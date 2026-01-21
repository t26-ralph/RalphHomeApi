import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
    {
        hotel: {                                      // Thuộc khách sạn nào
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        name: { type: String, required: true },       // Tên loại phòng (VD: Deluxe, Standard)
        price: { type: Number, required: true },      // Giá / đêm
        maxPeople: { type: Number, required: true },  // Sức chứa tối đa
        description: { type: String },                // Mô tả ngắn
        available: { type: Boolean, default: true },  // Còn trống hay không
        ratingAvg: {
            type: Number,
            default: 0,
        },
        ratingCount: {
            type: Number,
            default: 0,
        },
        numReviews: { type: Number, default: 0 },
        images: [
            {
                type: String,
                required: false,
            }
        ],
    },
    { timestamps: true,
        versionKey: false 
     }
);

export default mongoose.model("Room", roomSchema);