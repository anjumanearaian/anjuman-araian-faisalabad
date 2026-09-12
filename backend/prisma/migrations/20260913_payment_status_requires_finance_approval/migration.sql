-- Database-level anti-bypass guard.
-- A source record cannot be marked received/verified/recorded unless its
-- PaymentSubmission has already been approved by Finance.

CREATE OR REPLACE FUNCTION require_approved_payment_submission() RETURNS trigger AS $$
DECLARE
  expected_source_type TEXT;
  source_id TEXT;
  has_approved BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'Member' THEN
    expected_source_type := 'membership';
  ELSIF TG_TABLE_NAME = 'Business' THEN
    expected_source_type := 'business';
  ELSIF TG_TABLE_NAME = 'Matrimonial' THEN
    expected_source_type := 'matrimonial';
  ELSE
    RETURN NEW;
  END IF;

  source_id := NEW."id";

  IF lower(coalesce(NEW."paymentStatus", 'pending')) IN ('received','verified','recorded')
     AND lower(coalesce(OLD."paymentStatus", 'pending')) NOT IN ('received','verified','recorded') THEN
    SELECT EXISTS (
      SELECT 1 FROM "PaymentSubmission"
      WHERE "sourceType" = expected_source_type
        AND "sourceRecordId" = source_id
        AND "status" = 'approved'
    ) INTO has_approved;

    IF NOT has_approved THEN
      RAISE EXCEPTION 'Payment status cannot be cleared until Finance approves the payment proof.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_member_payment_requires_finance" ON "Member";
CREATE TRIGGER "trg_member_payment_requires_finance"
BEFORE UPDATE OF "paymentStatus" ON "Member"
FOR EACH ROW EXECUTE FUNCTION require_approved_payment_submission();

DROP TRIGGER IF EXISTS "trg_business_payment_requires_finance" ON "Business";
CREATE TRIGGER "trg_business_payment_requires_finance"
BEFORE UPDATE OF "paymentStatus" ON "Business"
FOR EACH ROW EXECUTE FUNCTION require_approved_payment_submission();

DROP TRIGGER IF EXISTS "trg_matrimonial_payment_requires_finance" ON "Matrimonial";
CREATE TRIGGER "trg_matrimonial_payment_requires_finance"
BEFORE UPDATE OF "paymentStatus" ON "Matrimonial"
FOR EACH ROW EXECUTE FUNCTION require_approved_payment_submission();
