import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";

import prisma from "../lib/prisma";
import { requireWelfareAdmin, requireMember } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter";
import { MASTER_EMAIL, emailFrame, sendEmail } from "../lib/email";
import { cleanupRemovedFiles } from "../lib/fileCleanup";
import { createReceiptPdf } from "../lib/receiptPdf";

const router = Router();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

const urlOrBase64 = z.string().refine(
  (s) => s.startsWith("http") || s.startsWith("/uploads/") || s.startsWith("/api/files/") || s.startsWith("data:image/"),
  { message: "Must be a valid uploaded file URL" }
);

const ChildSchema = z.object({
  fullName: z.string().min(1).max(120),
  dob: z.string().max(30).optional().default(""),
  education: z.string().max(150).optional().default(""),
});

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
  localArea: z.string().max(150).optional().default(""),
  city: z.string().min(2).max(100),
  district: z.string().max(100).optional().or(z.literal("")),
  province: z.string().min(2).max(100),
  occupation: z.string().min(2).max(150),
  education: z.string().min(2).max(150),
  designation: z.string().max(150).optional().default(""),
  institutionName: z.string().max(200).optional().default(""),
  businessName: z.string().max(200).optional().default(""),
  memberCell: z.enum(["male", "women"]).optional().default("male"),
  membershipType: z.string().min(1),
  familyInfoPublic: z.boolean().optional().default(false),
  referrerMemberId: z.string().uuid().nullable().optional(),
  photoUrl: urlOrBase64,
  cnicFrontUrl: urlOrBase64,
  cnicBackUrl: urlOrBase64,
  paymentProofUrl: urlOrBase64,
  additionalPhotos: z.array(urlOrBase64).optional().default([]),
  children: z.array(ChildSchema).max(20).optional().default([]),
  familyInfo: z.object({
    fatherName: z.string().optional(),
    familyBranch: z.string().optional(),
    caste: z.string().max(150).optional(),
    religiousSect: z.string().max(150).optional(),
    spouseName: z.string().optional(),
    childrenCount: z.string().optional(),
    childrenDetails: z.string().optional(),
    familyContactName: z.string().optional(),
    familyContactNumber: z.string().optional(),
    familyCity: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactNumber: z.string().optional(),
    emergencyRelationship: z.string().optional(),
  }).optional(),
});

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

const stripPassword = (member: any) => {
  const { password, ...safe } = member;
  return safe;
};

function parsePhotos(value?: string | null): string[] {
  try { return value ? JSON.parse(value) : []; } catch { return []; }
}

function canonicalDesignation(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase().replace(/[.\-_]/g, " ").replace(/\s+/g, " ").trim();
  const aliases: Record<string, string> = {
    ceo: "Chief Executive Officer", "chief executive": "Chief Executive Officer", "chief executive officer": "Chief Executive Officer",
    md: "Managing Director", "managing director": "Managing Director", gm: "General Manager", "general manager": "General Manager",
    svp: "Senior Vice President", "senior vice president": "Senior Vice President", vp: "Vice President", "vice president": "Vice President",
    "gen sec": "General Secretary", "general secretary": "General Secretary", owner: "Owner / Proprietor", proprietor: "Owner / Proprietor",
  };
  return aliases[key] || raw;
}

function canonicalLocation(value: unknown) {
  const raw = String(value || "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  const aliases: Record<string, string> = {
    fsd: "Faisalabad", faislabad: "Faisalabad", faisalabad: "Faisalabad",
    lhr: "Lahore", lahore: "Lahore", khi: "Karachi", karachi: "Karachi",
    isb: "Islamabad", islamabad: "Islamabad", rwp: "Rawalpindi", rawalpindi: "Rawalpindi",
    multan: "Multan", gujranwala: "Gujranwala", sialkot: "Sialkot", peshawar: "Peshawar", quetta: "Quetta",
  };
  return aliases[raw.toLowerCase()] || raw;
}

