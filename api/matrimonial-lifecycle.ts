import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lifecycleModule = require("../backend/dist/serverless/matrimonialLifecycle.js");
const matrimonialLifecycle = lifecycleModule.matrimonialLifecycle;

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, noarchive, nosnippet");
  return matrimonialLifecycle(req, res);
}
