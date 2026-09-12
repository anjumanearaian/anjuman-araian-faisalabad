-- Additive, idempotent production-safety migration.
-- No existing member, payment or audit record is deleted.

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "archivedByAdminId" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "archivedByName" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "archiveReason" TEXT;

CREATE TABLE IF NOT EXISTS "MemberAuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "memberId" TEXT,
  "action" TEXT NOT NULL,
  "actorAdminId" TEXT,
  "actorName" TEXT,
  "actorRole" TEXT,
  "reason" TEXT,
  "beforeData" JSONB,
  "afterData" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberAuditLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "MemberAuditLog_memberId_createdAt_idx" ON "MemberAuditLog"("memberId", "createdAt");
CREATE INDEX IF NOT EXISTS "MemberAuditLog_createdAt_idx" ON "MemberAuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "Member_isArchived_status_idx" ON "Member"("isArchived", "status");

CREATE OR REPLACE FUNCTION audit_member_insert_update() RETURNS trigger AS $$
BEGIN
  INSERT INTO "MemberAuditLog"("memberId", "action", "beforeData", "afterData")
  VALUES (
    NEW."id",
    CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_member_audit_insert_update" ON "Member";
CREATE TRIGGER "trg_member_audit_insert_update"
AFTER INSERT OR UPDATE ON "Member"
FOR EACH ROW EXECUTE FUNCTION audit_member_insert_update();

CREATE OR REPLACE FUNCTION prevent_protected_record_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Protected record cannot be physically deleted. Archive/void it instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_member_prevent_delete" ON "Member";
CREATE TRIGGER "trg_member_prevent_delete" BEFORE DELETE ON "Member" FOR EACH ROW EXECUTE FUNCTION prevent_protected_record_delete();

DROP TRIGGER IF EXISTS "trg_finance_transaction_prevent_delete" ON "FinanceTransaction";
CREATE TRIGGER "trg_finance_transaction_prevent_delete" BEFORE DELETE ON "FinanceTransaction" FOR EACH ROW EXECUTE FUNCTION prevent_protected_record_delete();

DROP TRIGGER IF EXISTS "trg_revenue_record_prevent_delete" ON "RevenueRecord";
CREATE TRIGGER "trg_revenue_record_prevent_delete" BEFORE DELETE ON "RevenueRecord" FOR EACH ROW EXECUTE FUNCTION prevent_protected_record_delete();

CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit history is immutable.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_finance_audit_immutable" ON "FinanceAuditLog";
CREATE TRIGGER "trg_finance_audit_immutable" BEFORE UPDATE OR DELETE ON "FinanceAuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

DROP TRIGGER IF EXISTS "trg_member_audit_immutable" ON "MemberAuditLog";
CREATE TRIGGER "trg_member_audit_immutable" BEFORE UPDATE OR DELETE ON "MemberAuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
