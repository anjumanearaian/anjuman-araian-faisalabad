import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));
    const items = await prisma.content.findMany({ where: { type: "news", status: "published" }, take: limit, orderBy: { date: "desc" } });
    res.json(items.map((item: any) => ({ ...item, images: item.images ? JSON.parse(item.images) : [] })));
  } catch (error) { next(error); }
});
export default router;
