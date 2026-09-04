import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// ─── Validation Schema ────────────────────────────────────────────────────────
const urlOrBase64 = z.string()
  .refine(
    (val) => !val || val.startsWith("data:") || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/uploads/"),
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
});

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

    const formatted = profiles.map(p => ({
      ...p,
      additionalPhotos: p.additionalPhotos ? JSON.parse(p.additionalPhotos as string) : [],
    }));

    res.json({ profiles: formatted, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ─── Get Approved Profiles — Public Directory ────────────────────────────────
router.get("/published", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));

    const [profiles, total] = await Promise.all([
      prisma.matrimonial.findMany({
        where: { status: "approved", showOnPortal: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isFeatured: "desc" },
          { createdAt: "desc" }
        ],
      }),
      prisma.matrimonial.count({ where: { status: "approved", showOnPortal: true } }),
    ]);

    const formatted = profiles.map(p => {
      const { contact, paymentProofUrl, adminNote, paymentStatus, ...safe } = p;
      return {
        ...safe,
        additionalPhotos: p.additionalPhotos ? JSON.parse(p.additionalPhotos as string) : [],
      };
    });

    res.json({ profiles: formatted, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ─── Submit New Matrimonial Profile ──────────────────────────────────────────
router.post("/submit", validate(MatrimonialSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Strip fields not in Prisma schema (e.g. packageId from frontend)
    const {
      name, gender, age, city, education, profession,
      familyBackground, requirements, contact,
      photoUrl, paymentProofUrl,
      additionalPhotos: rawAdditional = [],
    } = req.body;

    // Filter out base64 strings — only keep server-uploaded /uploads/ URLs
    const cleanAdditional = (rawAdditional as string[]).filter(
      (s) => s && !s.startsWith("data:")
    );

    const data = {
      name, gender, age, city, education, profession,
      familyBackground: familyBackground || "",
      requirements: requirements || "",
      contact,
      photoUrl: photoUrl || null,
      paymentProofUrl: paymentProofUrl || null,
      additionalPhotos: JSON.stringify(cleanAdditional),
    };
    console.log("MATRIMONIAL SUBMIT REQ.BODY:", req.body);
    console.log("MATRIMONIAL CLEAN DATA:", data);

    const newProfile = await prisma.matrimonial.create({ data });
    res.status(201).json({ ...newProfile, additionalPhotos: JSON.parse(newProfile.additionalPhotos || "[]") });
  } catch (err) {
    next(err);
  }
});

// ─── Update Matrimonial Status — Admin Only ───────────────────────────────────
router.patch("/:id/status", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, paymentStatus, adminNote } = req.body;

    const validStatuses = ["pending", "approved", "rejected"];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const updated = await prisma.matrimonial.update({
      where: { id },
      data: { status, paymentStatus, adminNote },
    });

    res.json({ ...updated, additionalPhotos: JSON.parse(updated.additionalPhotos || "[]") });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Matrimonial profile not found" });
      return;
    }
    next(err);
  }
});

// ─── Update Matrimonial — Member/Admin ─────────────────────────────────────────
router.put("/:id", requireAdmin, validate(MatrimonialSchema.partial().passthrough()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    
    // Strip fields not in Prisma schema (e.g. packageId from frontend)
    const {
      name, gender, age, city, education, profession,
      familyBackground, requirements, contact,
      photoUrl, paymentProofUrl,
      additionalPhotos: rawAdditional,
      status, paymentStatus, adminNote,
      isFeatured, showOnPortal
    } = req.body;

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
      // Filter out base64 strings — only keep server-uploaded /uploads/ URLs
      const cleanAdditional = (rawAdditional as string[]).filter(
        (s) => s && !s.startsWith("data:")
      );
      data.additionalPhotos = JSON.stringify(cleanAdditional);
    }

    const updated = await prisma.matrimonial.update({
      where: { id },
      data,
    });
    res.json({ ...updated, additionalPhotos: JSON.parse(updated.additionalPhotos || "[]") });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Matrimonial profile not found" });
      return;
    }
    next(err);
  }
});

// ─── Delete Matrimonial — Admin Only ───────────────────────────────────────────
router.delete("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.matrimonial.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Matrimonial profile not found" });
      return;
    }
    next(err);
  }
});

export default router;
