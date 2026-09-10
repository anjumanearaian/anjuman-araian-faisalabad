import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAdmin, requireMember } from "../middleware/auth";

const router = Router();

const MeetingInput = z.object({
  title: z.string().trim().min(2).max(250),
  groupKey: z.string().trim().min(2).max(120),
  meetingType: z.string().trim().max(120).optional().default("Monthly Meeting"),
  meetingNo: z.string().trim().max(120).optional().nullable(),
  scheduledAt: z.string().min(1),
  venue: z.string().trim().max(300).optional().nullable(),
  agenda: z.string().max(20000).optional().nullable(),
  noticeBody: z.string().max(20000).optional().nullable(),
  status: z.enum(["draft", "announced", "held", "minutes_draft", "published", "cancelled"]).optional().default("draft"),
  minutesBody: z.string().max(50000).optional().nullable(),
});

const AttendanceInput = z.object({
  memberId: z.string().uuid(),
  status: z.enum(["invited", "present", "absent", "leave", "late"]),
  notes: z.string().max(1000).optional().nullable(),
  roleSnapshot: z.string().max(200).optional().nullable(),
});

const groupLabels: Record<string, string> = {
  cabinet: "Executive Council / Cabinet",
  executive: "Executive Body / Executive Committee",
  "management-committee": "Management Committee",
  "standing-committee": "Standing Committee",
  "finance-committee": "Finance Committee",
  advisory: "Advisory Board",
  "women-wing": "Women Wing",
};

const meetingInclude = {
  attendances: {
    include: {
      member: {
        select: { id: true, fullName: true, photoUrl: true, city: true, designation: true },
      },
    },
    orderBy: { member: { fullName: "asc" as const } },
  },
};

function serializeMeeting(meeting: any) {
  return meeting;
}

router.get("/groups", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await prisma.leadershipProfile.findMany({
      where: { memberId: { not: null }, category: { notIn: ["founder", "expresident"] } },
      select: { category: true, memberId: true },
    });
    const counts = new Map<string, Set<string>>();
    for (const p of profiles) {
      const key = String(p.category || "").trim();
      if (!key || !p.memberId) continue;
      if (!counts.has(key)) counts.set(key, new Set());
      counts.get(key)!.add(p.memberId);
    }
    const standardKeys = Object.keys(groupLabels);
    const allKeys = Array.from(new Set([...standardKeys, ...counts.keys()]));
    const groups = allKeys.map((key) => ({ key, label: groupLabels[key] || key, members: counts.get(key)?.size || 0 }))
      .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
    res.json({ groups });
  } catch (error) { next(error); }
});

router.get("/meetings", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const meetings = await prisma.meeting.findMany({
      include: meetingInclude,
      orderBy: { scheduledAt: "desc" },
    });
    res.json({ meetings: meetings.map(serializeMeeting) });
  } catch (error) { next(error); }
});

router.post("/meetings", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = MeetingInput.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid meeting data", details: parsed.error.flatten().fieldErrors });
    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return void res.status(400).json({ error: "A valid meeting date and time is required." });
    const { scheduledAt: _raw, ...rest } = parsed.data;
    const meeting = await prisma.meeting.create({
      data: { ...rest, scheduledAt },
      include: meetingInclude,
    });
    res.status(201).json(meeting);
  } catch (error) { next(error); }
});

router.put("/meetings/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const parsed = MeetingInput.partial().safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid meeting data", details: parsed.error.flatten().fieldErrors });
    const data: any = { ...parsed.data };
    if (data.scheduledAt) {
      const scheduledAt = new Date(data.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) return void res.status(400).json({ error: "A valid meeting date and time is required." });
      data.scheduledAt = scheduledAt;
    }
    const meeting = await prisma.meeting.update({ where: { id }, data, include: meetingInclude });
    res.json(meeting);
  } catch (error: any) {
    if (error?.code === "P2025") return void res.status(404).json({ error: "Meeting not found" });
    next(error);
  }
});

router.delete("/meetings/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.meeting.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") return void res.status(404).json({ error: "Meeting not found" });
    next(error);
  }
});

