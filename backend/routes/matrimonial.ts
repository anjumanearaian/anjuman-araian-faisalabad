import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import prisma from "../lib/prisma";
import { requireMatrimonialAdmin, requireMember } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { MASTER_EMAIL, emailFrame, sendEmail } from "../lib/email";

const router = Router();

const urlOrBase64 = z.string()
  .refine(
    (val) => !val || val.startsWith("data:") || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/uploads/") || val.startsWith("/api/files/"),
    { message: "Must be a valid URL or base64 data URI" }
  )
  .nullable()
  .optional();

const JsonObject = z.record(z.any()).optional().default({});

const MatrimonialSchema = z.object({
  profileId: z.string().uuid().optional(),
  name: z.string().min(2).max(100),
  gender: z.enum(["male", "female"]),
  age: z.string().min(1).max(10),
  city: z.string().min(1).max(100),
  country: z.string().min(2).max(100).optional().default("Pakistan"),
  province: z.string().max(100).optional(),
  dateOfBirth: z.string().max(30).optional(),
  heightCm: z.number().int().min(120).max(230).nullable().optional(),
  maritalStatus: z.string().max(80).optional(),
  nationality: z.string().max(100).optional(),
  residenceStatus: z.string().max(120).optional(),
  employmentType: z.string().max(120).optional(),
  employerType: z.string().max(120).optional(),
  incomeBand: z.string().max(120).optional(),
  currency: z.string().max(12).optional().default("PKR"),
  education: z.string().min(2).max(150),
  profession: z.string().min(2).max(150),
  familyBackground: z.string().max(3000).optional(),
  requirements: z.string().max(3000).optional(),
  contact: z.string().regex(/^\+?[0-9\s\-]{10,20}$/, "Invalid contact number"),
  photoUrl: urlOrBase64,
  additionalPhotos: z.array(z.string()).max(12).optional(),
  paymentProofUrl: urlOrBase64,
  packageId: z.string().optional(),
  relationToCandidate: z.string().max(100).optional(),
  profileData: JsonObject,
  preferenceData: JsonObject,
  privacyData: JsonObject,
  candidateConsent: z.boolean().optional().default(false),
  applicationSource: z.enum(["self_service", "guardian_service", "admin_manual"]).optional(),
  paymentSenderName: z.string().max(180).optional(),
  paymentMethod: z.string().max(80).optional(),
  paymentReference: z.string().max(180).optional(),
});

const MatchRequestSchema = z.object({
  requesterProfileId: z.string().uuid(),
  targetProfileId: z.string().uuid(),
  requesterMessage: z.string().max(1000).optional(),
});

const AdminCreateSchema = MatrimonialSchema.omit({ profileId: true }).extend({
  status: z.enum(["pending", "approved", "rejected"]).optional().default("pending"),
  paymentStatus: z.enum(["pending", "submitted", "received", "verified", "rejected"]).optional().default("pending"),
  showOnPortal: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
  adminNote: z.string().max(1500).optional(),
});

const profileCode = (id: string) => `AAF-MAT-${String(id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const paymentCleared = (status?: string | null) => ["received", "verified"].includes(String(status || "").toLowerCase());
const cleanText = (v: unknown) => String(v ?? "").trim();
const normalize = (v: unknown) => cleanText(v).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

function parsePhotos(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  try { const parsed = JSON.parse(String(value)); return Array.isArray(parsed) ? parsed.filter(Boolean) : []; } catch { return []; }
}

function jsonValue(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function fullProfile(p: any) {
  return {
    ...p,
    profileCode: profileCode(p.id),
    additionalPhotos: parsePhotos(p.additionalPhotos),
    profileData: jsonValue(p.profileData),
    preferenceData: jsonValue(p.preferenceData),
    privacyData: jsonValue(p.privacyData),
  };
}

function anonymizedProfile(p: any) {
  const privacy = jsonValue(p.privacyData);
  const profile = jsonValue(p.profileData);
  const broadLocation = privacy.broadLocation !== false;
  return {
    id: p.id,
    profileCode: profileCode(p.id),
    gender: p.gender,
    age: p.age,
    country: p.country || "Pakistan",
    province: p.province || undefined,
    city: broadLocation ? p.city : undefined,
    education: p.education,
    profession: p.profession,
    maritalStatus: p.maritalStatus || profile.maritalStatus || undefined,
    heightCm: privacy.showHeight === false ? undefined : (p.heightCm || profile.heightCm || undefined),
    residenceStatus: p.residenceStatus || profile.residenceStatus || undefined,
    isFeatured: Boolean(p.isFeatured),
    verificationStatus: p.verificationStatus || "unverified",
    profileCompleteness: Number(p.profileCompleteness || 0),
    createdAt: p.createdAt,
  };
}

function expandedProfile(p: any, opts: { photo?: boolean; contact?: boolean } = {}) {
  const privacy = jsonValue(p.privacyData);
  return {
    ...anonymizedProfile(p),
    name: p.name,
    familyBackground: p.familyBackground,
    profileData: jsonValue(p.profileData),
    relationToCandidate: p.relationToCandidate,
    photoUrl: opts.photo && privacy.photoVisibility !== "admin_only" ? p.photoUrl : undefined,
    additionalPhotos: opts.photo && privacy.photoVisibility !== "admin_only" ? parsePhotos(p.additionalPhotos) : undefined,
    contact: opts.contact && privacy.contactVisibility !== "admin_only" ? p.contact : undefined,
  };
}

function clientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) return forwarded[0]?.split(",")[0]?.trim() || req.ip || null;
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || req.ip || null;
  return req.ip || null;
}

async function audit(req: Request, action: string, profileId?: string | null, requestId?: string | null, details?: any) {
  const user = (req as any).user || {};
  const payload = details === undefined ? null : JSON.stringify(details);
  await prisma.$executeRaw`
    INSERT INTO "MatrimonialAuditLog" ("profileId","requestId","action","actorId","actorName","actorRole","ipAddress","userAgent","details")
    VALUES (${profileId || null}, ${requestId || null}, ${action}, ${user.id || null}, ${user.email || user.username || null}, ${user.role || "public"}, ${clientIp(req)}, ${req.get("user-agent") || null}, ${payload}::jsonb)
  `;
}

async function rawProfile(id: string) {
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "Matrimonial" WHERE "id" = ${id} LIMIT 1`;
  return rows[0] ? fullProfile(rows[0]) : null;
}

