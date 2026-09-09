import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backendModule = require("../backend/dist/index.js");
const app = backendModule.default ?? backendModule;
const prismaModule = require("../backend/dist/lib/prisma.js");
const prisma = prismaModule.default ?? prismaModule.prisma;
const jwt = require("jsonwebtoken");

function bodyOf(req: any) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function restoreNestedApiPath(req: any) {
  try {
    const rawUrl = String(req.url || "");
    const parsed = new URL(rawUrl || "/", "http://localhost");
    const prefix = "__proxy__";

    let encoded = "";
    const pathnamePrefix = `/api/${prefix}`;
    if (parsed.pathname.startsWith(pathnamePrefix)) encoded = parsed.pathname.slice(pathnamePrefix.length);

    const caughtPath = req?.query?.path;
    const caught = Array.isArray(caughtPath) ? caughtPath.join("/") : String(caughtPath || "");
    if (!encoded && caught.startsWith(prefix)) encoded = caught.slice(prefix.length);
    if (!encoded) return;

    const nested = encoded
      .split("__")
      .filter(Boolean)
      .map((part) => {
        try { return decodeURIComponent(part); } catch { return part; }
      })
      .join("/");
    if (!nested) return;

    const passthrough = new URLSearchParams();
    const sourceQuery = req?.query && typeof req.query === "object" ? req.query : {};
    for (const [key, raw] of Object.entries(sourceQuery)) {
      if (key === "path") continue;
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values) if (value !== undefined && value !== null) passthrough.append(key, String(value));
    }
    for (const [key, value] of parsed.searchParams.entries()) {
      if (key === "path" || passthrough.has(key)) continue;
      passthrough.append(key, value);
    }

    const qs = passthrough.toString();
    req.url = `/api/${nested}${qs ? `?${qs}` : ""}`;
  } catch {}
}

function adminUser(req: any) {
  try {
    const authHeader = String(req.headers?.authorization || "");
    if (!authHeader.startsWith("Bearer ") || !process.env.JWT_SECRET) return null;
    const user = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET) as any;
    return ["admin", "super_admin"].includes(String(user?.role || "")) ? user : null;
  } catch { return null; }
}

function text(value: any, fallback = "") { return String(value ?? fallback).trim(); }

async function createAdminMember(req: any, res: any) {
  const user = adminUser(req);
  if (!user) return res.status(401).json({ error: "Admin authorization required" });
  const b = bodyOf(req);
  const fullName = text(b.fullName);
  const fatherName = text(b.fatherName);
  const cnic = text(b.cnic);
  const phone = text(b.phone);
  if (!fullName || !fatherName || !cnic || !phone) return res.status(400).json({ error: "Full name, father name, CNIC and phone are required." });

  const email = text(b.email);
  const duplicate = await prisma.member.findFirst({
    where: { OR: [{ cnic }, ...(email ? [{ email: { equals: email, mode: "insensitive" } }] : [])] },
    select: { id: true, cnic: true, email: true },
  });
  if (duplicate) return res.status(409).json({ error: duplicate.cnic === cnic ? "A member with this CNIC already exists" : "A member with this email already exists" });

  const familyInfo = b.familyInfo && typeof b.familyInfo === "object" ? b.familyInfo : null;
  const children = Array.isArray(b.children) ? b.children.filter((c: any) => text(c?.fullName)).slice(0, 20) : [];
  const validStatuses = ["pending", "approved", "rejected", "inactive", "suspended", "deceased"];
  const validPayments = ["pending", "submitted", "received", "verified", "recorded", "rejected"];
  const status = validStatuses.includes(text(b.status)) ? text(b.status) : "pending";
  const paymentStatus = validPayments.includes(text(b.paymentStatus)) ? text(b.paymentStatus) : "pending";

  try {
    const created = await prisma.$transaction(async (tx: any) => {
      const year = new Date().getFullYear();
      let memberNo = text(b.memberNo);
      if (!memberNo) {
        const prefix = `ARA-${year}-`;
        const latest = await tx.member.findFirst({ where: { memberNo: { startsWith: prefix } }, orderBy: { memberNo: "desc" }, select: { memberNo: true } });
        const lastSeq = latest ? Number(String(latest.memberNo).split("-").pop() || 0) : 0;
        memberNo = `${prefix}${String(lastSeq + 1).padStart(5, "0")}`;
      }

      let formNo = text(b.formNo);
      if (!formNo) {
        const prefix = `AAF-FORM-${year}-`;
        const latest = await tx.member.findFirst({ where: { formNo: { startsWith: prefix } }, orderBy: { formNo: "desc" }, select: { formNo: true } });
        const lastSeq = latest?.formNo ? Number(String(latest.formNo).split("-").pop() || 0) : 0;
        formNo = `${prefix}${String(lastSeq + 1).padStart(5, "0")}`;
      }

      return tx.member.create({
        data: {
          formNo, memberNo, fullName, fatherName, cnic,
          dob: text(b.dob), gender: text(b.gender, "male") || "male", bloodGroup: text(b.bloodGroup),
          email, phone, whatsapp: text(b.whatsapp), whatsappPublic: Boolean(b.whatsappPublic),
          address: text(b.address), localArea: text(b.localArea) || null,
          city: text(b.city, "Faisalabad") || "Faisalabad",
          district: text(b.district) || text(b.city, "Faisalabad") || "Faisalabad",
          province: text(b.province, "Punjab") || "Punjab",
          occupation: text(b.occupation, "Not provided") || "Not provided",
          education: text(b.education, "Not provided") || "Not provided",
          designation: text(b.designation) || null, institutionName: text(b.institutionName) || null, businessName: text(b.businessName) || null,
          memberCell: text(b.memberCell) || (text(b.gender).toLowerCase() === "female" ? "women" : "male"),
          membershipType: text(b.membershipType, "ordinary") || "ordinary", password: null,
          paymentStatus, status, visibility: text(b.visibility, "private") || "private",
          showOnWeb: Boolean(b.showOnWeb), showOnPortal: b.showOnPortal !== false,
          photoUrl: text(b.photoUrl) || null, cnicFrontUrl: text(b.cnicFrontUrl) || null, cnicBackUrl: text(b.cnicBackUrl) || null,
          paymentProofUrl: text(b.paymentProofUrl) || null,
          additionalPhotos: Array.isArray(b.additionalPhotos) ? JSON.stringify(b.additionalPhotos) : null,
          adminNote: text(b.adminNote) || null, rejectionReason: text(b.rejectionReason) || null,
          familyInfoPublic: Boolean(b.familyInfoPublic), referrerMemberId: text(b.referrerMemberId) || null,
          referralStatus: text(b.referralStatus, b.referrerMemberId ? "pending" : "not_provided") || "not_provided",
          approvedAt: status === "approved" ? new Date() : null,
          ...(familyInfo ? { familyInfo: { create: { ...familyInfo, childrenCount: String(children.length), childrenDetails: "" } } } : {}),
          ...(children.length ? { children: { create: children.map((c: any) => ({ fullName: text(c.fullName), dob: text(c.dob), education: text(c.education) })) } } : {}),
        },
        include: { familyInfo: true, children: true, referrerMember: { select: { id: true, memberNo: true, fullName: true, city: true } } },
      });
    }, { maxWait: 15000, timeout: 30000 });
    return res.status(201).json(created);
  } catch (error: any) {
    if (error?.code === "P2002") return res.status(409).json({ error: "Form No., Member No., CNIC or email is already in use." });
    throw error;
  }
}

