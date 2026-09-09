import { Router } from "express";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import prisma from "../lib/prisma";
import { emailFrame, emailConfigured, sendEmail } from "../lib/email";
import { loginLimiter } from "../middleware/rateLimiter";

const router = Router();
const normalizeEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
function secret() {
  if (!process.env.JWT_SECRET) throw Object.assign(new Error("Login is not configured. Ask the administrator to configure JWT_SECRET."), { status: 503 });
  return process.env.JWT_SECRET;
}
const digest = (email: string, code: string) => createHmac("sha256", secret()).update(`${email}:${code}`).digest("hex");

async function session(email: string, name?: string) {
  const user = await prisma.authUser.upsert({
    where: { email }, update: { verifiedAt: new Date(), ...(name ? { name } : {}) },
    create: { email, name, verifiedAt: new Date() },
  });

  let member = await prisma.member.findUnique({ where: { authUserId: user.id } });

  // Older/imported members may already exist under the same verified email but
  // pre-date AuthUser linking. Attach that record once instead of forcing the
  // person to re-enter an email or create a second profile for business or
  // matrimonial services.
  if (!member) {
    const matchingMember = await prisma.member.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        OR: [{ authUserId: null }, { authUserId: user.id }],
      },
    });
    if (matchingMember) {
      member = matchingMember.authUserId
        ? matchingMember
        : await prisma.member.update({ where: { id: matchingMember.id }, data: { authUserId: user.id } });
    }
  }

  // Keep a verified user signed in for one working day. Drafts live in the
  // database, so an expired browser session never deletes work already saved.
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const token = jwt.sign({ id: user.id, email: user.email, role: "applicant" }, secret(), { expiresIn: "24h" });
  const safeMember = member ? (({ password, ...rest }) => rest)(member) : null;
  return { token, expiresAt, user: { id: user.id, email: user.email, name: user.name }, member: safeMember };
}

router.post("/email/request-otp", loginLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!validEmail(email)) return void res.status(400).json({ error: "Please enter a valid email address." });
    secret();
    if (!emailConfigured()) return void res.status(503).json({ error: "Email delivery is not configured. Ask the administrator to configure SMTP credentials." });
    const code = String(randomInt(100000, 1000000));
    const record = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`;
      const recent = await tx.emailOtp.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
      if (recent && Date.now() - recent.createdAt.getTime() < 60000) return null;
      await tx.emailOtp.updateMany({ where: { email, consumedAt: null }, data: { consumedAt: new Date() } });
      return tx.emailOtp.create({ data: { email, codeHash: digest(email, code), expiresAt: new Date(Date.now() + 600000) } });
    });
    if (!record) return void res.status(429).json({ error: "Please wait 60 seconds before requesting another code." });
    try {
      const delivery = await sendEmail(email, "Your Anjuman-e-Araian login code", emailFrame("Verify your email", `<p>Your login code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes and can be used once. Do not share it.</p>`));
      if (!delivery.sent) throw new Error("SMTP unavailable");
    } catch (error: any) {
      await prisma.emailOtp.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
      console.error("[OTP_DELIVERY_FAILED]", { code: error.code || "MAIL_FAILED", responseCode: error.responseCode });
      return void res.status(502).json({ error: "The email service could not send the code. Ask the administrator to check SMTP credentials and delivery logs." });
    }
    res.json({ message: "A 6-digit code has been sent. It expires in 10 minutes." });
  } catch (error) { next(error); }
});

router.post("/email/verify-otp", loginLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!validEmail(email) || !/^\d{6}$/.test(code)) return void res.status(400).json({ error: "Enter your email and the 6-digit code." });
    secret();
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`;
      const record = await tx.emailOtp.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
      if (!record) return { ok: false, reason: "missing" } as const;
      if (record.consumedAt) return { ok: false, reason: "used" } as const;
      if (record.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "expired" } as const;
      if (record.attempts >= 5) return { ok: false, reason: "attempts" } as const;
      const expected = Buffer.from(record.codeHash, "hex");
      const actual = Buffer.from(digest(email, code), "hex");
      const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
      await tx.emailOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 }, ...(matches ? { consumedAt: new Date() } : {}) } });
      return matches ? { ok: true, reason: "ok" } as const : { ok: false, reason: "wrong" } as const;
    });
    if (!result.ok) {
      const message = result.reason === "expired" ? "This login code has expired. Request a new code."
        : result.reason === "used" ? "This login code has already been used. Request a new code."
        : result.reason === "attempts" ? "Too many incorrect attempts. Request a new code."
        : result.reason === "missing" ? "No active login code was found. Request a new code."
        : "The login code is incorrect. Please check the latest email or request a new code.";
      return void res.status(400).json({ error: message });
    }
    res.json(await session(email));
  } catch (error) { next(error); }
});

router.post("/google", loginLimiter, async (req, res, next) => {
  try {
    secret();
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return void res.status(503).json({ error: "Google sign-in is not configured." });
    if (typeof req.body?.credential !== "string") return void res.status(400).json({ error: "Google credential is required." });
    let payload;
    try {
      const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: req.body.credential, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      return void res.status(401).json({ error: "Google sign-in could not be verified. Please try again." });
    }
    if (!payload?.email || !payload.email_verified) return void res.status(401).json({ error: "A verified Google email is required." });
    res.json(await session(normalizeEmail(payload.email), payload.name));
  } catch (error) { next(error); }
});

export default router;
