-- Additive governance/member-history migration.
-- Existing member, business, matrimonial and leadership data are preserved.

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "memberId" TEXT;
ALTER TABLE "Matrimonial" ADD COLUMN IF NOT EXISTS "memberId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Business_memberId_fkey') THEN
    ALTER TABLE "Business"
      ADD CONSTRAINT "Business_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Matrimonial_memberId_fkey') THEN
    ALTER TABLE "Matrimonial"
      ADD CONSTRAINT "Matrimonial_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Business_memberId_idx" ON "Business"("memberId");
CREATE INDEX IF NOT EXISTS "Matrimonial_memberId_idx" ON "Matrimonial"("memberId");

-- Link existing matrimonial submissions to their already-linked authenticated member.
UPDATE "Matrimonial" m
SET "memberId" = mem."id"
FROM "Member" mem
WHERE m."memberId" IS NULL
  AND m."authUserId" IS NOT NULL
  AND mem."authUserId" = m."authUserId";

CREATE TABLE IF NOT EXISTS "Meeting" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "title" TEXT NOT NULL,
  "groupKey" TEXT NOT NULL,
  "meetingType" TEXT NOT NULL DEFAULT 'Monthly Meeting',
  "meetingNo" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "venue" TEXT,
  "agenda" TEXT,
  "noticeBody" TEXT,
  "noticePublishedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'draft',
  "minutesBody" TEXT,
  "minutesPublishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Meeting_groupKey_idx" ON "Meeting"("groupKey");
CREATE INDEX IF NOT EXISTS "Meeting_scheduledAt_idx" ON "Meeting"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Meeting_status_idx" ON "Meeting"("status");

CREATE TABLE IF NOT EXISTS "MeetingAttendance" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "meetingId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'invited',
  "notes" TEXT,
  "roleSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeetingAttendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MeetingAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MeetingAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MeetingAttendance_meetingId_memberId_key" ON "MeetingAttendance"("meetingId", "memberId");
CREATE INDEX IF NOT EXISTS "MeetingAttendance_meetingId_idx" ON "MeetingAttendance"("meetingId");
CREATE INDEX IF NOT EXISTS "MeetingAttendance_memberId_idx" ON "MeetingAttendance"("memberId");
CREATE INDEX IF NOT EXISTS "MeetingAttendance_status_idx" ON "MeetingAttendance"("status");
