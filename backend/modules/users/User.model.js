const mongoose = require("mongoose");
const { SUPER_ADMIN_EMAIL } = require("../../config/constants");

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 0 }, // New Naira Balance
    units: { type: Number, default: 0 },         // Legacy Units
    role: { type: String, enum: ["user", "admin", "super_admin"], default: "user" },
    status: { type: String, enum: ["active", "suspended"], default: "active" }
}, { timestamps: true });

// Pre-save to maintain Super Admin status
userSchema.pre("save", async function () {
    if (this.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
        this.role = "super_admin";
    }
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);