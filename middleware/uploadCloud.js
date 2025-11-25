// middleware/uploadCloud.js
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";  // dùng config sẵn

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "hotel_rooms",   // bạn có thể đổi tùy theo loại (hotel/room)
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
    },
});

const uploadCloud = multer({ storage });

export default uploadCloud;
