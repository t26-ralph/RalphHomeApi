// routes/hotelRoutes.js
import express from "express";
import { createHotel, getHotels, getHotel, updateHotel, deleteHotel, getTopHotels } from "../controllers/hotelController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import uploadCloud from "../middleware/uploadCloud.js";

const router = express.Router();

// router.post("/", protect, admin, createHotel);
router.post(
    "/",
    protect,
    admin,
    uploadCloud.fields([
        { name: "coverImage", maxCount: 1 },
        { name: "images", maxCount: 10 },
    ]),
    createHotel
);
router.get("/", getHotels);
router.get("/:id", getHotel);
router.get("/top", getTopHotels);
router.put(
    "/:id",
    protect,
    admin,
    uploadCloud.fields([
        { name: "coverImage", maxCount: 1 },
        { name: "images", maxCount: 10 },
    ]),
    updateHotel
);
router.delete("/:id", protect, admin, deleteHotel);

export default router;
