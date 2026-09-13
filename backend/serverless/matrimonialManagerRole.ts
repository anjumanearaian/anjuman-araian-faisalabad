import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

function superAdmin(req: any) {
  const header = String(req.headers?.authorization || "");
  if (!header.startsWith("Bearer ") || !process.env.JWT_SECRET) return null;
  try {
    const user = jwt.verify(header.slice(7).trim(), process.env.JWT_SECRET) as any;
    return user?.role === "super_admin" ? user : null;
  } catch { return null; }
}

function bodyOf(req: any) {
  if (!req?.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export async function createMatrimonialManagerAdmin(req: any, res: any) {
  if (!superAdmin(req)) return res.status(403).json({ error: "Super Admin access required" });
  const body = bodyOf(req);
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!username || !username.includes("@")) return res.status(400).json({ error: "A valid admin email/username is required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const exists = await prisma.admin.findUnique({ where: { username } });
  if (exists) return res.status(409).json({ error: "An admin account with this email already exists" });
  const created = await prisma.admin.create({
    data: { username, password: await bcrypt.hash(password, 12), role: "matrimonial_manager" },
    select: { id: true, username: true, role: true, createdAt: true },
  });
  return res.status(201).json(created);
}

export async function assignMatrimonialManagerRole(req: any, res: any, adminId: string) {
  if (!superAdmin(req)) return res.status(403).json({ error: "Super Admin access required" });
  const current = await prisma.admin.findUnique({ where: { id: adminId }, select: { id: true } });
  if (!current) return res.status(404).json({ error: "Admin account not found" });
  const updated = await prisma.admin.update({
    where: { id: adminId },
    data: { role: "matrimonial_manager" },
    select: { id: true, username: true, role: true, createdAt: true },
  });
  return res.json(updated);
}
