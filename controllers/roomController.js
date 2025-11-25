import Room from "../models/Room.js";
import Hotel from "../models/Hotel.js";
import cloudinary from "../config/cloudinary.js";

// 🏠 Tạo phòng mới
export const createRoom = async (req, res) => {
    try {
        const { hotelId, name, price, maxPeople, description, available } = req.body;

        // Kiểm tra khách sạn tồn tại
        const existingHotel = await Hotel.findById(hotelId);
        if (!existingHotel) return res.status(404).json({ message: "Hotel not found" });

        // Upload images
        const images = req.files?.map(file => file.path) || [];

        // Tạo room mới
        const room = await Room.create({
            hotel: hotelId,
            name,
            price,
            maxPeople,
            description,
            available,
            images,
        });

        // Thêm room vào hotel
        existingHotel.rooms.push(room._id);
        await existingHotel.save();

        // Populate hotel name để frontend hiển thị luôn
        const populatedRoom = await Room.findById(room._id).populate("hotel", "name");

        res.status(201).json({ message: "Room created successfully", room: populatedRoom });
    } catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 📋 Lấy tất cả phòng
export const getRooms = async (req, res) => {
    const rooms = await Room.find().populate("hotel", "name");
    res.json(rooms);
};

// 📄 Lấy phòng theo ID
export const getRoom = async (req, res) => {
    const room = await Room.findById(req.params.id).populate("hotel", "name");
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
};

// ✏️ Cập nhật phòng
export const updateRoom = async (req, res) => {
    try {
        let room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        // 🧩 Xử lý imagesToDelete — hỗ trợ cả string lẫn array
        let imagesToDelete = [];
        if (req.body.imagesToDelete) {
            if (Array.isArray(req.body.imagesToDelete)) {
                imagesToDelete = req.body.imagesToDelete; // nhiều phần tử
            } else if (typeof req.body.imagesToDelete === "string") {
                imagesToDelete = [req.body.imagesToDelete]; // chỉ 1 URL
            } else {
                console.warn("⚠️ Không xác định kiểu của imagesToDelete:", req.body.imagesToDelete);
            }
        }

        // 🗑️ Xóa ảnh trên Cloudinary + DB
        for (let imgUrl of imagesToDelete) {
            if (!imgUrl) continue;
            const parts = imgUrl.split("/");
            const filename = parts.pop(); // ví dụ: abc123.jpg
            const folder = parts.pop();   // ví dụ: hotel_rooms
            const publicId = `${folder}/${filename.split(".")[0]}`;

            try {
                await cloudinary.uploader.destroy(publicId);
                console.log("🗑️ Đã xóa:", publicId);
            } catch (err) {
                console.error("❌ Cloudinary delete error:", err);
            }

            room.images = room.images.filter((img) => img !== imgUrl);
        }

        // 🆕 Thêm ảnh mới
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map((file) => file.path);
            room.images.push(...newImages);
        }

        // ⚙️ Cập nhật các trường khác
        const { imagesToDelete: _, ...rest } = req.body;
        Object.assign(room, rest);

        await room.save();

        const populatedRoom = await Room.findById(room._id).populate("hotel", "name");

        res.json({
            message: "Room updated successfully",
            room: populatedRoom,
        });
    } catch (error) {
        console.error("❌ Error updating room:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// ❌ Xóa phòng
export const deleteRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        // Xóa ảnh trên Cloudinary (nếu có)
        if (room.images && room.images.length > 0) {
            for (let imgUrl of room.images) {
                const publicId = imgUrl.split("/").pop().split(".")[0]; // abcd123
                await cloudinary.uploader.destroy(`hotel_rooms/${publicId}`);
            }
        }

        // Xóa room khỏi danh sách rooms của hotel
        await Hotel.findByIdAndUpdate(room.hotel, {
            $pull: { rooms: room._id },
        });

        // Xóa room khỏi DB
        await room.deleteOne();

        res.json({ message: "Room deleted successfully" });
    } catch (error) {
        console.error("Error deleting room:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 🌟 Lấy top phòng theo rating
export const getTopRooms = async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 5;
        const rooms = await Room.find()
            .populate("hotel", "name")
            .sort({ rating: -1 })
            .limit(limit);

        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 🔍 Tìm kiếm phòng
// export const searchRooms = async (req, res) => {
//     try {
//         const { keyword, hotelId, minPrice, maxPrice, maxPeople } = req.query;

//         let query = {};

//         if (keyword) {
//             query.$or = [
//                 { name: { $regex: keyword, $options: "i" } },
//                 { description: { $regex: keyword, $options: "i" } },
//             ];
//         }

//         if (hotelId) query.hotel = hotelId;

//         if (minPrice || maxPrice) {
//             query.price = {};
//             if (minPrice) query.price.$gte = Number(minPrice);
//             if (maxPrice) query.price.$lte = Number(maxPrice);
//         }

//         if (maxPeople) query.maxPeople = { $gte: Number(maxPeople) };

//         const rooms = await Room.find(query)
//             .populate("hotel", "name")
//             .sort({ createdAt: -1 });

//         res.json(rooms);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// 🏨 Lấy danh sách phòng theo khách sạn
export const getRoomsByHotel = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const rooms = await Room.find({ hotel: hotelId });
        res.json(rooms);
    } catch (error) {
        console.error("getRoomsByHotel error:", error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/rooms
export const searchRooms = async (req, res) => {
    try {
        const { city, maxPeople, price, hotel } = req.query;

        const query = {};

        if (hotel) query.hotel = hotel;
        if (maxPeople) query.maxPeople = { $gte: maxPeople };
        if (city) query.city = city;
        if (price) {
            const [min, max] = price.split("-").map(Number);
            query.price = { $gte: min, $lte: max };
        }

        const rooms = await Room.find(query).populate("hotel");
        res.json(rooms);
    } catch (err) {
        console.error("❌ Lỗi khi tìm phòng:", err);
        res.status(500).json({ message: err.message });
    }
};
