CREATE TABLE IF NOT EXISTS "BusinessAuditLog" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" text NOT NULL,
  "action" text NOT NULL,
  "actorId" text,
  "actorName" text,
  "actorRole" text,
  "ipAddress" text,
  "userAgent" text,
  "beforeData" jsonb,
  "afterData" jsonb,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "BusinessAuditLog_businessId_idx" ON "BusinessAuditLog" ("businessId");
CREATE INDEX IF NOT EXISTS "BusinessAuditLog_createdAt_idx" ON "BusinessAuditLog" ("createdAt");

CREATE OR REPLACE FUNCTION protect_business_audit_log() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Business audit records are append-only and cannot be changed or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_audit_no_update ON "BusinessAuditLog";
CREATE TRIGGER trg_business_audit_no_update
BEFORE UPDATE ON "BusinessAuditLog"
FOR EACH ROW EXECUTE FUNCTION protect_business_audit_log();

DROP TRIGGER IF EXISTS trg_business_audit_no_delete ON "BusinessAuditLog";
CREATE TRIGGER trg_business_audit_no_delete
BEFORE DELETE ON "BusinessAuditLog"
FOR EACH ROW EXECUTE FUNCTION protect_business_audit_log();

CREATE OR REPLACE FUNCTION audit_business_table_change() RETURNS trigger AS $$
DECLARE
  bid text;
BEGIN
  bid := COALESCE(NEW."id", OLD."id");
  INSERT INTO "BusinessAuditLog" (
    "businessId", "action", "actorName", "actorRole", "beforeData", "afterData"
  ) VALUES (
    bid,
    CASE TG_OP WHEN 'INSERT' THEN 'db_created' WHEN 'UPDATE' THEN 'db_updated' ELSE 'db_deleted' END,
    'Database audit',
    'system',
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_audit_insert ON "Business";
CREATE TRIGGER trg_business_audit_insert AFTER INSERT ON "Business"
FOR EACH ROW EXECUTE FUNCTION audit_business_table_change();

DROP TRIGGER IF EXISTS trg_business_audit_update ON "Business";
CREATE TRIGGER trg_business_audit_update AFTER UPDATE ON "Business"
FOR EACH ROW EXECUTE FUNCTION audit_business_table_change();

DROP TRIGGER IF EXISTS trg_business_audit_delete ON "Business";
CREATE TRIGGER trg_business_audit_delete AFTER DELETE ON "Business"
FOR EACH ROW EXECUTE FUNCTION audit_business_table_change();

INSERT INTO "BusinessAuditLog" ("businessId", "action", "actorName", "actorRole", "afterData")
SELECT b."id", 'baseline_snapshot', 'System migration', 'system', to_jsonb(b)
FROM "Business" b
WHERE NOT EXISTS (
  SELECT 1 FROM "BusinessAuditLog" a WHERE a."businessId" = b."id"
);