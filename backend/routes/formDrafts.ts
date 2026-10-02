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
    res.json(drafts);
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
      select: { submittedAt: true, paymentSubmittedAt: true, paymentApprovedAt: true },
    });
    const now = new Date();
    const paymentSubmitted = ["submitted", "received", "verified", "recorded"].includes(String(paymentStatus));
    const paymentApproved = ["received", "verified", "recorded"].includes(String(paymentStatus));
    const draft = await prisma.formDraft.upsert({
      where: { authUserId_formType: { authUserId: userId, formType } },
      update: {
        data,
        currentStep,
        completion: Math.min(100, Math.max(0, Number(completion))),
        status,
        paymentStatus,
        submittedAt: status === "submitted" && !existing?.submittedAt ? now : undefined,
        paymentSubmittedAt: paymentSubmitted && !existing?.paymentSubmittedAt ? now : undefined,
        paymentApprovedAt: paymentApproved && !existing?.paymentApprovedAt ? now : undefined,
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
        paymentSubmittedAt: paymentSubmitted ? now : undefined,
        paymentApprovedAt: paymentApproved ? now : undefined,
      },
    });
    res.json(draft);
  } catch (error) { next(error); }
});

export default router;
