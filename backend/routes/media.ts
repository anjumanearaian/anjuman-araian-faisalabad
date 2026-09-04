import express, { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

// ─── Get Media (Public) ──────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));
    
    let where: any = {};
    if (req.query.type) {
      where.type = String(req.query.type);
    }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.media.count({ where }),
    ]);

    res.json({
      media,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── Create Media (Admin Only) ───────────────────────────────────────────
router.post("/", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    
    // Support bulk create if body is an array
    if (Array.isArray(payload)) {
      await prisma.media.createMany({
        data: payload.map(item => ({
          type: item.type || "photo",
          title: item.title,
          caption: item.caption,
          date: item.date || new Date().toISOString().split("T")[0],
          url: item.url
        }))
      });
      res.json({ message: "Bulk media created successfully" });
      return;
    }

    const newMedia = await prisma.media.create({
      data: {
        type: payload.type || "photo",
        title: payload.title,
        caption: payload.caption,
        date: payload.date || new Date().toISOString().split("T")[0],
        url: payload.url,
      },
    });

    res.status(201).json(newMedia);
  } catch (err) {
    next(err);
  }
});

// ─── Update Media (Admin Only) ───────────────────────────────────────────
router.put("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const payload = req.body;
    
    const updatedMedia = await prisma.media.update({
      where: { id },
      data: {
        type: payload.type,
        title: payload.title,
        caption: payload.caption,
        date: payload.date,
        url: payload.url,
      },
    });

    res.json(updatedMedia);
  } catch (err) {
    next(err);
  }
});

// ─── Delete Media (Admin Only) ───────────────────────────────────────────
router.delete("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.media.delete({ where: { id } });
    res.json({ message: "Media deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
