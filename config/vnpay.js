import { VNPay } from "vnpay";

export const vnpay = new VNPay({
    tmnCode: process.env.VNP_TMNCODE,
    secureSecret: process.env.VNP_HASHSECRET,
    vnpayHost: "https://sandbox.vnpayment.vn",
});
