// routes/reviewRoutes.js
import express from "express";
import { createReview, getReviewsByRoom } from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST: thêm review (user phải login)
router.post("/", protect, createReview);

// GET: lấy review theo roomId
router.get("/:roomId", getReviewsByRoom);

export default router;
