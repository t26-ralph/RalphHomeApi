import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import User from "../models/User.js";

export const getDashboardStats = async (req, res) => {
    try {
        const { from, to } = req.query; // nhận từ frontend
        const dateFilter = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to) dateFilter.$lte = new Date(to);

        // --- Tổng doanh thu ---
        const revenueMatch = { status: "Confirmed", paymentStatus: "Paid" };
        if (from || to) revenueMatch.createdAt = dateFilter;

        const totalRevenue = await Booking.aggregate([
            { $match: revenueMatch },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);

        // --- Tổng booking ---
        const bookingMatch = { status: "Confirmed" };
        if (from || to) bookingMatch.createdAt = dateFilter;
        const totalBookings = await Booking.countDocuments(bookingMatch);

        // --- Tổng người dùng ---
        const totalUsers = await User.countDocuments();

        // --- Tổng phòng ---
        const totalRooms = await Room.countDocuments();

        // --- Tỷ lệ lấp đầy ---
        const occupancyMatch = { status: "Confirmed", paymentStatus: "Paid" };
        if (from || to) occupancyMatch.checkInDate = dateFilter; // hoặc checkInDate/createdAt tùy nhu cầu
        const occupiedRooms = await Booking.distinct("room", occupancyMatch);
        const occupancyRate = totalRooms > 0 ? (occupiedRooms.length / totalRooms) * 100 : 0;

        // --- Top 3 phòng ---
        const topMatch = { status: "Confirmed", paymentStatus: "Paid" };
        if (from || to) topMatch.createdAt = dateFilter;

        const topRooms = await Booking.aggregate([
            { $match: topMatch },
            { $group: { _id: "$room", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 3 },
            {
                $lookup: {
                    from: "rooms",
                    localField: "_id",
                    foreignField: "_id",
                    as: "roomInfo",
                },
            },
            { $unwind: "$roomInfo" },
            {
                $lookup: {
                    from: "hotels",
                    localField: "roomInfo.hotel",
                    foreignField: "_id",
                    as: "roomInfo.hotel",
                },
            },
            {
                $unwind: { path: "$roomInfo.hotel", preserveNullAndEmptyArrays: true }
            }
        ]);
        const match = { status: "Confirmed", paymentStatus: "Paid" };
        if (from || to) {
            match.checkInDate = {};
            if (from) match.checkInDate.$gte = new Date(from);
            if (to) match.checkInDate.$lte = new Date(to);
        }

        res.json({
            revenue: totalRevenue[0]?.total || 0,
            totalBookings,
            totalUsers,
            totalRooms,
            occupancyRate: occupancyRate.toFixed(2),
            topRooms,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
