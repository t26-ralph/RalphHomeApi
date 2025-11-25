import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import sendEmail from "../utils/sendEmail.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// REGISTER
export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id), // ✅ chỉ truyền id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// LOGIN
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id), // ✅ chỉ truyền id
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

export const googleLogin = async (req, res) => {
    try {
        const { token } = req.body; // token từ frontend

        // Xác thực token Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub } = payload;

        // Kiểm tra user đã tồn tại chưa
        let user = await User.findOne({ email });

        let isNewUser = false;
        if (!user) {
            // Nếu chưa có thì tạo mới
            user = await User.create({
                name,
                email,
                googleId: sub,
                avatar: picture,
                provider: "google",
            });
            isNewUser = true;
        }

        // Tạo JWT
        const jwtToken = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // ✅ Gửi mail nếu là user mới
        if (isNewUser) {
            await sendEmail(
                email,
                "🎉 Chào mừng bạn đến với RalpHome!",
                `
                <h2>Xin chào ${name}!</h2>
                <p>Cảm ơn bạn đã đăng ký bằng Google.</p>
                <p>Chúc bạn có trải nghiệm đặt phòng tuyệt vời 💙</p>
                <img src="${picture}" alt="avatar" width="60" style="border-radius:50%" />
                `
            );
        }

        res.json({ token: jwtToken, user });
    } catch (error) {
        console.error("Google login error:", error);
        res.status(500).json({ message: "Google login failed" });
    }
};