async function rawProfilesByUser(authUserId: string) {
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "Matrimonial" WHERE "authUserId" = ${authUserId} AND "isActive" = true ORDER BY "createdAt" DESC`;
  return rows.map(fullProfile);
}

function importanceWeight(value: unknown) {
  const key = normalize(value);
  if (key === "must" || key === "must have") return 5;
  if (key === "very important" || key === "high") return 4;
  if (key === "important") return 3;
  if (key === "preferred" || key === "preference") return 2;
  if (key === "nice" || key === "nice to have") return 1;
  return 0;
}

function list(value: any): string[] {
  if (Array.isArray(value)) return value.map((v) => cleanText(v)).filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
}

function layeredValueScore(pref: any, candidateValue: unknown) {
  const candidate = normalize(candidateValue);
  const primary = list(pref?.primary).map(normalize);
  const secondary = list(pref?.secondary).map(normalize);
  const acceptable = list(pref?.acceptable).map(normalize);
  const configured = primary.length + secondary.length + acceptable.length > 0;
  if (!configured) return { configured: false, known: Boolean(candidate), score: 1, label: "No preference" };
  if (!candidate) return { configured: true, known: false, score: 0, label: "Not specified" };
  const matches = (values: string[]) => values.some((v) => v === candidate || candidate.includes(v) || v.includes(candidate));
  if (matches(primary)) return { configured: true, known: true, score: 1, label: "Primary preference" };
  if (matches(secondary)) return { configured: true, known: true, score: 0.8, label: "Secondary preference" };
  if (matches(acceptable)) return { configured: true, known: true, score: 0.6, label: "Acceptable preference" };
  return { configured: true, known: true, score: 0, label: "Outside preference" };
}

function rangeScore(pref: any, candidateValue: unknown) {
  const min = Number(pref?.min || 0);
  const max = Number(pref?.max || 0);
  if (!min && !max) return { configured: false, known: Boolean(candidateValue), score: 1, label: "No preference" };
  const value = Number(candidateValue || 0);
  if (!value) return { configured: true, known: false, score: 0, label: "Not specified" };
  if ((!min || value >= min) && (!max || value <= max)) return { configured: true, known: true, score: 1, label: "Within range" };
  const delta = min && value < min ? min - value : max && value > max ? value - max : 0;
  const tolerance = Math.max(3, Math.round(((max || min || value) - (min || value)) * 0.25));
  return { configured: true, known: true, score: delta <= tolerance ? 0.5 : 0, label: delta <= tolerance ? "Near preferred range" : "Outside range" };
}

function numericIncome(value: unknown) {
  if (typeof value === "number") return value;
  const text = cleanText(value).replace(/,/g, "");
  const nums = text.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!nums.length) return 0;
  let n = Math.max(...nums);
  if (/\bk\b/i.test(text)) n *= 1000;
  if (/\bm\b/i.test(text)) n *= 1000000;
  return n;
}

function directionalScore(owner: any, candidate: any) {
  const pref = jsonValue(owner.preferenceData);
  const profile = jsonValue(candidate.profileData);
  const details: any[] = [];
  let earned = 0;
  let knownWeight = 0;
  let totalWeight = 0;
  let mustFail = false;

  const add = (label: string, result: any, importance: unknown) => {
    if (!result.configured) return;
    const weight = importanceWeight(importance) || 2;
    totalWeight += weight;
    if (result.known) {
      knownWeight += weight;
      earned += weight * result.score;
    }
    if ((normalize(importance) === "must" || normalize(importance) === "must have") && result.known && result.score < 1) mustFail = true;
    details.push({ criterion: label, result: result.label, score: Math.round(result.score * 100), importance: cleanText(importance) || "preferred", known: result.known });
  };

  add("Age", rangeScore(pref.age, candidate.age), pref.age?.importance);
  add("Height", rangeScore(pref.height, candidate.heightCm || profile.heightCm), pref.height?.importance);
  add("Education", layeredValueScore(pref.education, candidate.education), pref.education?.importance);
  add("Profession", layeredValueScore(pref.profession, candidate.profession), pref.profession?.importance);
  add("Country", layeredValueScore(pref.country, candidate.country || "Pakistan"), pref.country?.importance);
  add("City", layeredValueScore(pref.city, candidate.city), pref.city?.importance);
  add("Marital status", layeredValueScore(pref.maritalStatus, candidate.maritalStatus || profile.maritalStatus), pref.maritalStatus?.importance);
  add("Residence status", layeredValueScore(pref.residenceStatus, candidate.residenceStatus || profile.residenceStatus), pref.residenceStatus?.importance);
  add("Family setup", layeredValueScore(pref.familySetup, profile.familySetup), pref.familySetup?.importance);
  add("Sect", layeredValueScore(pref.sect, profile.sect), pref.sect?.importance);
  add("Relocation", layeredValueScore(pref.relocation, profile.relocation), pref.relocation?.importance);

  const incomeMin = Number(pref.income?.minimum || 0);
  if (incomeMin > 0) {
    const candidateIncome = numericIncome(profile.monthlyIncome || candidate.incomeBand);
    const result = candidateIncome ? { configured: true, known: true, score: candidateIncome >= incomeMin ? 1 : candidateIncome >= incomeMin * 0.75 ? 0.6 : 0, label: candidateIncome >= incomeMin ? "Meets income preference" : candidateIncome >= incomeMin * 0.75 ? "Near income preference" : "Below income preference" } : { configured: true, known: false, score: 0, label: "Income not specified" };
    add("Income", result, pref.income?.importance);
  }

  const rawScore = knownWeight ? Math.round((earned / knownWeight) * 100) : 50;
  const confidence = totalWeight ? Math.round((knownWeight / totalWeight) * 100) : 50;
  return { score: mustFail ? Math.min(39, rawScore) : rawScore, confidence, eligible: !mustFail, details };
}

function mutualCompatibility(a: any, b: any) {
  const aToB = directionalScore(a, b);
  const bToA = directionalScore(b, a);
  let mutual = Math.round((aToB.score + bToA.score) / 2);
  const eligible = aToB.eligible && bToA.eligible;
  if (!eligible) mutual = Math.min(39, mutual);
  return {
    requesterToTargetScore: aToB.score,
    targetToRequesterScore: bToA.score,
    mutualScore: mutual,
    scoreConfidence: Math.round((aToB.confidence + bToA.confidence) / 2),
    eligible,
    breakdown: { requesterToTarget: aToB.details, targetToRequester: bToA.details },
  };
}

function profileCompleteness(payload: any) {
  const profile = jsonValue(payload.profileData);
  const values = [payload.name, payload.age, payload.gender, payload.city, payload.country, payload.education, payload.profession, payload.contact, payload.maritalStatus, payload.heightCm, profile.familySetup, profile.hobbies, profile.languages, profile.marriageTimeline, payload.photoUrl];
  return Math.round((values.filter((v) => Array.isArray(v) ? v.length > 0 : Boolean(cleanText(v))).length / values.length) * 100);
}

async function writeExtendedProfile(id: string, body: any, req: Request, source?: { admin?: boolean }) {
  const profileJson = JSON.stringify(jsonValue(body.profileData));
  const preferenceJson = JSON.stringify(jsonValue(body.preferenceData));
  const privacyJson = JSON.stringify({
    profileVisibility: "matches_only",
    photoVisibility: "mutual_interest",
    contactVisibility: "mutual_interest",
    broadLocation: true,
    showHeight: true,
    ...jsonValue(body.privacyData),
  });
  const completeness = profileCompleteness(body);
  const user = (req as any).user || {};
  await prisma.$executeRaw`
    UPDATE "Matrimonial"
    SET "country" = ${body.country || "Pakistan"},
        "province" = ${body.province || null},
        "dateOfBirth" = ${body.dateOfBirth || null},
        "heightCm" = ${body.heightCm ?? null},
        "maritalStatus" = ${body.maritalStatus || null},
        "nationality" = ${body.nationality || null},
        "residenceStatus" = ${body.residenceStatus || null},
        "employmentType" = ${body.employmentType || null},
        "employerType" = ${body.employerType || null},
        "incomeBand" = ${body.incomeBand || null},
        "currency" = ${body.currency || "PKR"},
        "profileData" = ${profileJson}::jsonb,
        "preferenceData" = ${preferenceJson}::jsonb,
        "privacyData" = ${privacyJson}::jsonb,
        "candidateConsent" = ${Boolean(body.candidateConsent)},
        "candidateConsentAt" = CASE WHEN ${Boolean(body.candidateConsent)} THEN COALESCE("candidateConsentAt", CURRENT_TIMESTAMP) ELSE NULL END,
        "applicationSource" = ${source?.admin ? "admin_manual" : body.applicationSource || (body.relationToCandidate && body.relationToCandidate !== "Self" ? "guardian_service" : "self_service")},
        "sourceAdminId" = ${source?.admin ? user.id || null : null},
        "sourceAdminName" = ${source?.admin ? user.username || user.email || null : null},
        "profileCompleteness" = ${completeness},
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${id}
  `;
}

async function linkedMemberForUser(user: any) {
  if (!user?.id) return null;
  return prisma.member.findFirst({ where: { OR: [{ authUserId: user.id }, ...(user.email ? [{ email: { equals: user.email, mode: "insensitive" as const } }] : [])], status: "approved" } });
}

router.get("/public-stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE lower(COALESCE("country",'Pakistan')) = 'pakistan')::int AS pakistan,
             COUNT(*) FILTER (WHERE lower(COALESCE("country",'Pakistan')) <> 'pakistan')::int AS overseas,
             COUNT(*) FILTER (WHERE "verificationStatus" IN ('verified','committee_verified'))::int AS verified
      FROM "Matrimonial"
      WHERE "isActive" = true AND "status" = 'approved' AND "showOnPortal" = true
    `;
    const r = rows[0] || { total: 0, pakistan: 0, overseas: 0, verified: 0 };
    res.json({ total: Number(r.total || 0), pakistan: Number(r.pakistan || 0), overseas: Number(r.overseas || 0), verified: Number(r.verified || 0), privacy: "Individual profiles, names, photos and contacts are never public." });
  } catch (err) { next(err); }
});

