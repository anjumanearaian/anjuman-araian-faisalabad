import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import prisma from "../lib/prisma";
import { requireAdmin, requireMember } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { MASTER_EMAIL, emailFrame, sendEmail } from "../lib/email";

const router = Router();

const urlOrBase64 = z.string()
  .refine(
    (val) => !val || val.startsWith("data:") || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/uploads/") || val.startsWith("/api/files/"),
    { message: "Must be a valid URL or base64 data URI" }
  )
  .nullable()
  .optional();

const MatrimonialSchema = z.object({
  name: z.string().min(2).max(100),
  gender: z.enum(["male", "female"]),
  age: z.string().min(1).max(10),
  city: z.string().min(2).max(100),
  education: z.string().min(2).max(150),
  profession: z.string().min(2).max(150),
  familyBackground: z.string().max(2000).optional(),
  requirements: z.string().max(2000).optional(),
  contact: z.string().regex(/^\+?[0-9\s\-]{10,20}$/, "Invalid contact number"),
  photoUrl: urlOrBase64,
  additionalPhotos: z.array(z.string()).optional(),
  paymentProofUrl: urlOrBase64,
  packageId: z.string().optional(),
  relationToCandidate: z.string().max(100).optional(),
});

const MatchRequestSchema = z.object({
  targetProfileId: z.string().uuid(),
  requesterMessage: z.string().max(1000).optional(),
});

