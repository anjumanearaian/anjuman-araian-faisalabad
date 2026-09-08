import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backendModule = require("../../backend/dist/index.js");
const app = backendModule.default ?? backendModule;
const prismaModule = require("../../backend/dist/lib/prisma.js");
const prisma = prismaModule.default ?? prismaModule.prisma;
const jwt = require("jsonwebtoken");

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

export default async function handler(req: any, res: any) {
  // Keep every existing method on the Express backend. This exact Vercel route
  // only intercepts profile PATCH so passwordless applicants can edit their own
  // submitted application while it is still pending admin review.
  if (String(req.method || "GET").toUpperCase() !== "PATCH") {
    return app(req, res);
  }

  try {
    const authHeader = String(req.headers?.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ error: "Authentication is not configured" });
    }

    const token = authHeader.slice(7);
    const user = jwt.verify(token, process.env.JWT_SECRET) as any;
    const id = readId(req);
    if (!id) return res.status(400).json({ error: "Member id is required" });

    const allowedRoles = ["admin", "super_admin", "member", "applicant"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (user.role === "member" && String(user.id) !== id) {
      return res.status(403).json({ error: "Access denied. You can only update your own profile." });
    }

    if (user.role === "applicant") {
      const own = await prisma.member.findUnique({
        where: { id },
        select: { authUserId: true },
      });
      if (!own || String(own.authUserId || "") !== String(user.id || "")) {
        return res.status(403).json({ error: "This membership application does not belong to the verified account." });
      }
    }

    const rawUpdates = { ...readBody(req) };
    const memberEditableFields = new Set([
      "fullName", "fatherName", "dob", "gender", "bloodGroup",
      "email", "phone", "whatsapp", "whatsappPublic", "address",
      "city", "district", "province", "occupation", "education",
      "designation", "institutionName", "businessName",
      "familyInfoPublic", "photoUrl", "cnicFrontUrl", "cnicBackUrl",
      "paymentProofUrl", "additionalPhotos"
    ]);

    let updates: any;
    if (user.role === "member" || user.role === "applicant") {
      updates = Object.fromEntries(
        Object.entries(rawUpdates).filter(([key]) => memberEditableFields.has(key))
      );
    } else {
      updates = { ...rawUpdates };
      delete updates.id;
      delete updates.createdAt;
      delete updates.updatedAt;
      delete updates.memberNo;
    }

    // These values must only be changed through their dedicated admin/auth flows.
    delete updates.authUserId;
    delete updates.familyInfo;
    delete updates.password;
    delete updates.status;
    delete updates.approvedAt;
    delete updates.adminNote;
    delete updates.rejectionReason;

    if (Array.isArray(updates.additionalPhotos)) {
      updates.additionalPhotos = JSON.stringify(updates.additionalPhotos);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: "No editable fields were provided" });
    }

    const updated = await prisma.member.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        memberNo: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Member not found" });
    }
    console.error("[MEMBER_PROFILE_PATCH]", error);
    return res.status(500).json({ error: "Could not save member profile changes" });
  }
}
