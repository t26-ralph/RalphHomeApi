// routes/roomRoutes.js
import express from "express";
import { createRoom, getRooms, getRoom, updateRoom, deleteRoom, getTopRooms, searchRooms, getRoomsByHotel} from "../controllers/roomController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import uploadCloud from "../middleware/uploadCloud.js";

const router = express.Router();

// Upload tối đa 5 ảnh
router.post("/",protect, admin, uploadCloud.array("images", 5),  createRoom);
router.put("/:id", protect, admin, uploadCloud.array("images", 5), updateRoom);
// router.post("/", protect, admin, createRoom);
router.get("/", getRooms);
router.get("/top", getTopRooms);
router.get("/search", searchRooms);
router.get("/:id", getRoom);
router.get("/hotel/:hotelId", getRoomsByHotel);

// router.put("/:id", protect, admin, updateRoom);
router.delete("/:id", protect, admin, deleteRoom);

export default router;
