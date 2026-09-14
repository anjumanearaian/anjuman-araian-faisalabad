import { Router, Request } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

const router = Router();

function requestRole(req: Request) {
  const header = req.headers.authorization;
  const secret = process.env.JWT_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return "public";
  try {
    const decoded = jwt.verify(header.slice(7), secret) as { role?: string };
    return String(decoded.role || "public");
  } catch {
    return "public";
  }
}

async function activeMemberSummary() {
  const rows = await prisma.$queryRaw<Array<{
    total: bigint;
    men: bigint;
    women: bigint;
    life: bigint;
  }>>`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (
        WHERE COALESCE("memberCell", CASE WHEN gender = 'female' THEN 'women' ELSE 'male' END) = 'male'
      ) AS men,
      COUNT(*) FILTER (
        WHERE COALESCE("memberCell", CASE WHEN gender = 'female' THEN 'women' ELSE 'male' END) = 'women'
      ) AS women,
      COUNT(*) FILTER (WHERE "membershipType" = 'life') AS life
    FROM "Member"
    WHERE status = 'approved' AND COALESCE("isArchived", false) = false
  `;
  const row = rows[0] || { total: BigInt(0), men: BigInt(0), women: BigInt(0), life: BigInt(0) };
  return {
    approvedMembers: Number(row.total),
    menMembers: Number(row.men),
    womenMembers: Number(row.women),
    lifeMembers: Number(row.life),
  };
}

router.get("/", async (_req, res, next) => {
  try {
    const [settings, leadership, news, events, statistics] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: "settings" } }),
      prisma.leadershipProfile.findMany({ where: { category: "cabinet" }, take: 6, orderBy: [{ tier: "asc" }, { role: "asc" }] }),
      prisma.content.findMany({ where: { type: "news", status: "published" }, take: 3, orderBy: { date: "desc" } }),
      prisma.content.findMany({ where: { type: "event", status: "published" }, take: 3, orderBy: { date: "asc" } }),
      activeMemberSummary(),
    ]);
    const parse = (item: any) => ({ ...item, images: item.images ? JSON.parse(item.images) : [] });
    res.json({ settings, leadership, news: news.map(parse), events: events.map(parse), statistics });
  } catch (error) { next(error); }
});

// Public member directory intentionally exposes only community-facing profile data.
// Approved logged-in members/admins may also see member contact details. CNIC,
// documents, addresses and other private/admin fields are never returned here.
router.get("/member-directory", async (req: Request, res, next) => {
  try {
    const role = requestRole(req);
    const canSeeContacts = ["member", "applicant", "admin", "super_admin", "welfare_manager", "finance_secretary", "assistant_finance_secretary"].includes(role);
    const page = Math.max(1, Number(req.query.page || 1) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 250) || 250));

    const archivedRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Member" WHERE COALESCE("isArchived", false) = true
    `;
    const archivedIds = archivedRows.map((row) => row.id);
    const where: any = { status: "approved", ...(archivedIds.length ? { id: { notIn: archivedIds } } : {}) };

    const [members, total, summary] = await Promise.all([
      prisma.member.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fullName: "asc" },
        select: {
          id: true,
          memberNo: true,
          fullName: true,
          fatherName: true,
          city: true,
          district: true,
          province: true,
          localArea: true,
          occupation: true,
          education: true,
          designation: true,
          institutionName: true,
          businessName: true,
          memberCell: true,
          membershipType: true,
          photoUrl: true,
          isFeatured: true,
          isFeaturedPortal: true,
          approvedAt: true,
          createdAt: true,
          leadershipProfiles: {
            where: { category: "cabinet" },
            orderBy: [{ tier: "asc" }, { role: "asc" }],
            take: 1,
            select: { role: true, tier: true, category: true },
          },
          organizationAssignments: {
            where: { isActive: true, organization: { type: "cabinet" } },
            orderBy: { rank: "asc" },
            take: 1,
            select: {
              role: true,
              rank: true,
              organization: { select: { name: true, type: true, slug: true } },
            },
          },
          ...(canSeeContacts ? { phone: true, whatsapp: true, email: true } : {}),
        },
      }),
      prisma.member.count({ where }),
      activeMemberSummary(),
    ]);

    const directoryMembers = members.map((member: any) => {
      const cabinetAssignment = member.organizationAssignments?.[0] || null;
      const leadershipProfile = member.leadershipProfiles?.[0] || null;
      const { organizationAssignments, leadershipProfiles, ...safeMember } = member;
      return {
        ...safeMember,
        leadershipRole: cabinetAssignment?.role || leadershipProfile?.role || null,
        leadershipRank: cabinetAssignment?.rank ?? (leadershipProfile?.tier != null ? leadershipProfile.tier * 10 : null),
        leadershipTier: leadershipProfile?.tier ?? null,
        leadershipUnit: cabinetAssignment?.organization?.name || (leadershipProfile ? "Executive Council / Cabinet" : null),
      };
    });

    res.json({
      members: directoryMembers,
      summary,
      privacy: {
        contactDetailsVisible: canSeeContacts,
        publicFields: ["name", "member number", "city", "profession", "designation", "institution/business", "membership type", "official leadership role"],
      },
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
});

export default router;
