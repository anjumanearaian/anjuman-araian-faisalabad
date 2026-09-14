import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { emailFrame, sendEmail } from "../lib/email";
import { matrimonialCompatibility } from "../lib/matrimonialCompatibility";
import { createMatrimonialProfilePdf } from "../lib/matrimonialPdf";

const ADMIN_ROLES = new Set(["admin", "super_admin", "welfare_manager", "matrimonial_manager"]);

type ReferenceInput = {
  name?: string;
  profession?: string;
  phone?: string;
  city?: string;
  address?: string;
};

function bodyOf(req: any) {
  if (!req?.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}

function clean(value: any) { return String(value ?? "").trim(); }
function digits(value: any) { return clean(value).replace(/\D/g, ""); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function code(id: string) { return `AAF-MAT-${String(id).replace(/-/g, "").slice(0, 8).toUpperCase()}`; }
function jsonObject(value: any) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function scoreBand(score: number) { return score >= 80 ? "excellent_80" : score >= 70 ? "strong_70" : score >= 50 ? "relevant_50" : "below_50"; }
function isAboveThreshold(band: string) { return band !== "below_50"; }

function authenticate(req: any) {
  const header = clean(req.headers?.authorization);
  if (!header.startsWith("Bearer ")) throw Object.assign(new Error("Authentication required"), { status: 401 });
  if (!process.env.JWT_SECRET) throw Object.assign(new Error("JWT_SECRET is not configured"), { status: 500 });
  try { return jwt.verify(header.slice(7).trim(), process.env.JWT_SECRET) as any; }
  catch { throw Object.assign(new Error("Your session has expired. Please sign in again."), { status: 401 }); }
}

function requireAdmin(req: any) {
  const user = authenticate(req);
  if (!ADMIN_ROLES.has(clean(user?.role))) throw Object.assign(new Error("Matrimonial manager access required"), { status: 403 });
  return user;
}

async function rawProfile(id: string) {
  const rows = await prisma.$queryRaw<any[]>`SELECT m.*, a."email" AS "accountEmail" FROM "Matrimonial" m LEFT JOIN "AuthUser" a ON a."id"=m."authUserId" WHERE m."id"=${id} LIMIT 1`;
  if (!rows[0]) return null;
  const row = rows[0];
  row.profileData = jsonObject(row.profileData);
  row.preferenceData = jsonObject(row.preferenceData);
  row.privacyData = jsonObject(row.privacyData);
  row.profileCode = code(row.id);
  row.email = clean(row.email) || clean(row.accountEmail);
  return row;
}

async function audit(user: any, action: string, profileId?: string | null, requestId?: string | null, details?: any) {
  await prisma.$executeRaw`INSERT INTO "MatrimonialAuditLog" ("profileId","requestId","action","actorId","actorName","actorRole","details") VALUES (${profileId || null},${requestId || null},${action},${user?.id || null},${user?.username || user?.email || null},${user?.role || "system"},${JSON.stringify(details || {})}::jsonb)`;
}

async function verifyReferences(refs: ReferenceInput[]) {
  const normalized = refs.slice(0, 8).map((r) => ({
    name: clean(r.name),
    profession: clean(r.profession),
    phone: clean(r.phone),
    city: clean(r.city),
    address: clean(r.address),
  }));
  if (normalized.length < 2) throw Object.assign(new Error("At least two references are required."), { status: 400 });
  for (let i = 0; i < normalized.length; i++) {
    const r = normalized[i];
    if (!r.name || !r.profession || digits(r.phone).length < 10 || (!r.city && !r.address)) {
      throw Object.assign(new Error(`Reference ${i + 1}: name, profession, mobile and city/address are required.`), { status: 400 });
    }
  }

  const out: any[] = [];
  for (const r of normalized) {
    const phone10 = digits(r.phone).slice(-10);
    const members = await prisma.$queryRaw<any[]>`
      SELECT "id","memberNo","fullName","phone","city","occupation","status"
      FROM "Member"
      WHERE "status"='approved'
        AND (
          right(regexp_replace(COALESCE("phone",''),'\\D','','g'),10)=${phone10}
          OR lower(trim("fullName"))=lower(${r.name})
        )
      ORDER BY CASE WHEN right(regexp_replace(COALESCE("phone",''),'\\D','','g'),10)=${phone10} THEN 0 ELSE 1 END
      LIMIT 1`;
    const m = members[0];
    out.push({
      ...r,
      isMember: Boolean(m),
      memberId: m?.id || null,
      memberNo: m?.memberNo || null,
      memberName: m?.fullName || null,
      memberPhone: m?.phone || null,
      memberCity: m?.city || null,
      memberVerified: Boolean(m),
      verifiedAt: m ? new Date().toISOString() : null,
    });
  }
  return out;
}

async function sendProfilePacket(profile: any) {
  if (!profile.email) return { sent: false, reason: "Candidate email is missing" };
  const pdf = createMatrimonialProfilePdf(profile);
  return sendEmail(
    profile.email,
    `Your confidential matrimonial profile - ${profile.profileCode}`,
    emailFrame("Matrimonial Profile Updated", `
      <p>Dear ${profile.name || "Candidate"},</p>
      <p>Your confidential matrimonial profile <strong>${profile.profileCode}</strong> has been saved/updated by the authorized Anjuman-e-Araian Faisalabad matrimonial desk.</p>
      <p>Your current profile and matching readiness is <strong>${Number(profile.profileCompleteness || 0)}%</strong>.</p>
      <p>The attached A4 PDF is your private official record. Please do not forward it publicly. You may sign in using this same email address to access your permitted matrimonial workflow.</p>
      <p>No candidate photo, phone number or identity is released to another party unless the consent and privacy workflow allows it.</p>`),
    [{ filename: `${profile.profileCode}-confidential-profile.pdf`, content: pdf, contentType: "application/pdf" }],
  );
}

async function sendMatchEmail(profile: any, score: number, direction: "available" | "updated") {
  if (!profile.email) return { sent: false, reason: "email_missing" };
  const title = direction === "available" ? "A private compatibility match is available" : "Your compatibility match status was updated";
  const body = direction === "available"
    ? `<p>A private compatibility result of <strong>${score}%</strong> is available for profile <strong>${profile.profileCode}</strong>.</p><p>This is an automated compatibility indicator, not a guarantee of suitability. The other candidate's name, photo and contact remain protected. Sign in to your matrimonial account to review the anonymized match and show interest if appropriate.</p>`
    : `<p>A previously notified compatibility result for profile <strong>${profile.profileCode}</strong> has changed after profile/preferences were updated and is now below the 50% notification threshold.</p><p>No private information has been released. The matching engine will automatically notify you again if a relevant compatibility result becomes available.</p>`;
  return sendEmail(profile.email, title, emailFrame(title, body));
}

async function recalculateAlerts(profileId: string, user: any) {
  const current = await rawProfile(profileId);
  if (!current) return { checked: 0, notifications: 0 };
  const currentEligible = current.status === "approved" && current.showOnPortal === true && current.isActive !== false;
  const targets = await prisma.$queryRaw<any[]>`
    SELECT m.*, a."email" AS "accountEmail"
    FROM "Matrimonial" m
    LEFT JOIN "AuthUser" a ON a."id"=m."authUserId"
    WHERE m."id"<>${profileId} AND m."isActive"=true AND m."status"='approved' AND m."showOnPortal"=true AND m."gender"<>${current.gender}
    ORDER BY m."updatedAt" DESC LIMIT 300`;
  let notifications = 0;
  for (const raw of targets) {
    const target = { ...raw, profileData: jsonObject(raw.profileData), preferenceData: jsonObject(raw.preferenceData), privacyData: jsonObject(raw.privacyData), profileCode: code(raw.id), email: clean(raw.email) || clean(raw.accountEmail) };
    const compatibility = currentEligible ? matrimonialCompatibility(current, target) : { mutualScore: 0 } as any;
    const score = Number(compatibility.mutualScore || 0);
    const band = scoreBand(score);
    const a = current.id < target.id ? current.id : target.id;
    const b = current.id < target.id ? target.id : current.id;
    const prior = await prisma.$queryRaw<any[]>`SELECT * FROM "MatrimonialMatchAlert" WHERE "profileAId"=${a} AND "profileBId"=${b} LIMIT 1`;
    const oldBand = prior[0]?.lastBand || "below_50";
    const crossedUp = !isAboveThreshold(oldBand) && isAboveThreshold(band);
    const crossedDown = isAboveThreshold(oldBand) && !isAboveThreshold(band);

    if (!prior.length) {
      await prisma.$executeRaw`INSERT INTO "MatrimonialMatchAlert" ("profileAId","profileBId","lastScore","lastBand","lastNotifiedAt") VALUES (${a},${b},${score},${band},${crossedUp ? new Date() : null})`;
    } else {
      await prisma.$executeRaw`UPDATE "MatrimonialMatchAlert" SET "lastScore"=${score},"lastBand"=${band},"lastNotifiedAt"=CASE WHEN ${crossedUp || crossedDown} THEN CURRENT_TIMESTAMP ELSE "lastNotifiedAt" END,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${prior[0].id}`;
    }

    if (crossedUp) {
      const [one, two] = await Promise.all([sendMatchEmail(current, score, "available"), sendMatchEmail(target, score, "available")]);
      notifications += Number(Boolean(one.sent)) + Number(Boolean(two.sent));
      await audit(user, "compatibility_threshold_notification", current.id, null, { counterpartProfileId: target.id, score, band, candidateEmailSent: Boolean(one.sent), counterpartEmailSent: Boolean(two.sent) });
    } else if (crossedDown) {
      const [one, two] = await Promise.all([sendMatchEmail(current, score, "updated"), sendMatchEmail(target, score, "updated")]);
      notifications += Number(Boolean(one.sent)) + Number(Boolean(two.sent));
      await audit(user, "compatibility_threshold_withdrawn", current.id, null, { counterpartProfileId: target.id, score, oldBand, candidateEmailSent: Boolean(one.sent), counterpartEmailSent: Boolean(two.sent) });
    }
  }
  await prisma.$executeRaw`UPDATE "Matrimonial" SET "lastMatchedAt"=CURRENT_TIMESTAMP,"lastMatchNotificationAt"=CASE WHEN ${notifications > 0} THEN CURRENT_TIMESTAMP ELSE "lastMatchNotificationAt" END WHERE "id"=${profileId}`;
  return { checked: targets.length, notifications };
}

async function syncProfile(req: any, res: any, user: any) {
  const body = bodyOf(req);
  const profileId = clean(body.profileId);
  const email = clean(body.email).toLowerCase();
  if (!profileId) return res.status(400).json({ error: "Profile ID is required" });
  if (!validEmail(email)) return res.status(400).json({ error: "A valid candidate email is required." });
  const profile = await rawProfile(profileId);
  if (!profile) return res.status(404).json({ error: "Candidate profile not found" });
  const references = await verifyReferences(Array.isArray(body.references) ? body.references : []);
  const nextProfileData = { ...jsonObject(profile.profileData), references };
  await prisma.$executeRaw`UPDATE "Matrimonial" SET "email"=${email},"profileData"=${JSON.stringify(nextProfileData)}::jsonb,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${profileId}`;
  await audit(user, "candidate_email_and_references_synced", profileId, null, { email, references: references.map((r) => ({ name:r.name, phone:r.phone, isMember:r.isMember, memberNo:r.memberNo })) });
  const updated = await rawProfile(profileId);
  const emailResult = body.sendEmail === false ? { sent:false, reason:"disabled" } : await sendProfilePacket(updated);
  if (emailResult.sent) await prisma.$executeRaw`UPDATE "Matrimonial" SET "lastProfileEmailAt"=CURRENT_TIMESTAMP WHERE "id"=${profileId}`;
  await audit(user, "candidate_profile_packet_email", profileId, null, { sent:Boolean(emailResult.sent), reason:(emailResult as any).reason || null, email });
  const matching = await recalculateAlerts(profileId, user);
  return res.json({ profile: updated, references, email: emailResult, matching });
}

async function claimProfiles(req: any, res: any, user: any) {
  if (ADMIN_ROLES.has(clean(user?.role))) return res.status(403).json({ error: "Member/candidate login required" });
  const account = user?.id ? await prisma.$queryRaw<any[]>`SELECT "id","email" FROM "AuthUser" WHERE "id"=${String(user.id)} LIMIT 1` : [];
  const email = clean(user?.email || account[0]?.email).toLowerCase();
  if (!user?.id || !validEmail(email)) return res.status(400).json({ error: "A verified account email is required" });
  const candidates = await prisma.$queryRaw<any[]>`SELECT "id" FROM "Matrimonial" WHERE "authUserId" IS NULL AND lower(COALESCE("email",''))=${email}`;
  if (candidates.length) await prisma.$executeRaw`UPDATE "Matrimonial" SET "authUserId"=${String(user.id)},"updatedAt"=CURRENT_TIMESTAMP WHERE "authUserId" IS NULL AND lower(COALESCE("email",''))=${email}`;
  for (const p of candidates) await audit(user, "admin_created_profile_claimed_by_verified_email", p.id, null, { email });
  return res.json({ claimed: candidates.length, profileIds: candidates.map((p) => p.id) });
}

async function listConnections(res: any) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT c.*, r."name" AS "requesterName", t."name" AS "targetName", mr."mutualScore", mr."scoreConfidence"
    FROM "MatrimonialConnection" c
    JOIN "Matrimonial" r ON r."id"=c."requesterProfileId"
    JOIN "Matrimonial" t ON t."id"=c."targetProfileId"
    JOIN "MatrimonialMatchRequest" mr ON mr."id"=c."requestId"
    ORDER BY c."connectedAt" DESC LIMIT 500`;
  return res.json({ connections: rows.map((r) => ({ ...r, requesterCode:code(r.requesterProfileId), targetCode:code(r.targetProfileId) })) });
}

function rating(value: any) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : NaN;
}

async function completeConnection(req: any, res: any, user: any) {
  const body = bodyOf(req);
  const requestId = clean(body.requestId);
  if (!requestId) return res.status(400).json({ error: "Match request is required" });
  const requesterRating = rating(body.requesterRating), targetRating = rating(body.targetRating), managerRating = rating(body.managerRating);
  if (Number.isNaN(requesterRating) || Number.isNaN(targetRating) || Number.isNaN(managerRating) || managerRating === null) return res.status(400).json({ error: "Manager outcome rating (1-5) is required; candidate ratings, when provided, must also be 1-5." });
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "MatrimonialMatchRequest" WHERE "id"=${requestId} LIMIT 1`;
  const match = rows[0];
  if (!match) return res.status(404).json({ error: "Match request not found" });
  if (match.status !== "accepted") return res.status(409).json({ error: "Only an accepted mutual-consent match can be marked successful." });
  const existing = await prisma.$queryRaw<any[]>`SELECT * FROM "MatrimonialConnection" WHERE "requestId"=${requestId} LIMIT 1`;
  if (existing.length) return res.status(409).json({ error: "This match is already recorded as a successful connection." });
  const note = clean(body.successNote).slice(0, 2000);
  const created = await prisma.$queryRaw<any[]>`
    INSERT INTO "MatrimonialConnection" ("requestId","requesterProfileId","targetProfileId","requesterRating","targetRating","managerRating","successNote","createdByAdminId","createdByName")
    VALUES (${requestId},${match.requesterProfileId},${match.targetProfileId},${requesterRating},${targetRating},${managerRating},${note || null},${user.id || null},${user.username || user.email || null}) RETURNING *`;
  await prisma.$executeRaw`UPDATE "MatrimonialMatchRequest" SET "status"='closed',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${requestId}`;
  await prisma.$executeRaw`UPDATE "Matrimonial" SET "isActive"=false,"showOnPortal"=false,"updatedAt"=CURRENT_TIMESTAMP WHERE "id" IN (${match.requesterProfileId},${match.targetProfileId})`;
  await audit(user, "successful_connection_recorded", match.requesterProfileId, requestId, { targetProfileId:match.targetProfileId, requesterRating, targetRating, managerRating, successNote:note });
  const [requester, target] = await Promise.all([rawProfile(match.requesterProfileId), rawProfile(match.targetProfileId)]);
  const subject = "Matrimonial case closed as successful connection";
  const results = await Promise.all([requester, target].filter(Boolean).map((p) => p.email ? sendEmail(p.email, subject, emailFrame(subject, `<p>Profile <strong>${p.profileCode}</strong> has been closed by the authorized matrimonial desk after a mutually accepted connection was recorded.</p><p>The profile is no longer included in active matching. For privacy, this email does not identify the other party.</p>`)) : Promise.resolve({sent:false,reason:"email_missing"})));
  return res.status(201).json({ connection: created[0], emails: results });
}

async function emailProfile(req: any, res: any, user: any) {
  const profileId = clean(bodyOf(req).profileId);
  const profile = await rawProfile(profileId);
  if (!profile) return res.status(404).json({ error: "Candidate profile not found" });
  const result = await sendProfilePacket(profile);
  if (result.sent) await prisma.$executeRaw`UPDATE "Matrimonial" SET "lastProfileEmailAt"=CURRENT_TIMESTAMP WHERE "id"=${profileId}`;
  await audit(user, "candidate_profile_packet_email", profileId, null, { sent:Boolean(result.sent), reason:(result as any).reason || null, email:profile.email });
  return res.json({ email:result });
}

export async function matrimonialLifecycle(req: any, res: any) {
  try {
    const user = authenticate(req);
    const body = bodyOf(req);
    const rawUrl = new URL(String(req.url || "/api/matrimonial-lifecycle"), "http://localhost");
    const action = clean(body.action || rawUrl.searchParams.get("action"));
    if (action === "claim_profile") return claimProfiles(req, res, user);
    const admin = requireAdmin(req);
    if (action === "sync_profile") return syncProfile(req, res, admin);
    if (action === "list_connections") return listConnections(res);
    if (action === "complete_connection") return completeConnection(req, res, admin);
    if (action === "email_profile") return emailProfile(req, res, admin);
    return res.status(400).json({ error: "Unsupported matrimonial lifecycle action" });
  } catch (error: any) {
    console.error("matrimonial lifecycle error", error);
    return res.status(Number(error?.status || 500)).json({ error: error?.message || "Matrimonial lifecycle request failed" });
  }
}
