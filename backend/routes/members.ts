import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";

import prisma from "../lib/prisma";
import { requireAdmin, requireMember } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter";

const router = Router();
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

const urlOrBase64 = z.string().refine(
  (s) => s.startsWith("http") || s.startsWith("/uploads/") || s.startsWith("data:image/"),
  { message: "Must be a valid URL, /uploads/ path, or base64 image" }
);

// ─── Validation Schemas ───────────────────────────────────────────────────────
const RegisterSchema = z.object({
  fullName: z.string().min(2).max(100),
  fatherName: z.string().min(2).max(100),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "CNIC format: 12345-1234567-1"),
  dob: z.string().min(1),
  gender: z.enum(["male", "female", "other"]),
  bloodGroup: z.string().optional().default(""),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9\s-]{10,20}$/, "Invalid phone number"),
  whatsapp: z.string().optional().default(""),
  whatsappPublic: z.boolean().optional().default(false),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(100),
  district: z.string().max(100).optional().or(z.literal("")),
  province: z.string().min(2).max(100),
  occupation: z.string().min(2).max(150),
  education: z.string().min(2).max(150),
  membershipType: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
  familyInfoPublic: z.boolean().optional().default(false),
  photoUrl: urlOrBase64,
  cnicFrontUrl: urlOrBase64,
  cnicBackUrl: urlOrBase64,
  paymentProofUrl: urlOrBase64,
  additionalPhotos: z.array(urlOrBase64).optional().default([]),
  familyInfo: z
    .object({
      fatherName: z.string().optional(),
      familyBranch: z.string().optional(),
      spouseName: z.string().optional(),
      childrenCount: z.string().optional(),
      childrenDetails: z.string().optional(),
      familyContactName: z.string().optional(),
      familyContactNumber: z.string().optional(),
      familyCity: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactNumber: z.string().optional(),
      emergencyRelationship: z.string().optional(),
    })
    .optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Helper: strip password from member object
const stripPassword = (member: any) => {
  const { password, ...safe } = member;
  return safe;
};

// ─── Member Login ─────────────────────────────────────────────────────────────
router.post("/login", loginLimiter, validate(LoginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const member = await prisma.member.findFirst({ where: { email } });
    if (!member) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (member.status === "pending") {
      res.status(403).json({ error: "Your account is pending admin approval. Please wait for an email or contact the administration." });
      return;
    }
    
    if (member.status === "rejected") {
      res.status(403).json({ error: "Your registration was not approved. Please contact the administration." });
      return;
    }

    const token = jwt.sign(
      { id: member.id, role: "member" },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    res.json({ token, member: stripPassword(member) }); // Never return password
  } catch (err) {
    next(err);
  }
});

// ─── Register New Member ──────────────────────────────────────────────────────
router.post("/register", registerLimiter, validate(RegisterSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyInfo, password, additionalPhotos, ...memberData } = req.body;
    const additionalPhotosJson = additionalPhotos ? JSON.stringify(additionalPhotos) : null;

    // Prevent duplicate member accounts by email or CNIC.
    const existing = await prisma.member.findFirst({
      where: { OR: [{ email: memberData.email }, { cnic: memberData.cnic }] },
      select: { email: true, cnic: true },
    });
    if (existing) {
      res.status(409).json({
        error: existing.cnic === memberData.cnic
          ? "A member with this CNIC already exists"
          : "An account with this email already exists",
      });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique Member No — use transaction to prevent race condition
    const newMember = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const prefix = `ARA-${year}-`;
      const latest = await tx.member.findFirst({
        where: { memberNo: { startsWith: prefix } },
        orderBy: { memberNo: "desc" },
        select: { memberNo: true },
      });
      const lastSeq = latest ? Number(latest.memberNo.split("-").pop() || 0) : 0;
      const seq = String(lastSeq + 1).padStart(5, "0");
      const memberNo = `${prefix}${seq}`;

      return tx.member.create({
        data: {
          ...memberData,
          additionalPhotos: additionalPhotosJson,
          password: hashedPassword,
          memberNo,
          ...(familyInfo
            ? { familyInfo: { create: familyInfo } }
            : {}),
        },
        include: { familyInfo: true },
      });
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    res.status(201).json(stripPassword(newMember));
  } catch (err: any) {
    if (err.code === "P2002") {
      // Prisma unique constraint violation
      res.status(409).json({ error: "Member with this CNIC or email already exists" });
      return;
    }
    next(err);
  }
});

