import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { createMeetingDocumentPdf, MeetingDocumentType } from "../lib/meetingDocumentPdf";

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
  id: z.string().uuid().optional(),
  memberId: z.string().uuid().nullable().optional(),
  attendeeType: z.enum(["member", "volunteer", "guest", "special_invitee", "observer"]).default("member"),
  guestName: z.string().trim().max(180).nullable().optional(),
  guestDesignation: z.string().trim().max(180).nullable().optional(),
  status: z.enum(["not_marked", "present", "absent", "leave", "late", "online", "excused"]).default("not_marked"),
  remarks: z.string().max(1000).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.attendeeType === "member" && !value.memberId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["memberId"], message: "Member is required." });
  }
  if (value.attendeeType !== "member" && !value.guestName?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["guestName"], message: "Guest or volunteer name is required." });
  }
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
  if (item.status === "postponed") parts.push(`<p><strong>Status:</strong> This meeting has been postponed.</p>`);
  if (item.status === "cancelled") parts.push(`<p><strong>Status:</strong> This meeting has been cancelled.</p>`);
  if (item.notice) parts.push(`<h2>Meeting Information</h2><p>${escapeHtml(item.notice)}</p>`);
  if (item.agenda) parts.push(`<h2>Agenda</h2><p>${escapeHtml(item.agenda)}</p>`);
  parts.push(`<p><em>Attendance, minutes, decisions, approvals and official meeting documents are internal records and are not publicly available.</em></p>`);
  return parts.join("\n") || `<p>Meeting information of Anjuman-e-Araian Faisalabad.</p>`;
}

function meetingCategory(item: any) {
  return item.meetingType === "agm"
    ? "Annual General Meeting"
    : item.meetingType === "committee"
      ? "Committee Meeting"
      : item.meetingType === "emergency"
        ? "Emergency Meeting"
        : "Meeting";
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


const DOCUMENT_TYPES = new Set<MeetingDocumentType>(["notice","agenda","attendance","minutes","decisions","package"]);

async function meetingForDocument(id: string) {
  return prisma.governanceMeeting.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true, type: true } },
      attendance: {
        include: { member: { select: { id: true, memberNo: true, fullName: true } } },
        orderBy: [{ attendeeType: "asc" }, { createdAt: "asc" }],
      },
      agendaItems: { orderBy: [{ itemNo: "asc" }, { createdAt: "asc" }] },
      approvals: { orderBy: { createdAt: "asc" } },
    },
  });
}

function safePdfName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "meeting-document";
}

function sendMeetingPdf(res: Response, meeting: any, type: MeetingDocumentType, mode: string) {
  const buffer = createMeetingDocumentPdf(meeting as any, type);
  const filename = safePdfName(`${meeting.date || "meeting"}-${meeting.title}-${type}`) + ".pdf";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${mode === "download" ? "attachment" : "inline"}; filename="${filename}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(buffer);
}

router.get("/meetings/:id/document.pdf", requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const requested = String(req.query.type || "minutes").toLowerCase() as MeetingDocumentType;
    const type = DOCUMENT_TYPES.has(requested) ? requested : "minutes";
    const mode = String(req.query.mode || "view").toLowerCase() === "download" ? "download" : "view";
    const meeting = await meetingForDocument(id);
    if (!meeting) return void res.status(404).json({ error: "Meeting not found." });
    return void sendMeetingPdf(res, meeting, type, mode);
  } catch (error) { next(error); }
});

router.get("/public/meetings/:id/document.pdf", (_req, res) => {
  res.status(404).json({ error: "Meeting records are internal and are not publicly available." });
});

async function resolveSuggestedPresidingOfficer(meetingId: string, organizationId?: string | null) {
  const present = await prisma.meetingAttendance.findMany({
    where: { meetingId, memberId: { not: null }, status: { in: ["present", "late", "online"] } },
    include: { member: { select: { id: true, fullName: true } } },
  });
  if (!present.length) return null;
  const memberIds = present.map((x) => x.memberId!).filter(Boolean);
  const assignments = await prisma.organizationAssignment.findMany({
    where: {
      memberId: { in: memberIds },
      isActive: true,
      ...(organizationId ? { organizationId } : {}),
    },
    select: { memberId: true, role: true, rank: true },
  });
  const roles = await prisma.governanceRoleMaster.findMany({ where: { canChair: true, isActive: true } });
  const priorityByDesignation = new Map(roles.map((r) => [r.designation.toLowerCase(), r.chairPriority ?? 999]));
  const candidates = present.map((row) => {
    const assignment = assignments
      .filter((a) => a.memberId === row.memberId)
      .sort((a, b) => (priorityByDesignation.get(a.role.toLowerCase()) ?? 999) - (priorityByDesignation.get(b.role.toLowerCase()) ?? 999) || a.rank - b.rank)[0];
    return {
      memberId: row.memberId!,
      name: row.member?.fullName || "",
      designation: assignment?.role || "",
      priority: assignment ? (priorityByDesignation.get(assignment.role.toLowerCase()) ?? 999) : 999,
      rank: assignment?.rank ?? 999,
    };
  }).filter((x) => x.designation && x.priority < 999)
    .sort((a, b) => a.priority - b.priority || a.rank - b.rank || a.name.localeCompare(b.name));
  return candidates[0] || null;
}

