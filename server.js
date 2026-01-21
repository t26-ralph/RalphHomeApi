import dotenv from "dotenv";
import connectDB from "./config/db.js";
dotenv.config();
import express from "express";

import cors from "cors";


import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import hotelRoutes from "./routes/hotelRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import "./cronJobs/autoUpdateRooms.js";
import momoRoutes from "./routes/momoRoutes.js";
import vnpayRoutes from "./routes/vnpayRoutes.js"


connectDB();

const app = express();
const allowedOrigins = [
    "http://localhost:5173", // frontend admin
    "http://localhost:5174", // frontend client
    "https://ralph-home-admin.vercel.app",
    "https://ralphhome.vercel.app",
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/momo", momoRoutes);
app.use("/api/vnpay", vnpayRoutes);

app.get("/", (req, res) => {
    res.send("API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀Server running on http://localhost:${PORT}`));
