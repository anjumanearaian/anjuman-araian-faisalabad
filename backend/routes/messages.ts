import express, { Request, Response } from "express";
import prisma from "../lib/prisma";
import { requireAdmin, requireMember } from "../middleware/auth";

const router = express.Router();

// POST /api/messages/member-contact-request
// Only an authenticated, active member can request another approved member's contact details.
// The phone number is never returned by this endpoint. The request is routed to the admin inbox.
router.post("/member-contact-request", requireMember, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (String(user?.role || "") !== "member") {
      return res.status(403).json({ error: "Only approved members can request member contact details" });
    }

    const targetMemberId = String(req.body?.targetMemberId || "").trim();
    const reason = String(req.body?.reason || "Community coordination").trim().slice(0, 500);
    if (!targetMemberId) return res.status(400).json({ error: "Target member is required" });
    if (targetMemberId === String(user.id)) return res.status(400).json({ error: "You already have access to your own contact details" });

    const [requester, target] = await Promise.all([
      prisma.member.findFirst({
        where: { id: String(user.id), status: "approved" },
        select: { id: true, memberNo: true, fullName: true, email: true, phone: true },
      }),
      prisma.member.findFirst({
        where: { id: targetMemberId, status: "approved" },
        select: { id: true, memberNo: true, fullName: true },
      }),
    ]);

    if (!requester) return res.status(403).json({ error: "Your approved member record could not be verified" });
    if (!target) return res.status(404).json({ error: "Requested member was not found" });

    const duplicateSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const duplicate = await prisma.message.findFirst({
      where: {
        type: "member_contact_request",
        email: requester.email,
        message: { contains: `Target Member ID: ${target.id}` },
        createdAt: { gte: duplicateSince },
      },
      select: { id: true },
    });
    if (duplicate) {
      return res.status(409).json({ error: "A contact request for this member is already pending from the last 24 hours" });
    }

    const newMessage = await prisma.message.create({
      data: {
        type: "member_contact_request",
        name: requester.fullName,
        email: requester.email,
        phone: requester.phone || "",
        message: [
          `Contact request from approved member ${requester.fullName} (${requester.memberNo}).`,
          `Target: ${target.fullName} (${target.memberNo}).`,
          `Target Member ID: ${target.id}`,
          `Reason: ${reason || "Community coordination"}`,
          "Please verify the purpose and contact the requester through the approved administrative process. Do not publish the target member's private number.",
        ].join("\n"),
        status: "unread",
      },
    });

    res.status(201).json({
      id: newMessage.id,
      status: "submitted",
      message: "Your request has been sent to the administration for review.",
    });
  } catch (error) {
    console.error("Failed to submit member contact request:", error);
    res.status(500).json({ error: "Failed to submit member contact request" });
  }
});

// GET /api/messages
// Fetch messages (Admin)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Number(String(req.query.page || "1")) || 1;
    const limit = Number(String(req.query.limit || "20")) || 20;
    const skip = (page - 1) * limit;

    const filter = String(req.query.filter || "");
    const startDateQuery = String(req.query.startDate || "");
    const endDateQuery = String(req.query.endDate || "");
    const whereClause: any = {};

    if (filter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      whereClause.createdAt = { gte: start };
    } else if (filter === "yesterday") {
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const startYesterday = new Date(startToday);
      startYesterday.setDate(startYesterday.getDate() - 1);
      whereClause.createdAt = { gte: startYesterday, lt: startToday };
    } else if (filter === "week") {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      whereClause.createdAt = { gte: start };
    } else if (startDateQuery && endDateQuery) {
      const start = new Date(startDateQuery);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateQuery);
      end.setHours(23, 59, 59, 999);
      whereClause.createdAt = { gte: start, lte: end };
    } else if (startDateQuery) {
      const start = new Date(startDateQuery);
      start.setHours(0, 0, 0, 0);
      whereClause.createdAt = { gte: start };
    } else if (endDateQuery) {
      const end = new Date(endDateQuery);
      end.setHours(23, 59, 59, 999);
      whereClause.createdAt = { lte: end };
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({ where: whereClause, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.message.count({ where: whereClause }),
    ]);

    res.json({ messages, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/messages
// Public message submission
router.post("/", async (req: Request, res: Response) => {
  try {
    const { type, name, email, phone = "", message }: { type: string; name: string; email: string; phone?: string; message: string } = req.body;
    if (!type || !name || !email || !message) return res.status(400).json({ error: "Missing required fields" });

    const newMessage = await prisma.message.create({
      data: { type, name, email, phone, message, status: "unread" },
    });
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Failed to submit message:", error);
    res.status(500).json({ error: "Failed to submit message" });
  }
});

// PATCH /api/messages/:id/status
router.patch("/:id/status", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const status = String(req.body.status || "");
    if (!status) return res.status(400).json({ error: "Status is required" });

    const updated = await prisma.message.update({ where: { id }, data: { status } });
    res.json(updated);
  } catch (error) {
    console.error("Failed to update status:", error);
    res.status(500).json({ error: "Failed to update message status" });
  }
});

// DELETE /api/messages/:id
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.message.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

export default router;
