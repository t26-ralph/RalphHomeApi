import moment from "moment";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import { vnpay } from "../config/vnpay.js";
import crypto from "crypto";

const verifyVnpaySignature = (params, secureHash) => {
    const secretKey = process.env.VNP_HASHSECRET;

    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys
        .map(key => `${key}=${params[key]}`)
        .join("&");

    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    return signed === secureHash;
};

/**
 * Tạo URL thanh toán VNPay
 * ĐƯỢC GỌI TỪ PaymentController
 */
export const generateVnpayUrl = ({ paymentId, amount, ipAddr }) => {
    if (!ipAddr) {
        throw new Error("VNPay requires client IP address");
    }

    return vnpay.buildPaymentUrl({
        vnp_Amount: Math.round(amount),
        vnp_IpAddr: ipAddr,
        vnp_TxnRef: paymentId.toString(),
        vnp_OrderInfo: `Payment_${paymentId}`,
        vnp_OrderType: "other",
        vnp_ReturnUrl: process.env.VNP_RETURNURL,
        vnp_Locale: "vn",
        vnp_CreateDate: moment().format("YYYYMMDDHHmmss"),
    });
};

// VNPay return / callback
export const vnpayReturn = async (req, res) => {
    try {
        console.log("====== VNPay CALLBACK ======");
        console.log("Query:", req.query);

        if (!req.query || Object.keys(req.query).length === 0) {
            return res.redirect(`${process.env.FRONTEND_URL}/payment-result?status=Failed`);
        }

        // 1. Verify chữ ký bằng lib
        const isValid = vnpay.verifyReturnUrl(req.query);
        console.log("Signature valid:", isValid);

        if (!isValid) {
            return res.redirect(`${process.env.FRONTEND_URL}/payment-result?status=Failed`);
        }

        // 2. Check kết quả thanh toán
        const responseCode = req.query.vnp_ResponseCode;
        const paymentId = req.query.vnp_TxnRef;

        if (responseCode !== "00") {
            console.log("VNPay failed:", responseCode);
            return res.redirect(`${process.env.FRONTEND_URL}/payment-result?status=Failed`);
        }

        // 3. Load Payment + Booking
        const payment = await Payment.findById(paymentId).populate("booking");

        if (!payment) {
            console.error("Payment not found:", paymentId);
            return res.redirect(`${process.env.FRONTEND_URL}/payment-result?status=Failed`);
        }

        // 4. Idempotent check (tránh double callback)
        if (payment.status === "Paid") {
            console.log("Payment already processed:", paymentId);
            return res.redirect(`${process.env.FRONTEND_URL}/payment-result?status=Success`);
        }

        // 5. Update Payment
        if (payment.paymentType === "Deposit") {
            payment.status = "Deposit";
        } else {
            payment.status = "Paid";
        }

        payment.transactionId = paymentId;
        payment.paidAt = new Date();
        await payment.save();

        // 6. Update Booking
        const booking = payment.booking;

        if (payment.paymentType === "Deposit") {
            booking.paymentStatus = "Deposit";
            booking.status = "Confirmed";
        } else {
            booking.paymentStatus = "Paid";
            booking.status = "Confirmed";
        }

        await booking.save();

        console.log("VNPay payment success:", paymentId);

        // 7. Redirect FE
        return res.redirect(`${process.env.FRONTEND_URL}/payment-result?status=Success`);
    } catch (err) {
        console.error("VNPay RETURN ERROR:", err);
        return res.redirect(`${process.env.FRONTEND_URL}/payment-result?status=Failed`);
    }
};
