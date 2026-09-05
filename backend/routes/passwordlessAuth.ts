import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import prisma from "../lib/prisma";
import { emailFrame, sendEmail } from "../lib/email";
import { loginLimiter } from "../middleware/rateLimiter";

const router = Router();
const google = new OAuth2Client();
const normalize = (value: unknown) => String(value || "").trim().toLowerCase();
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function secret() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return process.env.JWT_SECRET;
}

async function issueSession(email: string, name?: string, provider = "email") {
  const existingMember = await prisma.member.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  const user = await prisma.authUser.upsert({
    where: { email },
    update: { name: name || undefined, provider, verifiedAt: new Date() },
    create: { email, name, provider },
  });
  if (existingMember && !existingMember.authUserId) {
    await prisma.member.update({ where: { id: existingMember.id }, data: { authUserId: user.id } });
  }
  const member = existingMember ? { ...existingMember, password: undefined } : null;
  const token = jwt.sign({ id: user.id, email, role: "applicant", memberId: existingMember?.id }, secret(), { expiresIn: "30d" });
  return { token, user: { id: user.id, email, name: user.name, provider }, member };
}

router.post("/email/request-otp", loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normalize(req.body?.email);
    if (!validEmail.test(email)) return void res.status(400).json({ error: "Enter a valid email address" });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    await prisma.emailOtp.deleteMany({ where: { email, consumedAt: null } });
    await prisma.emailOtp.create({ data: { email, codeHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    const delivery = await sendEmail(email, "Your Anjuman login code", emailFrame("Your verification code", `<p>Use this one-time code to securely sign in:</p><p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#1a4d2e">${code}</p><p>This code expires in 10 minutes. Never share it with anyone.</p>`));
    res.json({ ok: true, message: "If the address is valid, a code has been sent.", ...(!delivery.sent && process.env.NODE_ENV !== "production" ? { devOtp: code } : {}) });
  } catch (error) { next(error); }
});

router.post("/email/verify-otp", loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normalize(req.body?.email);
    const code = String(req.body?.code || "").trim();
    const record = await prisma.emailOtp.findFirst({ where: { email, consumedAt: null }, orderBy: { createdAt: "desc" } });
    if (!record || record.expiresAt < new Date()) return void res.status(401).json({ error: "Code expired. Request a new code." });
    if (record.attempts >= 5) return void res.status(429).json({ error: "Too many attempts. Request a new code." });
    const matches = await bcrypt.compare(code, record.codeHash);
    if (!matches) {
      await prisma.emailOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      return void res.status(401).json({ error: "Incorrect verification code" });
    }
    await prisma.emailOtp.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    res.json(await issueSession(email));
  } catch (error) { next(error); }
});

router.post("/google", loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credential = String(req.body?.credential || "");
    const audience = process.env.GOOGLE_CLIENT_ID;
    if (!audience) return void res.status(503).json({ error: "Google sign-in is not configured yet" });
    const ticket = await google.verifyIdToken({ idToken: credential, audience });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) return void res.status(401).json({ error: "Google email could not be verified" });
    res.json(await issueSession(normalize(payload.email), payload.name, "google"));
  } catch (error) { next(error); }
});

export default router;
