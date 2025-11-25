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
        amount: {
            type: Number,
            required: true,
        },
        method: {
            type: String,
            enum: ["Cash", "Momo", "Vnpay"],
            default: "Cash",
        },
        status: {
            type: String,
            enum: ["Unpaid", "Paid", "Pending"],
            default: "Unpaid",
        },
    },
    { timestamps: true,
        versionKey: false 
     }
);

// 🔹 Post-save hook: đồng bộ paymentStatus của Booking
paymentSchema.post("save", async function (doc) {
    try {
        if (!doc.booking) return;

        const booking = await Booking.findById(doc.booking);
        if (!booking) return;

        // Đồng bộ paymentStatus
        booking.paymentStatus = doc.status;
        await booking.save();
    } catch (err) {
        console.error("Error syncing paymentStatus to booking:", err);
    }
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
