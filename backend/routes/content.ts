import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────
const ContentSchema = z.object({
  type: z.enum(["news", "event"]),
  title: z.string().min(2).max(300),
  body: z.string().min(10).max(10000),
  date: z.string().min(1),
  time: z.string().nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  category: z.string().min(1).max(100).default("General"),
  status: z.enum(["draft", "published", "rejected"]).default("draft"),
  images: z.array(z.string()).optional().default([]),
});

const ContentUpdateSchema = ContentSchema.partial(); // All fields optional for update

// ─── Get All Content — Admin Only ─────────────────────────────────────────────
router.get("/", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));
    const type = req.query.type ? String(req.query.type) : undefined;

    const where = type ? { type } : {};

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
      }),
      prisma.content.count({ where }),
    ]);

    const parsedContent = content.map((c: any) => {
      let images = [];
      try { images = c.images ? JSON.parse(c.images) : []; } catch(e) {}
      return { ...c, images };
    });

    res.json({ content: parsedContent, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ─── Get Published Content — Public ──────────────────────────────────────────
router.get("/published", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));
    const type = req.query.type ? String(req.query.type) : undefined;

    const where: any = { status: "published" };
    if (type) where.type = type;

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
      }),
      prisma.content.count({ where }),
    ]);

    const parsedContent = content.map((c: any) => {
      let images = [];
      try { images = c.images ? JSON.parse(c.images) : []; } catch(e) {}
      return { ...c, images };
    });

    res.json({ content: parsedContent, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ─── Create New Content — Admin Only ─────────────────────────────────────────
router.post("/", requireAdmin, validate(ContentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body };
    if (data.images) data.images = JSON.stringify(data.images);
    
    const newContent = await prisma.content.create({ data });
    res.status(201).json(newContent);
  } catch (err) {
    next(err);
  }
});

// ─── Update Content — Admin Only ─────────────────────────────────────────────
router.put("/:id", requireAdmin, validate(ContentUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const data = { ...req.body };
    if (data.images) data.images = JSON.stringify(data.images);

    const updated = await prisma.content.update({
      where: { id },
      data,
    });
    res.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Content not found" });
      return;
    }
    next(err);
  }
});

// ─── Delete Content — Admin Only ─────────────────────────────────────────────
router.delete("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.content.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Content not found" });
      return;
    }
    next(err);
  }
});

export default router;
