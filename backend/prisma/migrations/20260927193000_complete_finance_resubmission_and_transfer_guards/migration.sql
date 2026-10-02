-- Membership payment resubmission and internal-transfer confirmation guards.
CREATE OR REPLACE FUNCTION public.sync_membership_payment_resubmission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  existing_row RECORD;
  fee_amount double precision;
  fee_currency text;
  fee_category text;
  source_key text;
BEGIN
  IF NEW."paymentProofUrl" IS NOT DISTINCT FROM OLD."paymentProofUrl" THEN RETURN NEW; END IF;
  IF NEW."paymentProofUrl" IS NULL OR length(trim(NEW."paymentProofUrl")) = 0 THEN RETURN NEW; END IF;

  SELECT * INTO existing_row
  FROM "PaymentSubmission"
  WHERE "sourceType"='membership' AND "sourceRecordId"=NEW."id"
  ORDER BY "createdAt" DESC LIMIT 1;

  IF FOUND AND lower(coalesce(existing_row."status",''))='approved' THEN
    RAISE EXCEPTION 'This membership payment is already Finance Verified and locked.';
  END IF;

  IF lower(coalesce(NEW."membershipType",'ordinary')) IN ('life','lifetime') THEN
    fee_amount:=3000; fee_currency:='PKR'; fee_category:='Life Membership Fee';
  ELSIF lower(coalesce(NEW."membershipType",'ordinary'))='patron' THEN
    fee_amount:=25000; fee_currency:='PKR'; fee_category:='Patron Membership Fee';
  ELSIF lower(coalesce(NEW."membershipType",'ordinary'))='overseas' THEN
    fee_amount:=100; fee_currency:='USD'; fee_category:='Overseas Membership Fee';
  ELSE
    fee_amount:=1000; fee_currency:='PKR'; fee_category:='Annual Membership Fee';
  END IF;

  source_key:='membership-registration:'||NEW."id";

  IF FOUND THEN
    UPDATE "PaymentSubmission"
    SET "sourceKey"=source_key,
        "memberId"=NEW."id",
        "payerName"=NEW."fullName",
        "category"=fee_category,
        "amount"=fee_amount,
        "currency"=fee_currency,
        "proofUrl"=NEW."paymentProofUrl",
        "supportingDocuments"=COALESCE(NEW."additionalPhotos",'[]'),
        "status"='pending',
        "reviewedByAdminId"=NULL,
        "reviewedByName"=NULL,
        "reviewedByRole"=NULL,
        "reviewedAt"=NULL,
        "reviewNote"=NULL,
        "cashBookNo"=NULL,
        "financeTransactionId"=NULL,
        "updatedAt"=CURRENT_TIMESTAMP
    WHERE "id"=existing_row."id";

    INSERT INTO "PaymentSubmissionAuditLog"
      ("submissionId","action","actorName","actorRole","beforeData","afterData")
    VALUES
      (existing_row."id",'resubmitted_after_rejection',NEW."fullName",'applicant',
       to_jsonb(existing_row),
       jsonb_build_object('proofUrl',NEW."paymentProofUrl",'status','pending','source','membership'));
  ELSE
    INSERT INTO "PaymentSubmission" (
      "sourceType","sourceRecordId","sourceKey","memberId","payerName","senderName",
      "category","amount","currency","proofUrl","supportingDocuments","description","status"
    ) VALUES (
      'membership',NEW."id",source_key,NEW."id",NEW."fullName",NEW."fullName",
      fee_category,fee_amount,fee_currency,NEW."paymentProofUrl",
      COALESCE(NEW."additionalPhotos",'[]'),
      'Membership payment proof submitted; finance verification required before ledger posting.','pending'
    );
  END IF;

  UPDATE "Member"
  SET "paymentStatus"='pending'
  WHERE "id"=NEW."id" AND "paymentStatus" IS DISTINCT FROM 'pending';

  IF NEW."authUserId" IS NOT NULL THEN
    UPDATE "FormDraft"
    SET "paymentStatus"='pending',"updatedAt"=CURRENT_TIMESTAMP
    WHERE "authUserId"=NEW."authUserId" AND "formType"='membership';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_membership_payment_resubmission" ON "Member";
CREATE TRIGGER "trg_membership_payment_resubmission"
AFTER UPDATE OF "paymentProofUrl" ON "Member"
FOR EACH ROW
WHEN (OLD."paymentProofUrl" IS DISTINCT FROM NEW."paymentProofUrl")
EXECUTE FUNCTION public.sync_membership_payment_resubmission();

CREATE OR REPLACE FUNCTION public.guard_finance_internal_transfer_confirmation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status"='pending' AND NEW."status"='confirmed' THEN
    IF lower(coalesce(NEW."confirmedByRole",'')) NOT IN ('finance_secretary','assistant_finance_secretary','super_admin') THEN
      RAISE EXCEPTION 'Only Finance Secretary, Assistant Finance Secretary or Super Admin may confirm receipt of an internal transfer.';
    END IF;

    IF lower(coalesce(NEW."confirmedByRole",''))<>'super_admin'
       AND NEW."confirmedByAdminId" IS NOT NULL
       AND OLD."initiatedByAdminId" IS NOT NULL
       AND NEW."confirmedByAdminId"=OLD."initiatedByAdminId" THEN
      RAISE EXCEPTION 'The person who initiated this transfer cannot confirm receipt of the same transfer.';
    END IF;

    IF NEW."confirmedAt" IS NULL THEN
      RAISE EXCEPTION 'Confirmed transfers must record the confirmation time.';
    END IF;
  END IF;

  IF OLD."status"='confirmed' AND NEW."status" IS DISTINCT FROM OLD."status" THEN
    RAISE EXCEPTION 'A confirmed internal transfer is locked and cannot be reopened.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_finance_internal_transfer_confirmation_guard" ON "FinanceInternalTransfer";
CREATE TRIGGER "trg_finance_internal_transfer_confirmation_guard"
BEFORE UPDATE ON "FinanceInternalTransfer"
FOR EACH ROW
EXECUTE FUNCTION public.guard_finance_internal_transfer_confirmation();