router.get("/manager", requireMatrimonialAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`SELECT "id","name","phone","email","notificationMode","publicContact","isActive","updatedAt" FROM "MatrimonialManagerSetting" WHERE "id"='primary' LIMIT 1`;
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

router.get("/", requireMatrimonialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20")) || 20));
    const offset = (page - 1) * limit;
    const profiles = await prisma.$queryRaw<any[]>`SELECT * FROM "Matrimonial" ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`;
    const countRows = await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int AS total FROM "Matrimonial"`;
    const total = Number(countRows[0]?.total || 0);
    res.json({ profiles: profiles.map(fullProfile), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get("/mine", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await rawProfilesByUser((req as any).user.id);
    res.json({ profiles, profile: profiles[0] || null });
  } catch (err) { next(err); }
});

router.get("/matches", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const profileId = cleanText(req.query.profileId);
    if (!profileId) return void res.status(400).json({ error: "Select a candidate profile before viewing matches." });
    const own = await rawProfile(profileId);
    if (!own || own.authUserId !== user.id) return void res.status(403).json({ error: "This candidate profile does not belong to your account." });
    if (own.status !== "approved" || !own.isActive) return void res.status(409).json({ error: "This profile must be approved before automated matching is enabled." });

    const candidates = await prisma.$queryRaw<any[]>`
      SELECT * FROM "Matrimonial"
      WHERE "id" <> ${own.id}
        AND "gender" <> ${own.gender}
        AND "isActive" = true
        AND "status" = 'approved'
        AND "showOnPortal" = true
      ORDER BY "isFeatured" DESC, "updatedAt" DESC
      LIMIT 300
    `;

    const scored = candidates.map((row) => {
      const target = fullProfile(row);
      const compatibility = mutualCompatibility(own, target);
      return { ...anonymizedProfile(target), ...compatibility };
    }).sort((a, b) => b.mutualScore - a.mutualScore || b.scoreConfidence - a.scoreConfidence);

    await prisma.$executeRaw`UPDATE "Matrimonial" SET "lastMatchedAt" = CURRENT_TIMESTAMP WHERE "id" = ${own.id}`;
    await audit(req, "matches_viewed", own.id, null, { returned: scored.length });
    res.json({ profile: anonymizedProfile(own), matches: scored.slice(0, 100) });
  } catch (err) { next(err); }
});

router.post("/submit", requireMember, validate(MatrimonialSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const authUser = (req as any).user;
    const linkedMember = await linkedMemberForUser(authUser);
    const existing = body.profileId ? await rawProfile(body.profileId) : null;
    if (existing && existing.authUserId !== authUser.id) return void res.status(403).json({ error: "You cannot edit another account's candidate profile." });

    const cleanAdditional = (body.additionalPhotos || []).filter((s: string) => s && !s.startsWith("data:"));
    const feeAmount = linkedMember ? 3000 : 5000;
    const baseData: any = {
      name: body.name,
      gender: body.gender,
      age: body.age,
      city: body.city,
      education: body.education,
      profession: body.profession,
      familyBackground: body.familyBackground || "",
      requirements: body.requirements || "",
      contact: body.contact,
      photoUrl: body.photoUrl || null,
      paymentProofUrl: body.paymentProofUrl || null,
      additionalPhotos: JSON.stringify(cleanAdditional),
      authUserId: authUser.id,
      applicantType: linkedMember ? "member" : "non_member",
      feeAmount,
      relationToCandidate: body.relationToCandidate || "Self",
      status: "pending",
      paymentStatus: existing && paymentCleared(existing.paymentStatus) ? existing.paymentStatus : body.paymentProofUrl ? "submitted" : "pending",
      showOnPortal: false,
      isFeatured: false,
    };

    const savedBase = existing
      ? await prisma.matrimonial.update({ where: { id: existing.id }, data: baseData })
      : await prisma.matrimonial.create({ data: baseData });
    await writeExtendedProfile(savedBase.id, body, req);
    const saved = await rawProfile(savedBase.id);

    const draftType = `matrimonial:${savedBase.id}`;
    await prisma.formDraft.upsert({
      where: { authUserId_formType: { authUserId: authUser.id, formType: draftType } },
      update: { data: { ...body, profileId: savedBase.id }, status: "submitted", completion: 100, paymentStatus: baseData.paymentStatus, submittedAt: new Date() },
      create: { authUserId: authUser.id, formType: draftType, data: { ...body, profileId: savedBase.id }, completion: 100, status: "submitted", paymentStatus: baseData.paymentStatus, submittedAt: new Date() },
    });

    await audit(req, existing ? "profile_resubmitted" : "profile_submitted", savedBase.id, null, { applicantType: baseData.applicantType, relationToCandidate: baseData.relationToCandidate });
    void sendEmail(MASTER_EMAIL, `Matrimonial application ${existing ? "updated" : "submitted"}: ${profileCode(savedBase.id)}`, emailFrame("Matrimonial application", `<p>A privacy-protected matrimonial application has been ${existing ? "updated" : "submitted"}.</p><p>Reference: <strong>${profileCode(savedBase.id)}</strong><br>Applicant type: ${baseData.applicantType}<br>Fee record: PKR ${feeAmount.toLocaleString()}</p>`)).catch(console.error);
    res.status(existing ? 200 : 201).json(saved);
  } catch (err) { next(err); }
});

router.post("/admin", requireMatrimonialAdmin, validate(AdminCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    if (body.status === "approved" && !body.candidateConsent) return void res.status(409).json({ error: "Record candidate/guardian consent before approving a manually entered profile." });
    if (body.showOnPortal && body.status !== "approved") return void res.status(409).json({ error: "Approve the profile before making it available for matching." });
    if ((body.status === "approved" || body.showOnPortal) && !paymentCleared(body.paymentStatus)) return void res.status(409).json({ error: "Payment must be received/verified before approval or matching visibility." });
    const cleanAdditional = (body.additionalPhotos || []).filter((s: string) => s && !s.startsWith("data:"));
    const savedBase = await prisma.matrimonial.create({
      data: {
        name: body.name, gender: body.gender, age: body.age, city: body.city, education: body.education, profession: body.profession,
        familyBackground: body.familyBackground || "", requirements: body.requirements || "", contact: body.contact,
        photoUrl: body.photoUrl || null, paymentProofUrl: body.paymentProofUrl || null, additionalPhotos: JSON.stringify(cleanAdditional),
        applicantType: "admin_client", feeAmount: 5000, relationToCandidate: body.relationToCandidate || "Self",
        status: body.status, paymentStatus: body.paymentStatus, showOnPortal: body.showOnPortal, isFeatured: body.isFeatured, adminNote: body.adminNote || "Entered by matrimonial manager/admin.",
      },
    });
    await writeExtendedProfile(savedBase.id, { ...body, applicationSource: "admin_manual" }, req, { admin: true });
    await audit(req, "admin_profile_created", savedBase.id, null, { relationToCandidate: body.relationToCandidate || "Self" });
    res.status(201).json(await rawProfile(savedBase.id));
  } catch (err) { next(err); }
});

router.put("/mine/:id", requireMember, validate(MatrimonialSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = String(req.params.id);
    const current = await rawProfile(id);
    if (!current || current.authUserId !== user.id) return void res.status(404).json({ error: "Candidate profile not found for this account." });
    const body = { ...current, ...req.body, profileId: id };
    const cleanAdditional = req.body.additionalPhotos !== undefined ? (req.body.additionalPhotos || []).filter((s: string) => s && !s.startsWith("data:")) : current.additionalPhotos;
    const updateData: any = { status: "pending", showOnPortal: false, isFeatured: false };
    for (const key of ["name","gender","age","city","education","profession","familyBackground","requirements","contact","photoUrl","paymentProofUrl","relationToCandidate"] as const) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    if (req.body.additionalPhotos !== undefined) updateData.additionalPhotos = JSON.stringify(cleanAdditional);
    if (!paymentCleared(current.paymentStatus) && req.body.paymentProofUrl) updateData.paymentStatus = "submitted";
    await prisma.matrimonial.update({ where: { id }, data: updateData });
    await writeExtendedProfile(id, body, req);
    await audit(req, "owner_profile_updated", id, null, { returnedToReview: true });
    res.json(await rawProfile(id));
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Matrimonial profile not found" });
    next(err);
  }
});

router.post("/match-requests", requireMember, validate(MatchRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const own = await rawProfile(req.body.requesterProfileId);
    if (!own || own.authUserId !== user.id) return void res.status(403).json({ error: "The requester profile does not belong to your account." });
    if (own.status !== "approved" || !own.showOnPortal || !own.isActive) return void res.status(403).json({ error: "Your candidate profile must be approved and enabled for matching first." });
    const target = await rawProfile(req.body.targetProfileId);
    if (!target || target.status !== "approved" || !target.showOnPortal || !target.isActive) return void res.status(404).json({ error: "The selected profile is not currently available." });
    if (target.id === own.id || target.gender === own.gender) return void res.status(400).json({ error: "This profile cannot be requested as a match." });

    const reverse = await prisma.matrimonialMatchRequest.findFirst({ where: { requesterProfileId: target.id, targetProfileId: own.id, status: { in: ["pending_admin", "awaiting_target", "accepted"] } } });
    if (reverse) return void res.status(409).json({ error: "A match request between these profiles is already active." });
    const compatibility = mutualCompatibility(own, target);
    const created = await prisma.matrimonialMatchRequest.create({
      data: {
        requesterAuthUserId: user.id,
        requesterProfileId: own.id,
        targetProfileId: target.id,
        requesterMessage: req.body.requesterMessage || null,
        status: "pending_admin",
      },
    });
    await prisma.$executeRaw`
      UPDATE "MatrimonialMatchRequest"
      SET "requesterToTargetScore"=${compatibility.requesterToTargetScore},
          "targetToRequesterScore"=${compatibility.targetToRequesterScore},
          "mutualScore"=${compatibility.mutualScore},
          "scoreConfidence"=${compatibility.scoreConfidence},
          "scoreBreakdown"=${JSON.stringify(compatibility.breakdown)}::jsonb
      WHERE "id"=${created.id}
    `;
    await audit(req, "interest_requested", own.id, created.id, { targetProfileId: target.id, mutualScore: compatibility.mutualScore });
    void sendEmail(MASTER_EMAIL, `Matrimonial interest: ${profileCode(own.id)} → ${profileCode(target.id)}`, emailFrame("New matrimonial interest", `<p>A privacy-protected interest request requires manager review.</p><p>${profileCode(own.id)} → ${profileCode(target.id)} · compatibility ${compatibility.mutualScore}%</p>`)).catch(console.error);
    res.status(201).json({ id: created.id, status: created.status, target: anonymizedProfile(target), ...compatibility });
  } catch (err: any) {
    if (err?.code === "P2002") return void res.status(409).json({ error: "This match request already exists." });
    next(err);
  }
});

router.get("/match-requests/mine", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const ownProfiles = await rawProfilesByUser(user.id);
    const ownIds = ownProfiles.map((p) => p.id);
    const rows = await prisma.matrimonialMatchRequest.findMany({
      where: { OR: [{ requesterAuthUserId: user.id }, { targetProfileId: { in: ownIds.length ? ownIds : ["__none__"] } }] },
      include: { requesterProfile: true, targetProfile: true },
      orderBy: { createdAt: "desc" },
    });

    const enriched = [] as any[];
    for (const r of rows) {
      const requester = await rawProfile(r.requesterProfileId);
      const target = await rawProfile(r.targetProfileId);
      if (!requester || !target) continue;
      const incoming = ownIds.includes(r.targetProfileId);
      const accepted = r.status === "accepted" && Boolean(r.contactReleasedAt);
      const counterpart = incoming ? requester : target;
      const requestRaw = await prisma.$queryRaw<any[]>`SELECT * FROM "MatrimonialMatchRequest" WHERE "id"=${r.id} LIMIT 1`;
      const meta = requestRaw[0] || {};
      enriched.push({
        id: r.id,
        direction: incoming ? "incoming" : "outgoing",
        status: r.status,
        requesterProfileId: r.requesterProfileId,
        targetProfileId: r.targetProfileId,
        requesterMessage: incoming && ["awaiting_target", "accepted"].includes(r.status) ? r.requesterMessage : undefined,
        counterpart: accepted ? expandedProfile(counterpart, { photo: meta.photoAccessStatus === "released", contact: meta.contactAccessStatus === "released" }) : anonymizedProfile(counterpart),
        mutualScore: meta.mutualScore,
        requesterToTargetScore: meta.requesterToTargetScore,
        targetToRequesterScore: meta.targetToRequesterScore,
        scoreConfidence: meta.scoreConfidence,
        createdAt: r.createdAt,
        adminApprovedAt: r.adminApprovedAt,
        targetRespondedAt: r.targetRespondedAt,
        contactReleasedAt: r.contactReleasedAt,
        photoReleasedAt: meta.photoReleasedAt,
      });
    }
    res.json({ requests: enriched });
  } catch (err) { next(err); }
});

router.patch("/match-requests/:id/respond", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const decision = String(req.body?.decision || "").toLowerCase();
    if (!["accept", "decline"].includes(decision)) return void res.status(400).json({ error: "Decision must be accept or decline." });
    const row = await prisma.matrimonialMatchRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!row) return void res.status(404).json({ error: "Match request not found." });
    const target = await rawProfile(row.targetProfileId);
    const requester = await rawProfile(row.requesterProfileId);
    if (!target || !requester || target.authUserId !== user.id) return void res.status(403).json({ error: "Only the owner of the requested profile can respond." });
    if (row.status !== "awaiting_target") return void res.status(409).json({ error: "This request is not waiting for your response." });

    const accepted = decision === "accept";
    const targetPrivacy = jsonValue(target.privacyData);
    const photoRelease = accepted && targetPrivacy.photoVisibility !== "admin_only";
    const contactRelease = accepted && targetPrivacy.contactVisibility !== "admin_only";
    const updated = await prisma.matrimonialMatchRequest.update({
      where: { id: row.id },
      data: { status: accepted ? "accepted" : "declined", targetRespondedAt: new Date(), contactReleasedAt: contactRelease ? new Date() : null },
    });
    await prisma.$executeRaw`
      UPDATE "MatrimonialMatchRequest"
      SET "fullProfileReleasedAt"=${accepted ? new Date() : null},
          "photoReleasedAt"=${photoRelease ? new Date() : null},
          "photoAccessStatus"=${photoRelease ? "released" : "locked"},
          "contactAccessStatus"=${contactRelease ? "released" : "locked"}
      WHERE "id"=${row.id}
    `;
    await audit(req, accepted ? "interest_accepted" : "interest_declined", target.id, row.id, { requesterProfileId: requester.id, photoReleased: photoRelease, contactReleased: contactRelease });
    res.json({ id: updated.id, status: updated.status, counterpart: accepted ? expandedProfile(requester, { photo: true, contact: true }) : anonymizedProfile(requester) });
  } catch (err) { next(err); }
});

router.get("/match-requests/admin/all", requireMatrimonialAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "MatrimonialMatchRequest" ORDER BY "createdAt" DESC LIMIT 1000`;
    const requests = [] as any[];
    for (const row of rows) {
      const requester = await rawProfile(row.requesterProfileId);
      const target = await rawProfile(row.targetProfileId);
      if (!requester || !target) continue;
      requests.push({ ...row, requester: expandedProfile(requester, { photo: true, contact: true }), target: expandedProfile(target, { photo: true, contact: true }) });
    }
    res.json({ requests });
  } catch (err) { next(err); }
});