function parseAmount(fee: string) {
  const match = String(fee || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function frequency(fee: string) {
  const lower = String(fee || "").toLowerCase();
  if (lower.includes("month")) return "monthly";
  if (lower.includes("year") || lower.includes("annual")) return "yearly";
  return "one_time";
}

const defaultTiers = [
  { type: "ordinary", name: "Regular / Annual Member", fee: "Rs. 1,000 / year" },
  { type: "life", name: "Life Member", fee: "Rs. 3,000 once" },
  { type: "patron", name: "Patron Member", fee: "Rs. 25,000 once" },
  { type: "overseas", name: "Overseas Member", fee: "$100 / year" },
];

router.post("/login", loginLimiter, validate(LoginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const member = await prisma.member.findFirst({ where: { email } });
    if (!member) return void res.status(401).json({ error: "Invalid credentials" });
    const isMatch = member.password ? await bcrypt.compare(password, member.password) : false;
    if (!isMatch) return void res.status(401).json({ error: "Invalid credentials" });
    if (member.status === "pending") return void res.status(403).json({ error: "Your account is pending admin approval. Please wait for an email or contact the administration." });
    if (["rejected", "suspended", "deceased", "inactive"].includes(member.status)) return void res.status(403).json({ error: "Your membership is not currently active. Please contact the administration." });
    const token = jwt.sign({ id: member.id, role: "member" }, getJwtSecret(), { expiresIn: "24h" });
    res.json({ token, expiresAt: new Date(Date.now() + 86400000).toISOString(), member: stripPassword(member) });
  } catch (err) { next(err); }
});

router.get("/referral-search", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return void res.json({ members: [] });
    const members = await prisma.member.findMany({
      where: { status: "approved", OR: [{ fullName: { contains: q, mode: "insensitive" } }, { memberNo: { contains: q, mode: "insensitive" } }] },
      take: 12, orderBy: { fullName: "asc" }, select: { id: true, memberNo: true, fullName: true, city: true },
    });
    res.json({ members });
  } catch (err) { next(err); }
});

router.post("/register", registerLimiter, requireMember, validate(RegisterSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyInfo, children = [], additionalPhotos, referrerMemberId, ...memberData } = req.body;
    const authUser = (req as any).user;
    if (authUser.role !== "applicant" || String(authUser.email).toLowerCase() !== String(memberData.email).toLowerCase()) return void res.status(403).json({ error: "Please verify this email before submitting" });

    memberData.city = canonicalLocation(memberData.city);
    memberData.district = canonicalLocation(memberData.district);
    memberData.designation = canonicalDesignation(memberData.designation);

    const existing = await prisma.member.findFirst({ where: { OR: [{ email: memberData.email }, { cnic: memberData.cnic }] }, select: { email: true, cnic: true } });
    if (existing) return void res.status(409).json({ error: existing.cnic === memberData.cnic ? "A member with this CNIC already exists" : "An account with this email already exists" });

    const referrer = referrerMemberId ? await prisma.member.findFirst({ where: { id: referrerMemberId, status: "approved" }, select: { id: true, fullName: true, memberNo: true, email: true } }) : null;
    if (referrerMemberId && !referrer) return void res.status(400).json({ error: "Selected referrer is not an active approved member" });

    const additionalPhotosJson = additionalPhotos ? JSON.stringify(additionalPhotos) : null;
    const cleanChildren = (children as any[]).map((child) => ({ fullName: String(child.fullName || "").trim(), dob: String(child.dob || ""), education: String(child.education || "") })).filter((child) => child.fullName);

    const newMember = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const prefix = `ARA-${year}-`;
      const latest = await tx.member.findFirst({ where: { memberNo: { startsWith: prefix } }, orderBy: { memberNo: "desc" }, select: { memberNo: true } });
      const lastSeq = latest ? Number(latest.memberNo.split("-").pop() || 0) : 0;
      const memberNo = `${prefix}${String(lastSeq + 1).padStart(5, "0")}`;
      const familyData = familyInfo ? { ...familyInfo, childrenCount: String(cleanChildren.length), childrenDetails: "" } : undefined;
      return tx.member.create({
        data: {
          ...memberData, localArea: memberData.localArea || null, additionalPhotos: additionalPhotosJson, password: null,
          authUserId: authUser.id, paymentStatus: "submitted", memberNo, referrerMemberId: referrer?.id || null,
          referralStatus: referrer ? "pending" : "not_provided",
          ...(familyData ? { familyInfo: { create: familyData } } : {}), ...(cleanChildren.length ? { children: { create: cleanChildren } } : {}),
        },
        include: { familyInfo: true, children: true, referrerMember: { select: { id: true, fullName: true, memberNo: true, city: true } } },
      });
    }, { maxWait: 15000, timeout: 30000 });

    await prisma.formDraft.upsert({
      where: { authUserId_formType: { authUserId: authUser.id, formType: "membership" } },
      update: { data: req.body, currentStep: 5, status: "submitted", completion: 100, paymentStatus: "submitted", submittedAt: new Date() },
      create: { authUserId: authUser.id, formType: "membership", data: req.body, currentStep: 5, completion: 100, status: "submitted", paymentStatus: "submitted", submittedAt: new Date() },
    });

    void sendEmail(MASTER_EMAIL, `New membership application: ${memberData.fullName}`, emailFrame("New membership application", `<p><strong>${memberData.fullName}</strong> has submitted a ${memberData.membershipType} membership form.</p><p>Email: ${memberData.email}<br>Phone: ${memberData.phone}<br>Member No: ${newMember.memberNo}${referrer ? `<br>Referrer: ${referrer.fullName} (${referrer.memberNo})` : ""}</p>`)).catch(console.error);
    void sendEmail(memberData.email, "Membership application received", emailFrame("Application received", `<p>Dear ${memberData.fullName},</p><p>Your application is complete and has been sent to the administration. Your verified session can restore the saved form on this or another device.</p><p>Reference: <strong>${newMember.memberNo}</strong></p>`)).catch(console.error);
    if (referrer?.email) void sendEmail(referrer.email, "You were named as a membership referrer", emailFrame("Membership referral notification", `<p>Dear ${referrer.fullName},</p><p><strong>${memberData.fullName}</strong> has named you as an optional referrer in an Anjuman-e-Araian Faisalabad membership application.</p><p>This does not automatically approve or reject the application. The administration may contact you if verification is required.</p>`)).catch(console.error);

    res.status(201).json(stripPassword(newMember));
  } catch (err: any) {
    if (err.code === "P2002") return void res.status(409).json({ error: "Member with this CNIC or email already exists" });
    next(err);
  }
});

