import qs from "qs";
import crypto from "crypto";
import moment from "moment";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";

/* ----------------------------------------------------
 🧮 Hàm tạo chữ ký HMAC SHA512 chuẩn VNPay
---------------------------------------------------- */
const createSignature = (params, secretKey) => {
    const sorted = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
            acc[key] = params[key];
            return acc;
        }, {});

    // ⚠️ KHÔNG encode ở đây
    const signData = qs.stringify(sorted, { encode: false });
    const hash = crypto.createHmac("sha512", secretKey).update(signData).digest("hex");
    return { hash, signData };
};

/* ----------------------------------------------------
 🟢 Tạo URL thanh toán VNPay
---------------------------------------------------- */
export const createVnpayUrl = (paymentId, amount, req) => {
    const { VNP_TMNCODE, VNP_HASHSECRET, VNP_URL, VNP_RETURNURL } = process.env;
    const createDate = moment().format("YYYYMMDDHHmmss");
    const ipAddr =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection.remoteAddress ||
        req.socket?.remoteAddress ||
        "127.0.0.1";

    const txnRef = paymentId.toString().slice(-8);

    const vnpParams = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: VNP_TMNCODE,
        vnp_Locale: "vn",
        vnp_CurrCode: "VND",
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: `Payment_${paymentId}`,
        vnp_OrderType: "billpayment",
        vnp_Amount: Math.round(amount * 100),
        vnp_ReturnUrl: VNP_RETURNURL,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
    };

    // ✅ Tạo chữ ký TRƯỚC, KHÔNG có SecureHashType
    const { hash, signData } = createSignature(vnpParams, VNP_HASHSECRET);

    // ✅ Sau đó mới thêm 2 tham số này vào cuối
    vnpParams.vnp_SecureHashType = "SHA512";
    vnpParams.vnp_SecureHash = hash;

    console.log("===============================================");
    console.log("🔹 [VNPay - CREATE] vnpParams gửi lên:", vnpParams);
    console.log("🔹 [VNPay - CREATE] Chuỗi ký (signData):", signData);
    console.log("🔹 [VNPay - CREATE] Signature tạo:", hash);
    console.log("===============================================");

    const paymentUrl = `${VNP_URL}?${qs.stringify(vnpParams, { encode: true })}`;
    return paymentUrl;
};


/* ----------------------------------------------------
 🟡 Xử lý callback từ VNPay (ReturnURL)
---------------------------------------------------- */
export const vnpayReturn = async (req, res) => {
    try {
        console.log("===============================================");
        console.log("🔸 [VNPay - RETURN] Full query:", req.query);

        const vnpParams = { ...req.query };
        const vnp_SecureHash = vnpParams.vnp_SecureHash;
        delete vnpParams.vnp_SecureHash;
        delete vnpParams.vnp_SecureHashType;

        const sortedParams = Object.keys(vnpParams)
            .sort()
            .reduce((acc, key) => ((acc[key] = vnpParams[key]), acc), {});

        const signData = qs.stringify(sortedParams, { encode: false });
        const computedHash = crypto
            .createHmac("sha512", process.env.VNP_HASHSECRET)
            .update(signData)
            .digest("hex");

        console.log("🔹 [VNPay - RETURN] Chuỗi ký lại:", signData);
        console.log("🔹 [VNPay - RETURN] Hash VNPay gửi:", vnp_SecureHash);
        console.log("🔹 [VNPay - RETURN] Hash server tính:", computedHash);

        if (computedHash !== vnp_SecureHash) {
            console.error("❌ Sai chữ ký VNPay");
            return res.status(400).json({ message: "Sai chữ ký" });
        }


        // Lấy paymentId từ OrderInfo
        const paymentId = vnpQuery.vnp_OrderInfo?.split("_")[1];
        if (!paymentId) {
            console.error("❌ [VNPay - RETURN] Không tìm thấy paymentId trong OrderInfo");
            return res.status(400).json({ message: "Thiếu Payment ID" });
        }

        const payment = await Payment.findById(paymentId).populate("booking");
        if (!payment) {
            console.error("❌ [VNPay - RETURN] Không tìm thấy payment:", paymentId);
            return res.status(404).json({ message: "Payment not found" });
        }

        const redirectUrl =
            vnpQuery.vnp_ResponseCode === "00"
                ? "http://localhost:5173/payment-success"
                : "http://localhost:5173/payment-failed";

        if (vnpQuery.vnp_ResponseCode === "00") {
            payment.status = "Paid";
            payment.booking.paymentStatus = "Paid";
            payment.booking.status = "Confirmed";
            await Promise.all([payment.save(), payment.booking.save()]);
            console.log("✅ [VNPay - RETURN] Thanh toán thành công:", { paymentId });
        } else {
            console.warn("⚠️ [VNPay - RETURN] Thanh toán thất bại:", {
                code: vnpQuery.vnp_ResponseCode,
            });
        }

        console.log("===============================================");
        return res.redirect(redirectUrl);
    } catch (err) {
        console.error("❌ [VNPay - RETURN] Lỗi xử lý callback:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/* ----------------------------------------------------
 🧾 API tạo thanh toán VNPay
---------------------------------------------------- */
export const createVnpayPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId).populate("room");
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        const days = Math.ceil(
            (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) /
            (1000 * 60 * 60 * 24)
        );
        const amount = booking.room.price * days;

        const payment = await Payment.create({
            booking: booking._id,
            user: booking.user,
            amount,
            method: "Vnpay",
            status: "Pending",
        });

        const paymentUrl = createVnpayUrl(payment._id, amount, req);
        return res.json({ paymentUrl });
    } catch (err) {
        console.error("❌ [VNPay] createVnpayPayment error:", err);
        return res.status(500).json({ message: "Failed to create VNPay payment" });
    }
};
