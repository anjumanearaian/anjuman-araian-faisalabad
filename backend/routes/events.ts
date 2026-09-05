import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const items = await prisma.content.findMany({ where: { type: "event", status: "published" }, take: limit, orderBy: { date: "asc" } });
    res.json(items.map((item: any) => ({ ...item, desc: item.body, images: item.images ? JSON.parse(item.images) : [] })));
  } catch (error) { next(error); }
});
export default router;
