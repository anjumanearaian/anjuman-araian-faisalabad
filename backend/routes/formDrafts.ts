import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { requireWelfareAdmin, requireMember } from "../middleware/auth";

const router = Router();

function allowedType(formType: string) {
  return formType === "membership" || formType === "business" || formType === "matrimonial" || formType.startsWith("matrimonial:");
}

router.get("/admin/all", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const drafts = await prisma.formDraft.findMany({
      where: status ? { status } : undefined,
      include: { authUser: { select: { email: true, name: true } } },
      orderBy: { updatedAt: "desc" }, take: 500,
    });

    // Saved Forms is a read-only administrative view. Enrich membership drafts
    // from the authoritative Member record so completed approvals/payments remain
    // visible without adding or changing production database columns.
    const membershipUserIds = drafts
      .filter((draft) => draft.formType === "membership" && draft.authUserId)
      .map((draft) => draft.authUserId);

    const linkedMembers = membershipUserIds.length
      ? await prisma.member.findMany({
          where: { authUserId: { in: membershipUserIds } },
          select: {
            authUserId: true,
            memberNo: true,
            membershipType: true,
            status: true,
            paymentStatus: true,
            approvedAt: true,
          },
        })
      : [];

    const memberByUserId = new Map(linkedMembers.map((member) => [member.authUserId, member]));
    const clearedPaymentStates = new Set(["submitted", "received", "verified", "recorded"]);
    const annualMembershipTypes = new Set(["ordinary", "annual", "overseas"]);

    const response = drafts.map((draft) => {
      if (draft.formType !== "membership") return draft;
      const member = memberByUserId.get(draft.authUserId);
      if (!member) return draft;

      const approvedAt = member.approvedAt || null;
      const paymentKnown = clearedPaymentStates.has(String(member.paymentStatus || "").toLowerCase());
      let expiryDate: Date | null = null;
      if (approvedAt && annualMembershipTypes.has(String(member.membershipType || "").toLowerCase())) {
        expiryDate = new Date(approvedAt);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }

      const rawData = draft.data && typeof draft.data === "object" && !Array.isArray(draft.data)
        ? draft.data as Record<string, unknown>
        : {};

      return {
        ...draft,
        paymentStatus: member.paymentStatus || draft.paymentStatus,
        // The historical schema has no separate payment-verification timestamp.
        // For completed membership records, show the known payment submission time
        // rather than inventing an approval/payment date.
        paymentSubmittedAt: paymentKnown ? draft.submittedAt : null,
        approvedAt,
        data: expiryDate ? { ...rawData, expiryDate } : rawData,
        finalRecord: {
          memberNo: member.memberNo,
          membershipType: member.membershipType,
          status: member.status,
          paymentStatus: member.paymentStatus,
          approvedAt,
          expiryDate,
        },
      };
    });

    res.json(response);
  } catch (error) { next(error); }
});

router.get("/:formType", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const formType = String(req.params.formType);
    if (!allowedType(formType)) return void res.status(400).json({ error: "Unknown form type" });
    const draft = await prisma.formDraft.findUnique({ where: { authUserId_formType: { authUserId: (req as any).user.id, formType } } });
    if (formType === "business" && draft?.status === "submitted") return void res.json(null);
    res.json(draft || null);
  } catch (error) { next(error); }
});

router.put("/:formType", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const formType = String(req.params.formType);
    if (!allowedType(formType)) return void res.status(400).json({ error: "Unknown form type" });
    const { data, currentStep = 0, completion = 0, status = "incomplete", paymentStatus = "pending" } = req.body || {};
    const userId = (req as any).user.id;
    const existing = await prisma.formDraft.findUnique({
      where: { authUserId_formType: { authUserId: userId, formType } },
      select: { submittedAt: true },
    });
    const now = new Date();
    const draft = await prisma.formDraft.upsert({
      where: { authUserId_formType: { authUserId: userId, formType } },
      update: {
        data,
        currentStep,
        completion: Math.min(100, Math.max(0, Number(completion))),
        status,
        paymentStatus,
        submittedAt: status === "submitted" && !existing?.submittedAt ? now : undefined,
      },
      create: {
        authUserId: userId,
        formType,
        data,
        currentStep,
        completion,
        status,
        paymentStatus,
        submittedAt: status === "submitted" ? now : undefined,
      },
    });
    res.json(draft);
  } catch (error) { next(error); }
});

export default router;