router.put("/meetings/:id/finalize-minutes", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const current = await prisma.governanceMeeting.findUnique({ where: { id } });
    if (!current) return void res.status(404).json({ error: "Meeting not found." });
    if (!String(current.minutes || "").trim() && !(await prisma.meetingAgendaItem.count({ where: { meetingId: id, decision: { not: null } } }))) {
      return void res.status(400).json({ error: "Complete the meeting minutes or record agenda decisions before finalizing the official record." });
    }
    const user: any = (req as any).user || {};
    let chairName = current.chairName || "";
    let chairDesignation = current.chairDesignation || "";
    let chairMemberId = current.chairMemberId || null;
    if (!chairName || !chairDesignation) {
      const suggested = await resolveSuggestedPresidingOfficer(id, current.organizationId);
      if (!suggested) return void res.status(400).json({ error: "No eligible presiding officer is marked Present, Late or Online. Confirm attendance first." });
      chairName = suggested.name;
      chairDesignation = suggested.designation;
      chairMemberId = suggested.memberId;
    }
    let defaultSecretaryName = "";
    if (current.organizationId) {
      const secretary = await prisma.organizationAssignment.findFirst({
        where: { organizationId: current.organizationId, isActive: true, role: { equals: "General Secretary", mode: "insensitive" }, member: { status: "approved" } },
        include: { member: { select: { fullName: true } } },
        orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
      });
      defaultSecretaryName = secretary?.member?.fullName || "";
    }
    const preparedByName = String(req.body?.preparedByName || current.preparedByName || defaultSecretaryName).trim() || "General Secretary / Authorized Officer";
    const approvedByName = String(req.body?.approvedByName || current.approvedByName || chairName).trim();
    const row = await prisma.governanceMeeting.update({
      where: { id },
      data: {
        status: "held",
        minutesStatus: "finalized",
        chairMemberId,
        chairName,
        chairDesignation,
        chairConfirmedByAdminId: current.chairConfirmedByAdminId || (user.id ? String(user.id) : null),
        chairConfirmedAt: current.chairConfirmedAt || new Date(),
        preparedByName,
        approvedByName,
        approvedAt: new Date(),
      },
      include: { organization: { select: { id: true, name: true, type: true } } },
    });
    if (row.published || row.contentId) {
      await syncPublicMeetingContent(row);
    }
    res.json({ ...mapMeeting(row), finalizedBy: user.username || user.email || user.role || "Admin" });
  } catch (error) { next(error); }
});

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
    const meetingId = String(req.params.id);
    const meeting = await prisma.governanceMeeting.findUnique({ where: { id: meetingId }, select: { organizationId: true } });
    const rows = await prisma.meetingAttendance.findMany({
      where: { meetingId },
      include: { member: { select: { id: true, memberNo: true, fullName: true, city: true, photoUrl: true } } },
      orderBy: [{ attendeeType: "asc" }, { createdAt: "asc" }],
    });

    const memberIds = rows.map((x) => x.memberId).filter(Boolean) as string[];
    const assignments = meeting?.organizationId && memberIds.length
      ? await prisma.organizationAssignment.findMany({
          where: { organizationId: meeting.organizationId, memberId: { in: memberIds }, isActive: true },
          select: { memberId: true, role: true, rank: true },
        })
      : [];
    const assignmentByMember = new Map(assignments.map((a) => [a.memberId, a]));

    const enriched = rows.map((row: any) => {
      const assignment = row.memberId ? assignmentByMember.get(row.memberId) : null;
      return {
        ...row,
        organizationRole: assignment?.role || row.guestDesignation || null,
        organizationRank: assignment?.rank ?? 999,
      };
    });
    enriched.sort((a: any, b: any) =>
      (a.organizationRank ?? 999) - (b.organizationRank ?? 999) ||
      String(a.member?.fullName || a.guestName || "").localeCompare(String(b.member?.fullName || b.guestName || ""))
    );
    res.json(enriched);
  } catch (error) { next(error); }
});

