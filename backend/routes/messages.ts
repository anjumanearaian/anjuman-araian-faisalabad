import express from "express";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";


const router = express.Router();

// GET /api/messages - Fetch all messages
router.get("/", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const filter = req.query.filter as string;
    const startDateQuery = req.query.startDate as string;
    const endDateQuery = req.query.endDate as string;

    let whereClause: any = {};

    const now = new Date();
    if (filter === "today") {
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      whereClause.createdAt = { gte: startOfToday };
    } else if (filter === "yesterday") {
      const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
      const startOfYesterday = new Date(new Date().setDate(now.getDate() - 1));
      startOfYesterday.setHours(0, 0, 0, 0);
      whereClause.createdAt = { gte: startOfYesterday, lt: startOfToday };
    } else if (filter === "week") {
      const startOfWeek = new Date(new Date().setDate(now.getDate() - 7));
      startOfWeek.setHours(0, 0, 0, 0);
      whereClause.createdAt = { gte: startOfWeek };
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

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.message.count({ where: whereClause });

    res.json({
      messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/messages - Submit a new message (Public route)
router.post("/", async (req, res) => {
  try {
    const { type, name, email, phone, message } = req.body;

    if (!type || !name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newMessage = await prisma.message.create({
      data: {
        type,
        name,
        email,
        phone,
        message,
        status: "unread",
      },
    });

    res.status(201).json(newMessage);
  } catch (error: any) {
    console.error("Failed to submit message:", error);
    res.status(500).json({ error: "Failed to submit message" });
  }
});

// PATCH /api/messages/:id/status - Update message status
router.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (error: any) {
    console.error("Failed to update message status:", error);
    res.status(500).json({ error: "Failed to update message status" });
  }
});

// DELETE /api/messages/:id - Delete a message
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.message.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

export default router;
