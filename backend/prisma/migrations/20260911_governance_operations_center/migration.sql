-- Anjuman-e-Araian Faisalabad
-- Governance & Operations Center additive migration
-- 2026-09-11
-- SAFE PRINCIPLE: no DROP TABLE, no DROP COLUMN, no destructive data rewrite.

BEGIN;

-- Bring older LeadershipProfile / RevenueRecord deployments up to the current
-- non-destructive schema used by the application.
ALTER TABLE IF EXISTS "LeadershipProfile"
  ADD COLUMN IF NOT EXISTS "memberId" TEXT,
  ADD COLUMN IF NOT EXISTS "tier" INTEGER NOT NULL DEFAULT 2;

CREATE INDEX IF NOT EXISTS "LeadershipProfile_memberId_idx" ON "LeadershipProfile"("memberId");

DO $$
BEGIN
  IF to_regclass('"LeadershipProfile"') IS NOT NULL
     AND to_regclass('"Member"') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadershipProfile_memberId_fkey') THEN
    ALTER TABLE "LeadershipProfile"
      ADD CONSTRAINT "LeadershipProfile_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE IF EXISTS "RevenueRecord"
  ADD COLUMN IF NOT EXISTS "reference" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptNo" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "RevenueRecord_reference_key" ON "RevenueRecord"("reference");
CREATE UNIQUE INDEX IF NOT EXISTS "RevenueRecord_receiptNo_key" ON "RevenueRecord"("receiptNo");
CREATE INDEX IF NOT EXISTS "RevenueRecord_reference_idx" ON "RevenueRecord"("reference");

-- Dynamic cabinets, committees, zones, areas, chapters and working groups.
CREATE TABLE IF NOT EXISTS "OrganizationUnit" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'committee',
  "parentId" TEXT,
  "description" TEXT,
  "areaName" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "tenureStart" TEXT,
  "tenureEnd" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationUnit_slug_key" ON "OrganizationUnit"("slug");
CREATE INDEX IF NOT EXISTS "OrganizationUnit_type_idx" ON "OrganizationUnit"("type");
CREATE INDEX IF NOT EXISTS "OrganizationUnit_parentId_idx" ON "OrganizationUnit"("parentId");
CREATE INDEX IF NOT EXISTS "OrganizationUnit_isActive_displayOrder_idx" ON "OrganizationUnit"("isActive", "displayOrder");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationUnit_parentId_fkey') THEN
    ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- One approved member can hold multiple roles without duplicating the person.
CREATE TABLE IF NOT EXISTS "OrganizationAssignment" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "rank" INTEGER NOT NULL DEFAULT 10,
  "period" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationAssignment_member_organization_role_period_key"
  ON "OrganizationAssignment"("memberId", "organizationId", "role", "period");
CREATE INDEX IF NOT EXISTS "OrganizationAssignment_memberId_idx" ON "OrganizationAssignment"("memberId");
CREATE INDEX IF NOT EXISTS "OrganizationAssignment_organizationId_isActive_rank_idx" ON "OrganizationAssignment"("organizationId", "isActive", "rank");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationAssignment_memberId_fkey') THEN
    ALTER TABLE "OrganizationAssignment" ADD CONSTRAINT "OrganizationAssignment_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationAssignment_organizationId_fkey') THEN
    ALTER TABLE "OrganizationAssignment" ADD CONSTRAINT "OrganizationAssignment_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- A meeting begins as an announcement and the same row later receives agenda,
