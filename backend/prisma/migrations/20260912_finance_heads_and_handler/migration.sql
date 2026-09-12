CREATE TABLE IF NOT EXISTS "FinanceHead" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'revenue',
  "defaultAmount" DOUBLE PRECISION,
  "notes" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceHead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceHead_name_kind_key" ON "FinanceHead"("name", "kind");
CREATE INDEX IF NOT EXISTS "FinanceHead_kind_isActive_displayOrder_idx" ON "FinanceHead"("kind", "isActive", "displayOrder");
ALTER TABLE "FinanceHead" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "FinanceTransaction" ADD COLUMN IF NOT EXISTS "handledByMemberId" TEXT;
ALTER TABLE "FinanceTransaction" ADD COLUMN IF NOT EXISTS "handledByName" TEXT;
ALTER TABLE "FinanceTransaction" ADD COLUMN IF NOT EXISTS "handledByRole" TEXT;

INSERT INTO "FinanceHead" ("name", "kind", "defaultAmount", "notes", "displayOrder") VALUES
  ('Annual Membership Fee', 'revenue', 1000, 'Annual membership fee', 10),
  ('Life Membership Fee', 'revenue', 3000, 'Life membership fee', 20),
  ('Executive Committee Annual Contribution', 'revenue', 12000, 'Annual contribution from Executive Committee members', 30),
  ('Contribution', 'revenue', NULL, 'General contribution; describe its purpose in remarks', 40),
  ('Donation', 'revenue', NULL, 'Donation / voluntary support', 50),
  ('Sponsorship', 'revenue', NULL, 'Sponsorship income', 60),
  ('Family Gala Registration', 'revenue', NULL, 'Event / programme registration income', 70),
  ('Other Income', 'revenue', NULL, 'Use a custom finance head where possible', 90),
  ('Office Expense', 'expense', NULL, 'Office running expense', 110),
  ('Event Expense', 'expense', NULL, 'Event / programme expense', 120),
  ('Printing & Stationery', 'expense', NULL, 'Printing and stationery expense', 130),
  ('Welfare Payment', 'expense', NULL, 'Welfare related payment', 140),
  ('Travel & Conveyance', 'expense', NULL, 'Travel / local conveyance expense', 150),
  ('Utilities', 'expense', NULL, 'Electricity, internet, telephone or related utility', 160),
  ('Other Expense', 'expense', NULL, 'Use a custom finance head where possible', 190),
  ('Adjustment', 'adjustment', NULL, 'Credit or debit correction with remarks', 210)
ON CONFLICT ("name", "kind") DO UPDATE SET
  "defaultAmount" = EXCLUDED."defaultAmount",
  "notes" = EXCLUDED."notes",
  "displayOrder" = EXCLUDED."displayOrder",
  "isActive" = TRUE,
  "updatedAt" = CURRENT_TIMESTAMP;
