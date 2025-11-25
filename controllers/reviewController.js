// controllers/reviewController.js
import Review from "../models/Review.js";
import Room from "../models/Room.js";

export const createReview = async (req, res) => {
    try {
        const { roomId, rating, comment } = req.body;

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        // Kiểm tra user đã review chưa
        const existingReview = await Review.findOne({
            room: roomId,
            user: req.user._id,
        });
        if (existingReview) {
            return res.status(400).json({ message: "You already reviewed this room" });
        }

        const review = new Review({
            room: roomId,
            user: req.user._id,
            rating,
            comment,
        });

        await review.save();

        // tính lại rating trung bình và số lượng review
        const reviews = await Review.find({ room: roomId });
        room.numReviews = reviews.length;
        room.rating =
            reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

        await room.save();

        res.status(201).json({ message: "Review added", review });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getReviewsByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const reviews = await Review.find({ room: roomId })
            .populate("user", "name email"); // lấy thêm info user nếu cần
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
