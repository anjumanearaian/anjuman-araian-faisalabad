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
    const current = new URL(String(req.url || "/api/__proxy"), "http://localhost");
    const queryPath = req?.query?.__path;
    const proxyPath = current.searchParams.get("__path") || (Array.isArray(queryPath) ? queryPath[0] : queryPath);
    if (!proxyPath) return;

    const passthrough = new URLSearchParams();
    const sourceQuery = req?.query && typeof req.query === "object" ? req.query : {};
    for (const [key, raw] of Object.entries(sourceQuery)) {
      if (key === "__path" || key === "path") continue;
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values) {
        if (value !== undefined && value !== null) passthrough.append(key, String(value));
      }
    }

    // Some runtimes leave the query only on req.url. Preserve any values that
    // were not exposed through req.query.
    for (const [key, value] of current.searchParams.entries()) {
      if (key === "__path" || key === "path" || passthrough.has(key)) continue;
      passthrough.append(key, value);
    }

    const qs = passthrough.toString();
    req.url = `/api/${String(proxyPath).replace(/^\/+/, "")}${qs ? `?${qs}` : ""}`;
  } catch {}
}

export default async function handler(req: any, res: any) {
  restoreNestedApiPath(req);
  const pathname = String(req.url || "").split("?")[0];
  const match = pathname.match(/\/api\/members\/([^/]+)\/status\/?$/);

  // Approval is the gate that unlocks member-only services. It must not be
  // possible to approve a membership whose payment is only submitted/pending.
  if (match && String(req.method || "").toUpperCase() === "PATCH" && String(bodyOf(req)?.status || "") === "approved") {
    try {
      const authHeader = String(req.headers?.authorization || "");
      if (authHeader.startsWith("Bearer ") && process.env.JWT_SECRET) {
        const user = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET) as any;
        if (["admin", "super_admin"].includes(String(user?.role || ""))) {
          const member = await prisma.member.findUnique({ where: { id: decodeURIComponent(match[1]) }, select: { paymentStatus: true } });
          if (member && !["received", "verified", "recorded"].includes(String(member.paymentStatus || "").toLowerCase())) {
            return res.status(409).json({ error: "Payment must be received or verified before this membership can be approved." });
          }
        }
      }
    } catch {
      // Delegate invalid/expired-token handling to the normal backend middleware.
    }
  }

  return app(req, res);
}