router.post("/import", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 2000) : [];
    if (!rows.length) return void res.status(400).json({ error: "The spreadsheet has no data rows" });
    const value = (row: any, ...names: string[]) => {
      const entries = Object.entries(row || {});
      for (const name of names) {
        const found = entries.find(([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, "") === name.toLowerCase().replace(/[^a-z0-9]/g, ""));
        if (found && found[1] !== undefined && found[1] !== null) return String(found[1]).trim();
      }
      return "";
    };
    const stamp = Date.now().toString().slice(-8);
    const data = rows.map((row: any, index: number) => {
      const genderRaw = value(row, "gender", "sex").toLowerCase();
      const membershipRaw = value(row, "membershipType", "membership", "memberType", "category").toLowerCase();
      const statusRaw = value(row, "status", "memberStatus").toLowerCase();
      const paymentRaw = value(row, "paymentStatus", "payment", "feeStatus").toLowerCase();
      const gender = genderRaw.startsWith("f") ? "female" : genderRaw.startsWith("o") ? "other" : "male";
      const validStatus = ["pending", "approved", "rejected", "inactive", "suspended", "deceased"].includes(statusRaw) ? statusRaw : "approved";
      const validPayment = ["pending", "submitted", "received", "verified", "recorded", "rejected"].includes(paymentRaw) ? paymentRaw : "recorded";
      const photo = value(row, "photoUrl", "photo", "imageUrl", "profilePhoto");
      return {
        memberNo: value(row, "memberNo", "membershipNo", "memberId") || `ARA-IMP-${stamp}-${String(index + 1).padStart(4, "0")}`,
        fullName: value(row, "fullName", "name", "memberName") || "Imported Member",
        fatherName: value(row, "fatherName", "father") || "Not provided",
        cnic: value(row, "cnic", "nic") || `IMPORT-${stamp}-${index + 1}`,
        dob: value(row, "dob", "dateOfBirth", "birthday"), gender, bloodGroup: value(row, "bloodGroup", "blood"),
        email: value(row, "email", "emailAddress"), phone: value(row, "phone", "mobile", "contact"), whatsapp: value(row, "whatsapp", "whatsAppNo"),
        address: value(row, "address"), localArea: value(row, "localArea", "area", "village", "town", "tehsil") || null,
        city: canonicalLocation(value(row, "city")), district: canonicalLocation(value(row, "district")), province: value(row, "province") || "Punjab",
        occupation: value(row, "occupation", "profession") || "Not provided", education: value(row, "education", "qualification") || "Not provided",
        designation: canonicalDesignation(value(row, "designation", "role", "title")), institutionName: value(row, "institutionName", "institute", "organization"), businessName: value(row, "businessName", "business"),
        photoUrl: photo && (photo.startsWith("http://") || photo.startsWith("https://") || photo.startsWith("/api/files/") || photo.startsWith("/uploads/")) ? photo : null,
        memberCell: gender === "female" ? "women" : "male", membershipType: membershipRaw.includes("life") ? "life" : membershipRaw.includes("patron") ? "patron" : membershipRaw.includes("overseas") ? "overseas" : "ordinary",
        password: null, status: validStatus, paymentStatus: validPayment, showOnPortal: true, approvedAt: validStatus === "approved" ? new Date() : null,
      };
    });
    const result = await prisma.member.createMany({ data: data as any, skipDuplicates: true });
    res.status(201).json({ imported: result.count, skipped: data.length - result.count, template: "/templates/member-import-template.csv" });
  } catch (error) { next(error); }
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let isAdmin = false; let isMember = false;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], getJwtSecret()) as { role: string };
        isAdmin = ["admin", "super_admin", "welfare_manager"].includes(decoded.role); isMember = decoded.role === "member";
      } catch { /* public request */ }
    }
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));
    let where: any = {};
    if (isAdmin) { const status = req.query.status ? String(req.query.status) : undefined; if (status) where.status = status; }
    else if (isMember) { where.status = "approved"; where.OR = [{ showOnPortal: true }, { visibility: "public" }]; }
    else { where.status = "approved"; where.OR = [{ showOnWeb: true }, { visibility: "public" }]; }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" },
        select: {
          id: true, memberNo: true, formNo: true, fullName: true, fatherName: true, email: true, phone: true, whatsapp: true, whatsappPublic: true,
          city: true, district: true, province: true, localArea: true, occupation: true, education: true, designation: true, institutionName: true, businessName: true,
          memberCell: true, membershipType: true, photoUrl: true, status: true, paymentStatus: true, createdAt: true, approvedAt: true, isFeatured: true, isFeaturedPortal: true,
          showOnPortal: true, showOnWeb: true, visibility: true,
          ...(isAdmin ? { cnic: true, dob: true, bloodGroup: true, gender: true, address: true, adminNote: true, rejectionReason: true, familyInfo: true, children: true, referralStatus: true, referrerMemberId: true, referrerMember: { select: { id: true, memberNo: true, fullName: true, city: true } }, cnicFrontUrl: true, cnicBackUrl: true, paymentProofUrl: true, additionalPhotos: true } : {})
        }
      }), prisma.member.count({ where }),
    ]);

    const parsedMembers = members.map((m: any) => {
      if (isAdmin) return { ...m, additionalPhotos: parsePhotos(m.additionalPhotos) };
      return { id: m.id, memberNo: m.memberNo, fullName: m.fullName, city: m.city, district: m.district, province: m.province, occupation: m.occupation, education: m.education, designation: m.designation, institutionName: m.institutionName, businessName: m.businessName, memberCell: m.memberCell, membershipType: m.membershipType, photoUrl: m.photoUrl, isFeatured: m.isFeatured, isFeaturedPortal: m.isFeaturedPortal, whatsappPublic: m.whatsappPublic, whatsapp: m.whatsappPublic ? m.whatsapp : "", createdAt: m.createdAt, approvedAt: m.approvedAt };
    });
    res.json({ members: parsedMembers, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.patch("/:id/status", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, adminNote, rejectionReason } = req.body;
    const validStatuses = ["pending", "approved", "rejected", "inactive", "suspended", "deceased"];
    if (!validStatuses.includes(status)) return void res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });

    const current = await prisma.member.findUnique({ where: { id }, select: { id: true, memberNo: true, fullName: true, email: true, membershipType: true, paymentStatus: true } });
    if (!current) return void res.status(404).json({ error: "Member not found" });
    if (status === "approved" && !["received", "verified", "recorded"].includes(String(current.paymentStatus || ""))) return void res.status(400).json({ error: "Verify or record the membership fee before approving this member." });

    const settings = status === "approved" ? await prisma.siteSettings.findUnique({ where: { id: "settings" } }) : null;
    const tiers = ((settings?.membershipTiers as any[])?.length ? settings?.membershipTiers as any[] : defaultTiers);
    const tier = tiers.find((t: any) => String(t.type) === current.membershipType) || defaultTiers.find((t) => t.type === current.membershipType) || defaultTiers[0];
    const amount = parseAmount(tier?.fee || "0");
    const reference = `membership:${current.id}`;
    const receiptNo = `AAF-RCP-${current.memberNo}`;

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.member.update({
        where: { id }, data: { status, adminNote, rejectionReason, approvedAt: status === "approved" ? new Date() : null },
        select: { id: true, memberNo: true, fullName: true, email: true, phone: true, status: true, membershipType: true, paymentStatus: true, createdAt: true, approvedAt: true }
      });
      let receipt: any = null;
      if (status === "approved") {
        receipt = await tx.revenueRecord.upsert({
          where: { reference },
          update: { customerName: current.fullName, itemName: tier?.name || "Membership", amount, paymentFrequency: frequency(tier?.fee || ""), receiptNo },
          create: { customerName: current.fullName, itemType: "membership", itemName: tier?.name || "Membership", amount, paymentFrequency: frequency(tier?.fee || ""), reference, receiptNo },
        });
      }
      return { member, receipt };
    });

    if (["approved", "rejected", "suspended"].includes(status)) {
      void sendEmail(
        result.member.email,
        status === "approved" ? "Your membership is approved" : "Membership application update",
        emailFrame(status === "approved" ? "Membership approved" : "Application update", status === "approved"
          ? `<p>Dear ${result.member.fullName},</p><p>Your Anjuman-e-Araian Faisalabad membership has been approved.</p><p>Member No: <strong>${result.member.memberNo}</strong><br>Receipt No: <strong>${receiptNo}</strong><br>Recorded Fee: <strong>${tier?.fee || amount}</strong></p><p>Your official PDF receipt is available from your member record.</p>`
          : `<p>Dear ${result.member.fullName},</p><p>Your membership/application status is now <strong>${status}</strong>. ${rejectionReason || "Please contact the office for details."}</p>`)
      ).catch(console.error);
    }
    res.json({ ...result.member, receipt: result.receipt ? { receiptNo: result.receipt.receiptNo, reference: result.receipt.reference, amount: result.receipt.amount } : null });
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Member not found" });
    next(err);
  }
});