router.patch("/match-requests/:id/admin", requireMatrimonialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const action = String(req.body?.action || "").toLowerCase();
    if (!["forward", "reject", "close"].includes(action)) return void res.status(400).json({ error: "Action must be forward, reject or close." });
    const row = await prisma.matrimonialMatchRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!row) return void res.status(404).json({ error: "Match request not found." });
    const status = action === "forward" ? "awaiting_target" : action === "reject" ? "rejected" : "closed";
    const updated = await prisma.matrimonialMatchRequest.update({ where: { id: row.id }, data: { status, adminNote: String(req.body?.adminNote || "") || null, adminApprovedAt: action === "forward" ? new Date() : row.adminApprovedAt } });
    const target = await rawProfile(row.targetProfileId);
    if (action === "forward" && target?.authUserId) {
      const targetUser = await prisma.authUser.findUnique({ where: { id: target.authUserId }, select: { email: true } });
      if (targetUser?.email) {
        void sendEmail(targetUser.email, "A matrimonial interest is waiting for your consent", emailFrame("Consent requested", `<p>A verified profile has requested an introduction with ${profileCode(target.id)}.</p><p>Sign in to review the anonymized profile and compatibility score. Your photo, name and contact remain private unless you accept.</p>`)).catch(console.error);
      }
    }
    await audit(req, `manager_${action}`, target?.id || null, row.id, { status });
    res.json({ id: updated.id, status: updated.status });
  } catch (err) { next(err); }
});