async function saveAdminRelations(req: any, res: any, memberId: string) {
  const user = adminUser(req);
  if (!user) return false;
  const original = bodyOf(req);
  const hasFamily = Object.prototype.hasOwnProperty.call(original, "familyInfo");
  const hasChildren = Object.prototype.hasOwnProperty.call(original, "children");
  const hasEmail = Object.prototype.hasOwnProperty.call(original, "email");
  if (!hasFamily && !hasChildren && !hasEmail) return false;

  const family = original.familyInfo && typeof original.familyInfo === "object" ? original.familyInfo : null;
  const children = Array.isArray(original.children) ? original.children.filter((c: any) => text(c?.fullName)).slice(0, 20) : [];
  const email = text(original.email);

  if (hasEmail && email) {
    const duplicate = await prisma.member.findFirst({ where: { id: { not: memberId }, email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (duplicate) { res.status(409).json({ error: "Another member already uses this email address." }); return true; }
  }

  await prisma.$transaction(async (tx: any) => {
    if (hasEmail) await tx.member.update({ where: { id: memberId }, data: { email } });
    if (hasFamily) {
      if (family) {
        const allowed = ["fatherName","familyBranch","caste","religiousSect","spouseName","childrenCount","childrenDetails","familyContactName","familyContactNumber","familyCity","emergencyContactName","emergencyContactNumber","emergencyRelationship"];
        const data = Object.fromEntries(allowed.map((key) => [key, family[key] == null ? null : String(family[key]) ]));
        data.childrenCount = String(children.length);
        data.childrenDetails = "";
        await tx.familyInfo.upsert({ where: { memberId }, update: data, create: { memberId, ...data } });
      } else await tx.familyInfo.deleteMany({ where: { memberId } });
    }
    if (hasChildren) {
      await tx.memberChild.deleteMany({ where: { memberId } });
      if (children.length) await tx.memberChild.createMany({ data: children.map((c: any) => ({ memberId, fullName: text(c.fullName), dob: text(c.dob), education: text(c.education) })) });
    }
  });

  const nextBody = { ...original };
  delete nextBody.familyInfo; delete nextBody.children; delete nextBody.email;
  req.body = nextBody;
  return false;
}

export default async function handler(req: any, res: any) {
  restoreNestedApiPath(req);
  const pathname = String(req.url || "").split("?")[0];
  const method = String(req.method || "").toUpperCase();

  // The separate approval-center screen used these admin-only operations, but
  // they did not exist in the Express member router. Keep them inside the
  // existing catch-all function so no database connection or Vercel function
  // configuration needs to change.
  if (pathname === "/api/members/admin-create" && method === "POST") {
    try { return await createAdminMember(req, res); }
    catch (error) { return app.emit?.("error", error) || res.status(500).json({ error: "Could not create member." }); }
  }

  const memberEdit = pathname.match(/^\/api\/members\/([^/]+)$/);
  if (memberEdit && method === "PATCH") {
    try {
      const handled = await saveAdminRelations(req, res, decodeURIComponent(memberEdit[1]));
      if (handled) return;
    } catch (error: any) {
      if (error?.code === "P2025") return res.status(404).json({ error: "Member not found" });
      return res.status(500).json({ error: "Member family/contact changes could not be saved." });
    }
  }

  const statusMatch = pathname.match(/\/api\/members\/([^/]+)\/status\/?$/);
  // Clicking Approve in the authenticated admin panel is the administrator's
  // explicit confirmation that the relevant membership fee has been received.
  // Mark it verified immediately before the normal backend approval transaction,
  // which creates/updates the revenue record and official receipt reference.
  if (statusMatch && method === "PATCH" && String(bodyOf(req)?.status || "") === "approved") {
    try {
      const user = adminUser(req);
      if (user) await prisma.member.update({ where: { id: decodeURIComponent(statusMatch[1]) }, data: { paymentStatus: "verified" } });
    } catch {
      // The normal backend middleware will return the authoritative error.
    }
  }

  return app(req, res);
}
