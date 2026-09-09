import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { deleteManagedFileIfUnreferenced } from "../lib/fileCleanup";

const router = Router();
const ProfileSchema = z.object({
  memberId: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(150),
  role: z.string().min(2).max(150),
  city: z.string().max(100).default("Faisalabad"),
  tier: z.number().int().min(0).max(10).default(2),
  category: z.string().trim().min(2).max(100).default("cabinet"),
  image: z.string().max(3000).optional().nullable(),
  period: z.string().max(100).optional().nullable(),
  description: z.string().max(3000).optional().nullable(),
});
const MessageSchema = z.object({
  name: z.string().min(2).max(150).optional(), body: z.string().min(1).max(20000).optional(),
  photo: z.string().max(3000).optional().nullable(),
  attributes: z.array(z.object({ label: z.string().max(100), value: z.string().max(300) })).max(20).optional(),
});
const parseMessage = (item: any) => {
  let attributes: Array<{ label: string; value: string }> = [];
  try { attributes = item.attributes ? JSON.parse(item.attributes) : []; } catch { attributes = []; }
  return { ...item, attributes };
};

async function normalizeLinkedProfile(data: any) {
  let linkedMemberId = data.memberId ? String(data.memberId) : "";
  const historicalManualCategory = ["founder", "expresident"].includes(String(data.category || "").toLowerCase());

  // Current organizational positions must point back to the master Member row.
  // For compatibility with the older Admin Leadership form, an exact approved
  // member name is auto-linked. Typos/new duplicate person records are rejected.
  if (!linkedMemberId && !historicalManualCategory) {
    const exactMatches = await prisma.member.findMany({
      where: {
        status: "approved",
        fullName: { equals: String(data.name || "").trim(), mode: "insensitive" },
      },
      select: { id: true },
      take: 2,
    });
    if (exactMatches.length === 1) linkedMemberId = exactMatches[0].id;
    else {
      const error: any = new Error(
        exactMatches.length > 1
          ? "More than one approved member has this name. Assign the role from Member & Approval Center so the correct Member ID is used."
          : "Current leadership and committee roles must be assigned to an existing approved member from Member & Approval Center."
      );
      error.statusCode = 409;
      throw error;
    }
  }

  if (!linkedMemberId) return data;
  const member = await prisma.member.findUnique({
    where: { id: linkedMemberId },
    select: { id: true, status: true, fullName: true, city: true, photoUrl: true },
  });
  if (!member) {
    const error: any = new Error("Selected member was not found");
    error.statusCode = 404;
    throw error;
  }
  if (member.status !== "approved") {
    const error: any = new Error("Only approved members can be assigned to the Executive Committee or other leadership roles");
    error.statusCode = 409;
    throw error;
  }
  return {
    ...data,
    memberId: member.id,
    name: member.fullName,
    city: member.city || data.city || "Faisalabad",
    image: member.photoUrl || data.image || null,
  };
}

function publicProfile(item: any) {
  const linked = item.member;
  const { member, ...profile } = item;
  if (!linked) return profile;
  return { ...profile, name: linked.fullName || profile.name, city: linked.city || profile.city, image: linked.photoUrl || profile.image };
}

// Admin-only searchable source for assigning an existing master member to a leadership role.
// Sensitive fields are deliberately excluded from the response.
router.get("/member-options", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 1) return void res.json({ members: [] });

    const members = await prisma.member.findMany({
      where: {
        status: "approved",
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { memberNo: { contains: q, mode: "insensitive" } },
          { cnic: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { whatsapp: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { fullName: "asc" },
      take: 20,
      select: {
        id: true,
        memberNo: true,
        fullName: true,
        city: true,
        photoUrl: true,
        occupation: true,
        designation: true,
        membershipType: true,
      },
    });

    res.json({ members });
  } catch (error) { next(error); }
});

