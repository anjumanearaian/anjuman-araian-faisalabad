import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const storedFileUrl = z.string().refine(
  (value) => value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/"),
  { message: "Must be a valid uploaded file URL" }
);

// ─── Validation Schema ────────────────────────────────────────────────────────
const BusinessSchema = z.object({
  businessName: z.string().min(2).max(150),
  ownerName: z.string().min(2).max(100),
  category: z.string().min(1).max(100),
  city: z.string().min(2).max(100),
  address: z.string().min(5).max(300),
  phone: z.string().regex(/^\+?[0-9\s-]{10,20}$/, "Invalid phone number"),
  whatsapp: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  website: z.string().url().optional().or(z.literal("")).default(""),
  socialLinks: z.string().optional().default(""),
  productsServices: z.string().max(1000).optional().default(""),
  discountOffer: z.string().max(500).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  sponsorshipPackage: z.string().optional().default(""),
  logoUrl: storedFileUrl.nullable().optional(),
  paymentProofUrl: storedFileUrl.nullable().optional(),
  additionalPhotos: z.array(storedFileUrl).optional().default([]),
});

// ─── Get All Businesses — Admin Only ─────────────────────────────────────────
router.get("/", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.business.count(),
    ]);

    const formatted = businesses.map(b => ({
      ...b,
      additionalPhotos: b.additionalPhotos ? JSON.parse(b.additionalPhotos as string) : [],
    }));

    res.json({ businesses: formatted, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ─── Get Approved Businesses — Public Directory ───────────────────────────────
router.get("/published", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where: { status: "approved" },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.business.count({ where: { status: "approved" } }),
    ]);

    const formatted = businesses.map(b => {
      const { paymentProofUrl, adminNote, paymentStatus, ...safe } = b;
      return {
        ...safe,
        additionalPhotos: b.additionalPhotos ? JSON.parse(b.additionalPhotos as string) : [],
      };
    });

    res.json({ businesses: formatted, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ─── Submit New Business ──────────────────────────────────────────────────────
router.post("/submit", validate(BusinessSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body, additionalPhotos: JSON.stringify(req.body.additionalPhotos || []) };
    const newBusiness = await prisma.business.create({ data });
    res.status(201).json({ ...newBusiness, additionalPhotos: JSON.parse(newBusiness.additionalPhotos || "[]") });
  } catch (err) {
    next(err);
  }
});

// ─── Update Business Status — Admin Only ─────────────────────────────────────
router.patch("/:id/status", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, paymentStatus, adminNote } = req.body;

    const validStatuses = ["pending", "approved", "rejected"];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const updated = await prisma.business.update({
      where: { id },
      data: { status, paymentStatus, adminNote },
    });

    res.json({ ...updated, additionalPhotos: JSON.parse(updated.additionalPhotos || "[]") });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    next(err);
  }
});

// ─── Update Business — Member/Admin ───────────────────────────────────────────
router.put("/:id", requireAdmin, validate(BusinessSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const data = { ...req.body };
    if (data.additionalPhotos) {
      data.additionalPhotos = JSON.stringify(data.additionalPhotos);
    }
    const updated = await prisma.business.update({
      where: { id },
      data,
    });
    res.json({ ...updated, additionalPhotos: JSON.parse(updated.additionalPhotos || "[]") });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    next(err);
  }
});

// ─── Delete Business — Admin Only ─────────────────────────────────────────────
router.delete("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.business.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    next(err);
  }
});

export default router;
