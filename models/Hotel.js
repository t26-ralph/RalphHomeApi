// models/Hotel.js
import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },        // Tên khách sạn / homestay
        address: { type: String, required: true },
        city: { type: String, required: true },
        description: { type: String },
        rating: { type: Number, default: 0 },          // Điểm trung bình
        rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }], // Các phòng
        createdBy: {                                   // Admin nào tạo khách sạn này
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        coverImage: {
            type: String,
            required: false,
        },
        images: [
            {
                type: String, // URL từ Cloudinary
                required: false,
            }
        ],
    },
    { timestamps: true,
        versionKey: false 
    }
);

export default mongoose.model("Hotel", hotelSchema);
