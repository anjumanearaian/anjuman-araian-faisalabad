-- Business Directory payment workflow alignment.
-- "received" is an admin/accounts visual check and may be set before Finance review.
-- "verified" / "recorded" remain protected by the finance approval queue.

CREATE OR REPLACE FUNCTION require_approved_payment_submission() RETURNS trigger AS $$
DECLARE
  expected_source_type TEXT;
  source_id TEXT;
  has_approved BOOLEAN;
  new_status TEXT;
  old_status TEXT;
  guarded_new BOOLEAN;
  guarded_old BOOLEAN;
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
  new_status := lower(coalesce(NEW."paymentStatus", 'pending'));
  old_status := lower(coalesce(OLD."paymentStatus", 'pending'));

  IF TG_TABLE_NAME = 'Business' THEN
    guarded_new := new_status IN ('verified','recorded');
    guarded_old := old_status IN ('verified','recorded');
  ELSE
    guarded_new := new_status IN ('received','verified','recorded');
    guarded_old := old_status IN ('received','verified','recorded');
  END IF;

  IF guarded_new AND NOT guarded_old THEN
    SELECT EXISTS (
      SELECT 1 FROM "PaymentSubmission"
      WHERE "sourceType" = expected_source_type
        AND "sourceRecordId" = source_id
        AND "status" = 'approved'
    ) INTO has_approved;

    IF NOT has_approved THEN
      RAISE EXCEPTION 'Final payment verification requires Finance approval of the payment proof.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
