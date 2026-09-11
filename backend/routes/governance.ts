import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

const router = Router();

const slugify = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 80) || `unit-${Date.now()}`;

const UnitSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum(["cabinet", "committee", "zone", "area", "working_group", "chapter", "other"]).default("committee"),
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  areaName: z.string().max(160).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  tenureStart: z.string().max(50).nullable().optional(),
  tenureEnd: z.string().max(50).nullable().optional(),
});

const AssignmentSchema = z.object({
  memberId: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: z.string().trim().min(2).max(150),
  rank: z.coerce.number().int().min(0).max(999).default(10),
  period: z.string().max(100).nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
  isActive: z.boolean().default(true),
});

const MeetingSchema = z.object({
  organizationId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(3).max(250),
  meetingType: z.enum(["meeting", "agm", "committee", "emergency", "other"]).default("meeting"),
  date: z.string().trim().min(4).max(30),
  time: z.string().max(30).nullable().optional(),
  venue: z.string().max(300).nullable().optional(),
  status: z.enum(["announced", "held", "postponed", "cancelled"]).default("announced"),
  notice: z.string().max(20000).nullable().optional(),
  agenda: z.string().max(20000).nullable().optional(),
  minutes: z.string().max(40000).nullable().optional(),
  images: z.array(z.string().max(3000)).max(30).default([]),
  published: z.boolean().default(false),
});

const AttendanceSchema = z.object({
  memberId: z.string().uuid(),
  status: z.enum(["present", "absent", "excused"]).default("present"),
  remarks: z.string().max(1000).nullable().optional(),
});

function parseImages(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function mapMeeting(item: any) {
  return { ...item, images: parseImages(item.images) };
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\r?\n/g, "<br />");
}

function publicMeetingBody(item: any) {
  const parts: string[] = [];
  if (item.notice) parts.push(`<h2>Meeting Notice</h2><p>${escapeHtml(item.notice)}</p>`);
  if (item.agenda) parts.push(`<h2>Agenda</h2><p>${escapeHtml(item.agenda)}</p>`);
  if (item.status === "held" && item.minutes) parts.push(`<h2>Minutes & Decisions</h2><p>${escapeHtml(item.minutes)}</p>`);
  if (item.status === "postponed") parts.unshift(`<p><strong>Status:</strong> This meeting has been postponed.</p>`);
  if (item.status === "cancelled") parts.unshift(`<p><strong>Status:</strong> This meeting has been cancelled.</p>`);
  return parts.join("\n") || `<p>Official meeting record of Anjuman-e-Araian Faisalabad.</p>`;
}

function meetingCategory(item: any) {
  const base = item.meetingType === "agm"
    ? "Annual General Meeting"
    : item.meetingType === "committee"
      ? "Committee Meeting"
      : item.meetingType === "emergency"
        ? "Emergency Meeting"
        : "Meeting";
  // Keep one public record throughout the meeting lifecycle. Once minutes are
  // added to a held meeting, the same Content row naturally moves into the
  // Minutes filter because its category now contains the word "Minutes".
  return item.status === "held" && String(item.minutes || "").trim() ? `${base} Minutes` : base;
}

async function syncPublicMeetingContent(meeting: any) {
  const contentData = {
    type: "event",
    title: meeting.title,
    body: publicMeetingBody(meeting),
    date: meeting.date,
    time: meeting.time || null,
    location: meeting.venue || null,
    category: meetingCategory(meeting),
    status: meeting.published ? "published" : "draft",
    images: JSON.stringify(parseImages(meeting.images)),
  };

  if (meeting.contentId) {
    try {
      await prisma.content.update({ where: { id: meeting.contentId }, data: contentData });
      return meeting.contentId;
    } catch (error: any) {
      if (error?.code !== "P2025") throw error;
    }
  }

  const content = await prisma.content.create({ data: contentData });
  await prisma.governanceMeeting.update({ where: { id: meeting.id }, data: { contentId: content.id } });
  return content.id;
}

async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  while (await prisma.organizationUnit.findFirst({
    where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  })) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}

