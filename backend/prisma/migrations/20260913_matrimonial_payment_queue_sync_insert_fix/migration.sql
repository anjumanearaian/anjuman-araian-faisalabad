-- INSERT triggers do not have an OLD row. Keep metadata sync safe for both
-- newly-created drafts and later updates.
CREATE OR REPLACE FUNCTION refresh_matrimonial_payment_metadata_from_draft() RETURNS trigger AS $$
DECLARE
  profile_id TEXT;
  sender_name TEXT;
  payment_method TEXT;
  payment_reference TEXT;
  old_data JSONB := '{}'::jsonb;
BEGIN
  IF NEW."formType" <> 'matrimonial' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN old_data := COALESCE(OLD."data", '{}'::jsonb); END IF;

  SELECT m."id" INTO profile_id
  FROM "Matrimonial" m
  WHERE m."authUserId" = NEW."authUserId"
  ORDER BY m."createdAt" DESC
  LIMIT 1;

  IF profile_id IS NULL THEN RETURN NEW; END IF;

  sender_name := COALESCE(NULLIF(trim(NEW."data"->>'paymentSenderName'), ''), NULLIF(trim(old_data->>'paymentSenderName'), ''));
  payment_method := COALESCE(NULLIF(trim(NEW."data"->>'paymentMethod'), ''), NULLIF(trim(old_data->>'paymentMethod'), ''));
  payment_reference := COALESCE(NULLIF(trim(NEW."data"->>'paymentReference'), ''), NULLIF(trim(old_data->>'paymentReference'), ''));

  UPDATE "PaymentSubmission"
  SET "senderName" = COALESCE(sender_name, "senderName"),
      "paymentMethod" = COALESCE(payment_method, "paymentMethod"),
      "transactionReference" = COALESCE(payment_reference, "transactionReference"),
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE "sourceType" = 'matrimonial' AND "sourceRecordId" = profile_id AND "status" = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
