import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { z } from "zod";

import prisma from "../lib/prisma";
import { requireMatrimonialAdmin, requireMember } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { MASTER_EMAIL, emailFrame, sendEmail } from "../lib/email";

const router = Router();
const PRIVATE_FILE_PREFIX = "/api/matrimonial/private-file/";
const MATRIMONIAL_ADMIN_ROLES = new Set(["admin", "super_admin", "welfare_manager", "matrimonial_manager"]);
const FINANCE_ROLES = new Set(["admin", "super_admin", "finance_secretary", "assistant_finance_secretary"]);

const privateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only JPG, PNG, WebP and PDF files are allowed."), allowed.includes(file.mimetype));
  },
});

function validSignature(file: Express.Multer.File) {
  const b = file.buffer;
  if (!b?.length) return false;
  if (file.mimetype === "image/jpeg") return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (file.mimetype === "image/png") return b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (file.mimetype === "image/webp") return b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
  if (file.mimetype === "application/pdf") return b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-";
  return false;
}

const urlOrPrivate = z.string().refine(
  (val) => !val || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/uploads/") || val.startsWith("/api/files/") || val.startsWith(PRIVATE_FILE_PREFIX),
  { message: "Must be a valid stored file URL" },
).nullable().optional();

const JsonObject = z.record(z.string(), z.unknown()).optional().default({});
const MatrimonialSchema = z.object({
  profileId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  gender: z.enum(["male", "female"]),
  age: z.string().min(1).max(10),
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().min(2).max(100).optional().default("Pakistan"),
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
  education: z.string().trim().min(2).max(150),
  profession: z.string().trim().min(2).max(150),
  familyBackground: z.string().max(3000).optional(),
  requirements: z.string().max(3000).optional(),
  contact: z.string().regex(/^\+?[0-9\s\-]{10,20}$/, "Invalid contact number"),
  photoUrl: urlOrPrivate,
  additionalPhotos: z.array(z.string()).max(12).optional(),
  paymentProofUrl: urlOrPrivate,
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
const AdminCreateSchema = MatrimonialSchema.omit({ profileId: true }).extend({
  status: z.enum(["pending", "approved", "rejected"]).optional().default("pending"),
  paymentStatus: z.enum(["pending", "submitted", "received", "verified", "rejected"]).optional().default("pending"),
  showOnPortal: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
  adminNote: z.string().max(1500).optional(),
  verificationStatus: z.string().max(80).optional(),
});
const MatchRequestSchema = z.object({ requesterProfileId: z.string().uuid(), targetProfileId: z.string().uuid(), requesterMessage: z.string().max(1000).optional() });

const profileCode = (id: string) => `AAF-MAT-${String(id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const paymentCleared = (status?: string | null) => ["received", "verified"].includes(String(status || "").toLowerCase());
const cleanText = (v: unknown) => String(v ?? "").trim();
const normalize = (v: unknown) => cleanText(v).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const parsePhotos = (value: any): string[] => { if (Array.isArray(value)) return value.filter(Boolean); if (!value) return []; try { const x = JSON.parse(String(value)); return Array.isArray(x) ? x.filter(Boolean) : []; } catch { return []; } };
const jsonValue = (value: any) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

function fullProfile(p: any) {
  return { ...p, profileCode: profileCode(p.id), additionalPhotos: parsePhotos(p.additionalPhotos), profileData: jsonValue(p.profileData), preferenceData: jsonValue(p.preferenceData), privacyData: jsonValue(p.privacyData) };
}
function anonymizedProfile(p: any) {
  const privacy = jsonValue(p.privacyData), profile = jsonValue(p.profileData);
  return {
    id: p.id, profileCode: profileCode(p.id), gender: p.gender, age: p.age, country: p.country || "Pakistan", province: p.province || undefined,
    city: privacy.broadLocation === false ? undefined : p.city, education: p.education, profession: p.profession,
    maritalStatus: p.maritalStatus || profile.maritalStatus || undefined, heightCm: privacy.showHeight === false ? undefined : (p.heightCm || profile.heightCm || undefined),
    residenceStatus: p.residenceStatus || profile.residenceStatus || undefined, isFeatured: Boolean(p.isFeatured), verificationStatus: p.verificationStatus || "unverified",
    profileCompleteness: Number(p.profileCompleteness || 0), createdAt: p.createdAt,
  };
}
function expandedProfile(p: any, opts: { photo?: boolean; contact?: boolean } = {}) {
  const privacy = jsonValue(p.privacyData);
  return { ...anonymizedProfile(p), name: p.name, familyBackground: p.familyBackground, profileData: jsonValue(p.profileData), relationToCandidate: p.relationToCandidate,
    photoUrl: opts.photo && privacy.photoVisibility !== "admin_only" ? p.photoUrl : undefined,
    additionalPhotos: opts.photo && privacy.photoVisibility !== "admin_only" ? parsePhotos(p.additionalPhotos) : undefined,
    contact: opts.contact && privacy.contactVisibility !== "admin_only" ? p.contact : undefined };
}
function clientIp(req: Request) { const x = req.headers["x-forwarded-for"]; if (Array.isArray(x)) return x[0]?.split(",")[0]?.trim() || req.ip || null; if (typeof x === "string") return x.split(",")[0]?.trim() || req.ip || null; return req.ip || null; }
async function audit(req: Request, action: string, profileId?: string | null, requestId?: string | null, details?: any) {
  const user = (req as any).user || {}, payload = details === undefined ? null : JSON.stringify(details);
  await prisma.$executeRaw`INSERT INTO "MatrimonialAuditLog" ("profileId","requestId","action","actorId","actorName","actorRole","ipAddress","userAgent","details") VALUES (${profileId || null},${requestId || null},${action},${user.id || null},${user.email || user.username || null},${user.role || "public"},${clientIp(req)},${req.get("user-agent") || null},${payload}::jsonb)`;
}
async function rawProfile(id: string) { const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "Matrimonial" WHERE "id"=${id} LIMIT 1`; return rows[0] ? fullProfile(rows[0]) : null; }
async function rawProfilesByUser(id: string) { const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "Matrimonial" WHERE "authUserId"=${id} AND "isActive"=true ORDER BY "createdAt" DESC`; return rows.map(fullProfile); }

function importanceWeight(value: unknown) { const k = normalize(value); if (k === "must" || k === "must have") return 5; if (k === "very important" || k === "high") return 4; if (k === "important") return 3; if (k === "preferred" || k === "preference") return 2; if (k === "nice" || k === "nice to have") return 1; return 0; }
function asList(value: any): string[] { if (Array.isArray(value)) return value.map(cleanText).filter(Boolean); if (typeof value === "string" && value.trim()) return value.split(",").map((x) => x.trim()).filter(Boolean); return []; }
function layeredValueScore(pref: any, candidateValue: unknown) {
  const candidate = normalize(candidateValue), primary = asList(pref?.primary).map(normalize), secondary = asList(pref?.secondary).map(normalize), acceptable = asList(pref?.acceptable).map(normalize);
  const configured = primary.length + secondary.length + acceptable.length > 0;
  if (!configured) return { configured: false, known: Boolean(candidate), score: 1, label: "No preference" };
  if (!candidate) return { configured: true, known: false, score: 0, label: "Not specified" };
  const match = (a: string[]) => a.some((v) => v === candidate || candidate.includes(v) || v.includes(candidate));
  if (match(primary)) return { configured: true, known: true, score: 1, label: "Primary preference" };
  if (match(secondary)) return { configured: true, known: true, score: .8, label: "Secondary preference" };
  if (match(acceptable)) return { configured: true, known: true, score: .6, label: "Acceptable preference" };
  return { configured: true, known: true, score: 0, label: "Outside preference" };
}
function rangeScore(pref: any, candidateValue: unknown) {
  const min = Number(pref?.min || 0), max = Number(pref?.max || 0), value = Number(candidateValue || 0);
  if (!min && !max) return { configured: false, known: Boolean(value), score: 1, label: "No preference" };
  if (!value) return { configured: true, known: false, score: 0, label: "Not specified" };
  if ((!min || value >= min) && (!max || value <= max)) return { configured: true, known: true, score: 1, label: "Within range" };
  const delta = min && value < min ? min - value : max && value > max ? value - max : 0;
  return { configured: true, known: true, score: delta <= 3 ? .5 : 0, label: delta <= 3 ? "Near preferred range" : "Outside range" };
}
function numericIncome(value: unknown) { if (typeof value === "number") return value; const text = cleanText(value).replace(/,/g, ""); const nums = text.match(/\d+(?:\.\d+)?/g)?.map(Number) || []; if (!nums.length) return 0; let n = Math.max(...nums); if (/\bk\b/i.test(text)) n *= 1000; if (/\bm\b/i.test(text)) n *= 1000000; return n; }
function directionalScore(owner: any, candidate: any) {
  const pref = jsonValue(owner.preferenceData), profile = jsonValue(candidate.profileData), details: any[] = [];
  let earned = 0, knownWeight = 0, totalWeight = 0, mustFail = false;
  const add = (label: string, result: any, importance: unknown) => { if (!result.configured) return; const weight = importanceWeight(importance) || 2; totalWeight += weight; if (result.known) { knownWeight += weight; earned += weight * result.score; } if (["must","must have"].includes(normalize(importance)) && result.known && result.score < 1) mustFail = true; details.push({ criterion: label, result: result.label, score: Math.round(result.score * 100), importance: cleanText(importance) || "preferred", known: result.known }); };
  add("Age", rangeScore(pref.age, candidate.age), pref.age?.importance); add("Height", rangeScore(pref.height, candidate.heightCm || profile.heightCm), pref.height?.importance);
  add("Education", layeredValueScore(pref.education, candidate.education), pref.education?.importance); add("Profession", layeredValueScore(pref.profession, candidate.profession), pref.profession?.importance);
  add("Country", layeredValueScore(pref.country, candidate.country || "Pakistan"), pref.country?.importance); add("City", layeredValueScore(pref.city, candidate.city), pref.city?.importance);
  add("Marital status", layeredValueScore(pref.maritalStatus, candidate.maritalStatus || profile.maritalStatus), pref.maritalStatus?.importance); add("Residence status", layeredValueScore(pref.residenceStatus, candidate.residenceStatus || profile.residenceStatus), pref.residenceStatus?.importance);
  add("Family setup", layeredValueScore(pref.familySetup, profile.familySetup), pref.familySetup?.importance); add("Sect", layeredValueScore(pref.sect, profile.sect), pref.sect?.importance); add("Relocation", layeredValueScore(pref.relocation, profile.relocation), pref.relocation?.importance);
  const incomeMin = Number(pref.income?.minimum || 0); if (incomeMin > 0) { const income = numericIncome(profile.monthlyIncome || candidate.incomeBand); add("Income", income ? { configured: true, known: true, score: income >= incomeMin ? 1 : income >= incomeMin * .75 ? .6 : 0, label: income >= incomeMin ? "Meets income preference" : income >= incomeMin * .75 ? "Near income preference" : "Below income preference" } : { configured: true, known: false, score: 0, label: "Income not specified" }, pref.income?.importance); }
  const raw = knownWeight ? Math.round(earned / knownWeight * 100) : 50, confidence = totalWeight ? Math.round(knownWeight / totalWeight * 100) : 50;
  return { score: mustFail ? Math.min(39, raw) : raw, confidence, eligible: !mustFail, details };
}
function mutualCompatibility(a: any, b: any) { const ab = directionalScore(a,b), ba = directionalScore(b,a); const eligible = ab.eligible && ba.eligible; let mutual = Math.round((ab.score + ba.score)/2); if (!eligible) mutual = Math.min(39, mutual); return { requesterToTargetScore: ab.score, targetToRequesterScore: ba.score, mutualScore: mutual, scoreConfidence: Math.round((ab.confidence + ba.confidence)/2), eligible, breakdown: { requesterToTarget: ab.details, targetToRequester: ba.details } }; }
function profileCompleteness(payload: any) { const p = jsonValue(payload.profileData); const values = [payload.name,payload.age,payload.gender,payload.city,payload.country,payload.education,payload.profession,payload.contact,payload.maritalStatus,payload.heightCm,p.familySetup,p.hobbies,p.languages,p.marriageTimeline,payload.photoUrl]; return Math.round(values.filter((v) => Array.isArray(v) ? v.length > 0 : Boolean(cleanText(v))).length / values.length * 100); }

async function writeExtendedProfile(id: string, body: any, req: Request, admin = false) {
  const profileJson = JSON.stringify(jsonValue(body.profileData)), preferenceJson = JSON.stringify(jsonValue(body.preferenceData));
  const privacyJson = JSON.stringify({ profileVisibility: "matches_only", photoVisibility: "mutual_interest", contactVisibility: "mutual_interest", broadLocation: true, showHeight: true, ...jsonValue(body.privacyData) });
  const user = (req as any).user || {};
  await prisma.$executeRaw`UPDATE "Matrimonial" SET "country"=${body.country || "Pakistan"},"province"=${body.province || null},"dateOfBirth"=${body.dateOfBirth || null},"heightCm"=${body.heightCm ?? null},"maritalStatus"=${body.maritalStatus || null},"nationality"=${body.nationality || null},"residenceStatus"=${body.residenceStatus || null},"employmentType"=${body.employmentType || null},"employerType"=${body.employerType || null},"incomeBand"=${body.incomeBand || null},"currency"=${body.currency || "PKR"},"profileData"=${profileJson}::jsonb,"preferenceData"=${preferenceJson}::jsonb,"privacyData"=${privacyJson}::jsonb,"candidateConsent"=${Boolean(body.candidateConsent)},"candidateConsentAt"=CASE WHEN ${Boolean(body.candidateConsent)} THEN COALESCE("candidateConsentAt",CURRENT_TIMESTAMP) ELSE NULL END,"applicationSource"=${admin ? "admin_manual" : body.applicationSource || (body.relationToCandidate && body.relationToCandidate !== "Self" ? "guardian_service" : "self_service")},"sourceAdminId"=${admin ? user.id || null : null},"sourceAdminName"=${admin ? user.username || user.email || null : null},"profileCompleteness"=${profileCompleteness(body)},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`;
}
async function linkedMemberForUser(user: any) { if (!user?.id) return null; return prisma.member.findFirst({ where: { OR: [{ authUserId: user.id }, ...(user.email ? [{ email: { equals: user.email, mode: "insensitive" as const } }] : [])], status: "approved" } }); }

router.post("/private-upload", requireMember, privateUpload.single("file"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return void res.status(400).json({ error: "No file uploaded" });
    if (!validSignature(req.file)) return void res.status(400).json({ error: "Uploaded file content does not match its declared type." });
    const category = String(req.body?.category || "matrimonial-document").slice(0, 40);
    if (!category.startsWith("matrimonial-")) return void res.status(400).json({ error: "Invalid private matrimonial file category." });
    const stored = await prisma.storedFile.create({ data: { originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size, category, data: req.file.buffer } });
    await audit(req, "private_file_uploaded", null, null, { fileId: stored.id, category, size: stored.size });
    res.status(201).json({ url: `${PRIVATE_FILE_PREFIX}${stored.id}` });
  } catch (err) { next(err); }
});

router.get("/private-file/:id", requireMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user || {}, id = String(req.params.id), file = await prisma.storedFile.findUnique({ where: { id } });
    if (!file || !String(file.category).startsWith("matrimonial-")) return void res.status(404).json({ error: "Private file not found" });
    const url = `${PRIVATE_FILE_PREFIX}${id}`;
    const role = String(user.role || "");
    let allowed = MATRIMONIAL_ADMIN_ROLES.has(role) || (file.category === "matrimonial-payment-proof" && FINANCE_ROLES.has(role));
    if (!allowed && user.id) {
      const owned = await prisma.$queryRaw<any[]>`SELECT "id" FROM "Matrimonial" WHERE "authUserId"=${user.id} AND ("photoUrl"=${url} OR "paymentProofUrl"=${url} OR COALESCE("additionalPhotos",'') LIKE ${`%${url}%`}) LIMIT 1`;
      allowed = owned.length > 0;
    }
    if (!allowed && user.id && file.category === "matrimonial-photo") {
      const released = await prisma.$queryRaw<any[]>`
        SELECT mr."id" FROM "MatrimonialMatchRequest" mr
        JOIN "Matrimonial" mine ON mine."authUserId"=${user.id}
        JOIN "Matrimonial" other ON other."photoUrl"=${url}
        WHERE mr."status"='accepted' AND mr."photoAccessStatus"='released'
          AND ((mr."requesterProfileId"=mine."id" AND mr."targetProfileId"=other."id") OR (mr."targetProfileId"=mine."id" AND mr."requesterProfileId"=other."id"))
        LIMIT 1`;
      allowed = released.length > 0;
    }
    if (!allowed) return void res.status(403).json({ error: "This private matrimonial file is not available to your account." });
    res.setHeader("Content-Type", file.mimeType); res.setHeader("Content-Length", String(file.size)); res.setHeader("Cache-Control", "private, no-store"); res.setHeader("X-Robots-Tag", "noindex, noarchive, nosnippet"); res.setHeader("Content-Disposition", `inline; filename="${file.originalName.replace(/[\"\r\n]/g, "")}"`); res.send(Buffer.from(file.data));
  } catch (err) { next(err); }
});

router.get("/public-stats", async (_req, res, next) => { try { const rows = await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE lower(COALESCE("country",'Pakistan'))='pakistan')::int pakistan,COUNT(*) FILTER(WHERE lower(COALESCE("country",'Pakistan'))<>'pakistan')::int overseas,COUNT(*) FILTER(WHERE "verificationStatus" IN('verified','committee_verified','identity_checked'))::int verified FROM "Matrimonial" WHERE "isActive"=true AND "status"='approved' AND "showOnPortal"=true`; const r=rows[0]||{}; res.json({total:Number(r.total||0),pakistan:Number(r.pakistan||0),overseas:Number(r.overseas||0),verified:Number(r.verified||0),privacy:"Individual profiles, names, photos and contacts are never public."}); } catch(e){next(e);} });
router.get("/manager", requireMatrimonialAdmin, async (_req,res,next)=>{try{const r=await prisma.$queryRaw<any[]>`SELECT "id","name","phone","email","notificationMode","publicContact","isActive","updatedAt" FROM "MatrimonialManagerSetting" WHERE "id"='primary' LIMIT 1`;res.json(r[0]||null);}catch(e){next(e);}});
router.get("/", requireMatrimonialAdmin, async (req,res,next)=>{try{const page=Math.max(1,parseInt(String(req.query.page||"1"))||1),limit=Math.min(100,Math.max(1,parseInt(String(req.query.limit||"20"))||20)),offset=(page-1)*limit;const rows=await prisma.$queryRaw<any[]>`SELECT * FROM "Matrimonial" ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`;const c=await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int total FROM "Matrimonial"`;const total=Number(c[0]?.total||0);res.json({profiles:rows.map(fullProfile),pagination:{total,page,limit,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}});
router.get("/mine", requireMember, async (req,res,next)=>{try{const profiles=await rawProfilesByUser((req as any).user.id);res.json({profiles,profile:profiles[0]||null});}catch(e){next(e);}});

router.get("/matches", requireMember, async (req,res,next)=>{try{const user=(req as any).user,id=cleanText(req.query.profileId);if(!id)return void res.status(400).json({error:"Select a candidate profile before viewing matches."});const own=await rawProfile(id);if(!own||own.authUserId!==user.id)return void res.status(403).json({error:"This candidate profile does not belong to your account."});if(own.status!=="approved"||!own.showOnPortal||!own.isActive)return void res.status(409).json({error:"This profile must be approved and enabled before automated matching is available."});const rows=await prisma.$queryRaw<any[]>`SELECT * FROM "Matrimonial" WHERE "id"<>${own.id} AND "gender"<>${own.gender} AND "isActive"=true AND "status"='approved' AND "showOnPortal"=true ORDER BY "isFeatured" DESC,"updatedAt" DESC LIMIT 150`;const scored=rows.map(r=>{const t=fullProfile(r);return {...anonymizedProfile(t),...mutualCompatibility(own,t)}}).sort((a,b)=>b.mutualScore-a.mutualScore||b.scoreConfidence-a.scoreConfidence).slice(0,30);await prisma.$executeRaw`UPDATE "Matrimonial" SET "lastMatchedAt"=CURRENT_TIMESTAMP WHERE "id"=${own.id}`;await audit(req,"matches_viewed",own.id,null,{returned:scored.length});res.json({profile:anonymizedProfile(own),matches:scored});}catch(e){next(e);}});

router.post("/submit", requireMember, validate(MatrimonialSchema), async (req,res,next)=>{try{const body=req.body,user=(req as any).user,member=await linkedMemberForUser(user),existing=body.profileId?await rawProfile(body.profileId):null;if(existing&&existing.authUserId!==user.id)return void res.status(403).json({error:"You cannot edit another account's candidate profile."});const photos=(body.additionalPhotos||[]).filter((s:string)=>s&&!s.startsWith("data:"));const feeAmount=member?3000:5000;const data:any={name:body.name,gender:body.gender,age:body.age,city:body.city,education:body.education,profession:body.profession,familyBackground:body.familyBackground||"",requirements:body.requirements||"",contact:body.contact,photoUrl:body.photoUrl||null,paymentProofUrl:body.paymentProofUrl||null,additionalPhotos:JSON.stringify(photos),authUserId:user.id,applicantType:member?"member":"non_member",feeAmount,relationToCandidate:body.relationToCandidate||"Self",status:"pending",paymentStatus:existing&&paymentCleared(existing.paymentStatus)?existing.paymentStatus:body.paymentProofUrl?"submitted":"pending",showOnPortal:false,isFeatured:false};const savedBase=existing?await prisma.matrimonial.update({where:{id:existing.id},data}):await prisma.matrimonial.create({data});await writeExtendedProfile(savedBase.id,body,req,false);const draftType=`matrimonial:${savedBase.id}`;await prisma.formDraft.upsert({where:{authUserId_formType:{authUserId:user.id,formType:draftType}},update:{data:{...body,profileId:savedBase.id},status:"submitted",completion:100,paymentStatus:data.paymentStatus,submittedAt:new Date()},create:{authUserId:user.id,formType:draftType,data:{...body,profileId:savedBase.id},completion:100,status:"submitted",paymentStatus:data.paymentStatus,submittedAt:new Date()}});await audit(req,existing?"profile_resubmitted":"profile_submitted",savedBase.id,null,{applicantType:data.applicantType,relationToCandidate:data.relationToCandidate});void sendEmail(MASTER_EMAIL,`Matrimonial application: ${profileCode(savedBase.id)}`,emailFrame("Matrimonial application",`<p>A privacy-protected matrimonial application requires review.</p><p>Reference: <strong>${profileCode(savedBase.id)}</strong></p>`)).catch(console.error);res.status(existing?200:201).json(await rawProfile(savedBase.id));}catch(e){next(e);}});

router.post("/admin", requireMatrimonialAdmin, validate(AdminCreateSchema), async (req,res,next)=>{try{const b=req.body;if(b.status==="approved"&&!b.candidateConsent)return void res.status(409).json({error:"Record candidate/guardian consent before approval."});if(b.showOnPortal&&b.status!=="approved")return void res.status(409).json({error:"Approve the profile before enabling matching."});if((b.status==="approved"||b.showOnPortal)&&!paymentCleared(b.paymentStatus))return void res.status(409).json({error:"Payment must be received/verified before approval or matching visibility."});const base=await prisma.matrimonial.create({data:{name:b.name,gender:b.gender,age:b.age,city:b.city,education:b.education,profession:b.profession,familyBackground:b.familyBackground||"",requirements:b.requirements||"",contact:b.contact,photoUrl:b.photoUrl||null,paymentProofUrl:b.paymentProofUrl||null,additionalPhotos:JSON.stringify((b.additionalPhotos||[]).filter(Boolean)),applicantType:"admin_client",feeAmount:5000,relationToCandidate:b.relationToCandidate||"Self",status:b.status,paymentStatus:b.paymentStatus,showOnPortal:b.showOnPortal,isFeatured:b.isFeatured,adminNote:b.adminNote||"Entered by matrimonial manager/admin."}});await writeExtendedProfile(base.id,{...b,applicationSource:"admin_manual"},req,true);if(b.verificationStatus)await prisma.$executeRaw`UPDATE "Matrimonial" SET "verificationStatus"=${b.verificationStatus} WHERE "id"=${base.id}`;await audit(req,"admin_profile_created",base.id,null,{relationToCandidate:b.relationToCandidate||"Self"});res.status(201).json(await rawProfile(base.id));}catch(e){next(e);}});

router.put("/mine/:id", requireMember, validate(MatrimonialSchema.partial()), async (req,res,next)=>{try{const user=(req as any).user,id=String(req.params.id),current=await rawProfile(id);if(!current||current.authUserId!==user.id)return void res.status(404).json({error:"Candidate profile not found for this account."});const body={...current,...req.body,profileId:id},data:any={status:"pending",showOnPortal:false,isFeatured:false};for(const k of ["name","gender","age","city","education","profession","familyBackground","requirements","contact","photoUrl","paymentProofUrl","relationToCandidate"] as const)if(req.body[k]!==undefined)data[k]=req.body[k];if(req.body.additionalPhotos!==undefined)data.additionalPhotos=JSON.stringify((req.body.additionalPhotos||[]).filter(Boolean));if(!paymentCleared(current.paymentStatus)&&req.body.paymentProofUrl)data.paymentStatus="submitted";await prisma.matrimonial.update({where:{id},data});await writeExtendedProfile(id,body,req,false);await audit(req,"owner_profile_updated",id,null,{returnedToReview:true});res.json(await rawProfile(id));}catch(e:any){if(e.code==="P2025")return void res.status(404).json({error:"Matrimonial profile not found"});next(e);}});

router.post("/match-requests", requireMember, validate(MatchRequestSchema), async (req,res,next)=>{try{const user=(req as any).user,own=await rawProfile(req.body.requesterProfileId),target=await rawProfile(req.body.targetProfileId);if(!own||own.authUserId!==user.id)return void res.status(403).json({error:"The requester profile does not belong to your account."});if(own.status!=="approved"||!own.showOnPortal||!own.isActive)return void res.status(403).json({error:"Your candidate profile must be approved and enabled for matching first."});if(!target||target.status!=="approved"||!target.showOnPortal||!target.isActive)return void res.status(404).json({error:"The selected profile is not currently available."});if(target.id===own.id||target.gender===own.gender)return void res.status(400).json({error:"This profile cannot be requested as a match."});const reverse=await prisma.matrimonialMatchRequest.findFirst({where:{requesterProfileId:target.id,targetProfileId:own.id,status:{in:["pending_admin","awaiting_target","accepted"]}}});if(reverse)return void res.status(409).json({error:"A match request between these profiles is already active."});const c=mutualCompatibility(own,target),created=await prisma.matrimonialMatchRequest.create({data:{requesterAuthUserId:user.id,requesterProfileId:own.id,targetProfileId:target.id,requesterMessage:req.body.requesterMessage||null,status:"pending_admin"}});await prisma.$executeRaw`UPDATE "MatrimonialMatchRequest" SET "requesterToTargetScore"=${c.requesterToTargetScore},"targetToRequesterScore"=${c.targetToRequesterScore},"mutualScore"=${c.mutualScore},"scoreConfidence"=${c.scoreConfidence},"scoreBreakdown"=${JSON.stringify(c.breakdown)}::jsonb WHERE "id"=${created.id}`;await audit(req,"interest_requested",own.id,created.id,{targetProfileId:target.id,mutualScore:c.mutualScore});void sendEmail(MASTER_EMAIL,`Matrimonial interest: ${profileCode(own.id)} → ${profileCode(target.id)}`,emailFrame("New matrimonial interest",`<p>A privacy-protected interest requires manager review.</p><p>${profileCode(own.id)} → ${profileCode(target.id)} · ${c.mutualScore}% compatibility</p>`)).catch(console.error);res.status(201).json({id:created.id,status:created.status,target:anonymizedProfile(target),...c});}catch(e:any){if(e?.code==="P2002")return void res.status(409).json({error:"This match request already exists."});next(e);}});

router.get("/match-requests/mine", requireMember, async (req,res,next)=>{try{const user=(req as any).user,mine=await rawProfilesByUser(user.id),ids=mine.map(p=>p.id),rows=await prisma.matrimonialMatchRequest.findMany({where:{OR:[{requesterAuthUserId:user.id},{targetProfileId:{in:ids.length?ids:["__none__"]}}]},include:{requesterProfile:true,targetProfile:true},orderBy:{createdAt:"desc"}}),out:any[]=[];for(const r of rows){const requester=await rawProfile(r.requesterProfileId),target=await rawProfile(r.targetProfileId);if(!requester||!target)continue;const incoming=ids.includes(r.targetProfileId),accepted=r.status==="accepted"&&Boolean(r.contactReleasedAt),counterpart=incoming?requester:target,meta=(await prisma.$queryRaw<any[]>`SELECT * FROM "MatrimonialMatchRequest" WHERE "id"=${r.id} LIMIT 1`)[0]||{};out.push({id:r.id,direction:incoming?"incoming":"outgoing",status:r.status,requesterProfileId:r.requesterProfileId,targetProfileId:r.targetProfileId,requesterMessage:incoming&&["awaiting_target","accepted"].includes(r.status)?r.requesterMessage:undefined,counterpart:accepted?expandedProfile(counterpart,{photo:meta.photoAccessStatus==="released",contact:meta.contactAccessStatus==="released"}):anonymizedProfile(counterpart),mutualScore:meta.mutualScore,requesterToTargetScore:meta.requesterToTargetScore,targetToRequesterScore:meta.targetToRequesterScore,scoreConfidence:meta.scoreConfidence,createdAt:r.createdAt,adminApprovedAt:r.adminApprovedAt,targetRespondedAt:r.targetRespondedAt,contactReleasedAt:r.contactReleasedAt,photoReleasedAt:meta.photoReleasedAt});}res.json({requests:out});}catch(e){next(e);}});

router.patch("/match-requests/:id/respond", requireMember, async (req,res,next)=>{try{const user=(req as any).user,decision=String(req.body?.decision||"").toLowerCase();if(!["accept","decline"].includes(decision))return void res.status(400).json({error:"Decision must be accept or decline."});const row=await prisma.matrimonialMatchRequest.findUnique({where:{id:String(req.params.id)}});if(!row)return void res.status(404).json({error:"Match request not found."});const target=await rawProfile(row.targetProfileId),requester=await rawProfile(row.requesterProfileId);if(!target||!requester||target.authUserId!==user.id)return void res.status(403).json({error:"Only the owner of the requested profile can respond."});if(row.status!=="awaiting_target")return void res.status(409).json({error:"This request is not waiting for your response."});const accepted=decision==="accept",privacy=jsonValue(target.privacyData),photoRelease=accepted&&privacy.photoVisibility!=="admin_only",contactRelease=accepted&&privacy.contactVisibility!=="admin_only";const updated=await prisma.matrimonialMatchRequest.update({where:{id:row.id},data:{status:accepted?"accepted":"declined",targetRespondedAt:new Date(),contactReleasedAt:contactRelease?new Date():null}});await prisma.$executeRaw`UPDATE "MatrimonialMatchRequest" SET "fullProfileReleasedAt"=${accepted?new Date():null},"photoReleasedAt"=${photoRelease?new Date():null},"photoAccessStatus"=${photoRelease?"released":"locked"},"contactAccessStatus"=${contactRelease?"released":"locked"} WHERE "id"=${row.id}`;await audit(req,accepted?"interest_accepted":"interest_declined",target.id,row.id,{requesterProfileId:requester.id,photoReleased:photoRelease,contactReleased:contactRelease});res.json({id:updated.id,status:updated.status,counterpart:accepted?expandedProfile(requester,{photo:true,contact:true}):anonymizedProfile(requester)});}catch(e){next(e);}});

router.get("/match-requests/admin/all", requireMatrimonialAdmin, async (_req,res,next)=>{try{const rows=await prisma.$queryRaw<any[]>`SELECT * FROM "MatrimonialMatchRequest" ORDER BY "createdAt" DESC LIMIT 500`,out:any[]=[];for(const r of rows){const requester=await rawProfile(r.requesterProfileId),target=await rawProfile(r.targetProfileId);if(requester&&target)out.push({...r,requester:expandedProfile(requester,{photo:true,contact:true}),target:expandedProfile(target,{photo:true,contact:true})});}res.json({requests:out});}catch(e){next(e);}});
router.patch("/match-requests/:id/admin", requireMatrimonialAdmin, async (req,res,next)=>{try{const action=String(req.body?.action||"").toLowerCase();if(!["forward","reject","close"].includes(action))return void res.status(400).json({error:"Action must be forward, reject or close."});const row=await prisma.matrimonialMatchRequest.findUnique({where:{id:String(req.params.id)}});if(!row)return void res.status(404).json({error:"Match request not found."});const status=action==="forward"?"awaiting_target":action==="reject"?"rejected":"closed";const updated=await prisma.matrimonialMatchRequest.update({where:{id:row.id},data:{status,adminNote:String(req.body?.adminNote||"")||null,adminApprovedAt:action==="forward"?new Date():row.adminApprovedAt}});const target=await rawProfile(row.targetProfileId);if(action==="forward"&&target?.authUserId){const u=await prisma.authUser.findUnique({where:{id:target.authUserId},select:{email:true}});if(u?.email)void sendEmail(u.email,"A matrimonial interest is waiting for your consent",emailFrame("Consent requested",`<p>A verified profile has requested an introduction with ${profileCode(target.id)}.</p><p>Sign in to review the anonymized match. Private details remain protected unless you accept.</p>`)).catch(console.error);}await audit(req,`manager_${action}`,target?.id||null,row.id,{status});res.json({id:updated.id,status:updated.status});}catch(e){next(e);}});

router.get("/:id/audit", requireMatrimonialAdmin, async (req,res,next)=>{try{const id=String(req.params.id),rows=await prisma.$queryRaw<any[]>`SELECT * FROM "MatrimonialAuditLog" WHERE "profileId"=${id} ORDER BY "createdAt" DESC LIMIT 300`;res.json({audit:rows});}catch(e){next(e);}});
router.patch("/:id/status", requireMatrimonialAdmin, async (req,res,next)=>{try{const id=String(req.params.id),current=await rawProfile(id);if(!current)return void res.status(404).json({error:"Matrimonial profile not found"});const {status,paymentStatus,adminNote,verificationStatus}=req.body,effective=paymentStatus??current.paymentStatus;if(status==="approved"&&!paymentCleared(effective))return void res.status(409).json({error:"Payment must be received or verified before approving this profile."});if(status==="approved"&&!current.candidateConsent)return void res.status(409).json({error:"Candidate/guardian consent must be recorded before approval."});const updated=await prisma.matrimonial.update({where:{id},data:{status,paymentStatus,adminNote,...(status==="rejected"?{showOnPortal:false}:{})}});if(verificationStatus!==undefined)await prisma.$executeRaw`UPDATE "Matrimonial" SET "verificationStatus"=${verificationStatus},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`;await audit(req,"manager_status_updated",id,null,{status,paymentStatus,verificationStatus});res.json(await rawProfile(updated.id));}catch(e:any){if(e.code==="P2025")return void res.status(404).json({error:"Matrimonial profile not found"});next(e);}});
router.put("/:id", requireMatrimonialAdmin, validate(MatrimonialSchema.partial().passthrough()), async (req,res,next)=>{try{const id=String(req.params.id),current=await rawProfile(id);if(!current)return void res.status(404).json({error:"Matrimonial profile not found"});const body={...current,...req.body},effectiveStatus=req.body.status??current.status,effectivePayment=req.body.paymentStatus??current.paymentStatus;if((effectiveStatus==="approved"||req.body.showOnPortal===true)&&!paymentCleared(effectivePayment))return void res.status(409).json({error:"Payment must be received or verified before approval/matching visibility."});if((effectiveStatus==="approved"||req.body.showOnPortal===true)&&!body.candidateConsent)return void res.status(409).json({error:"Candidate/guardian consent must be recorded before approval/matching visibility."});if(req.body.showOnPortal===true&&effectiveStatus!=="approved")return void res.status(409).json({error:"Approve the profile before enabling it for matching."});const data:any={};for(const k of ["name","gender","age","city","education","profession","familyBackground","requirements","contact","photoUrl","paymentProofUrl","status","paymentStatus","adminNote","isFeatured","showOnPortal","relationToCandidate"] as const)if(req.body[k]!==undefined)data[k]=req.body[k];if(req.body.additionalPhotos!==undefined)data.additionalPhotos=JSON.stringify((req.body.additionalPhotos||[]).filter(Boolean));await prisma.matrimonial.update({where:{id},data});await writeExtendedProfile(id,body,req,true);if(req.body.verificationStatus!==undefined)await prisma.$executeRaw`UPDATE "Matrimonial" SET "verificationStatus"=${req.body.verificationStatus} WHERE "id"=${id}`;await audit(req,"manager_profile_updated",id,null,{fields:Object.keys(req.body)});res.json(await rawProfile(id));}catch(e:any){if(e.code==="P2025")return void res.status(404).json({error:"Matrimonial profile not found"});next(e);}});
router.delete("/:id", requireMatrimonialAdmin, async (req,res,next)=>{try{const id=String(req.params.id),current=await rawProfile(id);if(!current)return void res.status(404).json({error:"Matrimonial profile not found"});await prisma.$executeRaw`UPDATE "Matrimonial" SET "isActive"=false,"showOnPortal"=false,"status"='rejected',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}`;await audit(req,"profile_archived",id,null,{profileCode:profileCode(id)});res.json({success:true,archived:true});}catch(e){next(e);}});

export default router;
