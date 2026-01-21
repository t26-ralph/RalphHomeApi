import express from "express";
import {
    createReview,
    getReviewsByRoom,
    getReviewByBooking,
    getMyReviewedBookings
} from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// tạo review
router.post("/", protect, createReview);

// review theo phòng
router.get("/room/:roomId", getReviewsByRoom);

// kiểm tra booking đã review chưa
router.get("/booking/:bookingId", protect, getReviewByBooking);

// danh sách booking đã review
router.get("/my-reviewed-bookings", protect, getMyReviewedBookings);

export default router;
