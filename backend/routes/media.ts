import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
const MediaSchema = z.object({
  type: z.enum(["photo", "video"]),
  title: z.string().min(2).max(200),
  caption: z.string().max(1000).optional().nullable(),
  date: z.string().min(1),
  url: z.string().min(1).max(3000),
});
const serialize = (item: any) => ({ ...item, caption: item.caption || "" });

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
    const type = req.query.type ? String(req.query.type) : undefined;
    const where = type === "photo" || type === "video" ? { type } : {};
    const [media, total] = await Promise.all([
      prisma.media.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
      prisma.media.count({ where }),
    ]);
    res.json({ media: media.map(serialize), pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasMore: page * limit < total } });
  } catch (error) { next(error); }
});

router.post("/", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = Array.isArray(req.body) ? req.body : [req.body];
    const parsed = z.array(MediaSchema).min(1).max(50).safeParse(input);
    if (!parsed.success) { res.status(400).json({ error: "Invalid media data", details: parsed.error.flatten().fieldErrors }); return; }
    const created = await prisma.$transaction(parsed.data.map((data) => prisma.media.create({ data })));
    res.status(201).json(Array.isArray(req.body) ? created.map(serialize) : serialize(created[0]));
  } catch (error) { next(error); }
});

router.put("/:id", requireAdmin, validate(MediaSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(serialize(await prisma.media.update({ where: { id: String(req.params.id) }, data: req.body }))); }
  catch (error: any) { if (error.code === "P2025") { res.status(404).json({ error: "Media item not found" }); return; } next(error); }
});

router.delete("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try { await prisma.media.delete({ where: { id: String(req.params.id) } }); res.json({ success: true }); }
  catch (error: any) { if (error.code === "P2025") { res.status(404).json({ error: "Media item not found" }); return; } next(error); }
});

export default router;
