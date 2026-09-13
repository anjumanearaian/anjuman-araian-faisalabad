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
    const draft = await prisma.formDraft.upsert({
      where: { authUserId_formType: { authUserId: (req as any).user.id, formType } },
      update: { data, currentStep, completion: Math.min(100, Math.max(0, Number(completion))), status, paymentStatus, submittedAt: status === "submitted" ? new Date() : undefined },
      create: { authUserId: (req as any).user.id, formType, data, currentStep, completion, status, paymentStatus, submittedAt: status === "submitted" ? new Date() : undefined },
    });
    res.json(draft);
  } catch (error) { next(error); }
});

export default router;
