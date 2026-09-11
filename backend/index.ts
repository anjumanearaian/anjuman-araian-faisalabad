import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { put } from "@vercel/blob";
import { emailFrame, emailConfigured, sendEmail } from "./lib/email";

import prisma from "./lib/prisma";
import authRouter from "./routes/auth";
import membersRouter from "./routes/members";
import businessesRouter from "./routes/businesses";
import matrimonialRouter from "./routes/matrimonial";

import formDraftsRouter from "./routes/formDrafts";
import contentRouter from "./routes/content";
import { loginLimiter, apiLimiter, uploadLimiter } from "./middleware/rateLimiter";
import { requireSuperAdmin, requireAdmin } from "./middleware/auth";


const app = express();
// Reduce passive fingerprinting and trust the single Vercel/reverse-proxy hop.
app.disable("x-powered-by");
// Vercel/edge proxies provide the real client IP via X-Forwarded-For.
app.set("trust proxy", 1);

// ─── CORS — Restrict to known origins only ──────────────────────────────────
const defaultOrigins = [
  "http://localhost:5173",
  "https://anjumanearaian.org",
  "https://www.anjumanearaian.org",
];

const configuredOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
  .filter(Boolean)
  .map((host) => `https://${String(host).replace(/^https?:\/\//, "")}`);
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins, ...vercelOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without Origin are server-to-server. Preview access is limited
      // to the Vercel URLs injected for this deployment instead of every vercel.app site.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ─── Global Rate Limiter ─────────────────────────────────────────────────────
app.use("/api/", apiLimiter);

// ─── File Upload — Vercel-safe Config ─────────────────────────────────────────
// Vercel Functions do not provide persistent local-disk storage.
// New production uploads go to Vercel Blob. Existing legacy uploads are copied
// into /public/uploads by the deployment package so old URLs keep working.
const uploadDir = path.join(__dirname, "uploads");

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Only JPG, PNG, WebP, GIF and PDF are allowed."));
  },
});

function hasValidFileSignature(file: Express.Multer.File) {
  const b = file.buffer;
  if (!b?.length) return false;
  if (file.mimetype === "image/jpeg") return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (file.mimetype === "image/png") return b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (file.mimetype === "image/webp") return b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
  if (file.mimetype === "image/gif") return b.length >= 6 && ["GIF87a", "GIF89a"].includes(b.toString("ascii", 0, 6));
  if (file.mimetype === "application/pdf") return b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-";
  return false;
}

// Local-development fallback for existing /uploads URLs only.
if (!process.env.VERCEL) {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use("/uploads", express.static(uploadDir));
}

import mediaRouter from "./routes/media";
import overseasRouter from "./routes/overseas";
import leadershipRouter from "./routes/leadership";
import messagesRouter from "./routes/messages";
import revenueRouter from "./routes/revenue";
import governanceRouter from "./routes/governance";
import financeRouter from "./routes/finance";
import activitiesRouter from "./routes/activities";
import eventsRouter from "./routes/events";
import homepageRouter from "./routes/homepage";
import servicesRouter from "./routes/services";

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/members", membersRouter);
app.use("/api/businesses", businessesRouter);
app.use("/api/matrimonial", matrimonialRouter);
app.use("/api/content", contentRouter);
app.use("/api/media", mediaRouter);
app.use("/api/overseas", overseasRouter);
app.use("/api/leadership", leadershipRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/revenue", revenueRouter);
app.use("/api/governance", governanceRouter);
app.use("/api/finance", financeRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/homepage", homepageRouter);
app.use("/api/services", servicesRouter);

app.use("/api/forms", formDraftsRouter);

process.on("unhandledRejection", (reason, promise) => {
  console.error("[UnhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[UncaughtException]", err);
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  const authConfigured = Boolean(process.env.JWT_SECRET);
  const storageConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  let database = "not_configured";

  if (databaseConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "connected";
    } catch (error) {
      database = "unreachable";
    }
  }

  let authTables = "not_checked";
  if (database === "connected") {
    try {
      await Promise.all([
        prisma.admin.findFirst({ select: { id: true } }),
        prisma.authUser.findFirst({ select: { id: true } }),
        prisma.emailOtp.findFirst({ select: { id: true } }),
        prisma.formDraft.findFirst({ select: { id: true } }),
      ]);
      authTables = "ready";
    } catch { authTables = "missing_or_unavailable"; }
  }
  const ok = database === "connected" && authConfigured && authTables === "ready";
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "setup_required",
    version: "5.0.1-auth-fix",
    database,
    authTables,
    authentication: authConfigured ? "configured" : "not_configured",
    storage: storageConfigured ? "vercel_blob" : (databaseConfigured ? "database_fallback" : "not_configured"),
    passwordlessEmail: emailConfigured() ? "configured" : "not_configured",
    googleSignIn: process.env.GOOGLE_CLIENT_ID ? "configured" : "not_configured",
    timestamp: new Date().toISOString(),
  });
});

