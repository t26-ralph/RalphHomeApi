import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import { vnpayReturn, createVnpayPayment } from "../controllers/vnpayController.js";

const router = express.Router();
// 🟢 VNPay tạo link thanh toán
router.post("/create_payment", protect, createVnpayPayment);

// 🟢 Callback của VNPay
router.get("/vnpay_return", vnpayReturn);
export default router;