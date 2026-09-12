import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireFinanceAdmin, requireSuperAdmin } from "../middleware/auth";
import { createFinanceDocumentPdf } from "../lib/financeDocumentPdf";

const router = Router();

const StoredFileUrl = z.string().trim().min(1).max(2000).refine(
  (value) => value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/") || value.startsWith("/api/files/"),
  { message: "A valid uploaded proof/document URL is required." },
);

const TransactionSchema = z.object({
  type: z.enum(["revenue", "expense", "adjustment"]),
  direction: z.enum(["credit", "debit"]).optional(),
  memberId: z.string().uuid().nullable().optional(),
  partyName: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(120),
  amount: z.coerce.number().positive().max(1000000000),
  paymentMethod: z.string().max(80).nullable().optional(),
  cashBookNo: z.string().max(100).nullable().optional(),
  receiptNo: z.string().max(100).nullable().optional(),
  voucherNo: z.string().max(100).nullable().optional(),
  externalReference: z.string().max(180).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  transactionDate: z.coerce.date().optional(),
  handledByAssignmentId: z.string().uuid().nullable().optional(),
  paymentSenderName: z.string().trim().max(180).nullable().optional(),
  proofUrl: StoredFileUrl.nullable().optional(),
  supportingDocuments: z.array(StoredFileUrl).max(20).optional().default([]),
});

const PaymentSubmissionSchema = z.object({
  sourceType: z.string().trim().min(2).max(80).optional().default("manual_revenue"),
  sourceRecordId: z.string().trim().max(180).nullable().optional(),
  sourceKey: z.string().trim().max(240).nullable().optional(),
  memberId: z.string().uuid().nullable().optional(),
  payerName: z.string().trim().min(2).max(180),
  senderName: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(120),
  amount: z.coerce.number().positive().max(1000000000),
  currency: z.string().trim().min(3).max(8).optional().default("PKR"),
  paymentMethod: z.string().trim().max(80).nullable().optional(),
  transactionReference: z.string().trim().max(180).nullable().optional(),
  proofUrl: StoredFileUrl,
  supportingDocuments: z.array(StoredFileUrl).max(20).optional().default([]),
  description: z.string().trim().max(4000).nullable().optional(),
});

const PaymentReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  cashBookNo: z.string().trim().max(100).nullable().optional(),
  reviewNote: z.string().trim().max(1000).nullable().optional(),
  ledgerAmount: z.coerce.number().positive().max(1000000000).nullable().optional(),
});

const HeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["revenue", "expense", "adjustment"]),
  defaultAmount: z.coerce.number().positive().max(1000000000).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

type PaymentSubmissionRow = {
  id: string;
  sourceType: string;
  sourceRecordId: string | null;
  sourceKey: string | null;
  memberId: string | null;
  payerName: string;
  senderName: string;
  category: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  transactionReference: string | null;
  proofUrl: string;
  supportingDocuments: string | null;
  description: string | null;
  status: string;
  submittedByAdminId: string | null;
  submittedByName: string | null;
  submittedByRole: string | null;
  submittedAt: Date;
  reviewedByAdminId: string | null;
  reviewedByName: string | null;
  reviewedByRole: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  cashBookNo: string | null;
  financeTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberNo?: string | null;
  memberFullName?: string | null;
};

function parseDocuments(value?: string | null) {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch { return []; }
}

function serializeDocuments(value?: string[] | null) {
  return JSON.stringify((value || []).filter(Boolean).slice(0, 20));
}

function paymentView(row: PaymentSubmissionRow) {
  return { ...row, supportingDocuments: parseDocuments(row.supportingDocuments) };
}

async function actor(req: Request) {
  const user: any = (req as any).user || {};
  let username = "Admin";
  const resolvedRole = String(user.role || "admin");
  if (user.id) {
    try {
      const admin = await prisma.admin.findUnique({ where: { id: String(user.id) }, select: { username: true } });
      if (admin?.username) username = admin.username;
    } catch { /* keep safe fallback */ }
  }
  return { id: user.id ? String(user.id) : null, name: username, role: resolvedRole };
}

