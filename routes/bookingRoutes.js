// routes/bookingRoutes.js
import express from "express";
import {
    createBooking,
    getUserBookings,
    getAllBookings,
    updateBookingStatus,
    getBookingById, cancelBooking
} from "../controllers/bookingController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// User đặt phòng
router.post("/", protect, createBooking);

// User xem danh sách booking của mình
router.get("/my", protect, getUserBookings);

// Hủy booking
router.delete("/:id", protect, cancelBooking);

// Admin xem tất cả booking
router.get("/", protect, admin, getAllBookings);

// Admin update booking
router.put("/:id", protect, admin, updateBookingStatus);

router.get("/:id", protect, getBookingById);
export default router;
