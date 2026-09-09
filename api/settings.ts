import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backendModule = require("../backend/dist/index.js");
const app = backendModule.default ?? backendModule;
const prismaModule = require("../backend/dist/lib/prisma.js");
const prisma = prismaModule.default ?? prismaModule.prisma;
const cleanupModule = require("../backend/dist/lib/fileCleanup.js");
const cleanupRemovedFiles = cleanupModule.cleanupRemovedFiles as (before: Array<string | null | undefined>, after: Array<string | null | undefined>) => Promise<void>;
const jwt = require("jsonwebtoken");

function arrayStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function requireAdmin(req: any) {
  const header = String(req.headers?.authorization || "");
  if (!header.startsWith("Bearer ") || !process.env.JWT_SECRET) throw Object.assign(new Error("Admin authentication required"), { statusCode: 401 });
  const user = jwt.verify(header.slice(7), process.env.JWT_SECRET) as any;
  if (!["admin", "super_admin"].includes(String(user?.role || ""))) throw Object.assign(new Error("Admin access required"), { statusCode: 403 });
}

export default async function handler(req: any, res: any) {
  if (String(req.method || "GET").toUpperCase() !== "PUT") return app(req, res);

  try {
    requireAdmin(req);
    const previous = await prisma.siteSettings.findUnique({ where: { id: "settings" } });
    if (!previous) return app(req, res);

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const allowed = [
      "whatsappNumber", "contactEmail", "contactPhone", "address", "facebookUrl", "twitterUrl", "instagramUrl", "linkedinUrl",
      "heroSlides", "paymentMethods", "membershipTiers", "matrimonialPackages",
      "constitutionPdfUrl", "constitutionPdfName", "memorandumPdfUrl", "memorandumPdfName", "rulesPdfUrl", "rulesPdfName"
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) if (body[key] !== undefined) data[key] = body[key];

    const before = [
      ...arrayStrings(previous.heroSlides),
      previous.constitutionPdfUrl,
      previous.memorandumPdfUrl,
      previous.rulesPdfUrl,
    ];

    const updated = await prisma.siteSettings.update({ where: { id: "settings" }, data });
    const after = [
      ...arrayStrings(updated.heroSlides),
      updated.constitutionPdfUrl,
      updated.memorandumPdfUrl,
      updated.rulesPdfUrl,
    ];
    await cleanupRemovedFiles(before, after);
    return res.status(200).json(updated);
  } catch (error: any) {
    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") return res.status(401).json({ error: "Invalid or expired admin session" });
    return res.status(error?.statusCode || 500).json({ error: error?.message || "Could not update site settings" });
  }
}
