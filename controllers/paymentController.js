import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import { createVnpayUrl } from "./vnpayController.js";


// 💳 User thanh toán
export const createPayment = async (req, res) => {
    try {
        const { booking: bookingId, method } = req.body;
        // Tìm booking
        const booking = await Booking.findById(bookingId).populate("room");
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Kiểm tra user
        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Tính tiền
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const amount = booking.room.price * days;

        let paymentStatus = "Paid";
        if (method === "Cash") { paymentStatus = "Unpaid";}
        if (method === "Vnpay") { paymentStatus = "Pending"; }
        // Tạo payment
        const payment = await Payment.create({
            booking: booking._id,
            user: req.user._id,
            amount,
            method,
            status: paymentStatus,
        });
        // // 🔹 Nếu là VNPAY → tạo URL thanh toán
        // if (method === "Vnpay") {
        //     const paymentUrl = createVnpayUrl(payment._id, amount, req);
        //     return res.status(200).json({ paymentUrl });
        // }

        // 🔹 Đồng bộ booking
        booking.paymentStatus = paymentStatus;
        if (paymentStatus === "Paid") {
            booking.status = "Confirmed"; // auto confirm nếu thanh toán online
        } else {
            booking.status = "Pending"; // chờ thanh toán nếu trả tiền mặt
        }
        await booking.save();

        res.status(201).json(payment);
    } catch (error) {
        console.error("createPayment error:", error);
        res.status(500).json({ message: error.message });
    }
};

// 👤 User xem lịch sử thanh toán
export const getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user._id }).populate("booking");
        res.json(payments);
    } catch (error) {
        console.error("getMyPayments error:", error);
        res.status(500).json({ message: error.message });
    }
};

// 👑 Admin xem tất cả thanh toán
export const getPayments = async (req, res) => {
    try {
        const payments = await Payment.find().populate("user booking");
        res.json(payments);
    } catch (error) {
        console.error("getPayments error:", error);
        res.status(500).json({ message: error.message });
    }
};

// 🔹 Optional: Admin / hệ thống update payment status
export const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // "Paid" hoặc "Unpaid"

        const payment = await Payment.findById(id);
        if (!payment) return res.status(404).json({ message: "Payment not found" });

        payment.status = status;
        await payment.save(); // hook post-save sẽ tự động đồng bộ booking

        res.json({ message: "Payment updated and booking synced", payment });
    } catch (error) {
        console.error("updatePaymentStatus error:", error);
        res.status(500).json({ message: error.message });
    }
};
