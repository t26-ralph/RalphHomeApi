import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import { createMomoPayment } from "./momoController.js";
import { generateVnpayUrl } from "./vnpayController.js";

// ==========================
// POST /api/payments
// ==========================
export const createPayment = async (req, res) => {
    try {
        const { booking: bookingId, method } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const totalAmount = booking.totalPrice;

        // ===== CASE 1: CASH → DEPOSIT 20% (VNPAY) =====
        if (method === "Cash") {
            const depositAmount = Math.round(totalAmount * 0.2);

            const payment = await Payment.create({
                booking: booking._id,
                user: req.user._id,
                totalAmount,
                amount: depositAmount,
                method: "Vnpay",
                paymentType: "Deposit",
                status: "Pending",
            });

            booking.paymentStatus = "Unpaid";
            booking.status = "Pending";
            await booking.save();

            const ipAddr =
                req.headers["x-forwarded-for"]?.split(",")[0] ||
                req.socket.remoteAddress ||
                "127.0.0.1";

            const paymentUrl = generateVnpayUrl({
                paymentId: payment._id,
                amount: depositAmount,
                ipAddr,
            });

            return res.json({
                paymentUrl,
                depositAmount,
                remainingAmount: totalAmount - depositAmount,
            });
        }

        // ===== CASE 2: MOMO – FULL =====
        if (method === "Momo") {
            const payment = await Payment.create({
                booking: booking._id,
                user: req.user._id,
                totalAmount,
                amount: totalAmount,
                method: "Momo",
                paymentType: "Full",
                status: "Pending",
            });

            booking.paymentStatus = "Unpaid";
            booking.status = "Pending";
            await booking.save();

            const paymentUrl = await createMomoPayment(payment);
            return res.json({ paymentUrl });
        }

        // ===== CASE 3: VNPAY – FULL =====
        if (method === "Vnpay") {
            const payment = await Payment.create({
                booking: booking._id,
                user: req.user._id,
                totalAmount,
                amount: totalAmount,
                method: "Vnpay",
                paymentType: "Full",
                status: "Pending",
            });

            booking.paymentStatus = "Unpaid";
            booking.status = "Pending";
            await booking.save();

            const ipAddr =
                req.headers["x-forwarded-for"]?.split(",")[0] ||
                req.socket.remoteAddress ||
                "127.0.0.1";

            const paymentUrl = generateVnpayUrl({
                paymentId: payment._id,
                amount: totalAmount,
                ipAddr,
            });

            return res.json({ paymentUrl });
        }

        return res.status(400).json({ message: "Invalid payment method" });
    } catch (err) {
        console.error("createPayment error:", err);
        return res.status(500).json({ message: err.message });
    }
};

// ==========================
// PUT /api/payments/:id
// ==========================
export const updatePaymentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const payment = await Payment.findById(req.params.id).populate("booking");

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // ===== Deposit → Paid =====
        if (payment.paymentType === "Deposit" && status === "Paid") {
            payment.amount = payment.totalAmount; // thu đủ 100%
            payment.status = "Paid";
            payment.paidAt = new Date();
            await payment.save();

            payment.booking.paymentStatus = "Paid";
            await payment.booking.save();

            return res.json({
                message: "Payment completed (100%)",
                payment,
            });
        }

        // ===== Normal update =====
        payment.status = status;
        if (status === "Paid") {
            payment.paidAt = new Date();
        }
        await payment.save();

        res.json(payment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
export const getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user._id })
            .populate("booking")
            .sort({ createdAt: -1 });

        res.json(payments);
    } catch (err) {
        console.error("getMyPayments error:", err);
        res.status(500).json({ message: err.message });
    }
};
export const getPayments = async (req, res) => { 
    try { 
        const payments = await Payment.find().populate("user booking"); 
        res.json(payments); 
    } catch (err) { 
        console.error(err); 
        res.status(500).json({ message: err.message }); 
    } };