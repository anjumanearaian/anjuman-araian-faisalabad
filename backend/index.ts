import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { put } from "@vercel/blob";

import prisma from "./lib/prisma";
import membersRouter from "./routes/members";
import businessesRouter from "./routes/businesses";
import matrimonialRouter from "./routes/matrimonial";
import contentRouter from "./routes/content";
import { loginLimiter, apiLimiter, uploadLimiter } from "./middleware/rateLimiter";
import { requireSuperAdmin, requireAdmin } from "./middleware/auth";


const app = express();
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

const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without Origin are server-to-server. Vercel preview domains are
      // allowed so every preview deployment works before the custom domain is linked.
      const isVercelPreview = Boolean(origin && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin));
      if (!origin || allowedOrigins.has(origin) || isVercelPreview) {
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
import activitiesRouter from "./routes/activities";
import eventsRouter from "./routes/events";
import homepageRouter from "./routes/homepage";
import servicesRouter from "./routes/services";

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/members", membersRouter);
app.use("/api/businesses", businessesRouter);
app.use("/api/matrimonial", matrimonialRouter);
app.use("/api/content", contentRouter);
app.use("/api/media", mediaRouter);
app.use("/api/overseas", overseasRouter);
app.use("/api/leadership", leadershipRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/revenue", revenueRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/homepage", homepageRouter);
app.use("/api/services", servicesRouter);

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

  const ok = database === "connected" && authConfigured;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "setup_required",
    version: "4.1.0",
    database,
    authentication: authConfigured ? "configured" : "not_configured",
    storage: storageConfigured ? "configured" : "not_configured",
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
          contactEmail: "info@anjumanearaian.org",
          contactPhone: "+92 300 865 5522",
          address: "Central Secretariat, Anjuman-e-Araian, Faisalabad, Pakistan",
          facebookUrl: "https://facebook.com",
          twitterUrl: "https://twitter.com",
          instagramUrl: "https://instagram.com",
          linkedinUrl: "https://linkedin.com",
        },
      });
    }
    res.json(settings);
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
      contactEmail: payload.contactEmail || "info@anjumanearaian.org",
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

      const ext = path.extname(req.file.originalname || "").toLowerCase();
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

      // Local development only. Never rely on this branch in Vercel production.
      if (process.env.VERCEL || process.env.NODE_ENV === "production") {
        res.status(503).json({
          error: "File storage is not configured. Connect a Vercel Blob store to this project.",
        });
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

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);

  res.status(status).json({
    error: isProduction && status === 500 ? "Internal server error" : err.message,
  });
});

// ─── Admin Seed — Create default admin if none exists ─────────────────────────
async function seedAdmin() {
  try {
    const count = await prisma.admin.count();
    if (count === 0) {
      const username = process.env.ADMIN_USERNAME;
      const rawPassword = process.env.ADMIN_PASSWORD;

      if (!username || !rawPassword) {
        console.warn("[SETUP] No admin exists, but ADMIN_USERNAME/ADMIN_PASSWORD are not configured. Admin seed skipped.");
        return;
      }

      const password = rawPassword;
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      await prisma.admin.create({
        data: { username, password: hashedPassword, role: "admin" },
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