async function resolveFinanceHandler(assignmentId?: string | null) {
  if (!assignmentId) return null;
  const assignment = await prisma.organizationAssignment.findUnique({
    where: { id: assignmentId },
    include: { member: { select: { id: true, fullName: true, status: true } }, organization: { select: { name: true } } },
  });
  if (!assignment || !assignment.isActive || assignment.member?.status !== "approved" || !assignment.role.toLowerCase().includes("finance")) {
    throw new Error("Selected payment receiver is not an active Finance Secretary / Assistant Finance Secretary assignment.");
  }
  return { memberId: assignment.member.id, name: assignment.member.fullName, role: assignment.role, unit: assignment.organization?.name || null };
}

function lineDirection(type: string, direction?: string) {
  if (type === "expense") return "debit";
  if (type === "revenue") return "credit";
  return direction === "debit" ? "debit" : "credit";
}

function normalize(value: unknown) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function distanceWithin(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const value = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

function fuzzyMatch(values: unknown[], query: string) {
  const q = normalize(query);
  if (!q) return true;
  const hay = normalize(values.filter(Boolean).join(" "));
  if (hay.includes(q)) return true;
  const hayTokens = hay.split(" ").filter(Boolean);
  return q.split(" ").filter(Boolean).every((needle) => {
    if (hayTokens.some((token) => token.includes(needle))) return true;
    if (needle.length < 3) return false;
    const max = needle.length <= 4 ? 1 : needle.length <= 7 ? 2 : 3;
    return hayTokens.some((token) => distanceWithin(needle, token, max));
  });
}

function requiresPurpose(category: string) {
  return normalize(category) === "contribution";
}

async function validateLinkedMember(memberId?: string | null) {
  if (!memberId) return;
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { status: true } });
  if (!member || member.status !== "approved") throw new Error("Linked member must be an approved member.");
}

type LedgerView = "active" | "archived" | "all";

async function financeRows(view: LedgerView = "active") {
  const [transactions, legacy] = await Promise.all([
    prisma.financeTransaction.findMany({
      include: { member: { select: { id: true, memberNo: true, fullName: true } } },
      orderBy: [{ transactionDate: "desc" }, { serialNo: "desc" }],
    }),
    view === "archived" ? Promise.resolve([] as any[]) : prisma.revenueRecord.findMany({ orderBy: { date: "desc" } }),
  ]);

  const proofRows = transactions.length
    ? await prisma.$queryRaw<Array<{ id: string; paymentSenderName: string | null; proofUrl: string | null; supportingDocuments: string | null }>>`
        SELECT "id", "paymentSenderName", "proofUrl", "supportingDocuments"
        FROM "FinanceTransaction"
        WHERE "id" = ANY(${transactions.map((x) => x.id)}::text[])
      `
    : [];
  const proofs = new Map(proofRows.map((x) => [x.id, x]));

  const current = transactions
    .filter((x) => view === "all" ? true : view === "archived" ? x.status === "void" : x.status !== "void")
    .map((x) => {
      const proof = proofs.get(x.id);
      return {
        ...x,
        source: "ledger" as const,
        paymentSenderName: proof?.paymentSenderName || null,
        proofUrl: proof?.proofUrl || null,
        supportingDocuments: parseDocuments(proof?.supportingDocuments),
      };
    });

  const old = legacy.map((x) => ({
    id: `legacy:${x.id}`,
    source: "legacy" as const,
    serialNo: null,
    transactionNo: x.reference || x.receiptNo || `LEGACY-${x.id.slice(0, 8)}`,
    type: "revenue",
    direction: "credit",
    memberId: null,
    member: null,
    partyName: x.customerName,
    category: x.itemType,
    amount: x.amount,
    paymentMethod: null,
    paymentSenderName: null,
    proofUrl: null,
    supportingDocuments: [],
    cashBookNo: null,
    receiptNo: x.receiptNo,
    voucherNo: null,
    externalReference: x.reference,
    description: x.itemName,
    issuedByAdminId: null,
    issuedByName: "Legacy revenue record",
    issuedByRole: null,
    handledByMemberId: null,
    handledByName: null,
    handledByRole: null,
    status: "posted",
    transactionDate: x.date,
    createdAt: x.date,
    updatedAt: x.date,
  }));

  return [...current, ...old].sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
}