async function wouldCreateHierarchyCycle(unitId: string, parentId: string | null | undefined) {
  let current = parentId || null;
  const visited = new Set<string>();
  while (current) {
    if (current === unitId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    const row = await prisma.organizationUnit.findUnique({ where: { id: current }, select: { parentId: true } });
    current = row?.parentId || null;
  }
  return false;
}

router.get("/summary", requireAdmin, async (_req, res, next) => {
  try {
    const [units, activeAssignments, meetings, heldMeetings] = await Promise.all([
      prisma.organizationUnit.count({ where: { isActive: true } }),
      prisma.organizationAssignment.count({ where: { isActive: true } }),
      prisma.governanceMeeting.count(),
      prisma.governanceMeeting.count({ where: { status: "held" } }),
    ]);
    res.json({ units, activeAssignments, meetings, heldMeetings });
  } catch (error) { next(error); }
});

router.post("/bootstrap-legacy", requireAdmin, async (_req, res, next) => {
  try {
    const legacy = await prisma.leadershipProfile.findMany({
      where: { memberId: { not: null }, category: { in: ["cabinet", "executive", "advisory"] } },
      orderBy: [{ tier: "asc" }, { name: "asc" }],
    });
    const definitions: Record<string, { name: string; slug: string; type: "cabinet" | "committee"; displayOrder: number }> = {
      cabinet: { name: "Executive Council / Cabinet", slug: "executive-council-cabinet", type: "cabinet", displayOrder: 10 },
      executive: { name: "Executive Committee", slug: "executive-committee", type: "committee", displayOrder: 20 },
      advisory: { name: "Advisory Board", slug: "advisory-board", type: "committee", displayOrder: 30 },
    };
    let imported = 0;
    let skipped = 0;
    for (const profile of legacy) {
      if (!profile.memberId) { skipped += 1; continue; }
      const def = definitions[profile.category];
      if (!def) { skipped += 1; continue; }
      const unit = await prisma.organizationUnit.upsert({
        where: { slug: def.slug },
        update: { name: def.name, type: def.type, displayOrder: def.displayOrder, isActive: true },
        create: { ...def, isActive: true },
      });
      const existing = await prisma.organizationAssignment.findFirst({
        where: { memberId: profile.memberId, organizationId: unit.id, role: profile.role, period: profile.period || null },
        select: { id: true },
      });
      if (existing) { skipped += 1; continue; }
      await prisma.organizationAssignment.create({
        data: {
          memberId: profile.memberId, organizationId: unit.id, role: profile.role,
          rank: profile.tier ?? 10, period: profile.period || null, notes: profile.description || "Imported from legacy leadership profile", isActive: true,
        },
      });
      imported += 1;
    }
    res.json({ imported, skipped, message: "Legacy linked leadership profiles were imported without creating duplicate member records." });
  } catch (error) { next(error); }
});

router.get("/units", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await prisma.organizationUnit.findMany({
      include: {
        parent: { select: { id: true, name: true, type: true } },
        _count: { select: { assignments: true, meetings: true, children: true } },
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/units", requireAdmin, async (req, res, next) => {
  try {
    const data = UnitSchema.parse(req.body);
    if (data.parentId) {
      const parent = await prisma.organizationUnit.findUnique({ where: { id: data.parentId }, select: { id: true } });
      if (!parent) return void res.status(400).json({ error: "Parent unit was not found." });
    }
    const row = await prisma.organizationUnit.create({
      data: { ...data, slug: await uniqueSlug(data.name) },
    });
    res.status(201).json(row);
  } catch (error) { next(error); }
});

router.put("/units/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const data = UnitSchema.parse(req.body);
    if (data.parentId === id) return void res.status(400).json({ error: "A unit cannot be its own parent." });
    if (await wouldCreateHierarchyCycle(id, data.parentId)) return void res.status(400).json({ error: "This parent selection would create a circular organization hierarchy." });
    const row = await prisma.organizationUnit.update({
      where: { id },
      data: { ...data, slug: await uniqueSlug(data.name, id) },
    });
    res.json(row);
  } catch (error) { next(error); }
});

router.delete("/units/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const counts = await prisma.organizationUnit.findUnique({
      where: { id },
      select: { _count: { select: { assignments: true, meetings: true, children: true } } },
    });
    if (!counts) return void res.status(404).json({ error: "Unit not found." });
    const totalLinks = counts._count.assignments + counts._count.meetings + counts._count.children;
    if (totalLinks > 0) {
      const row = await prisma.organizationUnit.update({ where: { id }, data: { isActive: false } });
      return void res.json({ ...row, archived: true, message: "Unit was archived because it has linked records." });
    }
    await prisma.organizationUnit.delete({ where: { id } });
    res.json({ message: "Unit deleted." });
  } catch (error) { next(error); }
});

