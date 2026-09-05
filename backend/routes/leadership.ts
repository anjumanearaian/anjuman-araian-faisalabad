import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
const ProfileSchema = z.object({
  name: z.string().min(2).max(150), role: z.string().min(2).max(150),
  city: z.string().max(100).default("Faisalabad"), tier: z.number().int().min(0).max(10).default(2),
  category: z.enum(["cabinet", "executive", "advisory", "founder", "expresident"]),
  image: z.string().max(3000).optional().nullable(), period: z.string().max(100).optional().nullable(),
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

router.get("/profiles", async (_req, res, next) => {
  try {
    if (await prisma.leadershipProfile.count() === 0) {
      await prisma.leadershipProfile.createMany({ data: [
        { name: "Dr Ahsan-ul-Haq", role: "President", city: "Faisalabad", tier: 0, category: "cabinet", image: "/images/president.jpg" },
        { name: "Dr Mian Saqib Rahman", role: "General Secretary", city: "Faisalabad", tier: 1, category: "cabinet" },
      ] });
    }
    res.json(await prisma.leadershipProfile.findMany({ orderBy: [{ category: "asc" }, { tier: "asc" }, { name: "asc" }] }));
  }
  catch (error) { next(error); }
});
router.post("/profiles", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = Array.isArray(req.body) ? req.body : [req.body];
    const parsed = z.array(ProfileSchema).min(1).max(100).safeParse(input);
    if (!parsed.success) { res.status(400).json({ error: "Invalid leadership data", details: parsed.error.flatten().fieldErrors }); return; }
    const created = await prisma.$transaction(parsed.data.map((data) => prisma.leadershipProfile.create({ data })));
    res.status(201).json(Array.isArray(req.body) ? created : created[0]);
  } catch (error) { next(error); }
});
router.put("/profiles/:id", requireAdmin, validate(ProfileSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await prisma.leadershipProfile.update({ where: { id: String(req.params.id) }, data: req.body })); }
  catch (error: any) { if (error.code === "P2025") { res.status(404).json({ error: "Leadership profile not found" }); return; } next(error); }
});
router.delete("/profiles/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try { await prisma.leadershipProfile.delete({ where: { id: String(req.params.id) } }); res.json({ success: true }); }
  catch (error: any) { if (error.code === "P2025") { res.status(404).json({ error: "Leadership profile not found" }); return; } next(error); }
});

router.get("/messages", async (_req, res, next) => {
  try {
    await Promise.all([
      prisma.leadershipMessage.upsert({ where: { type: "president" }, update: {}, create: { type: "president", name: "Dr Ahsan-ul-Haq", body: "It is a privilege to serve the Araian community of Faisalabad. Our priorities are unity, welfare, education and transparent community service.", photo: "/images/president.jpg", attributes: "[]" } }),
      prisma.leadershipMessage.upsert({ where: { type: "secretary" }, update: {}, create: { type: "secretary", name: "Dr Mian Saqib Rahman", body: "We welcome members to participate in the Anjuman's welfare, educational and community programmes.", attributes: "[]" } }),
    ]);
    res.json((await prisma.leadershipMessage.findMany({ orderBy: { type: "asc" } })).map(parseMessage));
  }
  catch (error) { next(error); }
});
router.put("/messages/:type", requireAdmin, validate(MessageSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = String(req.params.type);
    if (!['president', 'secretary'].includes(type)) { res.status(400).json({ error: "Message type must be president or secretary" }); return; }
    const data: any = { ...req.body };
    if (data.attributes) data.attributes = JSON.stringify(data.attributes);
    const defaults = type === "president"
      ? { name: "Dr Ahsan-ul-Haq", body: "Welcome to Anjuman-e-Araian Faisalabad." }
      : { name: "Dr Mian Saqib Rahman", body: "We are committed to serving our community." };
    const message = await prisma.leadershipMessage.upsert({ where: { type }, update: data, create: { type, ...defaults, ...data } });
    res.json(parseMessage(message));
  } catch (error) { next(error); }
});

export default router;
