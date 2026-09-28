import prisma from "../lib/prisma";
import { MASTER_EMAIL, emailFrame, sendEmail } from "../lib/email";

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

function pktDateParts(date = new Date()) {
  const shifted = new Date(date.getTime() + PKT_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    iso: shifted.toISOString().slice(0, 10),
    md: shifted.toISOString().slice(5, 10),
  };
}

function dateOnlyUtc(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function annualExpiry(approvedAt: Date) {
  const expiry = new Date(approvedAt);
  expiry.setUTCFullYear(expiry.getUTCFullYear() + 1);
  return expiry;
}

function daysBetweenPakistanDates(target: Date, now = new Date()) {
  const today = pktDateParts(now);
  const targetPkt = new Date(target.getTime() + PKT_OFFSET_MS);
  const a = Date.UTC(today.year, today.month - 1, today.day);
  const b = Date.UTC(targetPkt.getUTCFullYear(), targetPkt.getUTCMonth(), targetPkt.getUTCDate());
  return Math.round((b - a) / 86400000);
}

function dobMonthDay(value?: string | null) {
  const raw = String(value || "").trim();
  const match = raw.match(/(?:^|\D)(\d{4})-(\d{2})-(\d{2})(?:\D|$)/) || raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (!match) return "";
  if (match[1]?.length === 4) return `${match[2]}-${match[3]}`;
  return `${match[2]}-${match[1]}`;
}

function isAnnualMembership(value?: string | null) {
  return ["ordinary", "annual"].includes(String(value || "").trim().toLowerCase());
}

async function alreadyLogged(memberId: string, action: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "MemberAuditLog"
    WHERE "memberId" = ${memberId} AND "action" = ${action}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function logAutomation(memberId: string, action: string, reason: string) {
  await prisma.$executeRaw`
    INSERT INTO "MemberAuditLog"
      ("memberId", "action", "actorAdminId", "actorName", "actorRole", "reason")
    VALUES
      (${memberId}, ${action}, NULL, 'System Automation', 'system', ${reason})
  `;
}

async function sendOnce(memberId: string, action: string, to: string, subject: string, html: string, reason: string) {
  if (!to || await alreadyLogged(memberId, action)) return false;
  const result = await sendEmail(to, subject, html);
  if (result.sent) await logAutomation(memberId, action, reason);
  return Boolean(result.sent);
}

function authorized(req: any) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return String(req?.headers?.authorization || "") === `Bearer ${secret}`;
}

export async function memberAutomation(req: any, res: any) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, noarchive, nosnippet");
  if (!authorized(req)) return res.status(401).json({ error: "Unauthorized automation request" });

  const now = new Date();
  const today = pktDateParts(now);
  const stats = { birthdayEmails: 0, childBirthdayEmails: 0, expiryReminders: 0, expiredToday: 0, adminSummary: false };

  try {
    const members = await prisma.member.findMany({
      where: { status: { in: ["approved", "expired"] } },
      select: {
        id: true, memberNo: true, fullName: true, email: true, dob: true,
        membershipType: true, status: true, approvedAt: true,
        children: { select: { id: true, fullName: true, dob: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const adminLines: string[] = [];

    for (const member of members) {
      if (member.status === "approved" && dobMonthDay(member.dob) === today.md) {
        const action = `birthday_member_${today.year}`;
        const sent = await sendOnce(
          member.id,
          action,
          member.email,
          "Happy Birthday from Anjuman-e-Araian Faisalabad",
          emailFrame("Happy Birthday!", `<p>Dear ${member.fullName},</p><p>Anjuman-e-Araian Faisalabad wishes you a very happy birthday and a year filled with health, happiness and success.</p><p>Member No: <strong>${member.memberNo}</strong></p>`),
          `Birthday greeting sent for ${today.iso}`,
        );
        if (sent) stats.birthdayEmails++;
      }

      if (member.status === "approved") {
        for (const child of member.children || []) {
          if (!child.dob || dobMonthDay(child.dob) !== today.md) continue;
          const action = `birthday_child_${child.id}_${today.year}`;
          const sent = await sendOnce(
            member.id,
            action,
            member.email,
            `Birthday wishes for ${child.fullName}`,
            emailFrame("Family Birthday Greetings", `<p>Dear ${member.fullName},</p><p>Anjuman-e-Araian Faisalabad warmly wishes <strong>${child.fullName}</strong> a very happy birthday. May the year ahead bring health, happiness and success to your family.</p>`),
            `Birthday greeting sent for child ${child.fullName} on ${today.iso}`,
          );
          if (sent) stats.childBirthdayEmails++;
        }
      }

      if (!isAnnualMembership(member.membershipType) || !member.approvedAt) continue;
      const expiry = annualExpiry(member.approvedAt);
      const days = daysBetweenPakistanDates(expiry, now);
      const expiryIso = new Date(expiry.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);

      if (member.status === "approved" && days < 0) {
        await prisma.member.update({ where: { id: member.id }, data: { status: "expired" } });
        const action = `membership_expired_${expiryIso}`;
        const sent = await sendOnce(
          member.id,
          action,
          member.email,
          "Annual membership expired - renewal required",
          emailFrame("Membership Renewal Required", `<p>Dear ${member.fullName},</p><p>Your annual membership of Anjuman-e-Araian Faisalabad expired on <strong>${expiry.toLocaleDateString("en-GB")}</strong>.</p><p>Member No: <strong>${member.memberNo}</strong></p><p>Please contact the Anjuman office to renew your annual membership.</p>`),
          `Annual membership expired on ${expiryIso}`,
        );
        if (sent) stats.expiryReminders++;
        stats.expiredToday++;
        adminLines.push(`${member.memberNo} - ${member.fullName} expired ${expiryIso}`);
        continue;
      }

      if (member.status !== "approved") continue;
      const reminder = days === 30 ? "30d" : days === 7 ? "7d" : days === 0 ? "due" : "";
      if (!reminder) continue;
      const action = `membership_expiry_${reminder}_${expiryIso}`;
      const sent = await sendOnce(
        member.id,
        action,
        member.email,
        days === 0 ? "Annual membership expires today" : `Annual membership expires in ${days} days`,
        emailFrame("Annual Membership Reminder", `<p>Dear ${member.fullName},</p><p>Your annual membership of Anjuman-e-Araian Faisalabad ${days === 0 ? "expires today" : `will expire in <strong>${days} days</strong>`}.</p><p>Expiry date: <strong>${expiry.toLocaleDateString("en-GB")}</strong><br>Member No: <strong>${member.memberNo}</strong></p><p>Please arrange renewal to keep your membership active.</p>`),
        `Annual membership reminder: ${days} days until ${expiryIso}`,
      );
      if (sent) stats.expiryReminders++;
      adminLines.push(`${member.memberNo} - ${member.fullName}: ${days === 0 ? "expires today" : `${days} days remaining`}`);
    }

    if (adminLines.length) {
      const summary = adminLines.slice(0, 100).map((line) => `<li>${line}</li>`).join("");
      const result = await sendEmail(
        MASTER_EMAIL,
        `Membership expiry summary - ${today.iso}`,
        emailFrame("Membership Expiry Summary", `<p>The following annual memberships need attention:</p><ul>${summary}</ul><p>Open the Member & Approval Center to review renewal status.</p>`),
      );
      stats.adminSummary = Boolean(result.sent);
    }

    return res.status(200).json({ ok: true, date: today.iso, ...stats });
  } catch (error: any) {
    console.error("member automation failed", error);
    return res.status(500).json({ error: "Member automation failed", detail: process.env.NODE_ENV === "production" ? undefined : error?.message });
  }
}