async function createPostedTransaction(tx: any, data: any, who: { id: string | null; name: string; role: string }, handler?: any) {
  const direction = lineDirection(data.type, data.direction);
  const row = await tx.financeTransaction.create({
    data: {
      transactionNo: `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
      type: data.type,
      direction,
      memberId: data.memberId || null,
      partyName: data.partyName,
      category: data.category,
      amount: data.amount,
      paymentMethod: data.paymentMethod || null,
      cashBookNo: data.cashBookNo || null,
      receiptNo: data.receiptNo || null,
      voucherNo: data.voucherNo || null,
      externalReference: data.externalReference || null,
      description: data.description || null,
      issuedByAdminId: who.id,
      issuedByName: who.name,
      issuedByRole: who.role,
      handledByMemberId: handler?.memberId || null,
      handledByName: handler?.name || who.name,
      handledByRole: handler?.role || who.role,
      transactionDate: data.transactionDate || new Date(),
    },
  });
  const year = new Date(row.transactionDate).getFullYear();
  const generatedNo = `${row.type === "expense" || row.direction === "debit" ? "EXP" : "RCPT"}-${year}-${String(row.serialNo).padStart(6, "0")}`;
  const updated = await tx.financeTransaction.update({
    where: { id: row.id },
    data: row.type === "expense" || row.direction === "debit"
      ? { voucherNo: row.voucherNo || generatedNo }
      : { receiptNo: row.receiptNo || generatedNo },
  });
  const senderName = String(data.paymentSenderName || "").trim() || null;
  const proofUrl = String(data.proofUrl || "").trim() || null;
  const docs = serializeDocuments(data.supportingDocuments || []);
  await tx.$executeRaw`
    UPDATE "FinanceTransaction"
    SET "paymentSenderName" = ${senderName}, "proofUrl" = ${proofUrl}, "supportingDocuments" = ${docs}
    WHERE "id" = ${row.id}
  `;
  await tx.financeAuditLog.create({ data: { transactionId: row.id, action: "created", actorAdminId: who.id, actorName: who.name, afterData: updated as any } });
  return updated;
}

async function updateSourcePaymentStatus(sourceType: string, sourceRecordId: string | null, status: "verified" | "rejected") {
  if (!sourceRecordId) return;
  if (sourceType === "membership") {
    const member = await prisma.member.update({ where: { id: sourceRecordId }, data: { paymentStatus: status }, select: { authUserId: true } });
    if (member.authUserId) await prisma.formDraft.updateMany({ where: { authUserId: member.authUserId, formType: "membership" }, data: { paymentStatus: status } });
  } else if (sourceType === "business") {
    await prisma.business.update({ where: { id: sourceRecordId }, data: { paymentStatus: status } });
  } else if (sourceType === "matrimonial") {
    const profile = await prisma.matrimonial.update({ where: { id: sourceRecordId }, data: { paymentStatus: status }, select: { authUserId: true } });
    if (profile.authUserId) await prisma.formDraft.updateMany({ where: { authUserId: profile.authUserId, formType: "matrimonial" }, data: { paymentStatus: status } });
  }
}

router.get("/members", requireFinanceAdmin, async (_req, res, next) => {
  try {
    const archived = await prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Member" WHERE "isArchived" = true`;
    const excluded = archived.map((x) => x.id);
    const members = await prisma.member.findMany({
      where: { status: "approved", ...(excluded.length ? { id: { notIn: excluded } } : {}) },
      select: { id: true, memberNo: true, fullName: true, email: true, status: true, membershipType: true },
      orderBy: { fullName: "asc" },
      take: 2000,
    });
    res.json(members);
  } catch (error) { next(error); }
});

router.get("/officers", requireFinanceAdmin, async (_req, res, next) => {
  try {
    const assignments = await prisma.organizationAssignment.findMany({
      where: { isActive: true, role: { contains: "finance", mode: "insensitive" }, member: { status: "approved" } },
      include: { member: { select: { id: true, memberNo: true, fullName: true } }, organization: { select: { name: true } } },
      orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
    });
    res.json(assignments.map((a) => ({ id: a.id, memberId: a.memberId, name: a.member.fullName, memberNo: a.member.memberNo, role: a.role, unit: a.organization.name })));
  } catch (error) { next(error); }
});

router.get("/heads", requireFinanceAdmin, async (req, res, next) => {
  try {
    const kind = String(req.query.kind || "all");
    const heads = await prisma.financeHead.findMany({
      where: { isActive: true, ...(kind !== "all" ? { kind } : {}) },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    res.json(heads);
  } catch (error) { next(error); }
});

router.post("/heads", requireFinanceAdmin, async (req, res, next) => {
  try {
    const data = HeadSchema.parse(req.body);
    const head = await prisma.financeHead.upsert({
      where: { name_kind: { name: data.name, kind: data.kind } },
      update: { defaultAmount: data.defaultAmount ?? null, notes: data.notes || null, displayOrder: data.displayOrder ?? 500, isActive: true },
      create: { name: data.name, kind: data.kind, defaultAmount: data.defaultAmount ?? null, notes: data.notes || null, displayOrder: data.displayOrder ?? 500, isActive: true },
    });
    res.status(201).json(head);
  } catch (error) { next(error); }
});

router.patch("/heads/:id", requireFinanceAdmin, async (req, res, next) => {
  try {
    const data = HeadSchema.partial().parse(req.body);
    const head = await prisma.financeHead.update({ where: { id: String(req.params.id) }, data });
    res.json(head);
  } catch (error) { next(error); }
});

router.get("/summary", requireFinanceAdmin, async (_req, res, next) => {
  try {
    const rows = await financeRows("active");
    const credits = rows.filter((x: any) => x.direction === "credit").reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
    const debits = rows.filter((x: any) => x.direction === "debit").reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
    const pendingResult = await prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "PaymentSubmission" WHERE "status" = 'pending'`;
    res.json({ credits, debits, balance: credits - debits, count: rows.length, legacyCount: rows.filter((x: any) => x.source === "legacy").length, pendingPayments: Number(pendingResult[0]?.count || 0) });
  } catch (error) { next(error); }
});

router.get("/ledger", requireFinanceAdmin, async (req, res, next) => {
  try {
    const requestedView = String(req.query.view || "active");
    const view: LedgerView = requestedView === "archived" || requestedView === "all" ? requestedView : "active";
    const rows = await financeRows(view);
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "all");
    const filtered = rows.filter((x: any) => {
      if (type !== "all" && x.type !== type) return false;
      return fuzzyMatch([
        x.partyName, x.paymentSenderName, x.category, x.description, x.receiptNo, x.voucherNo, x.cashBookNo, x.transactionNo,
        x.externalReference, x.member?.memberNo, x.member?.fullName, x.handledByName, x.handledByRole, x.issuedByName,
      ], q);
    });
    res.json(filtered);
  } catch (error) { next(error); }
});

// ─── Payment Verification Queue ──────────────────────────────────────────────
// These records are intentionally outside FinanceTransaction. They do not affect
// revenue, balance or receipts until a finance-authorized reviewer approves them.
router.get("/payment-submissions", requireFinanceAdmin, async (req, res, next) => {
  try {
    const requested = String(req.query.status || "pending").toLowerCase();
    const status = ["pending", "approved", "rejected", "all"].includes(requested) ? requested : "pending";
    const q = String(req.query.q || "").trim();
    const rows = status === "all"
      ? await prisma.$queryRaw<PaymentSubmissionRow[]>`
          SELECT ps.*, m."memberNo", m."fullName" AS "memberFullName"
          FROM "PaymentSubmission" ps
          LEFT JOIN "Member" m ON m."id" = ps."memberId"
          ORDER BY ps."createdAt" DESC
        `
      : await prisma.$queryRaw<PaymentSubmissionRow[]>`
          SELECT ps.*, m."memberNo", m."fullName" AS "memberFullName"
          FROM "PaymentSubmission" ps
          LEFT JOIN "Member" m ON m."id" = ps."memberId"
          WHERE ps."status" = ${status}
          ORDER BY ps."createdAt" DESC
        `;
    const filtered = rows.filter((row) => fuzzyMatch([
      row.payerName, row.senderName, row.category, row.transactionReference, row.sourceType, row.memberNo, row.memberFullName,
    ], q));
    res.json(filtered.map(paymentView));
  } catch (error) { next(error); }
});

router.get("/payment-submissions/:id/audit", requireFinanceAdmin, async (req, res, next) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT "id", "submissionId", "action", "actorAdminId", "actorName", "actorRole", "beforeData", "afterData", "createdAt"
      FROM "PaymentSubmissionAuditLog"
      WHERE "submissionId" = ${String(req.params.id)}
      ORDER BY "createdAt" ASC
    `;
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/payment-submissions", requireFinanceAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = PaymentSubmissionSchema.parse(req.body);
    await validateLinkedMember(data.memberId);
    const who = await actor(req);
    const sourceKey = data.sourceKey || `manual-payment:${randomUUID()}`;
    const documents = serializeDocuments(data.supportingDocuments);
    const rows = await prisma.$queryRaw<PaymentSubmissionRow[]>`
      INSERT INTO "PaymentSubmission" (
        "sourceType", "sourceRecordId", "sourceKey", "memberId", "payerName", "senderName", "category", "amount", "currency",
        "paymentMethod", "transactionReference", "proofUrl", "supportingDocuments", "description", "status",
        "submittedByAdminId", "submittedByName", "submittedByRole"
      ) VALUES (
        ${data.sourceType}, ${data.sourceRecordId || null}, ${sourceKey}, ${data.memberId || null}, ${data.payerName}, ${data.senderName}, ${data.category}, ${data.amount}, ${data.currency.toUpperCase()},
        ${data.paymentMethod || null}, ${data.transactionReference || null}, ${data.proofUrl}, ${documents}, ${data.description || null}, 'pending',
        ${who.id}, ${who.name}, ${who.role}
      )
      RETURNING *
    `;
    res.status(201).json(paymentView(rows[0]));
  } catch (error: any) {
    if (error?.code === "P2010" || /unique|duplicate/i.test(String(error?.message || ""))) return void res.status(409).json({ error: "This payment proof is already in the verification queue." });
    next(error);
  }
});

router.patch("/payment-submissions/:id/review", requireFinanceAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const review = PaymentReviewSchema.parse(req.body);
    const who = await actor(req);
    const found = await prisma.$queryRaw<PaymentSubmissionRow[]>`SELECT * FROM "PaymentSubmission" WHERE "id" = ${id} LIMIT 1`;
    const submission = found[0];
    if (!submission) return void res.status(404).json({ error: "Payment submission not found." });
    if (submission.status !== "pending") return void res.status(409).json({ error: `This payment has already been ${submission.status}.` });

    if (review.action === "reject") {
      await prisma.$executeRaw`
        UPDATE "PaymentSubmission"
        SET "status" = 'rejected', "reviewedByAdminId" = ${who.id}, "reviewedByName" = ${who.name}, "reviewedByRole" = ${who.role},
            "reviewedAt" = CURRENT_TIMESTAMP, "reviewNote" = ${review.reviewNote || "Payment proof did not match accounts."}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} AND "status" = 'pending'
      `;
      await prisma.$executeRaw`
        INSERT INTO "PaymentSubmissionAuditLog" ("submissionId", "action", "actorAdminId", "actorName", "actorRole", "beforeData")
        VALUES (${id}, 'rejected_by_finance', ${who.id}, ${who.name}, ${who.role}, ${JSON.stringify(submission)}::jsonb)
      `;
      try { await updateSourcePaymentStatus(submission.sourceType, submission.sourceRecordId, "rejected"); } catch {}
      const rejected = await prisma.$queryRaw<PaymentSubmissionRow[]>`SELECT * FROM "PaymentSubmission" WHERE "id" = ${id} LIMIT 1`;
      return void res.json(paymentView(rejected[0]));
    }

    const currency = String(submission.currency || "PKR").toUpperCase();
    if (currency !== "PKR" && !review.ledgerAmount) {
      return void res.status(400).json({ error: `This proof is in ${currency}. Enter the verified PKR-equivalent amount before approval so the rupee ledger is not distorted.` });
    }
    const ledgerAmount = Number(review.ledgerAmount || submission.amount);
    if (!Number.isFinite(ledgerAmount) || ledgerAmount <= 0) return void res.status(400).json({ error: "Enter a valid verified ledger amount." });

    const created = await prisma.$transaction(async (tx: any) => {
      const row = await createPostedTransaction(tx, {
        type: "revenue",
        direction: "credit",
        memberId: submission.memberId,
        partyName: submission.payerName,
        category: submission.category,
        amount: ledgerAmount,
        paymentMethod: submission.paymentMethod,
        cashBookNo: review.cashBookNo || null,
        externalReference: submission.transactionReference,
        description: [submission.description, `Verified payment sender: ${submission.senderName}`, `Source: ${submission.sourceType}`].filter(Boolean).join("\n"),
        transactionDate: submission.submittedAt || new Date(),
        paymentSenderName: submission.senderName,
        proofUrl: submission.proofUrl,
        supportingDocuments: parseDocuments(submission.supportingDocuments),
      }, who, { memberId: null, name: who.name, role: who.role });

      await tx.$executeRaw`
        UPDATE "PaymentSubmission"
        SET "status" = 'approved', "reviewedByAdminId" = ${who.id}, "reviewedByName" = ${who.name}, "reviewedByRole" = ${who.role},
            "reviewedAt" = CURRENT_TIMESTAMP, "reviewNote" = ${review.reviewNote || "Payment proof matched and verified."},
            "cashBookNo" = ${review.cashBookNo || null}, "financeTransactionId" = ${row.id}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} AND "status" = 'pending'
      `;
      await tx.$executeRaw`
        INSERT INTO "PaymentSubmissionAuditLog" ("submissionId", "action", "actorAdminId", "actorName", "actorRole", "beforeData", "afterData")
        VALUES (${id}, 'approved_by_finance', ${who.id}, ${who.name}, ${who.role}, ${JSON.stringify(submission)}::jsonb, ${JSON.stringify({ financeTransactionId: row.id, ledgerAmount })}::jsonb)
      `;
      return row;
    });

    try { await updateSourcePaymentStatus(submission.sourceType, submission.sourceRecordId, "verified"); } catch (sourceError) { console.error("Payment source status sync failed", sourceError); }
    const approved = await prisma.$queryRaw<PaymentSubmissionRow[]>`SELECT * FROM "PaymentSubmission" WHERE "id" = ${id} LIMIT 1`;
    res.json({ submission: paymentView(approved[0]), transaction: created });
  } catch (error: any) {
    if (error?.code === "P2002") return void res.status(409).json({ error: "Receipt, voucher or transaction number already exists." });
    next(error);
  }
});

// Manual revenue is never posted directly. Even an accounts-entered payment first
// becomes a pending submission so its sender/proof can be matched before approval.
router.post("/transactions", requireFinanceAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = TransactionSchema.parse(req.body);
    if (data.type === "revenue") {
      return void res.status(409).json({ error: "Revenue cannot be posted directly. Submit it to Payment Verification first, then approve the matched proof to create the ledger receipt." });
    }
    await validateLinkedMember(data.memberId);
    if (requiresPurpose(data.category) && !String(data.description || "").trim()) return void res.status(400).json({ error: "Please enter the purpose / remarks for this contribution." });
    if (data.type === "expense" && !data.proofUrl) return void res.status(400).json({ error: "Expense proof / voucher image or PDF is required before posting the expense." });
    const who = await actor(req);
    let handler;
    try { handler = await resolveFinanceHandler(data.handledByAssignmentId); }
    catch (error: any) { return void res.status(400).json({ error: error.message }); }
    const created = await prisma.$transaction((tx: any) => createPostedTransaction(tx, data, who, handler));
    res.status(201).json(created);
  } catch (error: any) {
    if (error?.code === "P2002") return void res.status(409).json({ error: "Receipt, voucher or transaction number already exists." });
    next(error);
  }
});

