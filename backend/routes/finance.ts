import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireFinanceAdmin } from "../middleware/auth";
import { createFinanceDocumentPdf } from "../lib/financeDocumentPdf";

const router = Router();

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
});

const HeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["revenue", "expense", "adjustment"]),
  defaultAmount: z.coerce.number().positive().max(1000000000).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

async function actor(req: Request) {
  const user: any = (req as any).user || {};
  let username = "Admin";
  let resolvedRole = String(user.role || "admin");
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
      cur[j] = value; rowMin = Math.min(rowMin, value);
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

async function financeRows() {
  const [transactions, legacy] = await Promise.all([
    prisma.financeTransaction.findMany({
      include: { member: { select: { id: true, memberNo: true, fullName: true } } },
      orderBy: [{ transactionDate: "desc" }, { serialNo: "desc" }],
    }),
    prisma.revenueRecord.findMany({ orderBy: { date: "desc" } }),
  ]);
  const current = transactions.map((x) => ({ ...x, source: "ledger" as const }));
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

router.get("/members", requireFinanceAdmin, async (_req, res, next) => {
  try {
    const members = await prisma.member.findMany({
      where: { status: "approved" },
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
    const rows = await financeRows();
    const posted = rows.filter((x: any) => x.status !== "void");
    const credits = posted.filter((x: any) => x.direction === "credit").reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
    const debits = posted.filter((x: any) => x.direction === "debit").reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
    res.json({ credits, debits, balance: credits - debits, count: posted.length, legacyCount: posted.filter((x: any) => x.source === "legacy").length });
  } catch (error) { next(error); }
});

router.get("/ledger", requireFinanceAdmin, async (req, res, next) => {
  try {
    const rows = await financeRows();
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "all");
    const filtered = rows.filter((x: any) => {
      if (type !== "all" && x.type !== type) return false;
      return fuzzyMatch([
        x.partyName, x.category, x.description, x.receiptNo, x.voucherNo, x.cashBookNo, x.transactionNo,
        x.externalReference, x.member?.memberNo, x.member?.fullName, x.handledByName, x.handledByRole, x.issuedByName,
      ], q);
    });
    res.json(filtered);
  } catch (error) { next(error); }
});

router.post("/transactions", requireFinanceAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = TransactionSchema.parse(req.body);
    await validateLinkedMember(data.memberId);
    if (requiresPurpose(data.category) && !String(data.description || "").trim()) return void res.status(400).json({ error: "Please enter the purpose / remarks for this contribution." });
    const who = await actor(req);
    let handler;
    try { handler = await resolveFinanceHandler(data.handledByAssignmentId); }
    catch (error: any) { return void res.status(400).json({ error: error.message }); }
    const direction = lineDirection(data.type, data.direction);
    const created = await prisma.$transaction(async (tx) => {
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
          handledByName: handler?.name || null,
          handledByRole: handler?.role || null,
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
      await tx.financeAuditLog.create({ data: { transactionId: row.id, action: "created", actorAdminId: who.id, actorName: who.name, afterData: updated as any } });
      return updated;
    });
    res.status(201).json(created);
  } catch (error: any) {
    if (error?.code === "P2002") return void res.status(409).json({ error: "Receipt, voucher or transaction number already exists." });
    next(error);
  }
});

router.patch("/transactions/:id", requireFinanceAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const data = TransactionSchema.parse(req.body);
    const existing = await prisma.financeTransaction.findUnique({ where: { id } });
    if (!existing) return void res.status(404).json({ error: "Transaction not found." });
    if (existing.status === "void") return void res.status(400).json({ error: "A voided transaction cannot be edited." });
    const nextDirection = lineDirection(data.type, data.direction);
    if (data.type !== existing.type || nextDirection !== existing.direction) return void res.status(400).json({ error: "Transaction type/direction cannot be changed after posting. Void the entry and create a corrected transaction instead." });
    await validateLinkedMember(data.memberId);
    if (requiresPurpose(data.category) && !String(data.description || "").trim()) return void res.status(400).json({ error: "Please enter the purpose / remarks for this contribution." });
    const who = await actor(req);
    let handler;
    try { handler = await resolveFinanceHandler(data.handledByAssignmentId); }
    catch (error: any) { return void res.status(400).json({ error: error.message }); }
    const updated = await prisma.$transaction(async (tx) => {
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
      await tx.financeAuditLog.create({ data: { transactionId: id, action: "edited", actorAdminId: who.id, actorName: who.name, beforeData: existing as any, afterData: row as any } });
      return row;
    });
    res.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") return void res.status(409).json({ error: "Receipt, voucher or transaction number already exists." });
    next(error);
  }
});

router.patch("/transactions/:id/void", requireFinanceAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const reason = z.string().trim().min(3).max(500).parse(req.body?.reason || "Voided by administrator");
    const who = await actor(req);
    const existing = await prisma.financeTransaction.findUnique({ where: { id } });
    if (!existing) return void res.status(404).json({ error: "Transaction not found." });
    if (existing.status === "void") return void res.json(existing);
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.financeTransaction.update({ where: { id }, data: { status: "void", description: `${existing.description || ""}\nVoid reason: ${reason}`.trim() } });
      await tx.financeAuditLog.create({ data: { transactionId: id, action: "voided", actorAdminId: who.id, actorName: who.name, beforeData: existing as any, afterData: row as any } });
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
