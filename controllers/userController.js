// controllers/userController.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Tạo token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Đăng ký
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });

        if (userExists) return res.status(400).json({ message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({ name, email, password: hashedPassword });
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Đăng nhập
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(401).json({ message: "Invalid email or password" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: "Invalid email or password" });

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Lấy thông tin user hiện tại
export const getMe = async (req, res) => {
    res.json(req.user);
};

// Admin: lấy danh sách user
export const getUsers = async (req, res) => {
    const users = await User.find().select("-password");
    res.json(users);
};

// Admin: xóa user
export const deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await user.deleteOne();
    res.json({ message: "User removed" });
};
// Cập nhật role user
export const updateUserRole = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.role = req.body.role || user.role; // chỉ cập nhật role
        await user.save();

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

export const changePassword = async (req, res) => {
    try {
        const userId = req.user._id; // lấy từ authMiddleware
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Vui lòng điền đủ thông tin!" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User không tồn tại" });

        // Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu cũ không đúng!" });
        }

        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();
        res.json({ message: "Đổi mật khẩu thành công!" });
    } catch (error) {
        console.error("changePassword error:", error);
        res.status(500).json({ message: "Lỗi server, vui lòng thử lại" });
    }
};