// ─── Get All Members (Public & Admin) ─────────────────────────────────────────
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    let isMember = false;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, getJwtSecret()) as { role: string };
        if (decoded.role === "admin" || decoded.role === "super_admin" || decoded.role === "content_manager" || decoded.role === "welfare_manager") {
          isAdmin = true;
        } else if (decoded.role === "member") {
          isMember = true;
        }
      } catch (e) {
        // Invalid token, treat as public visitor
      }
    }

    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));
    
    let where: any = {};
    if (isAdmin) {
      const status = req.query.status ? String(req.query.status) : undefined;
      if (status) where.status = status;
    } else if (isMember) {
      // Member portal sees approved members who have showOnPortal=true (or legacy visibility="public")
      where.status = "approved";
      where.OR = [{ showOnPortal: true }, { visibility: "public" }];
    } else {
      // Public visitors only see approved & public members
      where.status = "approved";
      where.OR = [{ showOnWeb: true }, { visibility: "public" }];
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: isAdmin ? { familyInfo: true } : undefined,
        orderBy: { createdAt: "desc" },
        omit: isAdmin 
          ? { password: true } 
          : { password: true, cnic: true, dob: true, adminNote: true, rejectionReason: true }, 
      }),
      prisma.member.count({ where }),
    ]);

    const parsedMembers = members.map((m: any) => {
      let additionalPhotos: string[] = [];
      try { additionalPhotos = m.additionalPhotos ? JSON.parse(m.additionalPhotos) : []; } catch(e) {}

      if (isAdmin) return { ...m, additionalPhotos };

      // Public/member directory payload: never leak private contact, CNIC, address,
      // family or payment-document fields. WhatsApp is only exposed by consent.
      return {
        id: m.id,
        memberNo: m.memberNo,
        fullName: m.fullName,
        city: m.city,
        district: m.district,
        province: m.province,
        occupation: m.occupation,
        education: m.education,
        membershipType: m.membershipType,
        photoUrl: m.photoUrl,
        isFeatured: m.isFeatured,
        isFeaturedPortal: m.isFeaturedPortal,
        whatsappPublic: m.whatsappPublic,
        whatsapp: m.whatsappPublic ? m.whatsapp : "",
        createdAt: m.createdAt,
        approvedAt: m.approvedAt,
      };
    });

    res.json({
      members: parsedMembers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Update Member Status — Admin Only ───────────────────────────────────────
router.patch("/:id/status", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, adminNote, rejectionReason } = req.body;

    const validStatuses = ["pending", "approved", "rejected", "suspended"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const updated = await prisma.member.update({
      where: { id },
      data: {
        status,
        adminNote,
        rejectionReason,
        approvedAt: status === "approved" ? new Date() : null,
      },
      omit: { password: true },
    });

    res.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    next(err);
  }
});

// ─── Update Member Details ────────────────────────────────────────────────────
router.patch("/:id", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const user = (req as any).user;
    
    // Only admins or the member themselves can update their details
    if (user.role === "member" && user.id !== id) {
      res.status(403).json({ error: "Access denied. You can only update your own profile." });
      return;
    }

    const rawUpdates = { ...req.body };
    const memberEditableFields = new Set([
      "fullName", "fatherName", "dob", "gender", "bloodGroup",
      "email", "phone", "whatsapp", "whatsappPublic", "address",
      "city", "district", "province", "occupation", "education",
      "familyInfoPublic", "photoUrl", "cnicFrontUrl", "cnicBackUrl",
      "paymentProofUrl", "additionalPhotos"
    ]);

    let updates: any = rawUpdates;
    if (user.role === "member") {
      updates = Object.fromEntries(
        Object.entries(rawUpdates).filter(([key]) => memberEditableFields.has(key))
      );
    } else {
      delete updates.id;
      delete updates.createdAt;
      delete updates.updatedAt;
      delete updates.memberNo;
    }

    // Password changes use the dedicated current-password verification route.
    delete updates.password;
    delete updates.status;
    delete updates.approvedAt;
    delete updates.adminNote;
    delete updates.rejectionReason;

    const updated = await prisma.member.update({
      where: { id },
      data: updates,
      omit: { password: true },
    });

    res.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    next(err);
  }
});

// ─── Change Member Password — verify current password ─────────────────────────
router.post("/:id/change-password", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const user = (req as any).user;
    if (user.role === "member" && user.id !== id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || String(newPassword).length < 8) {
      res.status(400).json({ error: "Current password and a new password of at least 8 characters are required" });
      return;
    }

    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const matches = await bcrypt.compare(currentPassword, member.password);
    if (!matches) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.member.update({ where: { id }, data: { password: hashedPassword } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Delete Member — Admin Only ───────────────────────────────────────────────
router.delete("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    
    await prisma.member.delete({
      where: { id }
    });

    res.json({ message: "Member deleted successfully" });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    next(err);
  }
});

// ─── Get Current Logged-In Member ─────────────────────────────────────────────
router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    const member = await prisma.member.findUnique({
      where: { id: decoded.id },
      include: { familyInfo: true },
      omit: { password: true },
    });

    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    let additionalPhotos = [];
    try { additionalPhotos = member.additionalPhotos ? JSON.parse(member.additionalPhotos) : []; } catch(e) {}

    res.json({
      ...member,
      additionalPhotos,
    });
  } catch (err: any) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    next(err);
  }
});

export default router;
