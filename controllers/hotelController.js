// controllers/hotelController.js
import Hotel from "../models/Hotel.js";
import cloudinary from "../config/cloudinary.js";

// export const createHotel = async (req, res) => {
//     try {
//         const hotel = await Hotel.create({ ...req.body, createdBy: req.user._id });
//         res.status(201).json(hotel);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };

export const createHotel = async (req, res) => {
    try {
        let coverImage = null;
        let images = [];

        if (req.files?.coverImage?.[0]) {
            coverImage = req.files.coverImage[0].path;
        }

        if (req.files?.images) {
            const uploadedImages = req.files.images.map(file => file.path);

            if (uploadedImages.length > 5) {
                return res.status(400).json({
                    message: "Chỉ được phép upload tối đa 5 ảnh cho phần images"
                });
            }

            images = uploadedImages;
        }

        const hotel = await Hotel.create({
            ...req.body,
            coverImage,
            images,
            createdBy: req.user._id,
        });

        res.status(201).json(hotel);
    } catch (err) {
        console.error("Error creating hotel:", err);
        res.status(500).json({ message: err.message });
    }
};


export const getHotels = async (req, res) => {
    const hotels = await Hotel.find().populate("rooms");
    res.json(hotels);
};

export const getHotel = async (req, res) => {
    const hotel = await Hotel.findById(req.params.id).populate("rooms");
    if (!hotel) return res.status(404).json({ message: "Hotel not found" });
    res.json(hotel);
};

// export const updateHotel = async (req, res) => {
//     const hotel = await Hotel.findById(req.params.id);
//     if (!hotel) return res.status(404).json({ message: "Hotel not found" });

//     Object.assign(hotel, req.body);
//     await hotel.save();
//     res.json(hotel);
// };

// export const deleteHotel = async (req, res) => {
//     const hotel = await Hotel.findById(req.params.id);
//     if (!hotel) return res.status(404).json({ message: "Hotel not found" });

//     await hotel.deleteOne();
//     res.json({ message: "Hotel deleted" });
// };

export const updateHotel = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ message: "Hotel not found" });

        // Cập nhật coverImage nếu có
        if (req.files?.coverImage?.[0]) {
            hotel.coverImage = req.files.coverImage[0].path;
        }

        // Xử lý images (giữ cũ + thêm mới nhưng max 5)
        if (req.files?.images) {
            const newImages = req.files.images.map(file => file.path);
            const totalImages = [...hotel.images, ...newImages];

            if (totalImages.length > 5) {
                return res.status(400).json({
                    message: "Tổng số ảnh images không được vượt quá 5"
                });
            }

            hotel.images = totalImages;
        }

        // Xóa ảnh theo yêu cầu
        if (req.body.imagesToDelete) {
            const imagesToDelete = Array.isArray(req.body.imagesToDelete)
                ? req.body.imagesToDelete
                : [req.body.imagesToDelete];

            for (const publicId of imagesToDelete) {
                await cloudinary.uploader.destroy(`hotel_rooms/${publicId}`);
                hotel.images = hotel.images.filter(img => !img.includes(publicId));
            }
        }
        //update các field khác
        Object.assign(hotel, req.body);
        delete hotel.imagesToDelete;

        await hotel.save();
        res.json(hotel);
    } catch (err) {
        console.error("Error updating hotel:", err);
        res.status(500).json({ message: err.message });
    }
};
// DELETE hotel
export const deleteHotel = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ message: "Hotel not found" });

        // Xóa ảnh trên Cloudinary nếu cần
        if (hotel.coverImage) {
            const publicId = hotel.coverImage.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`hotel_rooms/${publicId}`);
        }
        if (hotel.images && hotel.images.length > 0) {
            for (let imgUrl of hotel.images) {
                const publicId = imgUrl.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(`hotel_rooms/${publicId}`);
            }
        }

        await hotel.deleteOne();
        res.json({ message: "Hotel deleted" });
    } catch (err) {
        console.error("Error deleting hotel:", err);
        res.status(500).json({ message: err.message });
    }
};

export const getTopHotels = async (req, res) => {
    try {
        const hotels = await Hotel.find()
            .sort({ rating: -1 }) // hoặc trường khác như 'createdAt' nếu bạn chưa có rating
            .limit(6)
            .populate("rooms");

        res.json(hotels);
    } catch (err) {
        console.error("Error fetching top hotels:", err);
        res.status(500).json({ message: err.message });
    }
};