router.get("/profiles", async (_req, res, next) => {
  try {
    if (await prisma.leadershipProfile.count() === 0) {
      await prisma.leadershipProfile.createMany({ data: [
        { name: "Dr Ahsan-ul-Haq", role: "President", city: "Faisalabad", tier: 0, category: "cabinet", image: "/images/president.jpg" },
        { name: "Dr Mian Saqib Rahman", role: "General Secretary", city: "Faisalabad", tier: 1, category: "cabinet" },
      ] });
    }
    const rows = await prisma.leadershipProfile.findMany({ include: { member: { select: { id: true, fullName: true, city: true, photoUrl: true, status: true } } }, orderBy: [{ category: "asc" }, { tier: "asc" }, { name: "asc" }] });
    res.json(rows.map(publicProfile));
  } catch (error) { next(error); }
});

router.post("/profiles", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = Array.isArray(req.body) ? req.body : [req.body];
    const parsed = z.array(ProfileSchema).min(1).max(100).safeParse(input);
    if (!parsed.success) { res.status(400).json({ error: "Invalid leadership data", details: parsed.error.flatten().fieldErrors }); return; }
    const normalized = [];
    for (const row of parsed.data) normalized.push(await normalizeLinkedProfile(row));
    const created = await prisma.$transaction(normalized.map((data) => prisma.leadershipProfile.create({ data })));
    res.status(201).json(Array.isArray(req.body) ? created : created[0]);
  } catch (error: any) {
    if (error?.statusCode) { res.status(error.statusCode).json({ error: error.message }); return; }
    next(error);
  }
});

router.put("/profiles/:id", requireAdmin, validate(ProfileSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const previous = await prisma.leadershipProfile.findUnique({ where: { id }, select: { image: true, memberId: true, name: true, category: true, city: true } });
    const data = await normalizeLinkedProfile({
      name: previous?.name || "",
      city: previous?.city || "Faisalabad",
      category: previous?.category || "cabinet",
      memberId: previous?.memberId || null,
      ...req.body,
    });
    const updated = await prisma.leadershipProfile.update({ where: { id }, data });
    if (previous?.image && previous.image !== updated.image) await deleteManagedFileIfUnreferenced(previous.image);
    res.json(updated);
  } catch (error: any) {
    if (error?.statusCode) { res.status(error.statusCode).json({ error: error.message }); return; }
    if (error.code === "P2025") { res.status(404).json({ error: "Leadership profile not found" }); return; }
    next(error);
  }
});

router.delete("/profiles/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const removed = await prisma.leadershipProfile.delete({ where: { id: String(req.params.id) } });
    if (removed.image) await deleteManagedFileIfUnreferenced(removed.image);
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") { res.status(404).json({ error: "Leadership profile not found" }); return; }
    next(error);
  }
});

router.get("/messages", async (_req, res, next) => {
  try {
    await Promise.all([
      prisma.leadershipMessage.upsert({ where: { type: "president" }, update: {}, create: { type: "president", name: "Dr Ahsan-ul-Haq", body: "It is a privilege to serve the Araian community of Faisalabad. Our priorities are unity, welfare, education and transparent community service.", photo: "/images/president.jpg", attributes: "[]" } }),
      prisma.leadershipMessage.upsert({ where: { type: "secretary" }, update: {}, create: { type: "secretary", name: "Dr Mian Saqib Rahman", body: "We welcome members to participate in the Anjuman's welfare, educational and community programmes.", attributes: "[]" } }),
    ]);
    res.json((await prisma.leadershipMessage.findMany({ orderBy: { type: "asc" } })).map(parseMessage));
  } catch (error) { next(error); }
});

router.put("/messages/:type", requireAdmin, validate(MessageSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = String(req.params.type);
    if (!["president", "secretary"].includes(type)) { res.status(400).json({ error: "Message type must be president or secretary" }); return; }
    const previous = await prisma.leadershipMessage.findUnique({ where: { type }, select: { photo: true } });
    const data: any = { ...req.body };
    if (data.attributes) data.attributes = JSON.stringify(data.attributes);
    const defaults = type === "president" ? { name: "Dr Ahsan-ul-Haq", body: "Welcome to Anjuman-e-Araian Faisalabad." } : { name: "Dr Mian Saqib Rahman", body: "We are committed to serving our community." };
    const message = await prisma.leadershipMessage.upsert({ where: { type }, update: data, create: { type, ...defaults, ...data } });
    if (previous?.photo && previous.photo !== message.photo) await deleteManagedFileIfUnreferenced(previous.photo);
    res.json(parseMessage(message));
  } catch (error) { next(error); }
});

export default router;
