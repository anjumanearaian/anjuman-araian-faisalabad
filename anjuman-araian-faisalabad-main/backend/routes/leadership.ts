import { Router } from "express";

const router = Router();

// Get leadership members
router.get("/", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Leadership API working",
      data: []
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

export default router;
