// models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }, // Ai đặt (user)

        hotel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hotel",
            required: true
        }, // Thuộc khách sạn nào

        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true
        }, // Đặt phòng nào

        checkInDate: { type: Date, required: true },
        checkOutDate: { type: Date, required: true },
        guests: {
            type: Number,
            required: true,
            min: 1
        },

        totalPrice: { type: Number, required: true },
        status: {
            type: String,
            enum: ["Pending", "Confirmed", "Cancelled"],
            default: "Pending"
        }, // Trạng thái đặt phòng

        paymentStatus: {
            type: String,
            enum: ["Unpaid", "Pending", "Paid"],
            default: "Unpaid"
        }, // Thanh toán hay chưa
    },
    { timestamps: true,
        versionKey: false 
     }
);

export default mongoose.model("Booking", bookingSchema);
