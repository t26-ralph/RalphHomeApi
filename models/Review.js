// models/Review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
            unique: true, // mỗi booking chỉ review 1 lần
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },
        comment: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
