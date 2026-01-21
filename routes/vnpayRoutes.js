import express from "express";
import { vnpayReturn } from "../controllers/vnpayController.js";

const router = express.Router();
router.get("/vnpay-return", vnpayReturn);

export default router;
