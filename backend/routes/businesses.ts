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
  paymentSenderName: z.string().trim().max(180).optional(),
  paymentMethod: z.string().trim().max(80).optional(),
  paymentReference: z.string().trim().max(180).optional(),
});

const AdminBusinessSchema = BusinessSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]).optional().default("pending"),
  paymentStatus: z.enum(["pending", "submitted", "received", "verified", "rejected"]).optional().default("pending"),
  adminNote: z.string().max(1000).optional(),
});

function parsePhotos(value?: string | null) {
  try { return value ? JSON.parse(value) as string[] : []; } catch { return []; }
}

function packageAmount(pkg: string) {
  if (pkg === "vip") return 15000;
  if (pkg === "premium") return 5000;
  return 1000;
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
    const {
      paymentSenderName, paymentMethod, paymentReference,
      additionalPhotos = [], paymentProofUrl, ...businessFields
    } = req.body;

    if (!paymentProofUrl) return void res.status(400).json({ error: "Payment slip / receipt is required." });

    const created = await prisma.$transaction(async (tx: any) => {
      const newBusiness = await tx.business.create({
        data: {
          ...businessFields,
          paymentProofUrl,
          additionalPhotos: JSON.stringify(additionalPhotos),
          status: "pending",
          paymentStatus: "submitted",
        },
      });
      const sourceKey = `business-registration:${newBusiness.id}`;
      const amount = packageAmount(String(newBusiness.sponsorshipPackage || "basic"));
      const senderName = String(paymentSenderName || "").trim() || newBusiness.ownerName;
      await tx.$executeRaw`
        INSERT INTO "PaymentSubmission" (
          "sourceType", "sourceRecordId", "sourceKey", "payerName", "senderName", "category", "amount", "currency",
          "paymentMethod", "transactionReference", "proofUrl", "supportingDocuments", "description", "status"
        ) VALUES (
          'business', ${newBusiness.id}, ${sourceKey}, ${newBusiness.ownerName}, ${senderName},
          ${`Business Directory ${newBusiness.sponsorshipPackage} Listing`}, ${amount}, 'PKR', ${paymentMethod || null}, ${paymentReference || null},
          ${paymentProofUrl}, ${JSON.stringify(additionalPhotos)}, 'Submitted with business registration; uploaded slip requires admin/finance verification before approval.', 'pending'
        )
        ON CONFLICT ("sourceKey") DO NOTHING
      `;
      return newBusiness;
    });

    res.status(201).json({ ...created, additionalPhotos: parsePhotos(created.additionalPhotos) });
  } catch (err) { next(err); }
});

router.post("/admin", requireWelfareAdmin, validate(AdminBusinessSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      paymentSenderName, paymentMethod, paymentReference,
      additionalPhotos = [], paymentProofUrl, status = "pending", paymentStatus = "pending", adminNote,
      ...businessFields
    } = req.body;

    // A manually created business cannot become finance-verified merely from the
    // directory screen. "received" records an admin/accounts visual check; only
    // the Finance Center may later set the source to "verified" and post a ledger receipt.
    const effectivePaymentStatus = paymentStatus === "verified" ? "received" : paymentStatus;
    if (status === "approved" && !["received", "verified"].includes(effectivePaymentStatus)) {
      return void res.status(409).json({ error: "An approved paid listing must have payment marked received first." });
    }

    const created = await prisma.$transaction(async (tx: any) => {
      const newBusiness = await tx.business.create({
        data: {
          ...businessFields,
          paymentProofUrl: paymentProofUrl || null,
          additionalPhotos: JSON.stringify(additionalPhotos),
          status,
          paymentStatus: effectivePaymentStatus,
          adminNote: adminNote || "Created manually by admin.",
        },
      });

      if (paymentProofUrl) {
        const sourceKey = `business-registration:${newBusiness.id}`;
        const amount = packageAmount(String(newBusiness.sponsorshipPackage || "basic"));
        const senderName = String(paymentSenderName || "").trim() || newBusiness.ownerName;
        await tx.$executeRaw`
          INSERT INTO "PaymentSubmission" (
            "sourceType", "sourceRecordId", "sourceKey", "payerName", "senderName", "category", "amount", "currency",
            "paymentMethod", "transactionReference", "proofUrl", "supportingDocuments", "description", "status"
          ) VALUES (
            'business', ${newBusiness.id}, ${sourceKey}, ${newBusiness.ownerName}, ${senderName},
            ${`Business Directory ${newBusiness.sponsorshipPackage} Listing`}, ${amount}, 'PKR', ${paymentMethod || null}, ${paymentReference || null},
            ${paymentProofUrl}, ${JSON.stringify(additionalPhotos)}, 'Business profile created manually by admin; uploaded proof retained for finance review.', 'pending'
          )
          ON CONFLICT ("sourceKey") DO NOTHING
        `;
      }
      return newBusiness;
    });

    res.status(201).json({ ...created, additionalPhotos: parsePhotos(created.additionalPhotos) });
  } catch (err) { next(err); }
});

