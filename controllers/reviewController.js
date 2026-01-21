import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";

/**
 * POST /api/reviews
 * Tạo review
 */
export const createReview = async (req, res) => {
    try {
        const { bookingId, rating, comment } = req.body;

        if (!bookingId || !rating) {
            return res.status(400).json({ message: "Thiếu dữ liệu review" });
        }

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: "Booking không tồn tại" });
        }

        // ❗ chỉ chủ booking mới được review
        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Không có quyền đánh giá booking này" });
        }

        // ❗ chỉ cho review khi đã hoàn thành
        if (booking.status !== "completed") {
            return res.status(400).json({ message: "Chỉ được đánh giá sau khi hoàn thành" });
        }

        // ❗ chặn review trùng
        const existed = await Review.findOne({ booking: bookingId });
        if (existed) {
            return res.status(400).json({ message: "Booking này đã được đánh giá" });
        }

        const review = await Review.create({
            user: req.user._id,
            room: booking.room,
            booking: bookingId,
            rating,
            comment
        });

        // cập nhật rating trung bình phòng
        const reviews = await Review.find({ room: booking.room });
        const avgRating =
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

        await Room.findByIdAndUpdate(booking.room, {
            rating: avgRating,
            numReviews: reviews.length
        });

        res.status(201).json(review);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi tạo review" });
    }
};

/**
 * GET /api/reviews/room/:roomId
 * Lấy review theo phòng
 */
export const getReviewsByRoom = async (req, res) => {
    try {
        const reviews = await Review.find({ room: req.params.roomId })
            .populate("user", "name avatar")
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy review phòng" });
    }
};

/**
 * GET /api/reviews/booking/:bookingId
 * Kiểm tra booking đã review chưa
 */
export const getReviewByBooking = async (req, res) => {
    try {
        const review = await Review.findOne({
            booking: req.params.bookingId,
            user: req.user._id
        });

        res.json(review); // null nếu chưa review
    } catch (error) {
        res.status(500).json({ message: "Lỗi kiểm tra review" });
    }
};

/**
 * GET /api/reviews/my-reviewed-bookings
 * Lấy danh sách bookingId đã review của user
 */
export const getMyReviewedBookings = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user._id }).select("booking");
        res.json(reviews.map(r => r.booking));
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy booking đã review" });
    }
};