router.get("/:id/receipt", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const user = (req as any).user;
    const member = await prisma.member.findUnique({ where: { id }, select: { id: true, authUserId: true, memberNo: true, fullName: true, membershipType: true } });
    if (!member) return void res.status(404).json({ error: "Member not found" });
    const isAdmin = ["admin", "super_admin", "welfare_manager"].includes(String(user.role));
    const ownsLegacy = user.role === "member" && user.id === member.id;
    const ownsVerified = user.role === "applicant" && user.id === member.authUserId;
    if (!isAdmin && !ownsLegacy && !ownsVerified) return void res.status(403).json({ error: "You cannot access this receipt" });
    const record = await prisma.revenueRecord.findUnique({ where: { reference: `membership:${id}` } });
    if (!record || !record.receiptNo) return void res.status(404).json({ error: "No official receipt has been generated for this member yet" });
    const pdf = createReceiptPdf({ receiptNo: record.receiptNo, date: record.date, payerName: record.customerName, memberNo: member.memberNo, itemName: record.itemName, amount: record.amount, paymentStatus: "Verified", reference: record.reference });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${record.receiptNo}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(pdf);
  } catch (err) { next(err); }
});

router.patch("/:id", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const user = (req as any).user;
    if (user.role === "member" && user.id !== id) return void res.status(403).json({ error: "Access denied. You can only update your own profile." });
    if (!["admin", "super_admin", "welfare_manager", "member", "applicant"].includes(user.role)) return void res.status(403).json({ error: "Access denied" });

    const current = await prisma.member.findUnique({ where: { id }, select: { authUserId: true, status: true, photoUrl: true, cnicFrontUrl: true, cnicBackUrl: true, paymentProofUrl: true, additionalPhotos: true } });
    if (!current) return void res.status(404).json({ error: "Member not found" });
    if (user.role === "applicant" && current.authUserId !== user.id) return void res.status(403).json({ error: "This application does not belong to your account" });

    const rawUpdates = { ...req.body };
    const adminLike = ["admin", "super_admin", "welfare_manager"].includes(String(user.role));
    let passwordHash: string | undefined;
    if (adminLike && typeof rawUpdates.password === "string" && rawUpdates.password.trim()) {
      if (rawUpdates.password.trim().length < 8) return void res.status(400).json({ error: "Temporary password must be at least 8 characters." });
      passwordHash = await bcrypt.hash(rawUpdates.password.trim(), 12);
    }
    const memberEditableFields = new Set(["fullName", "fatherName", "dob", "gender", "bloodGroup", "phone", "whatsapp", "whatsappPublic", "address", "localArea", "city", "district", "province", "occupation", "education", "designation", "institutionName", "businessName", "familyInfoPublic", "photoUrl", "cnicFrontUrl", "cnicBackUrl", "paymentProofUrl", "additionalPhotos"]);
    let updates: any = rawUpdates;
    if (user.role === "member" || user.role === "applicant") updates = Object.fromEntries(Object.entries(rawUpdates).filter(([key]) => memberEditableFields.has(key)));
    else { delete updates.id; delete updates.createdAt; delete updates.updatedAt; }
    delete updates.email; delete updates.authUserId; delete updates.familyInfo; delete updates.children; delete updates.password;
    if (passwordHash) updates.password = passwordHash;
    delete updates.status; delete updates.approvedAt; delete updates.adminNote; delete updates.rejectionReason;
    if (!adminLike) {
      delete updates.memberNo; delete updates.formNo; delete updates.paymentStatus; delete updates.referrerMemberId; delete updates.referralStatus; delete updates.showOnWeb; delete updates.showOnPortal; delete updates.visibility;
    }
    if (typeof updates.city === "string") updates.city = canonicalLocation(updates.city);
    if (typeof updates.district === "string") updates.district = canonicalLocation(updates.district);
    if (typeof updates.designation === "string") updates.designation = canonicalDesignation(updates.designation);
    if (Array.isArray(updates.additionalPhotos)) updates.additionalPhotos = JSON.stringify(updates.additionalPhotos);

    const before = [current.photoUrl, current.cnicFrontUrl, current.cnicBackUrl, current.paymentProofUrl, ...parsePhotos(current.additionalPhotos)];
    const updated = await prisma.member.update({
      where: { id }, data: updates,
      select: { id: true, memberNo: true, fullName: true, email: true, phone: true, status: true, photoUrl: true, cnicFrontUrl: true, cnicBackUrl: true, paymentProofUrl: true, additionalPhotos: true, createdAt: true }
    });
    const after = [updated.photoUrl, updated.cnicFrontUrl, updated.cnicBackUrl, updated.paymentProofUrl, ...parsePhotos(updated.additionalPhotos)];
    await cleanupRemovedFiles(before, after);
    res.json({ ...updated, additionalPhotos: parsePhotos(updated.additionalPhotos) });
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Member not found" });
    next(err);
  }
});

