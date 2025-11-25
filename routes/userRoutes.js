// routes/userRoutes.js
import express from "express";
import { registerUser, loginUser, getMe, getUsers, deleteUser, updateUserRole, changePassword } from "../controllers/userController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
// Đổi mật khẩu (user phải login)
router.post("/change-password", protect, changePassword);

router.get("/", protect, admin, getUsers);
router.put("/:id/role", protect, admin, updateUserRole);
router.delete("/:id", protect, admin, deleteUser);

export default router;
