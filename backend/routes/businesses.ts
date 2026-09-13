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

const optionalStoredFileUrl = z.preprocess(
  (value) => typeof value === "string" && !value.trim() ? undefined : value,
  storedFileUrl.nullable().optional(),
);

const BusinessSchema = z.object({
  businessName: z.string().trim().min(2).max(150),
  ownerName: z.string().trim().min(2).max(100),
  category: z.string().trim().min(1).max(100),
  city: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(300),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{10,20}$/, "Invalid phone number"),
  whatsapp: z.string().trim().optional().default(""),
  email: z.string().trim().email().optional().or(z.literal("")).default(""),
  website: z.string().trim().url().optional().or(z.literal("")).default(""),
  socialLinks: z.string().trim().optional().default(""),
  productsServices: z.string().trim().max(1000).optional().default(""),
  discountOffer: z.string().trim().max(500).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  sponsorshipPackage: z.enum(["basic", "premium", "vip"]).optional().default("basic"),
  logoUrl: optionalStoredFileUrl,
  paymentProofUrl: optionalStoredFileUrl,
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

function financeGuardMessage(error: any) {
  const message = String(error?.message || "");
  if (/Finance approval|payment proof/i.test(message) && /payment status|verification/i.test(message)) {
    return "Final payment verification is completed only from Finance Verification after the payment proof is approved.";
  }
  return "";
}

function clientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) return forwarded[0]?.split(",")[0]?.trim() || req.ip || null;
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || req.ip || null;
  return req.ip || null;
}

async function auditBusiness(
  tx: any,
  req: Request,
  businessId: string,
  action: string,
  beforeData?: any,
  afterData?: any,
) {
  const user = (req as any).user || null;
  const actorId = user?.id ? String(user.id) : null;
  const actorRole = user?.role ? String(user.role) : "public";
  const actorName = user ? `Admin (${actorRole})` : "Public submitter";
  const beforeJson = beforeData ? JSON.stringify(beforeData) : null;
  const afterJson = afterData ? JSON.stringify(afterData) : null;
  await tx.$executeRaw`
    INSERT INTO "BusinessAuditLog" (
      "businessId", "action", "actorId", "actorName", "actorRole", "ipAddress", "userAgent", "beforeData", "afterData"
    ) VALUES (
      ${businessId}, ${action}, ${actorId}, ${actorName}, ${actorRole}, ${clientIp(req)}, ${req.get("user-agent") || null},
      ${beforeJson}::jsonb, ${afterJson}::jsonb
    )
  `;
}