// Posted financial records are locked. Only Super Admin may correct a posted
// transaction, and every correction is retained in FinanceAuditLog.
router.patch("/transactions/:id", requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const data = TransactionSchema.parse(req.body);
    const existing = await prisma.financeTransaction.findUnique({ where: { id } });
    if (!existing) return void res.status(404).json({ error: "Transaction not found." });
    if (existing.status === "void") return void res.status(400).json({ error: "An archived transaction cannot be edited. Restore it first." });
    const nextDirection = lineDirection(data.type, data.direction);
    if (data.type !== existing.type || nextDirection !== existing.direction) return void res.status(400).json({ error: "Transaction type/direction cannot be changed after posting. Archive the entry and create a corrected transaction instead." });
    await validateLinkedMember(data.memberId);
    if (requiresPurpose(data.category) && !String(data.description || "").trim()) return void res.status(400).json({ error: "Please enter the purpose / remarks for this contribution." });
    if (data.type === "expense" && !data.proofUrl) return void res.status(400).json({ error: "Expense proof is required." });
    const who = await actor(req);
    let handler;
    try { handler = await resolveFinanceHandler(data.handledByAssignmentId); }
    catch (error: any) { return void res.status(400).json({ error: error.message }); }
    const updated = await prisma.$transaction(async (tx: any) => {
      const row = await tx.financeTransaction.update({
        where: { id },
        data: {
          memberId: data.memberId || null,
          partyName: data.partyName,
          category: data.category,
          amount: data.amount,
          paymentMethod: data.paymentMethod || null,
          cashBookNo: data.cashBookNo || null,
          externalReference: data.externalReference || null,
          description: data.description || null,
          handledByMemberId: handler?.memberId || null,
          handledByName: handler?.name || null,
          handledByRole: handler?.role || null,
          transactionDate: data.transactionDate || existing.transactionDate,
        },
      });
      await tx.$executeRaw`
        UPDATE "FinanceTransaction"
        SET "paymentSenderName" = ${data.paymentSenderName || null}, "proofUrl" = ${data.proofUrl || null}, "supportingDocuments" = ${serializeDocuments(data.supportingDocuments)}
        WHERE "id" = ${id}
      `;
      await tx.financeAuditLog.create({ data: { transactionId: id, action: "edited_by_super_admin", actorAdminId: who.id, actorName: who.name, beforeData: existing as any, afterData: row as any } });
      return row;
    });
    res.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") return void res.status(409).json({ error: "Receipt, voucher or transaction number already exists." });
    next(error);
  }
});

