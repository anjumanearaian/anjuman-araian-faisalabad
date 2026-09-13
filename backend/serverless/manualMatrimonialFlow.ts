import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

const ADMIN_ROLES = new Set(["admin", "super_admin", "welfare_manager", "matrimonial_manager"]);

function bodyOf(req: any) {
  if (!req?.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function authenticate(req: any) {
  const header = String(req.headers?.authorization || "");
  if (!header.startsWith("Bearer ")) throw Object.assign(new Error("Authentication required"), { status: 401 });
  const secret = process.env.JWT_SECRET;
  if (!secret) throw Object.assign(new Error("JWT_SECRET is not configured"), { status: 500 });
  const decoded = jwt.verify(header.slice(7).trim(), secret) as any;
  if (!ADMIN_ROLES.has(String(decoded?.role || ""))) throw Object.assign(new Error("Matrimonial manager access required"), { status: 403 });
  return decoded;
}

function clean(v: any) { return String(v ?? "").trim(); }
function norm(v: any) { return clean(v).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function object(v: any) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
function list(v: any): string[] { if (Array.isArray(v)) return v.map(clean).filter(Boolean); if (typeof v === "string") return v.split(",").map((x) => x.trim()).filter(Boolean); return []; }
function code(id: string) { return `AAF-MAT-${String(id).replace(/-/g, "").slice(0, 8).toUpperCase()}`; }
function importance(v: any) { const k = norm(v); if (["must", "must have"].includes(k)) return 5; if (["very important", "high"].includes(k)) return 4; if (k === "important") return 3; if (["preferred", "preference"].includes(k)) return 2; if (["nice", "nice to have"].includes(k)) return 1; return 0; }

function layered(pref: any, candidateValue: any) {
  const candidate = norm(candidateValue), p = list(pref?.primary).map(norm), s = list(pref?.secondary).map(norm), a = list(pref?.acceptable).map(norm);
  const configured = p.length + s.length + a.length > 0;
  if (!configured) return { configured: false, known: Boolean(candidate), score: 1, label: "No preference" };
  if (!candidate) return { configured: true, known: false, score: 0, label: "Not specified" };
  const hit = (values: string[]) => values.some((x) => x === candidate || candidate.includes(x) || x.includes(candidate));
  if (hit(p)) return { configured: true, known: true, score: 1, label: "Primary preference" };
  if (hit(s)) return { configured: true, known: true, score: .8, label: "Secondary preference" };
  if (hit(a)) return { configured: true, known: true, score: .6, label: "Acceptable preference" };
  return { configured: true, known: true, score: 0, label: "Outside preference" };
}

function ranged(pref: any, candidateValue: any) {
  const min = Number(pref?.min || 0), max = Number(pref?.max || 0), value = Number(candidateValue || 0);
  if (!min && !max) return { configured: false, known: Boolean(value), score: 1, label: "No preference" };
  if (!value) return { configured: true, known: false, score: 0, label: "Not specified" };
  if ((!min || value >= min) && (!max || value <= max)) return { configured: true, known: true, score: 1, label: "Within range" };
  const delta = min && value < min ? min - value : max && value > max ? value - max : 0;
  return { configured: true, known: true, score: delta <= 3 ? .5 : 0, label: delta <= 3 ? "Near preferred range" : "Outside range" };
}

function incomeNumber(v: any) {
  if (typeof v === "number") return v;
  const value = clean(v).replace(/,/g, ""), nums = value.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!nums.length) return 0;
  let n = Math.max(...nums); if (/\bk\b/i.test(value)) n *= 1000; if (/\bm\b/i.test(value)) n *= 1000000; return n;
}

function directional(owner: any, candidate: any) {
  const pref = object(owner.preferenceData), profile = object(candidate.profileData), detail: any[] = [];
  let earned = 0, knownWeight = 0, totalWeight = 0, mustFail = false;
  const add = (criterion: string, result: any, imp: any) => {
    if (!result.configured) return;
    const weight = importance(imp) || 2; totalWeight += weight;
    if (result.known) { knownWeight += weight; earned += weight * result.score; }
    if (["must", "must have"].includes(norm(imp)) && result.known && result.score < 1) mustFail = true;
    detail.push({ criterion, result: result.label, score: Math.round(result.score * 100), importance: clean(imp) || "preferred", known: result.known });
  };
  add("Age", ranged(pref.age, candidate.age), pref.age?.importance);
  add("Height", ranged(pref.height, candidate.heightCm || profile.heightCm), pref.height?.importance);
  add("Education", layered(pref.education, candidate.education), pref.education?.importance);
  add("Profession", layered(pref.profession, candidate.profession), pref.profession?.importance);
  add("Country", layered(pref.country, candidate.country || "Pakistan"), pref.country?.importance);
  add("City", layered(pref.city, candidate.city), pref.city?.importance);
  add("Marital status", layered(pref.maritalStatus, candidate.maritalStatus || profile.maritalStatus), pref.maritalStatus?.importance);
  add("Residence status", layered(pref.residenceStatus, candidate.residenceStatus || profile.residenceStatus), pref.residenceStatus?.importance);
  add("Family setup", layered(pref.familySetup, profile.familySetup), pref.familySetup?.importance);
  add("Sect", layered(pref.sect, profile.sect), pref.sect?.importance);
  add("Relocation", layered(pref.relocation, profile.relocation), pref.relocation?.importance);
  const incomeMin = Number(pref.income?.minimum || 0);
  if (incomeMin > 0) {
    const current = incomeNumber(profile.monthlyIncome || candidate.incomeBand);
    add("Income", current ? { configured: true, known: true, score: current >= incomeMin ? 1 : current >= incomeMin * .75 ? .6 : 0, label: current >= incomeMin ? "Meets income preference" : current >= incomeMin * .75 ? "Near income preference" : "Below income preference" } : { configured: true, known: false, score: 0, label: "Income not specified" }, pref.income?.importance);
  }
  const raw = knownWeight ? Math.round(earned / knownWeight * 100) : 50;
  return { score: mustFail ? Math.min(39, raw) : raw, confidence: totalWeight ? Math.round(knownWeight / totalWeight * 100) : 50, eligible: !mustFail, detail };
}

function compatibility(a: any, b: any) {
  const ab = directional(a, b), ba = directional(b, a), eligible = ab.eligible && ba.eligible;
  let mutual = Math.round((ab.score + ba.score) / 2); if (!eligible) mutual = Math.min(39, mutual);
  return { requesterToTargetScore: ab.score, targetToRequesterScore: ba.score, mutualScore: mutual, scoreConfidence: Math.round((ab.confidence + ba.confidence) / 2), eligible, breakdown: { requesterToTarget: ab.detail, targetToRequester: ba.detail } };
}

async function getProfile(id: string) {
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "Matrimonial" WHERE "id"=${id} LIMIT 1`;
  return rows[0] || null;
}

async function audit(user: any, action: string, profileId?: string | null, requestId?: string | null, details?: any) {
  await prisma.$executeRaw`INSERT INTO "MatrimonialAuditLog" ("profileId","requestId","action","actorId","actorName","actorRole","details") VALUES (${profileId || null},${requestId || null},${action},${user.id || null},${user.username || user.email || null},${user.role || "admin"},${JSON.stringify(details || {})}::jsonb)`;
}

async function previewBatch(requesterProfileId: string) {
  const requester = await getProfile(requesterProfileId);
  if (!requester) throw Object.assign(new Error("Requester profile not found"), { status: 404 });
  if (requester.status !== "approved" || requester.showOnPortal !== true || requester.isActive === false) throw Object.assign(new Error("Requester must be approved and enabled for matching"), { status: 409 });
  const targets = await prisma.$queryRaw<any[]>`SELECT * FROM "Matrimonial" WHERE "id"<>${requester.id} AND "gender"<>${requester.gender} AND "status"='approved' AND "showOnPortal"=true AND "isActive"=true ORDER BY "isFeatured" DESC,"updatedAt" DESC LIMIT 250`;
  return targets.map((target) => ({ id: target.id, profileCode: code(target.id), name: target.name, gender: target.gender, age: target.age, city: target.city, country: target.country || "Pakistan", education: target.education, profession: target.profession, maritalStatus: target.maritalStatus, verificationStatus: target.verificationStatus, ...compatibility(requester, target) })).sort((a, b) => b.mutualScore - a.mutualScore || b.scoreConfidence - a.scoreConfidence).slice(0, 50);
}

export async function manualMatrimonialFlow(req: any, res: any) {
  try {
    const user = authenticate(req);
    if (String(req.method || "").toUpperCase() === "GET") {
      const rawUrl = new URL(String(req.url || "/api/matrimonial/manual-flow"), "http://localhost");
      const action = rawUrl.searchParams.get("action") || "manual_consent_queue";
      if (action !== "manual_consent_queue") return res.status(400).json({ error: "Unsupported action" });
      const rows = await prisma.$queryRaw<any[]>`
        SELECT mr.*, r."name" AS "requesterName", r."contact" AS "requesterContact", r."authUserId" AS "requesterAuthUserId", r."gender" AS "requesterGender", r."age" AS "requesterAge", r."city" AS "requesterCity",
               t."name" AS "targetName", t."contact" AS "targetContact", t."authUserId" AS "targetAuthUserId", t."gender" AS "targetGender", t."age" AS "targetAge", t."city" AS "targetCity"
        FROM "MatrimonialMatchRequest" mr
        JOIN "Matrimonial" r ON r."id"=mr."requesterProfileId"
        JOIN "Matrimonial" t ON t."id"=mr."targetProfileId"
        WHERE mr."status"='awaiting_target' AND t."authUserId" IS NULL
        ORDER BY mr."adminApprovedAt" DESC NULLS LAST, mr."createdAt" DESC
        LIMIT 200`;
      return res.json({ requests: rows.map((r) => ({ ...r, requesterCode: code(r.requesterProfileId), targetCode: code(r.targetProfileId) })) });
    }

    const body = bodyOf(req), action = String(body.action || "");
    if (action === "preview_batch") {
      const requesterProfileId = clean(body.requesterProfileId);
      if (!requesterProfileId) return res.status(400).json({ error: "Requester profile is required" });
      return res.json({ matches: await previewBatch(requesterProfileId) });
    }

    if (action === "create_interest") {
      const requesterProfileId = clean(body.requesterProfileId), targetProfileId = clean(body.targetProfileId), note = clean(body.note).slice(0, 1000);
      if (!requesterProfileId || !targetProfileId) return res.status(400).json({ error: "Requester and target profiles are required" });
      const requester = await getProfile(requesterProfileId), target = await getProfile(targetProfileId);
      if (!requester || !target) return res.status(404).json({ error: "Candidate profile not found" });
      if (requester.id === target.id || requester.gender === target.gender) return res.status(400).json({ error: "These profiles cannot be paired" });
      for (const p of [requester, target]) if (p.status !== "approved" || p.showOnPortal !== true || p.isActive === false) return res.status(409).json({ error: `${code(p.id)} must be approved and enabled for matching first.` });
      const existing = await prisma.$queryRaw<any[]>`SELECT "id","status" FROM "MatrimonialMatchRequest" WHERE (("requesterProfileId"=${requester.id} AND "targetProfileId"=${target.id}) OR ("requesterProfileId"=${target.id} AND "targetProfileId"=${requester.id})) AND "status" IN ('pending_admin','awaiting_target','accepted') LIMIT 1`;
      if (existing.length) return res.status(409).json({ error: "An active interest already exists between these profiles." });
      const c = compatibility(requester, target), actorId = requester.authUserId || null;
      const created = await prisma.$queryRaw<any[]>`
        INSERT INTO "MatrimonialMatchRequest" ("id","requesterAuthUserId","requesterProfileId","targetProfileId","requesterMessage","status","requesterToTargetScore","targetToRequesterScore","mutualScore","scoreConfidence","scoreBreakdown","createdAt","updatedAt")
        VALUES (gen_random_uuid()::text,${actorId},${requester.id},${target.id},${note || null},'pending_admin',${c.requesterToTargetScore},${c.targetToRequesterScore},${c.mutualScore},${c.scoreConfidence},${JSON.stringify(c.breakdown)}::jsonb,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        RETURNING *`;
      await audit(user, "manager_manual_interest_created", requester.id, created[0]?.id, { targetProfileId: target.id, mutualScore: c.mutualScore, requesterCode: code(requester.id), targetCode: code(target.id) });
      return res.status(201).json({ request: created[0], compatibility: c });
    }

    if (action === "record_consent") {
      const requestId = clean(body.requestId), decision = clean(body.decision).toLowerCase(), consentMethod = clean(body.consentMethod).toLowerCase(), note = clean(body.note).slice(0, 1200);
      if (!requestId || !["accept", "decline"].includes(decision)) return res.status(400).json({ error: "Request and consent decision are required" });
      if (!["office_visit", "phone", "signed_form", "family_meeting", "other"].includes(consentMethod)) return res.status(400).json({ error: "Select how consent was recorded" });
      if (note.length < 5) return res.status(400).json({ error: "Add a short consent note for the audit trail" });
      const rows = await prisma.$queryRaw<any[]>`SELECT mr.*, t."privacyData", t."authUserId" AS "targetAuthUserId" FROM "MatrimonialMatchRequest" mr JOIN "Matrimonial" t ON t."id"=mr."targetProfileId" WHERE mr."id"=${requestId} LIMIT 1`;
      const row = rows[0]; if (!row) return res.status(404).json({ error: "Interest request not found" });
      if (row.status !== "awaiting_target") return res.status(409).json({ error: "This request is not waiting for target consent" });
      if (row.targetAuthUserId) return res.status(409).json({ error: "This target has a verified portal account. Consent should normally be given from the candidate account, not recorded manually." });
      const accepted = decision === "accept", privacy = object(row.privacyData), photoRelease = accepted && privacy.photoVisibility !== "admin_only", contactRelease = accepted && privacy.contactVisibility !== "admin_only";
      await prisma.$executeRaw`
        UPDATE "MatrimonialMatchRequest" SET "status"=${accepted ? "accepted" : "declined"},"targetRespondedAt"=CURRENT_TIMESTAMP,"contactReleasedAt"=${contactRelease ? new Date() : null},"fullProfileReleasedAt"=${accepted ? new Date() : null},"photoReleasedAt"=${photoRelease ? new Date() : null},"photoAccessStatus"=${photoRelease ? "released" : "locked"},"contactAccessStatus"=${contactRelease ? "released" : "locked"},"consentRecordedByAdminId"=${user.id || null},"consentRecordedByName"=${user.username || user.email || null},"consentRecordedAt"=CURRENT_TIMESTAMP,"consentMethod"=${consentMethod},"adminNote"=${note},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${requestId}`;
      await audit(user, accepted ? "manager_manual_consent_accepted" : "manager_manual_consent_declined", row.targetProfileId, requestId, { consentMethod, note, photoReleased: photoRelease, contactReleased: contactRelease });
      return res.json({ success: true, status: accepted ? "accepted" : "declined", photoReleased: photoRelease, contactReleased: contactRelease });
    }

    return res.status(400).json({ error: "Unsupported action" });
  } catch (error: any) {
    console.error("manual matrimonial flow error", error);
    return res.status(Number(error?.status || 500)).json({ error: error?.message || "Manual matrimonial workflow failed" });
  }
}
