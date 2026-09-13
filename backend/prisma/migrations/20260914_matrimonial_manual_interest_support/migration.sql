ALTER TABLE "MatrimonialMatchRequest" ALTER COLUMN "requesterAuthUserId" DROP NOT NULL;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "consentRecordedByAdminId" text;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "consentRecordedByName" text;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "consentRecordedAt" timestamp without time zone;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "consentMethod" text;
