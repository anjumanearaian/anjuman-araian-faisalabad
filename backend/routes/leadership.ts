import express, { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

// ─── Get Leadership Profiles ──────────────────────────────────────────────────
router.get("/profiles", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await prisma.leadershipProfile.findMany({
      orderBy: [
        { tier: "asc" },
        { name: "asc" }
      ]
    });
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

// ─── Create Leadership Profile (Admin Only) ───────────────────────────────────
router.post("/profiles", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    
    if (Array.isArray(payload)) {
      await prisma.leadershipProfile.createMany({
        data: payload.map(item => ({
          name: item.name,
          role: item.role,
          tier: parseInt(item.tier) || 2,
          city: item.city,
          category: item.category || "cabinet",
          image: item.image,
          period: item.period,
          description: item.description,
        })) as any
      });
      res.json({ message: "Bulk profiles created successfully" });
      return;
    }

    const newProfile = await prisma.leadershipProfile.create({
      data: {
        name: payload.name,
        role: payload.role,
        tier: payload.tier !== undefined && !isNaN(parseInt(payload.tier)) ? parseInt(payload.tier) : 2,
        city: payload.city,
        category: payload.category || "cabinet",
        image: payload.image,
        period: payload.period,
        description: payload.description,
      } as any,
    });

    res.status(201).json(newProfile);
  } catch (err) {
    next(err);
  }
});

// ─── Update Leadership Profile (Admin Only) ───────────────────────────────────
router.put("/profiles/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const payload = req.body;
    
    const updatedProfile = await prisma.leadershipProfile.update({
      where: { id },
      data: {
        name: payload.name,
        role: payload.role,
        tier: payload.tier !== undefined && !isNaN(parseInt(payload.tier)) ? parseInt(payload.tier) : 2,
        city: payload.city,
        category: payload.category || "cabinet",
        image: payload.image,
        period: payload.period,
        description: payload.description,
      } as any,
    });

    res.json(updatedProfile);
  } catch (err) {
    next(err);
  }
});

// ─── Delete Leadership Profile (Admin Only) ───────────────────────────────────
router.delete("/profiles/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.leadershipProfile.delete({ where: { id } });
    res.json({ message: "Profile deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// ─── Get Leadership Messages ──────────────────────────────────────────────────
router.get("/messages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = await prisma.leadershipMessage.findMany();
    // Parse attributes from JSON string
    const formattedMessages = messages.map((msg: any) => ({
      ...msg,
      attributes: msg.attributes ? JSON.parse(msg.attributes) : []
    }));
    res.json(formattedMessages);
  } catch (err) {
    next(err);
  }
});

// ─── Update Leadership Message (Admin Only) ───────────────────────────────────
router.put("/messages/:type", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = String(req.params.type);
    const payload = req.body;
    
    const updatedMessage = await prisma.leadershipMessage.upsert({
      where: { type },
      update: {
        name: payload.name,
        body: payload.body,
        photo: payload.photo,
        attributes: payload.attributes ? JSON.stringify(payload.attributes) : null,
      } as any,
      create: {
        type,
        name: payload.name,
        body: payload.body,
        photo: payload.photo,
        attributes: payload.attributes ? JSON.stringify(payload.attributes) : null,
      } as any
    });

    res.json({
      ...updatedMessage,
      attributes: (updatedMessage as any).attributes ? JSON.parse((updatedMessage as any).attributes) : []
    });
  } catch (err) {
    next(err);
  }
});

export default router;