router.post("/:id/change-password", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id); const user = (req as any).user;
    if (user.role === "member" && user.id !== id) return void res.status(403).json({ error: "Access denied" });
    if (!["admin", "super_admin", "member"].includes(user.role)) return void res.status(403).json({ error: "Use email or Google sign-in for this account" });
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || String(newPassword).length < 8) return void res.status(400).json({ error: "Current password and a new password of at least 8 characters are required" });
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) return void res.status(404).json({ error: "Member not found" });
    const matches = member.password ? await bcrypt.compare(currentPassword, member.password) : false;
    if (!matches) return void res.status(401).json({ error: "Current password is incorrect" });
    await prisma.member.update({ where: { id }, data: { password: await bcrypt.hash(newPassword, 12) } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete("/:id", requireWelfareAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const removed = await prisma.member.delete({ where: { id: String(req.params.id) } });
    await cleanupRemovedFiles([removed.photoUrl, removed.cnicFrontUrl, removed.cnicBackUrl, removed.paymentProofUrl, ...parsePhotos(removed.additionalPhotos)], []);
    res.json({ message: "Member deleted successfully" });
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Member not found" });
    next(err);
  }
});

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return void res.status(401).json({ error: "No token provided" });
    const decoded = jwt.verify(authHeader.split(" ")[1], getJwtSecret()) as any;
    const where = decoded.role === "applicant" ? { OR: [{ authUserId: decoded.id }, { email: { equals: decoded.email, mode: "insensitive" as const } }] } : { id: decoded.id };
    const member = await prisma.member.findFirst({ where, include: { familyInfo: true, children: { orderBy: { createdAt: "asc" } }, referrerMember: { select: { id: true, memberNo: true, fullName: true, city: true } } } });
    if (!member) return void res.status(404).json({ error: "No submitted membership profile yet" });
    res.json({ ...stripPassword(member), family: member.familyInfo, additionalPhotos: parsePhotos(member.additionalPhotos) });
  } catch (err: any) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") return void res.status(401).json({ error: "Invalid or expired token" });
    next(err);
  }
});

export default router;
