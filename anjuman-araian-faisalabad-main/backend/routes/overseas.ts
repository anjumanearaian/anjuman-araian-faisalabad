import express, { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

// ─── Get Overseas Chapters (Public) ───────────────────────────────────────
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapters = await prisma.overseasChapter.findMany({
      orderBy: { country: "asc" },
    });
    res.json(chapters);
  } catch (err) {
    next(err);
  }
});

// ─── Create Overseas Chapter (Admin Only) ─────────────────────────────────
router.post("/", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    
    // Support bulk create if body is an array
    if (Array.isArray(payload)) {
      await prisma.overseasChapter.createMany({
        data: payload.map(item => ({
          country: item.country,
          flag: item.flag,
          city: item.city,
          established: item.established,
          coordinator: item.coordinator,
          phone: item.phone,
          email: item.email,
          members: parseInt(item.members) || 0
        }))
      });
      res.json({ message: "Bulk chapters created successfully" });
      return;
    }

    const newChapter = await prisma.overseasChapter.create({
      data: {
        country: payload.country,
        flag: payload.flag,
        city: payload.city,
        established: payload.established,
        coordinator: payload.coordinator,
        phone: payload.phone,
        email: payload.email,
        members: parseInt(payload.members) || 0,
      },
    });

    res.status(201).json(newChapter);
  } catch (err) {
    next(err);
  }
});

// ─── Update Overseas Chapter (Admin Only) ─────────────────────────────────
router.put("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const payload = req.body;
    
    const updatedChapter = await prisma.overseasChapter.update({
      where: { id },
      data: {
        country: payload.country,
        flag: payload.flag,
        city: payload.city,
        established: payload.established,
        coordinator: payload.coordinator,
        phone: payload.phone,
        email: payload.email,
        members: parseInt(payload.members) || 0,
      },
    });

    res.json(updatedChapter);
  } catch (err) {
    next(err);
  }
});

// ─── Delete Overseas Chapter (Admin Only) ─────────────────────────────────
router.delete("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.overseasChapter.delete({ where: { id } });
    res.json({ message: "Overseas Chapter deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
