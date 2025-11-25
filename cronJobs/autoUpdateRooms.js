import cron from "node-cron";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";

// 🕒 Chạy mỗi ngày vào 00:00 (giờ VN)
cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Kiểm tra các booking đã checkout...");

    const today = new Date();
    try {
        // Lấy các booking có checkoutDate <= hôm nay
        const expiredBookings = await Booking.find({
            checkOutDate: { $lte: today }
        });

        for (const booking of expiredBookings) {
            // Cập nhật phòng về trạng thái available = true
            await Room.findByIdAndUpdate(booking.room, { available: true });
        }

        console.log(`✅ Đã cập nhật ${expiredBookings.length} phòng thành available.`);
    } catch (error) {
        console.error("❌ Lỗi cron job:", error);
    }
});
