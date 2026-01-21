import express from "express";
import { 
    createPayment, 
    getMyPayments, 
    getPayments, 
    updatePaymentStatus,
     } from "../controllers/paymentController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
const router = express.Router();

// User tạo thanh toán
router.post("/", protect, createPayment);

// User xem lịch sử thanh toán
router.get("/my", protect, getMyPayments);

// Admin xem tất cả thanh toán
router.get("/", protect, admin, getPayments);
router.put("/:id", protect, admin, updatePaymentStatus);
export default router;