router.post("/meetings/:id/attendance/initialize", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = String(req.params.id);
    const meeting = await prisma.governanceMeeting.findUnique({
      where: { id: meetingId },
      select: { id: true, organizationId: true, organization: { select: { name: true, type: true } } },
    });
    if (!meeting) return void res.status(404).json({ error: "Meeting not found." });
    if (!meeting.organizationId) return void res.status(400).json({ error: "Select the meeting body / committee before loading its official roster." });

    const assignments = await prisma.organizationAssignment.findMany({
      where: { organizationId: meeting.organizationId, isActive: true, member: { status: "approved" } },
      select: { memberId: true },
      orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
    });
    const memberIds = [...new Set(assignments.map((a) => a.memberId))];
    if (!memberIds.length) return void res.status(400).json({ error: `No active approved members are assigned to ${meeting.organization?.name || "this body / committee"}.` });

    await prisma.$transaction(async (tx) => {
      // Keep guest / volunteer / invitee rows, but make the official-member roster
      // exactly match the body selected on the meeting.
      await tx.meetingAttendance.deleteMany({
        where: { meetingId, memberId: { notIn: memberIds } },
      });
      for (const memberId of memberIds) {
        await tx.meetingAttendance.upsert({
          where: { meetingId_memberId: { meetingId, memberId } },
          update: { attendeeType: "member", source: "unit_roster" },
          create: { meetingId, memberId, attendeeType: "member", status: "not_marked", source: "unit_roster" },
        });
      }
    });
    res.json({ message: `${meeting.organization?.name || "Selected body"} roster loaded.`, count: memberIds.length, unitName: meeting.organization?.name || null });
  } catch (error) { next(error); }
});

router.put("/meetings/:id/attendance", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = String(req.params.id);
    const user: any = (req as any).user || {};
    const entries = z.array(AttendanceSchema).max(1000).parse(req.body?.entries || req.body || []);
    const memberIds = entries.map((x) => x.memberId).filter(Boolean) as string[];
    if (memberIds.length) {
      const approvedCount = await prisma.member.count({ where: { id: { in: memberIds }, status: "approved" } });
      if (approvedCount !== new Set(memberIds).size) return void res.status(400).json({ error: "Attendance can only be recorded for approved members." });
    }

    await prisma.$transaction(async (tx) => {
      const incomingGuestIds = entries.filter((x) => x.attendeeType !== "member" && x.id).map((x) => x.id!) as string[];
      const incomingMemberIds = memberIds;

      await tx.meetingAttendance.deleteMany({
        where: {
          meetingId,
          OR: [
            { memberId: { not: null }, ...(incomingMemberIds.length ? { memberId: { notIn: incomingMemberIds } } : {}) },
            { memberId: null, ...(incomingGuestIds.length ? { id: { notIn: incomingGuestIds } } : {}) },
          ],
        },
      });

      for (const entry of entries) {
        const common = {
          status: entry.status,
          remarks: entry.remarks?.trim() || null,
          attendeeType: entry.attendeeType,
          guestName: entry.attendeeType === "member" ? null : entry.guestName?.trim() || null,
          guestDesignation: entry.attendeeType === "member" ? null : entry.guestDesignation?.trim() || null,
          markedByAdminId: user.id ? String(user.id) : null,
          markedByName: user.username || user.email || user.role || "Admin",
          markedAt: entry.status === "not_marked" ? null : new Date(),
          source: entry.attendeeType === "member" ? "manual" : "additional_attendee",
        };
        if (entry.memberId) {
          await tx.meetingAttendance.upsert({
            where: { meetingId_memberId: { meetingId, memberId: entry.memberId } },
            update: common,
            create: { meetingId, memberId: entry.memberId, ...common },
          });
        } else if (entry.id) {
          await tx.meetingAttendance.update({ where: { id: entry.id }, data: common });
        } else {
          await tx.meetingAttendance.create({ data: { meetingId, memberId: null, ...common } });
        }
      }
    });
    res.json({ message: "Attendance saved.", count: entries.length });
  } catch (error) { next(error); }
});

router.get("/meetings/:id/chair-suggestion", requireAdmin, async (req, res, next) => {
  try {
    const meetingId = String(req.params.id);
    const meeting = await prisma.governanceMeeting.findUnique({ where: { id: meetingId }, select: { organizationId: true } });
    if (!meeting) return void res.status(404).json({ error: "Meeting not found." });
    const suggestion = await resolveSuggestedPresidingOfficer(meetingId, meeting.organizationId);
    res.json({ suggestion });
  } catch (error) { next(error); }
});

router.put("/meetings/:id/chair", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = String(req.params.id);
    const memberId = String(req.body?.memberId || "");
    const name = String(req.body?.name || "").trim();
    const designation = String(req.body?.designation || "").trim();
    if (!memberId || !name || !designation) return void res.status(400).json({ error: "Chair member, name and designation are required." });
    const user: any = (req as any).user || {};
    const row = await prisma.governanceMeeting.update({
      where: { id: meetingId },
      data: {
        chairMemberId: memberId,
        chairName: name,
        chairDesignation: designation,
        chairConfirmedByAdminId: user.id ? String(user.id) : null,
        chairConfirmedAt: new Date(),
      },
    });
    res.json(row);
  } catch (error) { next(error); }
});

export default router;
