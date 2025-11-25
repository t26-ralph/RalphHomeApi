// controllers/bookingController.js
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import Payment from "../models/Payment.js";

const VALID_STATUSES = ["Pending", "Confirmed", "Cancelled"];
const VALID_PAYMENTS = ["Paid", "Unpaid"];
// 📌 User đặt phòng
export const createBooking = async (req, res) => {
    try {
        const { roomId, checkInDate, checkOutDate, guests } = req.body;
        const userId = req.user.id;

        console.log("📩 Dữ liệu nhận từ client:", req.body);

        // 🏠 Tìm phòng theo roomId
        const roomData = await Room.findById(roomId);
        if (!roomData) {
            console.log("❌ Không tìm thấy phòng với ID:", roomId);
            return res.status(404).json({ message: "Room not found" });
        }

        // ❌ Nếu phòng không còn trống thì chặn đặt tiếp
        if (roomData.available === false) {
            return res.status(400).json({ message: "Phòng hiện đã được đặt!" });
        }

        // 📅 Tính số đêm
        const start = new Date(checkInDate);
        const end = new Date(checkOutDate);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        if (nights <= 0) {
            return res.status(400).json({ message: "Invalid booking dates" });
        }

        const totalPrice = nights * roomData.price;

        // 💾 Tạo booking
        const booking = new Booking({
            user: userId,
            hotel: roomData.hotel,   // ✅ dùng roomData
            room: roomData._id,      // ✅ dùng roomData._id
            checkInDate: start,
            checkOutDate: end,
            guests,
            totalPrice,
            status: "Pending",
            paymentStatus: "Unpaid",
        });

        await booking.save();
        // 🏠 Cập nhật phòng thành unavailable
        await Room.findByIdAndUpdate(roomId, { available: false });

        res.status(201).json({
            message: "Booking created successfully",
            booking,
        });
    } catch (error) {
        console.error("🚨 Lỗi khi tạo booking:", error);
        res.status(500).json({ message: error.message });
    }
};
// 📌 User xem danh sách booking của mình
export const getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id })
            .populate("hotel", "name address")
            .populate("room", "name price");

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 📌 Admin xem tất cả booking
export const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate("user", "name email")
            .populate("hotel", "name")
            .populate("room", "name");

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 📌 Admin update trạng thái booking
export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus } = req.body;

        const booking = await Booking.findById(id).populate("user");
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        const VALID_STATUSES = ["Pending", "Confirmed", "Cancelled"];
        const VALID_PAYMENTS = ["Unpaid", "Paid"];

        // Cập nhật status của booking
        if (status) {
            if (!VALID_STATUSES.includes(status))
                return res.status(400).json({ message: `Invalid status: ${status}` });

            booking.status = status;

            // Đồng bộ paymentStatus theo status
            if (status === "Cancelled"){
                booking.paymentStatus = "Unpaid";
                await Room.findByIdAndUpdate(booking.room, { available: true });
            }
            if (status === "Confirmed") booking.paymentStatus = "Paid";
            if (status === "Pending") booking.paymentStatus = "Unpaid";
        }

        // Cập nhật paymentStatus
        if (paymentStatus) {
            if (!VALID_PAYMENTS.includes(paymentStatus))
                return res.status(400).json({ message: `Invalid paymentStatus: ${paymentStatus}` });

            // Chỉ cho phép Unpaid → Paid, không cho Paid → Unpaid
            if (booking.paymentStatus === "Paid" && paymentStatus === "Unpaid") {
                return res.status(400).json({ message: "Cannot change from Paid to Unpaid" });
            }

            if (booking.paymentStatus === "Unpaid" && paymentStatus === "Paid") {
                booking.paymentStatus = "Paid";
                booking.status = "Confirmed"; // đồng bộ status
            }
        }

        // --- Đồng bộ Payment ---
        const payment = await Payment.findOne({ booking: booking._id });
        if (payment) {
            payment.status = booking.paymentStatus; // luôn đồng bộ với booking
            await payment.save();
        }

        await booking.save();

        res.json({ message: "Booking updated", booking });
    } catch (err) {
        console.error("UpdateBookingStatus error:", err);
        res.status(500).json({ message: err.message });
    }
};

export const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate("user", "name email")
            .populate("hotel", "name address")
            .populate("room", "name price");

        if (!booking) return res.status(404).json({ message: "Booking not found" });
        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 📌 User hủy booking
export const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params; // id booking
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ message: "Booking không tồn tại" });
        }

        // Chỉ user tạo booking mới được hủy
        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Không có quyền hủy booking này" });
        }

        // Chỉ hủy nếu booking chưa Confirmed / Paid
        if (booking.status === "Confirmed" || booking.paymentStatus === "Paid") {
            return res.status(400).json({ message: "Booking đã thanh toán/đã xác nhận, không thể hủy" });
        }

        booking.status = "Cancelled";
        await booking.save();
        await Room.findByIdAndUpdate(booking.room, { available: true });

        res.json({ message: "Hủy booking thành công", booking });
    } catch (error) {
        console.error("cancelBooking error:", error);
        res.status(500).json({ message: error.message });
    }
};