import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const moduleRef = require("../backend/dist/serverless/matrimonialSelfSync.js");
const matrimonialSelfSync = moduleRef.matrimonialSelfSync;

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, noarchive, nosnippet");
  return matrimonialSelfSync(req, res);
}
