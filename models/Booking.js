import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        hotel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },

        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },

        checkInDate: { type: Date, required: true },
        checkOutDate: { type: Date, required: true },

        guests: {
            type: Number,
            required: true,
            min: 1,
        },

        totalPrice: {
            type: Number,
            required: true,
        },

        // ✅ ĐÃ THANH TOÁN BAO NHIÊU
        paidAmount: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
            default: "Pending",
        },

        paymentStatus: {
            type: String,
            enum: ["Unpaid", "Deposit", "Paid", "Pending"],
            default: "Unpaid",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/**
 * Virtual: còn thiếu bao nhiêu tiền
 */
bookingSchema.virtual("remainingAmount").get(function () {
    return Math.max(this.totalPrice - this.paidAmount, 0);
});

bookingSchema.set("toJSON", { virtuals: true });
bookingSchema.set("toObject", { virtuals: true });

export default mongoose.model("Booking", bookingSchema);
