import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lifecycleModule = require("../backend/dist/serverless/matrimonialLifecycle.js");
const selfModule = require("../backend/dist/serverless/matrimonialSelfSync.js");
const matrimonialLifecycle = lifecycleModule.matrimonialLifecycle;
const matrimonialSelfSync = selfModule.matrimonialSelfSync;

function bodyOf(req: any) {
  if (!req?.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, noarchive, nosnippet");
  const parsed = new URL(String(req.url || "/api/matrimonial-lifecycle"), "http://localhost");
  const action = String(bodyOf(req).action || parsed.searchParams.get("action") || "");
  if (action === "self_meta" || action === "self_sync_profile") {
    if (req.body && typeof req.body === "object") req.body = { ...req.body, action: action === "self_meta" ? "meta" : "sync_profile" };
    else req.body = { action: action === "self_meta" ? "meta" : "sync_profile", profileId: parsed.searchParams.get("profileId") || undefined };
    if (action === "self_meta") parsed.searchParams.set("action", "meta");
    req.url = `${parsed.pathname}?${parsed.searchParams.toString().replace("action=self_meta", "action=meta")}`;
    return matrimonialSelfSync(req, res);
  }
  return matrimonialLifecycle(req, res);
}
