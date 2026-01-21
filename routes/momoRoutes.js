import express from "express";
import { momoWebhook } from "../controllers/momoController.js";

const router = express.Router();
router.post("/webhook", momoWebhook);

export default router;