// ─── Auth — Admin Login ───────────────────────────────────────────────────────
app.post("/api/auth/admin/login", loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Email/Username and password are required" });
      return;
    }

    // Ensure first-deployment credentials are created before the initial login.
    await seedAdmin();

    // Look up admin from DB by username
    const admin = await prisma.admin.findFirst({
      where: { username }
    });
    if (!admin) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    res.json({ token, user: { id: admin.id, username: admin.username, role: admin.role } });
  } catch (err) {
    next(err);
  }
});

const ADMIN_ROLE_OPTIONS = ["super_admin", "admin", "content_manager", "welfare_manager", "finance_secretary", "assistant_finance_secretary"] as const;

// ─── Create Admin User (Super Admin Only) ─────────────────────────────────────
app.post("/api/auth/admin", requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "admin");
    if (!username || !username.includes("@")) return void res.status(400).json({ error: "A valid admin email/username is required" });
    if (password.length < 8) return void res.status(400).json({ error: "Password must be at least 8 characters" });
    if (!ADMIN_ROLE_OPTIONS.includes(role as any)) return void res.status(400).json({ error: "Invalid admin role" });
    const exists = await prisma.admin.findUnique({ where: { username } });
    if (exists) return void res.status(409).json({ error: "An admin account with this email already exists" });
    const hashedPassword = await bcrypt.hash(password, 12);
    const created = await prisma.admin.create({ data: { username, password: hashedPassword, role }, select: { id: true, username: true, role: true, createdAt: true } });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// ─── Change Admin Role (Super Admin Only) ─────────────────────────────────────
app.patch("/api/auth/admin/:id/role", requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const role = String(req.body?.role || "");
    if (!ADMIN_ROLE_OPTIONS.includes(role as any)) return void res.status(400).json({ error: "Invalid admin role" });
    const current = await prisma.admin.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!current) return void res.status(404).json({ error: "Admin account not found" });
    if (current.role === "super_admin" && role !== "super_admin") {
      const superCount = await prisma.admin.count({ where: { role: "super_admin" } });
      if (superCount <= 1) return void res.status(400).json({ error: "The last super admin cannot be demoted" });
    }
    const updated = await prisma.admin.update({ where: { id }, data: { role }, select: { id: true, username: true, role: true, createdAt: true } });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === "P2025") return void res.status(404).json({ error: "Admin account not found" });
    next(err);
  }
});

// ─── List Admins (Super Admin Only) ───────────────────────────────────────────
app.get("/api/auth/admin/list", requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admins = await prisma.admin.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" }
    });
    res.json(admins);
  } catch (err) {
    next(err);
  }
});

