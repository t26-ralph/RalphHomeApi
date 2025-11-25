import express from "express";
import { createPayment, momoWebhook } from "../controllers/momoController.js";

const router = express.Router();

router.post("/create-payment", createPayment);
router.post("/webhook", momoWebhook);

export default router;
