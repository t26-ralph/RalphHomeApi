import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String,},
    provider: { type: String, enum: ["local", "google"], default: "local" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    googleId: { type: String }, // 👈 thêm để lưu ID Google
    avatar: { type: String }
}, { timestamps: true,
    versionKey: false 
 });

export default mongoose.model("User", userSchema);
