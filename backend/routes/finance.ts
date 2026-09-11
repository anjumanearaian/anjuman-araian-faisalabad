import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireFinanceAdmin } from "../middleware/auth";

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
});

async function actor(req: Request) {
  const user: any = (req as any).user || {};
  let username = "Admin";
  let resolvedRole = String(user.role || "admin");
  if (user.id) {
    try {
      const admin = await prisma.admin.findUnique({ where: { id: String(user.id) }, select: { username: true } });
      if (admin?.username) {
        username = admin.username;
        // If the admin login email belongs to an approved member who currently
        // holds a finance assignment, print the member name and official role
        // on receipts automatically instead of exposing an email address.
        const linkedMember = await prisma.member.findFirst({
          where: { email: { equals: admin.username, mode: "insensitive" }, status: "approved" },
          select: { id: true, fullName: true },
        });
        if (linkedMember) {
          const financeAssignment = await prisma.organizationAssignment.findFirst({
            where: {
              memberId: linkedMember.id,
              isActive: true,
              role: { contains: "finance", mode: "insensitive" },
            },
            orderBy: { rank: "asc" },
          });
          if (financeAssignment) {
            username = linkedMember.fullName;
            resolvedRole = financeAssignment.role;
          }
        }
      }
    } catch { /* keep safe fallback */ }
  }
  return { id: user.id ? String(user.id) : null, name: username, role: resolvedRole };
}

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

function lineDirection(type: string, direction?: string) {
  if (type === "expense") return "debit";
  if (type === "revenue") return "credit";
  return direction === "debit" ? "debit" : "credit";
}

function pdfEscape(value: unknown) {
  return String(value ?? "")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function simplePdf(lines: string[]) {
  const contentLines = lines.slice(0, 44).map((line, index) => {
    const size = index === 0 ? 16 : index === 1 ? 12 : 10;
    return `/F1 ${size} Tf (${pdfEscape(line).slice(0, 110)}) Tj 0 -${index < 2 ? 22 : 16} Td`;
  });
  const stream = `BT 50 790 Td ${contentLines.join(" ")} ET`;
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
  ];
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [0];
  objects.forEach((obj, idx) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
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
      select: { id: true, memberNo: true, fullName: true, email: true, status: true },
      orderBy: { fullName: "asc" },
      take: 2000,
    });
    res.json(members);
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
    const q = String(req.query.q || "").trim().toLowerCase();
    const type = String(req.query.type || "all");
    const filtered = rows.filter((x: any) => {
      if (type !== "all" && x.type !== type) return false;
      if (!q) return true;
      return [x.partyName, x.category, x.receiptNo, x.voucherNo, x.cashBookNo, x.transactionNo, x.externalReference, x.member?.memberNo]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
    res.json(filtered);
  } catch (error) { next(error); }
});

router.post("/transactions", requireFinanceAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = TransactionSchema.parse(req.body);
    if (data.memberId) {
      const member = await prisma.member.findUnique({ where: { id: data.memberId }, select: { status: true } });
      if (!member || member.status !== "approved") return void res.status(400).json({ error: "Linked member must be an approved member." });
    }
    const who = await actor(req);
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
      await tx.financeAuditLog.create({
        data: { transactionId: row.id, action: "created", actorAdminId: who.id, actorName: who.name, afterData: updated as any },
      });
      return updated;
    });
    res.status(201).json(created);
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
    const isDebit = row.direction === "debit";
    const documentNo = isDebit ? row.voucherNo : row.receiptNo;
    const title = isDebit ? "PAYMENT / EXPENSE VOUCHER" : "OFFICIAL PAYMENT RECEIPT";
    const lines = [
      "Anjuman-e-Araian Faisalabad",
      title,
      `Document No: ${documentNo || row.transactionNo}`,
      `Ledger Serial: ${row.serialNo}`,
      `Transaction No: ${row.transactionNo}`,
      `Date: ${new Date(row.transactionDate).toLocaleDateString("en-GB")}`,
      `Name / Party: ${row.partyName}`,
      row.member ? `Member: ${row.member.fullName} (${row.member.memberNo})` : "",
      `Category: ${row.category}`,
      `Amount: ${money(row.amount)}`,
      `Payment Method: ${row.paymentMethod || "Not specified"}`,
      `Cash Book No: ${row.cashBookNo || "Not specified"}`,
      `Reference: ${row.externalReference || "-"}`,
      `Description: ${row.description || "-"}`,
      `Issued by: ${row.issuedByName || "Administrator"}${row.issuedByRole ? ` (${row.issuedByRole.replace(/_/g, " ")})` : ""}`,
      `Status: ${row.status.toUpperCase()}`,
      "",
      "This document is generated from the official digital ledger.",
    ].filter(Boolean);
    const buffer = simplePdf(lines);
    const safe = (documentNo || row.transactionNo).replace(/[^a-zA-Z0-9_-]/g, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${safe}.pdf\"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  } catch (error) { next(error); }
});

export default router;