router.patch("/:id/status", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, paymentStatus, adminNote } = req.body;
    const validStatuses = ["pending", "approved", "rejected"];
    const validPayments = ["pending", "submitted", "received", "verified", "rejected"];
    if (status && !validStatuses.includes(status)) return void res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    if (paymentStatus && !validPayments.includes(paymentStatus)) return void res.status(400).json({ error: `Invalid payment status. Must be one of: ${validPayments.join(", ")}` });

    const current = await prisma.business.findUnique({ where: { id }, select: { paymentStatus: true } });
    if (!current) return void res.status(404).json({ error: "Business not found" });

    let nextPaymentStatus = paymentStatus as string | undefined;
    // Backward compatibility: the legacy AdminPage Approve button sends
    // "verified". Convert that one-click directory approval to "received"
    // unless Finance has already verified the payment. This prevents a listing
    // admin from bypassing PaymentSubmission review / ledger posting.
    if (nextPaymentStatus === "verified" && current.paymentStatus !== "verified") {
      if (status === "approved") nextPaymentStatus = "received";
      else return void res.status(409).json({ error: "Final payment verification is completed from the Finance Verification queue." });
    }

    const effectivePayment = nextPaymentStatus || current.paymentStatus;
    if (status === "approved" && !["received", "verified"].includes(effectivePayment)) {
      return void res.status(409).json({ error: "Review the uploaded payment slip and mark it received before approving this business listing." });
    }

    const updated = await prisma.business.update({ where: { id }, data: { status, paymentStatus: nextPaymentStatus, adminNote } });
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
    const { paymentSenderName, paymentMethod, paymentReference, ...editable } = req.body as any;
    const data = { ...editable } as any;
    if (Array.isArray(data.additionalPhotos)) data.additionalPhotos = JSON.stringify(data.additionalPhotos);
    const updated = await prisma.business.update({ where: { id }, data });
    const after = [updated.logoUrl, updated.paymentProofUrl, ...parsePhotos(updated.additionalPhotos)];
    await cleanupRemovedFiles(before, after);

    if (updated.paymentProofUrl && String(updated.paymentStatus || "").toLowerCase() !== "verified") {
      await prisma.$executeRaw`
        UPDATE "PaymentSubmission"
        SET "senderName" = COALESCE(${paymentSenderName || null}, "senderName"),
            "paymentMethod" = COALESCE(${paymentMethod || null}, "paymentMethod"),
            "transactionReference" = COALESCE(${paymentReference || null}, "transactionReference"),
            "proofUrl" = ${updated.paymentProofUrl},
            "supportingDocuments" = ${updated.additionalPhotos || "[]"},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "sourceType" = 'business' AND "sourceRecordId" = ${id} AND "status" = 'pending'
      `;
    }
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
