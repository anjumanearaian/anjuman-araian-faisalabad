import proxyHandler from "../[...path]";

export default async function handler(req: any, res: any) {
  const raw = String(req.url || "");
  const query = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
  req.url = `/api/__proxy__matrimonial__published${query}`;
  req.query = { ...(req.query || {}), path: "__proxy__matrimonial__published" };
  return proxyHandler(req, res);
}