-- attendance, photos and minutes. No duplicate "meeting vs minutes" record.
CREATE TABLE IF NOT EXISTS "GovernanceMeeting" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "title" TEXT NOT NULL,
  "meetingType" TEXT NOT NULL DEFAULT 'meeting',
  "date" TEXT NOT NULL,
  "time" TEXT,
  "venue" TEXT,
  "status" TEXT NOT NULL DEFAULT 'announced',
  "notice" TEXT,
  "agenda" TEXT,
  "minutes" TEXT,
  "images" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT FALSE,
  "contentId" TEXT,
  "createdByAdminId" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GovernanceMeeting_pkey" PRIMARY KEY ("id")
);
ALTER TABLE IF EXISTS "GovernanceMeeting" ADD COLUMN IF NOT EXISTS "contentId" TEXT;
CREATE INDEX IF NOT EXISTS "GovernanceMeeting_date_idx" ON "GovernanceMeeting"("date");
CREATE INDEX IF NOT EXISTS "GovernanceMeeting_status_idx" ON "GovernanceMeeting"("status");
CREATE INDEX IF NOT EXISTS "GovernanceMeeting_organizationId_idx" ON "GovernanceMeeting"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "GovernanceMeeting_contentId_key" ON "GovernanceMeeting"("contentId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GovernanceMeeting_organizationId_fkey') THEN
    ALTER TABLE "GovernanceMeeting" ADD CONSTRAINT "GovernanceMeeting_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MeetingAttendance" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'present',
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeetingAttendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MeetingAttendance_meetingId_memberId_key" ON "MeetingAttendance"("meetingId", "memberId");
CREATE INDEX IF NOT EXISTS "MeetingAttendance_meetingId_idx" ON "MeetingAttendance"("meetingId");
CREATE INDEX IF NOT EXISTS "MeetingAttendance_memberId_idx" ON "MeetingAttendance"("memberId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MeetingAttendance_meetingId_fkey') THEN
    ALTER TABLE "MeetingAttendance" ADD CONSTRAINT "MeetingAttendance_meetingId_fkey"
      FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MeetingAttendance_memberId_fkey') THEN
    ALTER TABLE "MeetingAttendance" ADD CONSTRAINT "MeetingAttendance_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Permanent finance ledger. Existing RevenueRecord rows are not moved or
-- deleted; the API displays them together with this ledger as legacy revenue.
CREATE TABLE IF NOT EXISTS "FinanceTransaction" (
  "id" TEXT NOT NULL,
  "serialNo" INTEGER GENERATED BY DEFAULT AS IDENTITY,
  "transactionNo" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'credit',
  "memberId" TEXT,
  "partyName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "paymentMethod" TEXT,
  "cashBookNo" TEXT,
  "receiptNo" TEXT,
  "voucherNo" TEXT,
  "externalReference" TEXT,
  "description" TEXT,
  "issuedByAdminId" TEXT,
  "issuedByName" TEXT,
  "issuedByRole" TEXT,
  "status" TEXT NOT NULL DEFAULT 'posted',
  "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceTransaction_serialNo_key" ON "FinanceTransaction"("serialNo");
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceTransaction_transactionNo_key" ON "FinanceTransaction"("transactionNo");
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceTransaction_receiptNo_key" ON "FinanceTransaction"("receiptNo");
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceTransaction_voucherNo_key" ON "FinanceTransaction"("voucherNo");
CREATE INDEX IF NOT EXISTS "FinanceTransaction_type_direction_idx" ON "FinanceTransaction"("type", "direction");
CREATE INDEX IF NOT EXISTS "FinanceTransaction_memberId_idx" ON "FinanceTransaction"("memberId");
CREATE INDEX IF NOT EXISTS "FinanceTransaction_transactionDate_idx" ON "FinanceTransaction"("transactionDate");
CREATE INDEX IF NOT EXISTS "FinanceTransaction_cashBookNo_idx" ON "FinanceTransaction"("cashBookNo");
CREATE INDEX IF NOT EXISTS "FinanceTransaction_status_idx" ON "FinanceTransaction"("status");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinanceTransaction_memberId_fkey') THEN
    ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FinanceAuditLog" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT,
  "action" TEXT NOT NULL,
  "actorAdminId" TEXT,
  "actorName" TEXT,
  "beforeData" JSONB,
  "afterData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FinanceAuditLog_transactionId_idx" ON "FinanceAuditLog"("transactionId");
CREATE INDEX IF NOT EXISTS "FinanceAuditLog_createdAt_idx" ON "FinanceAuditLog"("createdAt");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinanceAuditLog_transactionId_fkey') THEN
    ALTER TABLE "FinanceAuditLog" ADD CONSTRAINT "FinanceAuditLog_transactionId_fkey"
      FOREIGN KEY ("transactionId") REFERENCES "FinanceTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
