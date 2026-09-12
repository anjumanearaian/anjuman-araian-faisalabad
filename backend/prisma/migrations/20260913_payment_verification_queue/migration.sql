-- Additive production-safety migration for payment verification.
-- Pending uploaded/manual payments stay outside the accounting ledger until a
-- Finance Secretary / Assistant Finance Secretary / Admin explicitly verifies them.
-- No existing ledger, member, business or matrimonial records are deleted.

ALTER TABLE "FinanceTransaction" ADD COLUMN IF NOT EXISTS "paymentSenderName" TEXT;
ALTER TABLE "FinanceTransaction" ADD COLUMN IF NOT EXISTS "proofUrl" TEXT;
ALTER TABLE "FinanceTransaction" ADD COLUMN IF NOT EXISTS "supportingDocuments" TEXT;

CREATE TABLE IF NOT EXISTS "PaymentSubmission" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sourceType" TEXT NOT NULL DEFAULT 'manual_revenue',
  "sourceRecordId" TEXT,
  "sourceKey" TEXT UNIQUE,
  "memberId" TEXT,
  "payerName" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PKR',
  "paymentMethod" TEXT,
  "transactionReference" TEXT,
  "proofUrl" TEXT NOT NULL,
  "supportingDocuments" TEXT,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "submittedByAdminId" TEXT,
  "submittedByName" TEXT,
  "submittedByRole" TEXT,
  "submittedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedByAdminId" TEXT,
  "reviewedByName" TEXT,
  "reviewedByRole" TEXT,
  "reviewedAt" TIMESTAMP,
  "reviewNote" TEXT,
  "cashBookNo" TEXT,
  "financeTransactionId" TEXT UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentSubmission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL,
  CONSTRAINT "PaymentSubmission_financeTransactionId_fkey" FOREIGN KEY ("financeTransactionId") REFERENCES "FinanceTransaction"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "PaymentSubmission_status_createdAt_idx" ON "PaymentSubmission"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentSubmission_memberId_idx" ON "PaymentSubmission"("memberId");
CREATE INDEX IF NOT EXISTS "PaymentSubmission_sourceType_sourceRecordId_idx" ON "PaymentSubmission"("sourceType", "sourceRecordId");

CREATE TABLE IF NOT EXISTS "PaymentSubmissionAuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "submissionId" TEXT,
  "action" TEXT NOT NULL,
  "actorAdminId" TEXT,
  "actorName" TEXT,
  "actorRole" TEXT,
  "beforeData" JSONB,
  "afterData" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentSubmissionAuditLog_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PaymentSubmission"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "PaymentSubmissionAuditLog_submissionId_createdAt_idx" ON "PaymentSubmissionAuditLog"("submissionId", "createdAt");

CREATE OR REPLACE FUNCTION audit_payment_submission_change() RETURNS trigger AS $$
BEGIN
  INSERT INTO "PaymentSubmissionAuditLog"("submissionId", "action", "beforeData", "afterData")
  VALUES (
    NEW."id",
    CASE WHEN TG_OP = 'INSERT' THEN 'submitted' ELSE 'updated' END,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_payment_submission_audit" ON "PaymentSubmission";
CREATE TRIGGER "trg_payment_submission_audit"
AFTER INSERT OR UPDATE ON "PaymentSubmission"
FOR EACH ROW EXECUTE FUNCTION audit_payment_submission_change();

DROP TRIGGER IF EXISTS "trg_payment_submission_prevent_delete" ON "PaymentSubmission";
CREATE TRIGGER "trg_payment_submission_prevent_delete" BEFORE DELETE ON "PaymentSubmission" FOR EACH ROW EXECUTE FUNCTION prevent_protected_record_delete();

DROP TRIGGER IF EXISTS "trg_payment_submission_audit_immutable" ON "PaymentSubmissionAuditLog";
CREATE TRIGGER "trg_payment_submission_audit_immutable" BEFORE UPDATE OR DELETE ON "PaymentSubmissionAuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- Existing uploaded proofs that have not yet been verified are brought into the
-- review queue. They are NOT inserted into FinanceTransaction and therefore do
-- not change credits, debits or balance until a finance reviewer approves them.
INSERT INTO "PaymentSubmission" (
  "sourceType", "sourceRecordId", "sourceKey", "memberId", "payerName", "senderName", "category", "amount", "currency", "paymentMethod", "proofUrl", "supportingDocuments", "description", "status"
)
SELECT
  'membership', m."id", 'membership-registration:' || m."id", m."id", m."fullName", m."fullName",
  CASE
    WHEN lower(m."membershipType") IN ('life','lifetime') THEN 'Life Membership Fee'
    WHEN lower(m."membershipType") = 'patron' THEN 'Patron Membership Fee'
    WHEN lower(m."membershipType") = 'overseas' THEN 'Overseas Membership Fee'
    ELSE 'Annual Membership Fee'
  END,
  CASE
    WHEN lower(m."membershipType") IN ('life','lifetime') THEN 3000
    WHEN lower(m."membershipType") = 'patron' THEN 25000
    WHEN lower(m."membershipType") = 'overseas' THEN 100
    ELSE 1000
  END,
  CASE WHEN lower(m."membershipType") = 'overseas' THEN 'USD' ELSE 'PKR' END,
  NULL, m."paymentProofUrl", m."additionalPhotos", 'Backfilled from existing membership registration. Sender name was not collected in the earlier form.', 'pending'
FROM "Member" m
WHERE m."paymentProofUrl" IS NOT NULL
  AND length(trim(m."paymentProofUrl")) > 0
  AND lower(coalesce(m."paymentStatus", 'pending')) IN ('pending','submitted')
ON CONFLICT ("sourceKey") DO NOTHING;

INSERT INTO "PaymentSubmission" (
  "sourceType", "sourceRecordId", "sourceKey", "payerName", "senderName", "category", "amount", "currency", "proofUrl", "supportingDocuments", "description", "status"
)
SELECT
  'business', b."id", 'business-registration:' || b."id", b."ownerName", b."ownerName",
  'Business Directory ' || initcap(b."sponsorshipPackage") || ' Listing',
  CASE WHEN lower(b."sponsorshipPackage") = 'vip' THEN 15000 WHEN lower(b."sponsorshipPackage") = 'premium' THEN 5000 ELSE 1000 END,
  'PKR', b."paymentProofUrl", b."additionalPhotos", 'Backfilled from existing business registration. Sender name was not collected in the earlier form.', 'pending'
FROM "Business" b
WHERE b."paymentProofUrl" IS NOT NULL
  AND length(trim(b."paymentProofUrl")) > 0
  AND lower(coalesce(b."paymentStatus", 'pending')) IN ('pending','submitted')
ON CONFLICT ("sourceKey") DO NOTHING;

INSERT INTO "PaymentSubmission" (
  "sourceType", "sourceRecordId", "sourceKey", "payerName", "senderName", "category", "amount", "currency", "proofUrl", "supportingDocuments", "description", "status"
)
SELECT
  'matrimonial', m."id", 'matrimonial-registration:' || m."id", m."name", m."name",
  'Matrimonial Application Fee', m."feeAmount"::double precision, 'PKR', m."paymentProofUrl", m."additionalPhotos",
  'Backfilled from existing matrimonial registration. Sender name was not collected in the earlier form.', 'pending'
FROM "Matrimonial" m
WHERE m."paymentProofUrl" IS NOT NULL
  AND length(trim(m."paymentProofUrl")) > 0
  AND lower(coalesce(m."paymentStatus", 'pending')) IN ('pending','submitted')
ON CONFLICT ("sourceKey") DO NOTHING;
