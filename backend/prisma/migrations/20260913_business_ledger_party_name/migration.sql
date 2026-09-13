-- Business-linked finance records should display the business/entity name as the payer/party.
-- The individual account-holder remains available separately as senderName/paymentSenderName.

CREATE OR REPLACE FUNCTION sync_business_payment_payer_name() RETURNS trigger AS $$
DECLARE
  resolved_business_name TEXT;
BEGIN
  IF NEW."sourceType" = 'business' AND NEW."sourceRecordId" IS NOT NULL THEN
    SELECT "businessName" INTO resolved_business_name
    FROM "Business"
    WHERE "id" = NEW."sourceRecordId";

    IF resolved_business_name IS NOT NULL AND btrim(resolved_business_name) <> '' THEN
      NEW."payerName" := resolved_business_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_payment_payer_name ON "PaymentSubmission";
CREATE TRIGGER trg_business_payment_payer_name
BEFORE INSERT OR UPDATE OF "sourceType", "sourceRecordId", "payerName" ON "PaymentSubmission"
FOR EACH ROW EXECUTE FUNCTION sync_business_payment_payer_name();

-- Normalize existing payment-verification rows.
UPDATE "PaymentSubmission" ps
SET "payerName" = b."businessName", "updatedAt" = CURRENT_TIMESTAMP
FROM "Business" b
WHERE ps."sourceType" = 'business'
  AND ps."sourceRecordId" = b."id"
  AND ps."payerName" IS DISTINCT FROM b."businessName";

-- Preserve an audit record before correcting already-posted ledger party names.
INSERT INTO "FinanceAuditLog" (
  "id", "transactionId", "action", "actorAdminId", "actorName", "beforeData", "afterData", "createdAt"
)
SELECT
  gen_random_uuid()::text,
  ft."id",
  'business_party_name_normalized',
  NULL,
  'System migration',
  to_jsonb(ft),
  jsonb_set(to_jsonb(ft), '{partyName}', to_jsonb(b."businessName"), true),
  CURRENT_TIMESTAMP
FROM "FinanceTransaction" ft
JOIN "PaymentSubmission" ps ON ps."financeTransactionId" = ft."id"
JOIN "Business" b ON ps."sourceType" = 'business' AND ps."sourceRecordId" = b."id"
WHERE ft."partyName" IS DISTINCT FROM b."businessName";

UPDATE "FinanceTransaction" ft
SET "partyName" = b."businessName", "updatedAt" = CURRENT_TIMESTAMP
FROM "PaymentSubmission" ps
JOIN "Business" b ON ps."sourceType" = 'business' AND ps."sourceRecordId" = b."id"
WHERE ps."financeTransactionId" = ft."id"
  AND ft."partyName" IS DISTINCT FROM b."businessName";
