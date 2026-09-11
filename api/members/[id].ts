import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backendModule = require("../../backend/dist/index.js");
const app = backendModule.default ?? backendModule;
const prismaModule = require("../../backend/dist/lib/prisma.js");
const prisma = prismaModule.default ?? prismaModule.prisma;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function readBody(req: any) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function readId(req: any) {
  const queryId = req.query?.id;
  if (Array.isArray(queryId)) return String(queryId[0] || "");
  if (queryId) return String(queryId);
  const pathname = String(req.url || "").split("?")[0];
  return decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "");
}

function verifyToken(req: any) {
  const authHeader = String(req.headers?.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    const error: any = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }
  if (!process.env.JWT_SECRET) {
    const error: any = new Error("Authentication is not configured");
    error.statusCode = 503;
    throw error;
  }
  return jwt.verify(authHeader.slice(7), process.env.JWT_SECRET) as any;
}

function requireAdminUser(user: any) {
  if (!["admin", "super_admin", "welfare_manager"].includes(String(user?.role || ""))) {
    const error: any = new Error("Admin access required");
    error.statusCode = 403;
    throw error;
  }
}

async function nextMemberNo() {
  const year = new Date().getFullYear();
  const prefix = `ARA-${year}-`;
  const latest = await prisma.member.findFirst({
    where: { memberNo: { startsWith: prefix } },
    orderBy: { memberNo: "desc" },
    select: { memberNo: true },
  });
  const lastSeq = latest ? Number(String(latest.memberNo).split("-").pop() || 0) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(5, "0")}`;
}

async function syncMembershipDraft(
  authUserId: string | null | undefined,
  updates: Record<string, unknown>,
  familyInfo?: Record<string, unknown> | null,
  children?: any[] | null,
) {
  if (!authUserId) return;
  const draft = await prisma.formDraft.findUnique({
    where: { authUserId_formType: { authUserId, formType: "membership" } },
    select: { data: true },
  });
  if (!draft) return;
  const existing = draft.data && typeof draft.data === "object" && !Array.isArray(draft.data) ? draft.data as Record<string, any> : {};
  const nextData: Record<string, any> = existing.form && typeof existing.form === "object" && !Array.isArray(existing.form)
    ? { ...existing, form: { ...existing.form, ...updates } }
    : { ...existing, ...updates };
  if (familyInfo) nextData.family = { ...(existing.family || {}), ...familyInfo };
  if (children) nextData.children = children;
  await prisma.formDraft.update({
    where: { authUserId_formType: { authUserId, formType: "membership" } },
    data: { data: nextData },
  });
}

export default async function handler(req: any, res: any) {
  const method = String(req.method || "GET").toUpperCase();
  const id = readId(req);

  if (method === "GET" && id === "admin-center") {
    try {
      const user = verifyToken(req);
      requireAdminUser(user);
      const members = await prisma.member.findMany({
        orderBy: { createdAt: "desc" },
        take: 2000,
        include: {
          familyInfo: true,
          children: { orderBy: { createdAt: "asc" } },
          referrerMember: { select: { id: true, memberNo: true, fullName: true, city: true } },
        },
      });
      return res.status(200).json({
        members: members.map((m: any) => ({
          ...m,
          password: undefined,
          additionalPhotos: (() => { try { return m.additionalPhotos ? JSON.parse(m.additionalPhotos) : []; } catch { return []; } })(),
        })),
      });
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Could not load members" });
    }
  }

  if (method === "POST" && id === "admin-create") {
    try {
      const user = verifyToken(req);
      requireAdminUser(user);
      const body = readBody(req);
      const fullName = String(body.fullName || "").trim();
      const fatherName = String(body.fatherName || "").trim();
      const cnic = String(body.cnic || "").trim();
      const phone = String(body.phone || "").trim();
      if (!fullName || !fatherName || !cnic || !phone) return res.status(400).json({ error: "Full name, father name, CNIC and phone are required" });

      const duplicate = await prisma.member.findFirst({
        where: { OR: [
          { cnic },
          ...(String(body.email || "").trim() ? [{ email: String(body.email).trim() }] : []),
          ...(String(body.memberNo || "").trim() ? [{ memberNo: String(body.memberNo).trim() }] : []),
          ...(String(body.formNo || "").trim() ? [{ formNo: String(body.formNo).trim() }] : []),
        ] },
        select: { cnic: true, email: true, memberNo: true, formNo: true },
      });
      if (duplicate) return res.status(409).json({ error: "A member already exists with the same CNIC, email, form number or registration number" });

      const memberNo = String(body.memberNo || "").trim() || await nextMemberNo();
      const status = ["pending", "approved", "rejected", "inactive", "suspended", "deceased"].includes(String(body.status)) ? String(body.status) : "pending";
      const formNo = String(body.formNo || "").trim() || undefined;
      const email = String(body.email || "").trim() || `offline-${Date.now()}@anjuman.local`;
      const additionalPhotos = Array.isArray(body.additionalPhotos) ? JSON.stringify(body.additionalPhotos) : null;
      const children = Array.isArray(body.children) ? body.children.filter((c: any) => String(c?.fullName || "").trim()).slice(0, 20) : [];
      const familyInfo = body.familyInfo && typeof body.familyInfo === "object" ? { ...body.familyInfo, childrenCount: String(children.length), childrenDetails: "" } : null;

      if (status === "approved" && !["received", "verified", "recorded"].includes(String(body.paymentStatus || ""))) {
        return res.status(400).json({ error: "Verify or record payment before creating an approved member." });
      }

      const created = await prisma.member.create({
        data: {
          ...(formNo ? { formNo } : {}), memberNo, fullName, fatherName, cnic,
          dob: String(body.dob || ""), gender: String(body.gender || "male"), bloodGroup: String(body.bloodGroup || ""),
          email, phone, whatsapp: String(body.whatsapp || phone), whatsappPublic: Boolean(body.whatsappPublic),
          address: String(body.address || "Not provided"), localArea: String(body.localArea || "") || null,
          city: String(body.city || "Faisalabad"), district: String(body.district || "Faisalabad"), province: String(body.province || "Punjab"),
          occupation: String(body.occupation || "Other"), education: String(body.education || "Other"), membershipType: String(body.membershipType || "ordinary"),
          password: null, designation: String(body.designation || "") || null, institutionName: String(body.institutionName || "") || null,
          businessName: String(body.businessName || "") || null, memberCell: String(body.memberCell || (String(body.gender) === "female" ? "women" : "male")),
          paymentStatus: String(body.paymentStatus || "pending"), familyInfoPublic: Boolean(body.familyInfoPublic), status,
          visibility: String(body.visibility || "private"), showOnWeb: Boolean(body.showOnWeb), showOnPortal: body.showOnPortal === undefined ? true : Boolean(body.showOnPortal),
          photoUrl: String(body.photoUrl || "") || null, cnicFrontUrl: String(body.cnicFrontUrl || "") || null,
          cnicBackUrl: String(body.cnicBackUrl || "") || null, paymentProofUrl: String(body.paymentProofUrl || "") || null,
          additionalPhotos, adminNote: String(body.adminNote || "") || null, approvedAt: status === "approved" ? new Date() : null,
          referrerMemberId: String(body.referrerMemberId || "") || null,
          referralStatus: String(body.referralStatus || (body.referrerMemberId ? "pending" : "not_provided")),
          ...(familyInfo ? { familyInfo: { create: familyInfo } } : {}),
          ...(children.length ? { children: { create: children.map((c: any) => ({ fullName: String(c.fullName).trim(), dob: String(c.dob || ""), education: String(c.education || "") })) } } : {}),
        },
        include: { familyInfo: true, children: true, referrerMember: { select: { id: true, memberNo: true, fullName: true, city: true } } },
      });
      return res.status(201).json({ ...created, password: undefined, additionalPhotos: [] });
    } catch (error: any) {
      if (error?.code === "P2002") return res.status(409).json({ error: "Form number, registration number or another unique value is already in use" });
      if (error?.code === "P2003") return res.status(400).json({ error: "Selected referrer member is invalid" });
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Could not create member" });
    }
  }

  if (method !== "PATCH") return app(req, res);

  try {
    const user = verifyToken(req);
    if (!id) return res.status(400).json({ error: "Member id is required" });
    if (!["admin", "super_admin", "welfare_manager", "member", "applicant"].includes(user.role)) return res.status(403).json({ error: "Access denied" });

    const current = await prisma.member.findUnique({
      where: { id },
      select: { id: true, authUserId: true, status: true, email: true, cnic: true, formNo: true, memberNo: true },
    });
    if (!current) return res.status(404).json({ error: "Member not found" });

    const isAdmin = ["admin", "super_admin", "welfare_manager"].includes(String(user.role));
    const isApplicant = user.role === "applicant";
    const isMember = user.role === "member";
    if (isMember && String(user.id) !== id) return res.status(403).json({ error: "Access denied. You can only update your own profile." });
    if (isApplicant && String(current.authUserId || "") !== String(user.id || "")) return res.status(403).json({ error: "This membership application does not belong to the verified account." });

    const rawBody = readBody(req);
    const rawUpdates = { ...rawBody };
    let passwordHash: string | undefined;
    if (isAdmin && typeof rawUpdates.password === "string" && rawUpdates.password.trim()) {
      if (rawUpdates.password.trim().length < 8) return res.status(400).json({ error: "Temporary password must be at least 8 characters." });
      passwordHash = await bcrypt.hash(rawUpdates.password.trim(), 12);
    }
    const familyPayload = rawBody.familyInfo && typeof rawBody.familyInfo === "object" ? rawBody.familyInfo : null;
    const childrenPayload = Array.isArray(rawBody.children) ? rawBody.children.slice(0, 20) : null;
    delete rawUpdates.familyInfo;
    delete rawUpdates.children;

    const normalEditableFields = new Set([
      "phone", "whatsapp", "whatsappPublic", "address", "localArea", "city", "district", "province",
      "occupation", "education", "designation", "institutionName", "businessName",
      "familyInfoPublic", "photoUrl", "cnicFrontUrl", "cnicBackUrl", "paymentProofUrl", "additionalPhotos"
    ]);
    const pendingIdentityFields = new Set(["fullName", "fatherName", "cnic", "dob", "gender", "bloodGroup"]);

    let updates: any = {};
    if (isAdmin) {
      updates = { ...rawUpdates };
      delete updates.id; delete updates.createdAt; delete updates.updatedAt;
    } else {
      const canEditIdentity = current.status === "pending";
      updates = Object.fromEntries(Object.entries(rawUpdates).filter(([key]) => normalEditableFields.has(key) || (canEditIdentity && pendingIdentityFields.has(key))));
    }

    delete updates.email; delete updates.authUserId; delete updates.password; delete updates.status; delete updates.approvedAt; delete updates.rejectionReason;
    if (passwordHash) updates.password = passwordHash;
    if (!isAdmin) {
      delete updates.memberNo; delete updates.formNo; delete updates.adminNote; delete updates.paymentStatus; delete updates.visibility;
      delete updates.showOnWeb; delete updates.showOnPortal; delete updates.isFeatured; delete updates.isFeaturedPortal;
      delete updates.referrerMemberId; delete updates.referralStatus;
    }

    if (updates.cnic && String(updates.cnic).trim() !== current.cnic) {
      const other = await prisma.member.findFirst({ where: { cnic: String(updates.cnic).trim(), NOT: { id } }, select: { id: true } });
      if (other) return res.status(409).json({ error: "This CNIC is already registered to another member" });
      updates.cnic = String(updates.cnic).trim();
    }

    for (const key of ["memberNo", "formNo"]) {
      if (isAdmin && updates[key] !== undefined) {
        const value = String(updates[key] || "").trim();
        if (!value) { delete updates[key]; continue; }
        const other = await prisma.member.findFirst({ where: { [key]: value, NOT: { id } }, select: { id: true } });
        if (other) return res.status(409).json({ error: `${key === "formNo" ? "Form number" : "Registration number"} is already in use` });
        updates[key] = value;
      }
    }
    if (Array.isArray(updates.additionalPhotos)) updates.additionalPhotos = JSON.stringify(updates.additionalPhotos);

    if (!Object.keys(updates).length && !familyPayload && !childrenPayload) return res.status(400).json({ error: "No editable fields were provided" });

    const updated = await prisma.$transaction(async (tx: any) => {
      if (Object.keys(updates).length) await tx.member.update({ where: { id }, data: updates });
      if (familyPayload) {
        const safeFamily = { ...familyPayload };
        delete safeFamily.id; delete safeFamily.memberId; delete safeFamily.member;
        if (childrenPayload) { safeFamily.childrenCount = String(childrenPayload.filter((c: any) => String(c?.fullName || "").trim()).length); safeFamily.childrenDetails = ""; }
        await tx.familyInfo.upsert({ where: { memberId: id }, update: safeFamily, create: { memberId: id, ...safeFamily } });
      }
      if (childrenPayload) {
        const clean = childrenPayload.map((c: any) => ({ fullName: String(c?.fullName || "").trim(), dob: String(c?.dob || ""), education: String(c?.education || "") })).filter((c: any) => c.fullName);
        await tx.memberChild.deleteMany({ where: { memberId: id } });
        if (clean.length) await tx.memberChild.createMany({ data: clean.map((c: any) => ({ memberId: id, ...c })) });
      }
      return tx.member.findUnique({
        where: { id },
        include: { familyInfo: true, children: { orderBy: { createdAt: "asc" } }, referrerMember: { select: { id: true, memberNo: true, fullName: true, city: true } } },
      });
    });

    const draftUpdates = { ...updates };
    if (typeof draftUpdates.additionalPhotos === "string") { try { draftUpdates.additionalPhotos = JSON.parse(draftUpdates.additionalPhotos); } catch { delete draftUpdates.additionalPhotos; } }
    await syncMembershipDraft(current.authUserId, draftUpdates, familyPayload, childrenPayload);

    return res.status(200).json({
      ...updated,
      password: undefined,
      additionalPhotos: (() => { try { return updated.additionalPhotos ? JSON.parse(updated.additionalPhotos) : []; } catch { return []; } })(),
    });
  } catch (error: any) {
    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") return res.status(401).json({ error: "Invalid or expired token" });
    if (error?.code === "P2025") return res.status(404).json({ error: "Member not found" });
    if (error?.code === "P2002") return res.status(409).json({ error: "A unique member value is already in use" });
    if (error?.code === "P2003") return res.status(400).json({ error: "Selected linked member is invalid" });
    console.error("[MEMBER_PROFILE_PATCH]", error);
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Could not save member profile changes" });
  }
}