const profileCode = (id: string) => `AAF-MAT-${String(id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const paymentCleared = (status?: string | null) => ["received", "verified"].includes(String(status || "").toLowerCase());

function basicProfile(p: any) {
  return {
    id: p.id,
    profileCode: profileCode(p.id),
    gender: p.gender,
    age: p.age,
    city: p.city,
    education: p.education,
    profession: p.profession,
    isFeatured: Boolean(p.isFeatured),
    createdAt: p.createdAt,
  };
}

function privateContactProfile(p: any) {
  return {
    ...basicProfile(p),
    name: p.name,
    contact: p.contact,
  };
}

// ─── Get All Matrimonial Profiles — Admin Only ────────────────────────────────
router.get("/", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));

    const [profiles, total] = await Promise.all([
      prisma.matrimonial.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.matrimonial.count(),
    ]);

    const formatted = profiles.map((p) => ({
      ...p,
      profileCode: profileCode(p.id),
      additionalPhotos: p.additionalPhotos ? JSON.parse(p.additionalPhotos as string) : [],
    }));

    res.json({ profiles: formatted, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ─── Approved Directory — privacy-safe basics only ───────────────────────────
router.get("/published", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));

    const where = { status: "approved", showOnPortal: true, paymentStatus: { in: ["received", "verified"] } } as any;
    const [profiles, total] = await Promise.all([
      prisma.matrimonial.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        select: { id: true, gender: true, age: true, city: true, education: true, profession: true, isFeatured: true, createdAt: true },
      }),
      prisma.matrimonial.count({ where }),
    ]);

    res.json({ profiles: profiles.map(basicProfile), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ─── Submit New Matrimonial Profile ──────────────────────────────────────────
router.post("/submit", requireMember, validate(MatrimonialSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, gender, age, city, education, profession,
      familyBackground, requirements, contact,
      photoUrl, paymentProofUrl,
      additionalPhotos: rawAdditional = [],
      relationToCandidate,
    } = req.body;
    const authUser = (req as any).user;
    const linkedMember = await prisma.member.findFirst({
      where: { OR: [{ authUserId: authUser.id }, { email: { equals: authUser.email, mode: "insensitive" } }], status: "approved" },
    });
    const applicantType = linkedMember ? "member" : "non_member";
    const feeAmount = linkedMember ? 3000 : 5000;

    const cleanAdditional = (rawAdditional as string[]).filter((s) => s && !s.startsWith("data:"));
    const data = {
      name, gender, age, city, education, profession,
      familyBackground: familyBackground || "",
      requirements: requirements || "",
      contact,
      photoUrl: photoUrl || null,
      paymentProofUrl: paymentProofUrl || null,
      additionalPhotos: JSON.stringify(cleanAdditional),
      authUserId: authUser.id,
      applicantType,
      feeAmount,
      relationToCandidate: relationToCandidate || "Self",
      status: "pending",
      paymentStatus: "pending",
      showOnPortal: false,
    };

    const newProfile = await prisma.matrimonial.create({ data });
    await prisma.formDraft.upsert({
      where: { authUserId_formType: { authUserId: authUser.id, formType: "matrimonial" } },
      update: { status: "submitted", completion: 100, paymentStatus: "submitted", submittedAt: new Date() },
      create: { authUserId: authUser.id, formType: "matrimonial", data: req.body, completion: 100, status: "submitted", paymentStatus: "submitted", submittedAt: new Date() },
    });
    void sendEmail(MASTER_EMAIL, `New matrimonial application: ${name}`, emailFrame("New matrimonial application", `<p>${name} has submitted a ${applicantType.replace("_", "-")} matrimonial application.</p><p>Reference: <strong>${profileCode(newProfile.id)}</strong><br>Fee: <strong>PKR ${feeAmount.toLocaleString()}</strong><br>Contact: ${contact}</p>`)).catch(console.error);
    res.status(201).json({ ...newProfile, profileCode: profileCode(newProfile.id), additionalPhotos: JSON.parse(newProfile.additionalPhotos || "[]") });
  } catch (err) {
    next(err);
  }
});

// ─── Privacy-first Match Requests ─────────────────────────────────────────────
router.post("/match-requests", requireMember, validate(MatchRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const own = await prisma.matrimonial.findFirst({
      where: { authUserId: user.id, status: "approved", showOnPortal: true, paymentStatus: { in: ["received", "verified"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!own) return void res.status(403).json({ error: "Your own matrimonial profile must first be payment-verified, approved and enabled by the administrator before you can request a match." });

    const target = await prisma.matrimonial.findFirst({
      where: { id: req.body.targetProfileId, status: "approved", showOnPortal: true, paymentStatus: { in: ["received", "verified"] } },
    });
    if (!target) return void res.status(404).json({ error: "The selected matrimonial profile is not currently available." });
    if (target.id === own.id) return void res.status(400).json({ error: "You cannot request a match with your own profile." });

    const reverse = await prisma.matrimonialMatchRequest.findFirst({
      where: { requesterProfileId: target.id, targetProfileId: own.id, status: { in: ["pending_admin", "awaiting_target", "accepted"] } },
    });
    if (reverse) return void res.status(409).json({ error: "A match request between these profiles is already active." });

    const created = await prisma.matrimonialMatchRequest.create({
      data: {
        requesterAuthUserId: user.id,
        requesterProfileId: own.id,
        targetProfileId: target.id,
        requesterMessage: req.body.requesterMessage || null,
        status: "pending_admin",
      },
    });
    void sendEmail(MASTER_EMAIL, `Matrimonial match request: ${profileCode(own.id)} → ${profileCode(target.id)}`, emailFrame("New match request", `<p>A privacy-protected matrimonial match request requires admin review.</p><p>${profileCode(own.id)} → ${profileCode(target.id)}</p>`)).catch(console.error);
    res.status(201).json({ id: created.id, status: created.status, target: basicProfile(target) });
  } catch (err: any) {
    if (err?.code === "P2002") { res.status(409).json({ error: "This match request already exists." }); return; }
    next(err);
  }
});

router.get("/match-requests/mine", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const ownProfiles = await prisma.matrimonial.findMany({ where: { authUserId: user.id }, select: { id: true } });
    const ownIds = ownProfiles.map((p) => p.id);
    const rows = await prisma.matrimonialMatchRequest.findMany({
      where: { OR: [{ requesterAuthUserId: user.id }, { targetProfileId: { in: ownIds.length ? ownIds : ["__none__"] } }] },
      include: { requesterProfile: true, targetProfile: true },
      orderBy: { createdAt: "desc" },
    });

    const result = rows.map((r) => {
      const incoming = ownIds.includes(r.targetProfileId);
      const accepted = r.status === "accepted" && Boolean(r.contactReleasedAt);
      const counterpart = incoming ? r.requesterProfile : r.targetProfile;
      return {
        id: r.id,
        direction: incoming ? "incoming" : "outgoing",
        status: r.status,
        requesterMessage: incoming && ["awaiting_target", "accepted"].includes(r.status) ? r.requesterMessage : undefined,
        counterpart: accepted ? privateContactProfile(counterpart) : basicProfile(counterpart),
        createdAt: r.createdAt,
        adminApprovedAt: r.adminApprovedAt,
        targetRespondedAt: r.targetRespondedAt,
        contactReleasedAt: r.contactReleasedAt,
      };
    });
    res.json({ requests: result });
  } catch (err) { next(err); }
});

router.patch("/match-requests/:id/respond", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const decision = String(req.body?.decision || "").toLowerCase();
    if (!["accept", "decline"].includes(decision)) return void res.status(400).json({ error: "Decision must be accept or decline." });

    const row = await prisma.matrimonialMatchRequest.findUnique({
      where: { id: String(req.params.id) },
      include: { targetProfile: true, requesterProfile: true },
    });
    if (!row) return void res.status(404).json({ error: "Match request not found." });
    if (row.targetProfile.authUserId !== user.id) return void res.status(403).json({ error: "Only the owner of the requested profile can respond." });
    if (row.status !== "awaiting_target") return void res.status(409).json({ error: "This request is not waiting for your response." });

    const accepted = decision === "accept";
    const updated = await prisma.matrimonialMatchRequest.update({
      where: { id: row.id },
      data: {
        status: accepted ? "accepted" : "declined",
        targetRespondedAt: new Date(),
        contactReleasedAt: accepted ? new Date() : null,
      },
    });
    res.json({
      id: updated.id,
      status: updated.status,
      counterpart: accepted ? privateContactProfile(row.requesterProfile) : basicProfile(row.requesterProfile),
    });
  } catch (err) { next(err); }
});

router.get("/match-requests/admin/all", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.matrimonialMatchRequest.findMany({
      include: { requesterProfile: true, targetProfile: true, requesterAuthUser: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    res.json({
      requests: rows.map((r) => ({
        ...r,
        requester: { ...privateContactProfile(r.requesterProfile), familyBackground: r.requesterProfile.familyBackground, requirements: r.requesterProfile.requirements },
        target: { ...privateContactProfile(r.targetProfile), familyBackground: r.targetProfile.familyBackground, requirements: r.targetProfile.requirements },
        requesterProfile: undefined,
        targetProfile: undefined,
      })),
    });
  } catch (err) { next(err); }
});

router.patch("/match-requests/:id/admin", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const action = String(req.body?.action || "").toLowerCase();
    if (!["forward", "reject", "close"].includes(action)) return void res.status(400).json({ error: "Action must be forward, reject or close." });
    const row = await prisma.matrimonialMatchRequest.findUnique({
      where: { id: String(req.params.id) },
      include: { requesterProfile: true, targetProfile: true },
    });
    if (!row) return void res.status(404).json({ error: "Match request not found." });

    const status = action === "forward" ? "awaiting_target" : action === "reject" ? "rejected" : "closed";
    const updated = await prisma.matrimonialMatchRequest.update({
      where: { id: row.id },
      data: {
        status,
        adminNote: String(req.body?.adminNote || "") || null,
        adminApprovedAt: action === "forward" ? new Date() : row.adminApprovedAt,
      },
    });

    if (action === "forward" && row.targetProfile.authUserId) {
      const targetUser = await prisma.authUser.findUnique({ where: { id: row.targetProfile.authUserId }, select: { email: true } });
      if (targetUser?.email) {
        void sendEmail(targetUser.email, "A matrimonial match request is waiting for your consent", emailFrame("Consent requested", `<p>A verified profile has requested a match with ${profileCode(row.targetProfile.id)}.</p><p>Please sign in to your Matrimonial Requests page to review the basic profile and accept or decline. Contact details are not shared unless you accept.</p>`)).catch(console.error);
      }
    }
    res.json({ id: updated.id, status: updated.status });
  } catch (err) { next(err); }
});

// ─── Update Matrimonial Status — Admin Only ──────────────────────────────────
router.patch("/:id/status", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, paymentStatus, adminNote } = req.body;
    const validStatuses = ["pending", "approved", "rejected"];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const current = await prisma.matrimonial.findUnique({ where: { id } });
    if (!current) return void res.status(404).json({ error: "Matrimonial profile not found" });
    const effectivePayment = paymentStatus ?? current.paymentStatus;
    if (status === "approved" && !paymentCleared(effectivePayment)) {
      return void res.status(409).json({ error: "Verify/receive the matrimonial fee before approving this profile." });
    }

    const updated = await prisma.matrimonial.update({
      where: { id },
      data: {
        status,
        paymentStatus,
        adminNote,
        ...(status === "rejected" ? { showOnPortal: false } : {}),
      },
    });
    res.json({ ...updated, profileCode: profileCode(updated.id), additionalPhotos: JSON.parse(updated.additionalPhotos || "[]") });
  } catch (err: any) {
    if (err.code === "P2025") { res.status(404).json({ error: "Matrimonial profile not found" }); return; }
    next(err);
  }
});

// ─── Update Matrimonial — Admin Only ─────────────────────────────────────────
router.put("/:id", requireAdmin, validate(MatrimonialSchema.partial().passthrough()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const current = await prisma.matrimonial.findUnique({ where: { id } });
    if (!current) return void res.status(404).json({ error: "Matrimonial profile not found" });

    const {
      name, gender, age, city, education, profession,
      familyBackground, requirements, contact,
      photoUrl, paymentProofUrl,
      additionalPhotos: rawAdditional,
      status, paymentStatus, adminNote,
      isFeatured, showOnPortal
    } = req.body;

    const effectiveStatus = status ?? current.status;
    const effectivePayment = paymentStatus ?? current.paymentStatus;
    if ((effectiveStatus === "approved" || showOnPortal === true) && !paymentCleared(effectivePayment)) {
      return void res.status(409).json({ error: "Payment must be received or verified before this profile can be approved/published." });
    }
    if (showOnPortal === true && effectiveStatus !== "approved") {
      return void res.status(409).json({ error: "Approve the matrimonial profile before enabling it in the directory." });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (gender !== undefined) data.gender = gender;
    if (age !== undefined) data.age = age;
    if (city !== undefined) data.city = city;
    if (education !== undefined) data.education = education;
    if (profession !== undefined) data.profession = profession;
    if (familyBackground !== undefined) data.familyBackground = familyBackground;
    if (requirements !== undefined) data.requirements = requirements;
    if (contact !== undefined) data.contact = contact;
    if (photoUrl !== undefined) data.photoUrl = photoUrl;
    if (paymentProofUrl !== undefined) data.paymentProofUrl = paymentProofUrl;
    if (status !== undefined) data.status = status;
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;
    if (adminNote !== undefined) data.adminNote = adminNote;
    if (isFeatured !== undefined) data.isFeatured = isFeatured;
    if (showOnPortal !== undefined) data.showOnPortal = showOnPortal;

    if (rawAdditional !== undefined) {
      const cleanAdditional = (rawAdditional as string[]).filter((s) => s && !s.startsWith("data:"));
      data.additionalPhotos = JSON.stringify(cleanAdditional);
    }

    const updated = await prisma.matrimonial.update({ where: { id }, data });
    res.json({ ...updated, profileCode: profileCode(updated.id), additionalPhotos: JSON.parse(updated.additionalPhotos || "[]") });
  } catch (err: any) {
    if (err.code === "P2025") { res.status(404).json({ error: "Matrimonial profile not found" }); return; }
    next(err);
  }
});

router.delete("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.matrimonial.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") { res.status(404).json({ error: "Matrimonial profile not found" }); return; }
    next(err);
  }
});

export default router;
