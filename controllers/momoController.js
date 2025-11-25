import axios from "axios";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import dotenv from "dotenv";

dotenv.config();

// 🟢 Tạo thanh toán MoMo
export const createPayment = async (req, res) => {
    const { bookingId } = req.body;

    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const redirectUrl = process.env.MOMO_REDIRECT_URL; // frontend page
        const ipnUrl = process.env.MOMO_IPN_URL; // backend webhook

        const orderId = booking._id.toString();
        const amount = booking.totalPrice.toString();
        const orderInfo = `Payment for booking ${booking._id}`;
        const requestId = orderId;
        const requestType = "captureWallet";

        // 🧾 Build raw signature theo Momo yêu cầu
        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

        const body = {
            partnerCode,
            accessKey,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            extraData: "",
            requestType,
            signature,
        };

        const response = await axios.post("https://test-payment.momo.vn/v2/gateway/api/create", body, {
            headers: { "Content-Type": "application/json" },
        });

        res.json(response.data);
    } catch (err) {
        console.error("❌ Momo create-payment error:", err);
        res.status(500).json({ message: "Momo payment failed", error: err.message });
    }
};

// 🟣 Webhook MoMo IPN
export const momoWebhook = async (req, res) => {
    const data = req.body;
    const secretKey = process.env.MOMO_SECRET_KEY;

    try {
        const rawSignature = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&partnerCode=${data.partnerCode}&payType=${data.payType}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`;
        const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

        if (signature !== data.signature) {
            return res.status(400).json({ message: "Invalid signature" });
        }

        const booking = await Booking.findById(data.orderId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (data.resultCode === 0) {
            booking.paymentStatus = "Paid";
            booking.status = "Confirmed";
        } else {
            booking.paymentStatus = "Failed";
        }
        await booking.save();

        res.json({ message: "ok" });
    } catch (err) {
        console.error("❌ Momo webhook error:", err);
        res.status(500).json({ message: "Webhook error" });
    }
};