// Archive rather than delete. The row and complete audit trail stay in the DB.
router.patch("/transactions/:id/void", requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const reason = z.string().trim().min(3).max(500).parse(req.body?.reason || "Archived by Super Admin");
    const who = await actor(req);
    const existing = await prisma.financeTransaction.findUnique({ where: { id } });
    if (!existing) return void res.status(404).json({ error: "Transaction not found." });
    if (existing.status === "void") return void res.json(existing);
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.financeTransaction.update({ where: { id }, data: { status: "void", description: `${existing.description || ""}\nArchive reason: ${reason}`.trim() } });
      await tx.financeAuditLog.create({ data: { transactionId: id, action: "archived_by_super_admin", actorAdminId: who.id, actorName: who.name, beforeData: existing as any, afterData: row as any } });
      return row;
    });
    res.json(updated);
  } catch (error) { next(error); }
});

router.patch("/transactions/:id/restore", requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const reason = z.string().trim().min(3).max(500).parse(req.body?.reason || "Restored by Super Admin");
    const who = await actor(req);
    const existing = await prisma.financeTransaction.findUnique({ where: { id } });
    if (!existing) return void res.status(404).json({ error: "Transaction not found." });
    if (existing.status !== "void") return void res.json(existing);
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.financeTransaction.update({ where: { id }, data: { status: "posted", description: `${existing.description || ""}\nRestore note: ${reason}`.trim() } });
      await tx.financeAuditLog.create({ data: { transactionId: id, action: "restored_by_super_admin", actorAdminId: who.id, actorName: who.name, beforeData: existing as any, afterData: row as any } });
      return row;
    });
    res.json(updated);
  } catch (error) { next(error); }
});

router.get("/transactions/:id/audit", requireFinanceAdmin, async (req, res, next) => {
  try {
    const rows = await prisma.financeAuditLog.findMany({ where: { transactionId: String(req.params.id) }, orderBy: { createdAt: "asc" } });
    res.json(rows);
  } catch (error) { next(error); }
});

router.get("/transactions/:id/receipt.pdf", requireFinanceAdmin, async (req, res, next) => {
  try {
    const row = await prisma.financeTransaction.findUnique({
      where: { id: String(req.params.id) },
      include: { member: { select: { memberNo: true, fullName: true } } },
    });
    if (!row) return void res.status(404).json({ error: "Transaction not found." });
    const documentNo = row.direction === "debit" ? row.voucherNo : row.receiptNo;
    const buffer = createFinanceDocumentPdf(row as any);
    const safe = (documentNo || row.transactionNo).replace(/[^a-zA-Z0-9_-]/g, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${safe}.pdf\"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  } catch (error) { next(error); }
});

export default router;
