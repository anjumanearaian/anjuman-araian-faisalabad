ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "country" text NOT NULL DEFAULT 'Pakistan';
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "province" text;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "dateOfBirth" text;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "heightCm" integer;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "maritalStatus" text;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "nationality" text;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "residenceStatus" text;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "employmentType" text;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "employerType" text;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "incomeBand" text;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'PKR';
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "profileData" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "preferenceData" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "privacyData" jsonb NOT NULL DEFAULT '{"profileVisibility":"matches_only","photoVisibility":"mutual_interest","contactVisibility":"mutual_interest"}'::jsonb;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "verificationStatus" text NOT NULL DEFAULT 'unverified';
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "candidateConsent" boolean NOT NULL DEFAULT false;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "candidateConsentAt" timestamp without time zone;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "applicationSource" text NOT NULL DEFAULT 'self_service';
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "sourceAdminId" text;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "sourceAdminName" text;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "profileCompleteness" integer NOT NULL DEFAULT 0;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "lastMatchedAt" timestamp without time zone;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true;

ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "requesterToTargetScore" integer;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "targetToRequesterScore" integer;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "mutualScore" integer;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "scoreConfidence" integer;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "scoreBreakdown" jsonb;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "fullProfileReleasedAt" timestamp without time zone;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "photoReleasedAt" timestamp without time zone;
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "photoAccessStatus" text NOT NULL DEFAULT 'locked';
ALTER TABLE "MatrimonialMatchRequest" ADD COLUMN IF NOT EXISTS "contactAccessStatus" text NOT NULL DEFAULT 'locked';

CREATE TABLE IF NOT EXISTS "MatrimonialAuditLog" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" text,
  "requestId" text,
  "action" text NOT NULL,
  "actorId" text,
  "actorName" text,
  "actorRole" text,
  "ipAddress" text,
  "userAgent" text,
  "details" jsonb,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "MatrimonialAuditLog_profileId_idx" ON "MatrimonialAuditLog" ("profileId");
CREATE INDEX IF NOT EXISTS "MatrimonialAuditLog_requestId_idx" ON "MatrimonialAuditLog" ("requestId");
CREATE INDEX IF NOT EXISTS "MatrimonialAuditLog_createdAt_idx" ON "MatrimonialAuditLog" ("createdAt");

CREATE TABLE IF NOT EXISTS "MatrimonialManagerSetting" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "phone" text,
  "email" text,
  "notificationMode" text NOT NULL DEFAULT 'digest',
  "publicContact" boolean NOT NULL DEFAULT false,
  "isActive" boolean NOT NULL DEFAULT true,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION protect_matrimonial_audit_log() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Matrimonial audit records are append-only and cannot be changed or deleted.';
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_matrimonial_audit_no_update ON "MatrimonialAuditLog";
CREATE TRIGGER trg_matrimonial_audit_no_update BEFORE UPDATE ON "MatrimonialAuditLog" FOR EACH ROW EXECUTE FUNCTION protect_matrimonial_audit_log();
DROP TRIGGER IF EXISTS trg_matrimonial_audit_no_delete ON "MatrimonialAuditLog";
CREATE TRIGGER trg_matrimonial_audit_no_delete BEFORE DELETE ON "MatrimonialAuditLog" FOR EACH ROW EXECUTE FUNCTION protect_matrimonial_audit_log();

ALTER TABLE "MatrimonialAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatrimonialManagerSetting" ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS "Matrimonial_gender_active_idx" ON "Matrimonial" ("gender","isActive","status");
CREATE INDEX IF NOT EXISTS "Matrimonial_country_city_idx" ON "Matrimonial" ("country","city");
CREATE INDEX IF NOT EXISTS "Matrimonial_verification_idx" ON "Matrimonial" ("verificationStatus");
