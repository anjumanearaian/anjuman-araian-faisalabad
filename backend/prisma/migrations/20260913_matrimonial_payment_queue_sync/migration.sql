-- Keep matrimonial proof uploads in the finance verification queue without
-- adding another Vercel Serverless Function. Pending/rejected proofs never enter
-- FinanceTransaction; Finance approval remains the only clearance path.

CREATE OR REPLACE FUNCTION sync_matrimonial_payment_submission() RETURNS trigger AS $$
DECLARE
  draft_data JSONB;
  sender_name TEXT;
  payment_method TEXT;
  payment_reference TEXT;
  linked_member_id TEXT;
  source_key TEXT;
BEGIN
  IF NEW."paymentProofUrl" IS NULL OR length(trim(NEW."paymentProofUrl")) = 0 THEN
    RETURN NEW;
  END IF;

  IF lower(coalesce(NEW."paymentStatus", 'pending')) IN ('received','verified','recorded') THEN
    RETURN NEW;
  END IF;

  SELECT fd."data" INTO draft_data
  FROM "FormDraft" fd
  WHERE fd."authUserId" = NEW."authUserId" AND fd."formType" = 'matrimonial'
  ORDER BY fd."updatedAt" DESC
  LIMIT 1;

  sender_name := COALESCE(NULLIF(trim(draft_data->>'paymentSenderName'), ''), NEW."name");
  payment_method := NULLIF(trim(draft_data->>'paymentMethod'), '');
  payment_reference := NULLIF(trim(draft_data->>'paymentReference'), '');

  SELECT m."id" INTO linked_member_id
  FROM "Member" m
  WHERE m."authUserId" = NEW."authUserId"
  ORDER BY m."createdAt" DESC
  LIMIT 1;

  source_key := 'matrimonial-registration:' || NEW."id";

  INSERT INTO "PaymentSubmission" (
    "sourceType", "sourceRecordId", "sourceKey", "memberId", "payerName", "senderName", "category", "amount", "currency",
    "paymentMethod", "transactionReference", "proofUrl", "supportingDocuments", "description", "status"
  ) VALUES (
    'matrimonial', NEW."id", source_key, linked_member_id, NEW."name", sender_name,
    'Matrimonial Application Fee', NEW."feeAmount"::double precision, 'PKR', payment_method, payment_reference,
    NEW."paymentProofUrl", COALESCE(NEW."additionalPhotos", '[]'),
    'Submitted with matrimonial application; finance verification required before ledger posting.', 'pending'
  )
  ON CONFLICT ("sourceKey") DO UPDATE SET
    "memberId" = COALESCE(EXCLUDED."memberId", "PaymentSubmission"."memberId"),
    "payerName" = EXCLUDED."payerName",
    "senderName" = COALESCE(NULLIF(EXCLUDED."senderName", ''), "PaymentSubmission"."senderName"),
    "amount" = EXCLUDED."amount",
    "paymentMethod" = COALESCE(EXCLUDED."paymentMethod", "PaymentSubmission"."paymentMethod"),
    "transactionReference" = COALESCE(EXCLUDED."transactionReference", "PaymentSubmission"."transactionReference"),
    "supportingDocuments" = EXCLUDED."supportingDocuments",
    "status" = CASE
      WHEN "PaymentSubmission"."status" = 'approved' THEN 'approved'
      WHEN "PaymentSubmission"."proofUrl" IS DISTINCT FROM EXCLUDED."proofUrl" THEN 'pending'
      ELSE "PaymentSubmission"."status"
    END,
    "reviewedByAdminId" = CASE WHEN "PaymentSubmission"."status" <> 'approved' AND "PaymentSubmission"."proofUrl" IS DISTINCT FROM EXCLUDED."proofUrl" THEN NULL ELSE "PaymentSubmission"."reviewedByAdminId" END,
    "reviewedByName" = CASE WHEN "PaymentSubmission"."status" <> 'approved' AND "PaymentSubmission"."proofUrl" IS DISTINCT FROM EXCLUDED."proofUrl" THEN NULL ELSE "PaymentSubmission"."reviewedByName" END,
    "reviewedByRole" = CASE WHEN "PaymentSubmission"."status" <> 'approved' AND "PaymentSubmission"."proofUrl" IS DISTINCT FROM EXCLUDED."proofUrl" THEN NULL ELSE "PaymentSubmission"."reviewedByRole" END,
    "reviewedAt" = CASE WHEN "PaymentSubmission"."status" <> 'approved' AND "PaymentSubmission"."proofUrl" IS DISTINCT FROM EXCLUDED."proofUrl" THEN NULL ELSE "PaymentSubmission"."reviewedAt" END,
    "reviewNote" = CASE WHEN "PaymentSubmission"."status" <> 'approved' AND "PaymentSubmission"."proofUrl" IS DISTINCT FROM EXCLUDED."proofUrl" THEN NULL ELSE "PaymentSubmission"."reviewNote" END,
    "proofUrl" = EXCLUDED."proofUrl",
    "updatedAt" = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_matrimonial_payment_queue_sync" ON "Matrimonial";
CREATE TRIGGER "trg_matrimonial_payment_queue_sync"
AFTER INSERT OR UPDATE OF "paymentProofUrl", "additionalPhotos", "paymentStatus" ON "Matrimonial"
FOR EACH ROW EXECUTE FUNCTION sync_matrimonial_payment_submission();

CREATE OR REPLACE FUNCTION refresh_matrimonial_payment_metadata_from_draft() RETURNS trigger AS $$
DECLARE
  profile_id TEXT;
  sender_name TEXT;
  payment_method TEXT;
  payment_reference TEXT;
BEGIN
  IF NEW."formType" <> 'matrimonial' THEN RETURN NEW; END IF;

  SELECT m."id" INTO profile_id
  FROM "Matrimonial" m
  WHERE m."authUserId" = NEW."authUserId"
  ORDER BY m."createdAt" DESC
  LIMIT 1;

  IF profile_id IS NULL THEN RETURN NEW; END IF;

  sender_name := COALESCE(NULLIF(trim(NEW."data"->>'paymentSenderName'), ''), NULLIF(trim(OLD."data"->>'paymentSenderName'), ''));
  payment_method := COALESCE(NULLIF(trim(NEW."data"->>'paymentMethod'), ''), NULLIF(trim(OLD."data"->>'paymentMethod'), ''));
  payment_reference := COALESCE(NULLIF(trim(NEW."data"->>'paymentReference'), ''), NULLIF(trim(OLD."data"->>'paymentReference'), ''));

  UPDATE "PaymentSubmission"
  SET "senderName" = COALESCE(sender_name, "senderName"),
      "paymentMethod" = COALESCE(payment_method, "paymentMethod"),
      "transactionReference" = COALESCE(payment_reference, "transactionReference"),
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE "sourceType" = 'matrimonial' AND "sourceRecordId" = profile_id AND "status" = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_matrimonial_payment_metadata_from_draft" ON "FormDraft";
CREATE TRIGGER "trg_matrimonial_payment_metadata_from_draft"
AFTER INSERT OR UPDATE OF "data", "status" ON "FormDraft"
FOR EACH ROW EXECUTE FUNCTION refresh_matrimonial_payment_metadata_from_draft();