// ─── Reset Admin Password (Super Admin Only) ──────────────────────────────────
app.put("/api/auth/admin/reset-password", requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetAdminId, newPassword } = req.body;
    if (!targetAdminId || !newPassword) {
      res.status(400).json({ error: "targetAdminId and newPassword are required" });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.admin.update({
      where: { id: targetAdminId },
      data: { password: hashedPassword }
    });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

// ─── Settings Route (Public) ──────────────────────────────────────────────────
app.get("/api/settings", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: "settings" } });
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: "settings",
          whatsappNumber: "923008655522",
          contactEmail: "anjumanearaianfaisalabad@gmail.com",
          contactPhone: "+92 300 865 5522",
          address: "Central Secretariat, Anjuman-e-Araian, Faisalabad, Pakistan",
          facebookUrl: "https://facebook.com",
          twitterUrl: "https://twitter.com",
          instagramUrl: "https://instagram.com",
          linkedinUrl: "https://linkedin.com",
          membershipTiers: [
            { id: "t1", type: "ordinary", name: "Regular / Annual Member", fee: "Rs. 1,000 / year", description: "Voting rights, welfare access and member directory" },
            { id: "t2", type: "life", name: "Life Member", fee: "Rs. 3,000 once", description: "Permanent membership with all regular-member benefits" },
            { id: "t3", type: "patron", name: "Patron Member", fee: "Rs. 25,000 once", description: "Patron benefits and advisory access" },
            { id: "t4", type: "overseas", name: "Overseas Member", fee: "$100 / year", description: "International chapter access" },
          ],
          matrimonialPackages: [
            { id: "mp1", name: "Member Matrimonial Application", fee: "Rs. 3,000 once", description: "For an approved member or their son/daughter", isFeatured: false },
            { id: "mp2", name: "Non-Member Matrimonial Application", fee: "Rs. 5,000 once", description: "Includes verification and office processing", isFeatured: false },
          ],
        },
      });
    }
    const membershipTiers = Array.isArray(settings.membershipTiers) ? (settings.membershipTiers as any[]).map((tier) => tier.type === "ordinary" ? { ...tier, name: "Regular / Annual Member", fee: "Rs. 1,000 / year" } : tier.type === "life" ? { ...tier, fee: "Rs. 3,000 once" } : tier) : settings.membershipTiers;
    const matrimonialPackages = [
      { id: "mp1", name: "Member Matrimonial Application", fee: "Rs. 3,000 once", description: "For an approved member or their son/daughter; member data is prefilled.", isFeatured: false },
      { id: "mp2", name: "Non-Member Matrimonial Application", fee: "Rs. 5,000 once", description: "For a new applicant, including verification and office processing.", isFeatured: false },
    ];
    res.json({ ...settings, contactEmail: "anjumanearaianfaisalabad@gmail.com", membershipTiers, matrimonialPackages });
  } catch (err) {
    next(err);
  }
});

// ─── Update Settings (Admin) ──────────────────────────────────────────────────
app.put("/api/settings", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const updateData: any = {
      whatsappNumber: payload.whatsappNumber,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      address: payload.address,
      facebookUrl: payload.facebookUrl,
      twitterUrl: payload.twitterUrl,
      instagramUrl: payload.instagramUrl,
      linkedinUrl: payload.linkedinUrl,
      heroSlides: payload.heroSlides,
      paymentMethods: payload.paymentMethods,
      membershipTiers: payload.membershipTiers,
      matrimonialPackages: payload.matrimonialPackages,
      constitutionPdfUrl: payload.constitutionPdfUrl,
      constitutionPdfName: payload.constitutionPdfName,
      memorandumPdfUrl: payload.memorandumPdfUrl,
      memorandumPdfName: payload.memorandumPdfName,
      rulesPdfUrl: payload.rulesPdfUrl,
      rulesPdfName: payload.rulesPdfName,
    };
    const createData: any = {
      id: "settings",
      whatsappNumber: payload.whatsappNumber || "923008655522",
      contactEmail: payload.contactEmail || "anjumanearaianfaisalabad@gmail.com",
      contactPhone: payload.contactPhone || "+92 300 865 5522",
      address: payload.address || "Central Secretariat, Anjuman-e-Araian, Faisalabad, Pakistan",
      facebookUrl: payload.facebookUrl || "https://facebook.com",
      twitterUrl: payload.twitterUrl || "https://twitter.com",
      instagramUrl: payload.instagramUrl || "https://instagram.com",
      linkedinUrl: payload.linkedinUrl || "https://linkedin.com",
      heroSlides: payload.heroSlides || [],
      paymentMethods: payload.paymentMethods || [],
      membershipTiers: payload.membershipTiers || [],
      matrimonialPackages: payload.matrimonialPackages || [],
      constitutionPdfUrl: payload.constitutionPdfUrl,
      constitutionPdfName: payload.constitutionPdfName,
      memorandumPdfUrl: payload.memorandumPdfUrl,
      memorandumPdfName: payload.memorandumPdfName,
      rulesPdfUrl: payload.rulesPdfUrl,
      rulesPdfName: payload.rulesPdfName,
    };
    const settings = await prisma.siteSettings.upsert({
      where: { id: "settings" },
      update: updateData,
      create: createData,
    });
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// ─── File Upload Route ────────────────────────────────────────────────────────
app.post(
  "/api/upload",
  uploadLimiter,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      if (!hasValidFileSignature(req.file)) {
        res.status(400).json({ error: "The uploaded file content does not match its declared file type." });
        return;
      }

      const extByMime: Record<string, string> = {
        "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
        "image/gif": ".gif", "application/pdf": ".pdf",
      };
      const ext = extByMime[req.file.mimetype] || path.extname(req.file.originalname || "").toLowerCase();
      const safeBase = path
        .basename(req.file.originalname || "file", ext)
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .slice(0, 60) || "file";
      const fileName = `anjuman/${safeBase}${ext}`;

      // Production: persistent object storage. Vercel injects BLOB_READ_WRITE_TOKEN
      // when a Blob store is connected to the project.
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(fileName, req.file.buffer, {
          access: "public",
          addRandomSuffix: true,
          contentType: req.file.mimetype,
        });
        res.json({ url: blob.url });
        return;
      }

      // Reliable production fallback: keep small documents in PostgreSQL when
      // Vercel Blob has not been connected yet.
      if (process.env.DATABASE_URL) {
        const stored = await prisma.storedFile.create({
          data: {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            category: String(req.body?.category || "document").slice(0, 40),
            data: req.file.buffer,
          },
        });
        res.json({ url: `/api/files/${stored.id}` });
        return;
      }

      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const localName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      fs.writeFileSync(path.join(uploadDir, localName), req.file.buffer);
      res.json({ url: `/uploads/${localName}` });
    } catch (err) {
      next(err);
    }
  }
);