router.get("/:id/audit", requireMatrimonialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "MatrimonialAuditLog" WHERE "profileId"=${id} ORDER BY "createdAt" DESC LIMIT 300`;
    res.json({ audit: rows });
  } catch (err) { next(err); }
});

router.patch("/:id/status", requireMatrimonialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, paymentStatus, adminNote, verificationStatus } = req.body;
    const current = await rawProfile(id);
    if (!current) return void res.status(404).json({ error: "Matrimonial profile not found" });
    const effectivePayment = paymentStatus ?? current.paymentStatus;
    if (status === "approved" && !paymentCleared(effectivePayment)) return void res.status(409).json({ error: "Payment must be received or verified before approving this profile." });
    if (status === "approved" && !current.candidateConsent) return void res.status(409).json({ error: "Candidate/guardian consent must be recorded before approval." });
    const updated = await prisma.matrimonial.update({ where: { id }, data: { status, paymentStatus, adminNote, ...(status === "rejected" ? { showOnPortal: false } : {}) } });
    if (verificationStatus !== undefined) await prisma.$executeRaw`UPDATE "Matrimonial" SET "verificationStatus"=${verificationStatus}, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`;
    await audit(req, "manager_status_updated", id, null, { status, paymentStatus, verificationStatus });
    res.json(await rawProfile(updated.id));
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Matrimonial profile not found" });
    next(err);
  }
});

router.put("/:id", requireMatrimonialAdmin, validate(MatrimonialSchema.partial().passthrough()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const current = await rawProfile(id);
    if (!current) return void res.status(404).json({ error: "Matrimonial profile not found" });
    const body = { ...current, ...req.body };
    const effectiveStatus = req.body.status ?? current.status;
    const effectivePayment = req.body.paymentStatus ?? current.paymentStatus;
    if ((effectiveStatus === "approved" || req.body.showOnPortal === true) && !paymentCleared(effectivePayment)) return void res.status(409).json({ error: "Payment must be received or verified before approval/matching visibility." });
    if ((effectiveStatus === "approved" || req.body.showOnPortal === true) && !body.candidateConsent) return void res.status(409).json({ error: "Candidate/guardian consent must be recorded before approval/matching visibility." });
    if (req.body.showOnPortal === true && effectiveStatus !== "approved") return void res.status(409).json({ error: "Approve the profile before enabling it for matching." });

    const data: any = {};
    for (const key of ["name","gender","age","city","education","profession","familyBackground","requirements","contact","photoUrl","paymentProofUrl","status","paymentStatus","adminNote","isFeatured","showOnPortal","relationToCandidate"] as const) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (req.body.additionalPhotos !== undefined) data.additionalPhotos = JSON.stringify((req.body.additionalPhotos || []).filter((s: string) => s && !s.startsWith("data:")));
    await prisma.matrimonial.update({ where: { id }, data });
    await writeExtendedProfile(id, body, req, { admin: true });
    await audit(req, "manager_profile_updated", id, null, { fields: Object.keys(req.body) });
    res.json(await rawProfile(id));
  } catch (err: any) {
    if (err.code === "P2025") return void res.status(404).json({ error: "Matrimonial profile not found" });
    next(err);
  }
});

router.delete("/:id", requireMatrimonialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const current = await rawProfile(id);
    if (!current) return void res.status(404).json({ error: "Matrimonial profile not found" });
    await prisma.$executeRaw`UPDATE "Matrimonial" SET "isActive"=false, "showOnPortal"=false, "status"='rejected', "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`;
    await audit(req, "profile_archived", id, null, { profileCode: profileCode(id) });
    res.json({ success: true, archived: true });
  } catch (err) { next(err); }
});

export default router;
