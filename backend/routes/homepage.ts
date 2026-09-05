import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();
router.get("/", async (_req, res, next) => {
  try {
    const [settings, leadership, news, events, approvedMembers] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: "settings" } }),
      prisma.leadershipProfile.findMany({ where: { category: "cabinet" }, take: 6, orderBy: { tier: "asc" } }),
      prisma.content.findMany({ where: { type: "news", status: "published" }, take: 3, orderBy: { date: "desc" } }),
      prisma.content.findMany({ where: { type: "event", status: "published" }, take: 3, orderBy: { date: "asc" } }),
      prisma.member.count({ where: { status: "approved" } }),
    ]);
    const parse = (item: any) => ({ ...item, images: item.images ? JSON.parse(item.images) : [] });
    res.json({ settings, leadership, news: news.map(parse), events: events.map(parse), statistics: { approvedMembers } });
  } catch (error) { next(error); }
});
export default router;