router.get("/assignments", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await prisma.organizationAssignment.findMany({
      include: {
        member: { select: { id: true, memberNo: true, fullName: true, city: true, photoUrl: true, status: true } },
        organization: { select: { id: true, name: true, type: true, areaName: true, isActive: true } },
      },
      orderBy: [{ isActive: "desc" }, { rank: "asc" }, { createdAt: "desc" }],
    });
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/assignments", requireAdmin, async (req, res, next) => {
  try {
    const data = AssignmentSchema.parse(req.body);
    const [member, unit] = await Promise.all([
      prisma.member.findUnique({ where: { id: data.memberId }, select: { id: true, status: true } }),
      prisma.organizationUnit.findUnique({ where: { id: data.organizationId }, select: { id: true, isActive: true } }),
    ]);
    if (!member || member.status !== "approved") return void res.status(400).json({ error: "Select an approved member." });
    if (!unit || !unit.isActive) return void res.status(400).json({ error: "Select an active cabinet, committee or zone." });
    const normalized = { ...data, period: data.period?.trim() || null, notes: data.notes?.trim() || null };
    const existing = await prisma.organizationAssignment.findFirst({
      where: { memberId: normalized.memberId, organizationId: normalized.organizationId, role: normalized.role, period: normalized.period },
      select: { id: true },
    });
    if (existing) {
      const revived = await prisma.organizationAssignment.update({ where: { id: existing.id }, data: { ...normalized, isActive: true } });
      return void res.json(revived);
    }
    const row = await prisma.organizationAssignment.create({ data: normalized });
    res.status(201).json(row);
  } catch (error: any) {
    if (error?.code === "P2002") return void res.status(409).json({ error: "This member already has the same role for this unit and period." });
    next(error);
  }
});

router.put("/assignments/:id", requireAdmin, async (req, res, next) => {
  try {
    const data = AssignmentSchema.parse(req.body);
    const row = await prisma.organizationAssignment.update({ where: { id: String(req.params.id) }, data });
    res.json(row);
  } catch (error) { next(error); }
});

router.delete("/assignments/:id", requireAdmin, async (req, res, next) => {
  try {
    const row = await prisma.organizationAssignment.update({
      where: { id: String(req.params.id) }, data: { isActive: false },
    });
    res.json({ ...row, message: "Assignment archived. The historical record is preserved." });
  } catch (error) { next(error); }
});

router.get("/meetings", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await prisma.governanceMeeting.findMany({
      include: {
        organization: { select: { id: true, name: true, type: true } },
        _count: { select: { attendance: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    res.json(rows.map(mapMeeting));
  } catch (error) { next(error); }
});

router.post("/meetings", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = MeetingSchema.parse(req.body);
    const user: any = (req as any).user || {};
    let row = await prisma.governanceMeeting.create({
      data: {
        ...data,
        images: JSON.stringify(data.images || []),
        createdByAdminId: user.id ? String(user.id) : null,
        createdByName: user.username || user.email || user.role || "Admin",
      },
      include: { organization: { select: { id: true, name: true, type: true } } },
    });
    if (row.published) {
      const contentId = await syncPublicMeetingContent(row);
      row = { ...row, contentId } as any;
    }
    res.status(201).json(mapMeeting(row));
  } catch (error) { next(error); }
});

router.put("/meetings/:id", requireAdmin, async (req, res, next) => {
  try {
    const data = MeetingSchema.parse(req.body);
    let row = await prisma.governanceMeeting.update({
      where: { id: String(req.params.id) },
      data: { ...data, images: JSON.stringify(data.images || []) },
      include: { organization: { select: { id: true, name: true, type: true } } },
    });
    if (row.published || row.contentId) {
      const contentId = await syncPublicMeetingContent(row);
      row = { ...row, contentId } as any;
    }
    res.json(mapMeeting(row));
  } catch (error) { next(error); }
});

router.get("/meetings/:id/attendance", requireAdmin, async (req, res, next) => {
  try {
    const rows = await prisma.meetingAttendance.findMany({
      where: { meetingId: String(req.params.id) },
      include: { member: { select: { id: true, memberNo: true, fullName: true, city: true, photoUrl: true } } },
      orderBy: { member: { fullName: "asc" } },
    });
    res.json(rows);
  } catch (error) { next(error); }
});

router.put("/meetings/:id/attendance", requireAdmin, async (req, res, next) => {
  try {
    const meetingId = String(req.params.id);
    const entries = z.array(AttendanceSchema).max(1000).parse(req.body?.entries || req.body || []);
    const memberIds = entries.map((x) => x.memberId);
    const approvedCount = await prisma.member.count({ where: { id: { in: memberIds }, status: "approved" } });
    if (approvedCount !== new Set(memberIds).size) return void res.status(400).json({ error: "Attendance can only be recorded for approved members." });
    const operations: any[] = [
      prisma.meetingAttendance.deleteMany({ where: { meetingId, ...(memberIds.length ? { memberId: { notIn: memberIds } } : {}) } }),
      ...entries.map((entry) => prisma.meetingAttendance.upsert({
        where: { meetingId_memberId: { meetingId, memberId: entry.memberId } },
        update: { status: entry.status, remarks: entry.remarks || null },
        create: { meetingId, memberId: entry.memberId, status: entry.status, remarks: entry.remarks || null },
      })),
    ];
    await prisma.$transaction(operations);
    res.json({ message: "Attendance saved.", count: entries.length });
  } catch (error) { next(error); }
});

export default router;
