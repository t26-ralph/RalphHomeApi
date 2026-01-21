import mongoose from "mongoose";
import Booking from "./Booking.js";

const paymentSchema = new mongoose.Schema(
    {
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Số tiền THỰC TẾ đã thu
        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        // Tổng tiền booking (100%)
        totalAmount: {
            type: Number,
            required: true,
        },

        method: {
            type: String,
            enum: ["Cash", "Momo", "Vnpay"],
            default: "Cash",
        },

        paymentType: {
            type: String,
            enum: ["Deposit", "Full"],
            default: "Deposit",
        },

        status: {
            type: String,
            enum: ["Unpaid", "Deposit", "Paid", "Pending"],
            default: "Unpaid",
        },

        transactionId: String,
        paidAt: Date,
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/**
 * Virtual: còn thiếu bao nhiêu tiền
 */
paymentSchema.virtual("remainingAmount").get(function () {
    return Math.max(this.totalAmount - this.amount, 0);
});

paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

/**
 * 🔹 Đồng bộ Booking khi Payment thay đổi
 */
paymentSchema.post("save", async function (doc) {
    try {
        const booking = await Booking.findById(doc.booking);
        if (!booking) return;

        booking.paidAmount = doc.amount;
        booking.paymentStatus = doc.status;

        await booking.save();
    } catch (err) {
        console.error("Sync payment to booking failed:", err);
    }
});

export default mongoose.model("Payment", paymentSchema);