router.post("/meetings/:id/roster", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const meeting = await prisma.meeting.findUnique({ where: { id }, select: { id: true, groupKey: true } });
    if (!meeting) return void res.status(404).json({ error: "Meeting not found" });

    const assignments = await prisma.leadershipProfile.findMany({
      where: { category: meeting.groupKey, memberId: { not: null }, member: { status: "approved" } },
      orderBy: [{ tier: "asc" }, { member: { fullName: "asc" } }],
      select: { memberId: true, role: true, member: { select: { id: true, fullName: true } } },
    });

    const byMember = new Map<string, string[]>();
    for (const item of assignments) {
      if (!item.memberId) continue;
      const roles = byMember.get(item.memberId) || [];
      if (!roles.includes(item.role)) roles.push(item.role);
      byMember.set(item.memberId, roles);
    }

    await prisma.$transaction(Array.from(byMember.entries()).map(([memberId, roles]) => prisma.meetingAttendance.upsert({
      where: { meetingId_memberId: { meetingId: id, memberId } },
      update: { roleSnapshot: roles.join(" / ") },
      create: { meetingId: id, memberId, roleSnapshot: roles.join(" / "), status: "invited" },
    })));

    const refreshed = await prisma.meeting.findUnique({ where: { id }, include: meetingInclude });
    res.json({ meeting: refreshed });
  } catch (error) { next(error); }
});

router.put("/meetings/:id/attendance", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const rows = z.array(AttendanceInput).max(500).safeParse(req.body?.attendance || []);
    if (!rows.success) return void res.status(400).json({ error: "Invalid attendance data", details: rows.error.flatten().fieldErrors });
    const meeting = await prisma.meeting.findUnique({ where: { id }, select: { id: true } });
    if (!meeting) return void res.status(404).json({ error: "Meeting not found" });

    await prisma.$transaction(rows.data.map((row) => prisma.meetingAttendance.upsert({
      where: { meetingId_memberId: { meetingId: id, memberId: row.memberId } },
      update: { status: row.status, notes: row.notes || null, roleSnapshot: row.roleSnapshot || null },
      create: { meetingId: id, memberId: row.memberId, status: row.status, notes: row.notes || null, roleSnapshot: row.roleSnapshot || null },
    })));

    const refreshed = await prisma.meeting.update({
      where: { id },
      data: { status: "held" },
      include: meetingInclude,
    });
    res.json({ meeting: refreshed });
  } catch (error) { next(error); }
});

router.patch("/meetings/:id/publish-minutes", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const minutesBody = String(req.body?.minutesBody || "").trim();
    if (!minutesBody) return void res.status(400).json({ error: "Meeting minutes are required before publishing." });
    const meeting = await prisma.meeting.update({
      where: { id },
      data: { minutesBody, status: "published", minutesPublishedAt: new Date() },
      include: meetingInclude,
    });
    res.json(meeting);
  } catch (error: any) {
    if (error?.code === "P2025") return void res.status(404).json({ error: "Meeting not found" });
    next(error);
  }
});

router.get("/member-minutes", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const member = await prisma.member.findFirst({
      where: { status: "approved", OR: [
        ...(user?.id ? [{ authUserId: String(user.id) }] : []),
        ...(user?.email ? [{ email: { equals: String(user.email), mode: "insensitive" as const } }] : []),
      ] },
      select: { id: true },
    });
    if (!member) return void res.status(403).json({ error: "Approved membership is required." });

    const meetings = await prisma.meeting.findMany({
      where: { status: "published", minutesPublishedAt: { not: null } },
      orderBy: { scheduledAt: "desc" },
      select: { id: true, title: true, groupKey: true, meetingType: true, meetingNo: true, scheduledAt: true, venue: true, agenda: true, minutesBody: true, minutesPublishedAt: true, status: true, createdAt: true, updatedAt: true },
    });
    res.json({ meetings });
  } catch (error) { next(error); }
});

router.get("/member-history/:memberId", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = String(req.params.memberId);
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true, formNo: true, memberNo: true, fullName: true, createdAt: true, approvedAt: true, membershipType: true, status: true,
        leadershipProfiles: { orderBy: [{ category: "asc" }, { tier: "asc" }], select: { id: true, role: true, category: true, period: true, description: true } },
        meetingAttendances: { include: { meeting: { select: { id: true, title: true, groupKey: true, scheduledAt: true, status: true } } }, orderBy: { meeting: { scheduledAt: "desc" } } },
        businesses: { select: { id: true, businessName: true, category: true, status: true, createdAt: true } },
        matrimonials: { select: { id: true, status: true, applicantType: true, createdAt: true } },
      },
    });
    if (!member) return void res.status(404).json({ error: "Member not found" });
    res.json({ member });
  } catch (error) { next(error); }
});

export default router;
