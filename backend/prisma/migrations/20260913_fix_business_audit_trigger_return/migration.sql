CREATE OR REPLACE FUNCTION audit_business_table_change() RETURNS trigger AS $$
DECLARE
  bid text;
BEGIN
  bid := CASE WHEN TG_OP = 'DELETE' THEN OLD."id" ELSE NEW."id" END;
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
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;