async function syncBusinessPaymentSubmission(tx: any, business: any, params: {
  paymentSenderName?: string;
  paymentMethod?: string;
  paymentReference?: string;
  supportingDocuments?: string[];
  resubmitRejected?: boolean;
}) {
  if (!business.paymentProofUrl) return;

  const sourceKey = `business-registration:${business.id}`;
  const amount = packageAmount(String(business.sponsorshipPackage || "basic"));
  const senderName = String(params.paymentSenderName || "").trim() || business.ownerName;
  const documents = JSON.stringify(params.supportingDocuments || parsePhotos(business.additionalPhotos));
  const existing = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status" FROM "PaymentSubmission"
    WHERE "sourceKey" = ${sourceKey}
    LIMIT 1
  `;

  if (!existing.length) {
    await tx.$executeRaw`
      INSERT INTO "PaymentSubmission" (
        "sourceType", "sourceRecordId", "sourceKey", "payerName", "senderName", "category", "amount", "currency",
        "paymentMethod", "transactionReference", "proofUrl", "supportingDocuments", "description", "status"
      ) VALUES (
        'business', ${business.id}, ${sourceKey}, ${business.businessName}, ${senderName},
        ${`Business Directory ${business.sponsorshipPackage} Listing`}, ${amount}, 'PKR', ${params.paymentMethod || null}, ${params.paymentReference || null},
        ${business.paymentProofUrl}, ${documents}, 'Business Directory payment proof awaiting Finance Verification.', 'pending'
      )
    `;
    return;
  }

  const queueStatus = String(existing[0].status || "").toLowerCase();
  if (queueStatus === "approved") return;
  if (queueStatus === "rejected" && !params.resubmitRejected) return;

  await tx.$executeRaw`
    UPDATE "PaymentSubmission"
    SET "payerName" = ${business.businessName},
        "senderName" = ${senderName},
        "category" = ${`Business Directory ${business.sponsorshipPackage} Listing`},
        "amount" = ${amount},
        "paymentMethod" = COALESCE(${params.paymentMethod || null}, "paymentMethod"),
        "transactionReference" = COALESCE(${params.paymentReference || null}, "transactionReference"),
        "proofUrl" = ${business.paymentProofUrl},
        "supportingDocuments" = ${documents},
        "description" = 'Business Directory payment proof awaiting Finance Verification.',
        "status" = 'pending',
        "reviewedByAdminId" = NULL,
        "reviewedByName" = NULL,
        "reviewedByRole" = NULL,
        "reviewedAt" = NULL,
        "reviewNote" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "sourceKey" = ${sourceKey}
      AND "status" <> 'approved'
  `;
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

router.get("/:id/audit", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const exists = await prisma.business.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return void res.status(404).json({ error: "Business not found" });
    const rows = await prisma.$queryRaw<any[]>`
      SELECT "id", "businessId", "action", "actorId", "actorName", "actorRole", "ipAddress", "userAgent", "beforeData", "afterData", "createdAt"
      FROM "BusinessAuditLog"
      WHERE "businessId" = ${id}
      ORDER BY "createdAt" DESC
      LIMIT 200
    `;
    res.json(rows);
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
      await syncBusinessPaymentSubmission(tx, newBusiness, { paymentSenderName, paymentMethod, paymentReference, supportingDocuments: additionalPhotos });
      await auditBusiness(tx, req, newBusiness.id, "public_submitted", null, newBusiness);
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

    const effectivePaymentStatus = paymentStatus === "verified" ? "received" : paymentStatus;
    if (status === "approved" && effectivePaymentStatus !== "received") {
      return void res.status(409).json({ error: "For an approved listing, payment must be Received / Admin Checked. Finance verification remains separate." });
    }
    if (status === "approved" && !paymentProofUrl) {
      return void res.status(409).json({ error: "Upload a payment slip, receipt or cash receipt before approving the listing so Accounts can verify it." });
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
      await syncBusinessPaymentSubmission(tx, newBusiness, { paymentSenderName, paymentMethod, paymentReference, supportingDocuments: additionalPhotos });
      await auditBusiness(tx, req, newBusiness.id, "admin_created", null, newBusiness);
      return newBusiness;
    });

    res.status(201).json({ ...created, additionalPhotos: parsePhotos(created.additionalPhotos) });
  } catch (err: any) {
    const guarded = financeGuardMessage(err);
    if (guarded) return void res.status(409).json({ error: guarded });
    next(err);
  }
});

router.patch("/:id/status", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, paymentStatus, adminNote } = req.body;
    const validStatuses = ["pending", "approved", "rejected"];
    const validPayments = ["pending", "submitted", "received", "verified", "rejected"];
    if (status && !validStatuses.includes(status)) return void res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    if (paymentStatus && !validPayments.includes(paymentStatus)) return void res.status(400).json({ error: `Invalid payment status. Must be one of: ${validPayments.join(", ")}` });

    const current = await prisma.business.findUnique({ where: { id } });
    if (!current) return void res.status(404).json({ error: "Business not found" });

    let nextPaymentStatus = paymentStatus as string | undefined;
    if (nextPaymentStatus === "verified" && current.paymentStatus !== "verified") {
      if (status === "approved") nextPaymentStatus = "received";
      else return void res.status(409).json({ error: "Final payment verification is completed from the Finance Verification queue." });
    }

    const effectivePayment = nextPaymentStatus || current.paymentStatus;
    if (status === "approved" && !["received", "verified"].includes(effectivePayment)) {
      return void res.status(409).json({ error: "Review the uploaded payment slip and mark it Received / Admin Checked before approving this business listing." });
    }
    if (status === "approved" && !current.paymentProofUrl) {
      return void res.status(409).json({ error: "A payment slip/receipt is required before approving this listing so it remains linked to Finance Verification." });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const row = await tx.business.update({ where: { id }, data: { status, paymentStatus: nextPaymentStatus, adminNote } });
      await auditBusiness(tx, req, id, "status_changed", current, row);
      return row;
    });
    res.json({ ...updated, additionalPhotos: parsePhotos(updated.additionalPhotos) });
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Business not found" });
    const guarded = financeGuardMessage(err);
    if (guarded) return void res.status(409).json({ error: guarded });
    next(err);
  }
});

router.put("/:id", requireWelfareAdmin, validate(BusinessSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const previous = await prisma.business.findUnique({ where: { id } });
    if (!previous) return void res.status(404).json({ error: "Business not found" });
    const beforeFiles = [previous.logoUrl, previous.paymentProofUrl, ...parsePhotos(previous.additionalPhotos)];
    const { paymentSenderName, paymentMethod, paymentReference, ...editable } = req.body as any;
    const data = { ...editable } as any;
    if (Array.isArray(data.additionalPhotos)) data.additionalPhotos = JSON.stringify(data.additionalPhotos);

    const proofChanged = Object.prototype.hasOwnProperty.call(data, "paymentProofUrl") && data.paymentProofUrl !== previous.paymentProofUrl;
    if (proofChanged) {
      const approvedQueue = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "PaymentSubmission"
        WHERE "sourceType" = 'business' AND "sourceRecordId" = ${id} AND "status" = 'approved'
        LIMIT 1
      `;
      if (approvedQueue.length) {
        return void res.status(409).json({ error: "This payment proof is already Finance Verified and locked. Create a new financial adjustment/record through Finance instead of replacing the approved proof." });
      }
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const row = await tx.business.update({ where: { id }, data });
      await syncBusinessPaymentSubmission(tx, row, {
        paymentSenderName,
        paymentMethod,
        paymentReference,
        supportingDocuments: parsePhotos(row.additionalPhotos),
        resubmitRejected: Boolean(proofChanged || paymentSenderName || paymentMethod || paymentReference),
      });
      await auditBusiness(tx, req, id, "profile_updated", previous, row);
      return row;
    });

    const afterFiles = [updated.logoUrl, updated.paymentProofUrl, ...parsePhotos(updated.additionalPhotos)];
    await cleanupRemovedFiles(beforeFiles, afterFiles);
    res.json({ ...updated, additionalPhotos: parsePhotos(updated.additionalPhotos) });
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Business not found" });
    const guarded = financeGuardMessage(err);
    if (guarded) return void res.status(409).json({ error: guarded });
    next(err);
  }
});

router.delete("/:id", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) return void res.status(404).json({ error: "Business not found" });

    const paymentRows = await prisma.$queryRaw<Array<{ status: string }>>`
      SELECT "status" FROM "PaymentSubmission"
      WHERE "sourceType" = 'business' AND "sourceRecordId" = ${id}
    `;
    if (paymentRows.some((row) => String(row.status).toLowerCase() === "approved")) {
      return void res.status(409).json({ error: "This business has a Finance-approved payment and cannot be deleted. Reject/archive the listing instead so the accounts audit trail is preserved." });
    }

    const removed = await prisma.$transaction(async (tx: any) => {
      await auditBusiness(tx, req, id, "business_deleted", existing, null);
      await tx.$executeRaw`
        DELETE FROM "PaymentSubmission"
        WHERE "sourceType" = 'business' AND "sourceRecordId" = ${id} AND "status" <> 'approved'
      `;
      return tx.business.delete({ where: { id } });
    });
    await cleanupRemovedFiles([removed.logoUrl, removed.paymentProofUrl, ...parsePhotos(removed.additionalPhotos)], []);
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Business not found" });
    next(err);
  }
});

export default router;
