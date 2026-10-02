ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

ALTER TABLE "FormDraft" ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP(3);
ALTER TABLE "FormDraft" ADD COLUMN IF NOT EXISTS "paymentSubmittedAt" TIMESTAMP(3);
ALTER TABLE "FormDraft" ADD COLUMN IF NOT EXISTS "paymentApprovedAt" TIMESTAMP(3);
ALTER TABLE "FormDraft" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

UPDATE "Business"
SET "approvedAt" = COALESCE("approvedAt", "updatedAt")
WHERE "status" = 'approved' AND "approvedAt" IS NULL;

UPDATE "Matrimonial"
SET "approvedAt" = COALESCE("approvedAt", "updatedAt")
WHERE "status" = 'approved' AND "approvedAt" IS NULL;

UPDATE "FormDraft"
SET "generatedAt" = COALESCE("generatedAt", "createdAt")
WHERE "generatedAt" IS NULL;

UPDATE "FormDraft"
SET "paymentSubmittedAt" = COALESCE("paymentSubmittedAt", "submittedAt", "updatedAt")
WHERE "paymentStatus" IN ('submitted','received','verified','recorded') AND "paymentSubmittedAt" IS NULL;

UPDATE "FormDraft"
SET "paymentApprovedAt" = COALESCE("paymentApprovedAt", "updatedAt")
WHERE "paymentStatus" IN ('received','verified','recorded') AND "paymentApprovedAt" IS NULL;

ALTER TABLE "FormDraft" ALTER COLUMN "generatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FormDraft" ALTER COLUMN "generatedAt" SET NOT NULL;
