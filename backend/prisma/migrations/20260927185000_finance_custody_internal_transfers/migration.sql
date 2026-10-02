CREATE TABLE IF NOT EXISTS "FinanceCustodian" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'person',
  "accountLabel" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceCustodian_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FinanceCustodian_name_key" ON "FinanceCustodian"("name");
CREATE INDEX IF NOT EXISTS "FinanceCustodian_isActive_name_idx" ON "FinanceCustodian"("isActive","name");

ALTER TABLE "FinanceTransaction" ADD COLUMN IF NOT EXISTS "custodianId" TEXT;
CREATE INDEX IF NOT EXISTS "FinanceTransaction_custodianId_idx" ON "FinanceTransaction"("custodianId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinanceTransaction_custodianId_fkey') THEN
    ALTER TABLE "FinanceTransaction"
      ADD CONSTRAINT "FinanceTransaction_custodianId_fkey"
      FOREIGN KEY ("custodianId") REFERENCES "FinanceCustodian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FinanceInternalTransfer" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "transferNo" TEXT NOT NULL,
  "fromCustodianId" TEXT NOT NULL,
  "toCustodianId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "paymentMethod" TEXT,
  "externalReference" TEXT,
  "proofUrl" TEXT,
  "remarks" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "initiatedByAdminId" TEXT,
  "initiatedByName" TEXT,
  "initiatedByRole" TEXT,
  "confirmedByAdminId" TEXT,
  "confirmedByName" TEXT,
  "confirmedByRole" TEXT,
  "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceInternalTransfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceInternalTransfer_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "FinanceInternalTransfer_distinct_custodians_check" CHECK ("fromCustodianId" <> "toCustodianId"),
  CONSTRAINT "FinanceInternalTransfer_status_check" CHECK ("status" IN ('pending','confirmed','cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "FinanceInternalTransfer_transferNo_key" ON "FinanceInternalTransfer"("transferNo");
CREATE INDEX IF NOT EXISTS "FinanceInternalTransfer_status_transferDate_idx" ON "FinanceInternalTransfer"("status","transferDate");
CREATE INDEX IF NOT EXISTS "FinanceInternalTransfer_fromCustodianId_idx" ON "FinanceInternalTransfer"("fromCustodianId");
CREATE INDEX IF NOT EXISTS "FinanceInternalTransfer_toCustodianId_idx" ON "FinanceInternalTransfer"("toCustodianId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinanceInternalTransfer_fromCustodianId_fkey') THEN
    ALTER TABLE "FinanceInternalTransfer" ADD CONSTRAINT "FinanceInternalTransfer_fromCustodianId_fkey"
      FOREIGN KEY ("fromCustodianId") REFERENCES "FinanceCustodian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinanceInternalTransfer_toCustodianId_fkey') THEN
    ALTER TABLE "FinanceInternalTransfer" ADD CONSTRAINT "FinanceInternalTransfer_toCustodianId_fkey"
      FOREIGN KEY ("toCustodianId") REFERENCES "FinanceCustodian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