app.get("/api/files/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = await prisma.storedFile.findUnique({ where: { id: String(req.params.id) } });
    if (!file) return void res.status(404).json({ error: "File not found" });
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", String(file.size));
    res.setHeader("Content-Disposition", `inline; filename="${file.originalName.replace(/[\"\r\n]/g, "")}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(Buffer.from(file.data));
  } catch (error) { next(error); }
});

// Daily birthday automation. Vercel sends CRON_SECRET as a bearer token.
app.get("/api/automation/birthdays", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.authorization !== `Bearer ${expected}`) return void res.status(401).json({ error: "Unauthorized" });
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const today = `${parts.find(p => p.type === "month")?.value}-${parts.find(p => p.type === "day")?.value}`;
    const members = await prisma.member.findMany({ where: { status: "approved", email: { not: "" } }, select: { fullName: true, email: true, dob: true } });
    const birthdays = members.filter((m) => {
      const match = String(m.dob || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
      return match ? `${match[2]}-${match[3]}` === today : false;
    }).slice(0, 100);
    const results = await Promise.allSettled(birthdays.map((member) => sendEmail(member.email, "Happy Birthday from Anjuman-e-Araian Faisalabad", emailFrame("Happy Birthday!", `<p>Dear ${member.fullName},</p><p>Anjuman-e-Araian Faisalabad wishes you a very happy birthday. May the coming year bring health, happiness and success to you and your family.</p>`))));
    res.json({ matched: birthdays.length, sent: results.filter((r) => r.status === "fulfilled" && r.value.sent).length });
  } catch (error) { next(error); }
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found. Confirm that the latest backend is deployed." });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const setupErrors: Record<string, string> = {
    P2021: "Database tables are missing. The administrator must apply the Prisma schema.",
    P2022: "Database columns are missing. The administrator must update the Prisma schema.",
    P1000: "Database credentials were rejected. Check DATABASE_URL.",
    P1001: "Database could not be reached. Check DATABASE_URL and database availability.",
  };
  const setupError = setupErrors[err.code];
  const status = setupError ? 503 : (err.status || err.statusCode || 500);
  const isProduction = process.env.NODE_ENV === "production";

  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);

  res.status(status).json({
    error: setupError || (isProduction && status === 500 ? "Internal server error" : err.message),
  });
});

// ─── Admin Seed — Create default admin if none exists ─────────────────────────
async function seedAdmin() {
  try {
    const count = await prisma.admin.count();
    if (count === 0) {
      const username = process.env.ADMIN_USERNAME || "anjumanearaianfaisalabad@gmail.com";
      const rawPassword = process.env.ADMIN_PASSWORD;

      if (!username || !rawPassword) {
        console.warn("[SETUP] No admin exists, but ADMIN_USERNAME/ADMIN_PASSWORD are not configured. Admin seed skipped.");
        return;
      }

      const password = rawPassword;
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      await prisma.admin.create({
        data: { username, password: hashedPassword, role: "super_admin" },
      });

      console.log(`[SETUP] Admin account created. Username: "${username}"`);
    }
  } catch (err) {
    console.error("[ERROR] Failed to seed admin:", err);
  }
}

// ─── Startup ─────────────────────────────────────────────────────────────────
// Seed once per process/cold start only when credentials are explicitly supplied.
void seedAdmin();

// Local development keeps the traditional listener. On Vercel, the Express app
// is exported and invoked by /api/index.ts or /api/[...path].ts.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[SERVER] Running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
  });
}

export default app;
