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
    if (parsed.pathname.startsWith(pathnamePrefix)) {
      encoded = parsed.pathname.slice(pathnamePrefix.length);
    }

    const caughtPath = req?.query?.path;
    const caught = Array.isArray(caughtPath) ? caughtPath.join("/") : String(caughtPath || "");
    if (!encoded && caught.startsWith(prefix)) {
      encoded = caught.slice(prefix.length);
    }
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
      for (const value of values) {
        if (value !== undefined && value !== null) passthrough.append(key, String(value));
      }
    }
    for (const [key, value] of parsed.searchParams.entries()) {
      if (key === "path" || passthrough.has(key)) continue;
      passthrough.append(key, value);
    }

    const qs = passthrough.toString();
    req.url = `/api/${nested}${qs ? `?${qs}` : ""}`;
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
