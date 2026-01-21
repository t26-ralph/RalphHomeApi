import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import User from "../models/User.js";

export const getDashboardStats = async (req, res) => {
    try {
        const { month, year } = req.query;

        // ===== 1. Tạo khoảng thời gian =====
        let dateFilter = {};

        if (month && year) {
            const start = new Date(year, month - 1, 1, 0, 0, 0);
            const end = new Date(year, month, 0, 23, 59, 59);

            dateFilter = {
                $gte: start,
                $lte: end,
            };
        }

        // ===== 2. Tổng doanh thu =====
        const revenueMatch = {
            status: "Confirmed",
            paymentStatus: "Paid",
        };

        if (month && year) revenueMatch.createdAt = dateFilter;

        const totalRevenueAgg = await Booking.aggregate([
            { $match: revenueMatch },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalPrice" },
                },
            },
        ]);

        const totalRevenue = totalRevenueAgg[0]?.total || 0;

        // ===== 3. Tổng booking =====
        const bookingMatch = { status: "Confirmed" };
        if (month && year) bookingMatch.createdAt = dateFilter;

        const totalBookings = await Booking.countDocuments(bookingMatch);

        // ===== 4. Tổng user & phòng =====
        const totalUsers = await User.countDocuments();
        const totalRooms = await Room.countDocuments();

        // // ===== 5. Tỷ lệ lấp đầy =====
        // const occupancyMatch = {
        //     status: "Confirmed",
        //     paymentStatus: "Paid",
        // };

        // if (month && year) occupancyMatch.createdAt = dateFilter;

        // const occupiedRooms = await Booking.distinct(
        //     "room",
        //     occupancyMatch
        // );

        // const occupancyRate =
        //     totalRooms > 0
        //         ? ((occupiedRooms.length / totalRooms) * 100).toFixed(2)
        //         : 0;
        //Occupancy Rate (%) =
        //(Tổng số room - nights đã bán / Tổng số room - nights có thể bán) × 100
        // ===== 5. TỶ LỆ LẤP ĐẦY (ROOM-NIGHT) =====

        // 5.1. Xác định số ngày trong kỳ
        let daysInPeriod = 0;

        if (month && year) {
            daysInPeriod = new Date(year, month, 0).getDate(); // số ngày trong tháng
        } else {
            // nếu không filter tháng → mặc định 30 ngày (dashboard tổng quan)
            daysInPeriod = 30;
        }

        // 5.2. Tổng số room-nights có thể bán
        const totalRoomNights = totalRooms * daysInPeriod;

        // 5.3. Lấy booking hợp lệ
        const occupancyBookings = await Booking.find({
            status: "Confirmed",
            paymentStatus: "Paid",
            ...(month && year && { createdAt: dateFilter }),
        }).select("checkInDate checkOutDate");

        // 5.4. Tính tổng room-nights đã bán
        let soldRoomNights = 0;

        occupancyBookings.forEach(booking => {
            const checkIn = new Date(booking.checkInDate);
            const checkOut = new Date(booking.checkOutDate);

            const nights =
                Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

            if (nights > 0) soldRoomNights += nights;
        });

        // 5.5. Tính tỷ lệ lấp đầy
        const occupancyRate =
            totalRoomNights > 0
                ? ((soldRoomNights / totalRoomNights) * 100).toFixed(2)
                : 0;

        // ===== 6. Top phòng =====
        const topMatch = {
            status: "Confirmed",
            paymentStatus: "Paid",
        };

        if (month && year) topMatch.createdAt = dateFilter;

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
                $unwind: {
                    path: "$roomInfo.hotel",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ]);

        const hasData = totalBookings > 0 || totalRevenue > 0;
        // ===== 7. Response =====
        res.json({
            revenue: totalRevenue,
            totalBookings,
            totalUsers,
            totalRooms,
            occupancyRate,
            topRooms,
            hasData,
        });
    } catch (err) {
        console.error("Dashboard stats error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
