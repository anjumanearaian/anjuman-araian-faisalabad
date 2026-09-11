import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import prisma from "../lib/prisma";
import { requireWelfareAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { cleanupRemovedFiles } from "../lib/fileCleanup";

const router = Router();

const storedFileUrl = z.string().refine(
  (value) => value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/") || value.startsWith("/api/files/"),
  { message: "Must be a valid uploaded file URL" }
);

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
  sponsorshipPackage: z.enum(["basic", "premium", "vip"]).optional().default("basic"),
  logoUrl: storedFileUrl.nullable().optional(),
  paymentProofUrl: storedFileUrl.nullable().optional(),
  additionalPhotos: z.array(storedFileUrl).optional().default([]),
});

function parsePhotos(value?: string | null) {
  try { return value ? JSON.parse(value) as string[] : []; } catch { return []; }
}

router.get("/", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));
    const [businesses, total] = await Promise.all([
      prisma.business.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.business.count(),
    ]);
    res.json({ businesses: businesses.map(b => ({ ...b, additionalPhotos: parsePhotos(b.additionalPhotos) })), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get("/published", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));
    const [businesses, total] = await Promise.all([
      prisma.business.findMany({ where: { status: "approved" }, skip: (page - 1) * limit, take: limit, orderBy: [{ sponsorshipPackage: "desc" }, { createdAt: "desc" }] }),
      prisma.business.count({ where: { status: "approved" } }),
    ]);
    const formatted = businesses.map(b => {
      const { paymentProofUrl, adminNote, paymentStatus, ...safe } = b;
      return { ...safe, additionalPhotos: parsePhotos(b.additionalPhotos) };
    });
    res.json({ businesses: formatted, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.post("/submit", validate(BusinessSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body, additionalPhotos: JSON.stringify(req.body.additionalPhotos || []), status: "pending", paymentStatus: "pending" };
    const newBusiness = await prisma.business.create({ data });
    res.status(201).json({ ...newBusiness, additionalPhotos: parsePhotos(newBusiness.additionalPhotos) });
  } catch (err) { next(err); }
});

router.patch("/:id/status", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, paymentStatus, adminNote } = req.body;
    const validStatuses = ["pending", "approved", "rejected"];
    const validPayments = ["pending", "received", "verified", "rejected"];
    if (status && !validStatuses.includes(status)) return void res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    if (paymentStatus && !validPayments.includes(paymentStatus)) return void res.status(400).json({ error: `Invalid payment status. Must be one of: ${validPayments.join(", ")}` });

    const current = await prisma.business.findUnique({ where: { id }, select: { paymentStatus: true } });
    if (!current) return void res.status(404).json({ error: "Business not found" });
    const effectivePayment = paymentStatus || current.paymentStatus;
    if (status === "approved" && !["received", "verified"].includes(effectivePayment)) {
      return void res.status(409).json({ error: "Verify or record the payment before approving this business listing." });
    }

    const updated = await prisma.business.update({ where: { id }, data: { status, paymentStatus, adminNote } });
    res.json({ ...updated, additionalPhotos: parsePhotos(updated.additionalPhotos) });
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Business not found" });
    next(err);
  }
});

router.put("/:id", requireWelfareAdmin, validate(BusinessSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const previous = await prisma.business.findUnique({ where: { id }, select: { logoUrl: true, paymentProofUrl: true, additionalPhotos: true } });
    if (!previous) return void res.status(404).json({ error: "Business not found" });
    const before = [previous.logoUrl, previous.paymentProofUrl, ...parsePhotos(previous.additionalPhotos)];
    const data = { ...req.body } as any;
    if (Array.isArray(data.additionalPhotos)) data.additionalPhotos = JSON.stringify(data.additionalPhotos);
    const updated = await prisma.business.update({ where: { id }, data });
    const after = [updated.logoUrl, updated.paymentProofUrl, ...parsePhotos(updated.additionalPhotos)];
    await cleanupRemovedFiles(before, after);
    res.json({ ...updated, additionalPhotos: parsePhotos(updated.additionalPhotos) });
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Business not found" });
    next(err);
  }
});

router.delete("/:id", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const removed = await prisma.business.delete({ where: { id } });
    await cleanupRemovedFiles([removed.logoUrl, removed.paymentProofUrl, ...parsePhotos(removed.additionalPhotos)], []);
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Business not found" });
    next(err);
  }
});

export default router;
