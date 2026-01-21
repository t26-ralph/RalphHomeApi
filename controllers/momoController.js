import axios from "axios";
import crypto from "crypto";
import Payment from "../models/Payment.js";

export const createMomoPayment = async (payment) => {
    const { MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY, MOMO_REDIRECT_URL, MOMO_IPN_URL } = process.env;

    const orderId = payment._id.toString();
    const requestId = orderId;
    const amount = payment.amount.toString();
    const orderInfo = `Payment_${orderId}`;
    const requestType = "captureWallet";
    const extraData = "";

    const rawSignature =
        `accessKey=${MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${MOMO_IPN_URL}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_PARTNER_CODE}&redirectUrl=${MOMO_REDIRECT_URL}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto.createHmac("sha256", MOMO_SECRET_KEY).update(rawSignature).digest("hex");

    const body = { partnerCode: MOMO_PARTNER_CODE, accessKey: MOMO_ACCESS_KEY, requestId, amount, orderId, orderInfo, redirectUrl: MOMO_REDIRECT_URL, ipnUrl: MOMO_IPN_URL, extraData, requestType, signature };

    const response = await axios.post("https://test-payment.momo.vn/v2/gateway/api/create", body, {
        headers: { "Content-Type": "application/json" },
    });

    if (!response.data?.payUrl) throw new Error("MoMo create payment failed");

    return response.data.payUrl;
};

export const momoWebhook = async (req, res) => {
    try {
        const data = req.body;
        const secretKey = process.env.MOMO_SECRET_KEY;

        const rawSignature =
            `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&partnerCode=${data.partnerCode}&payType=${data.payType}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`;

        const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
        if (signature !== data.signature) return res.status(400).json({ resultCode: 1, message: "Invalid signature" });

        const payment = await Payment.findById(data.orderId).populate("booking");
        if (!payment) return res.status(404).json({ resultCode: 1, message: "Payment not found" });

        payment.status = data.resultCode === 0 ? "Paid" : "Failed";
        if (payment.booking) {
            payment.booking.paymentStatus = payment.status === "Paid" ? "Paid" : payment.status;
            if (payment.status === "Paid") payment.booking.status = "Confirmed";
            await payment.booking.save();
        }
        await payment.save();

        return res.json({ resultCode: 0, message: "OK" });
    } catch (err) {
        console.error("MoMo webhook error:", err);
        res.status(500).json({ resultCode: 1, message: "Server error" });
    }
};
