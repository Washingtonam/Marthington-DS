const mongoose = require("mongoose");
const { SUPER_ADMIN_EMAIL } = require("../../config/constants");

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 0 }, // Naira balance for compatibility
    walletBalanceKobo: { type: Number, default: 0 }, // Precise integer currency amount
    units: { type: Number, default: 0 },         // Legacy Units
    role: { type: String, enum: ["user", "admin", "super_admin"], default: "user" },
    status: { type: String, enum: ["active", "suspended"], default: "active" }
}, { timestamps: true });

// Pre-save to preserve currency precision and keep legacy field in sync
userSchema.pre("save", async function () {
    if (this.isModified("walletBalanceKobo")) {
        this.walletBalance = Number((this.walletBalanceKobo || 0) / 100);
    } else if (this.isModified("walletBalance")) {
        this.walletBalanceKobo = Math.round((this.walletBalance || 0) * 100);
    }

    if (this.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
        this.role = "super_admin";
    }
});

userSchema.methods.getWalletBalanceNaira = function () {
    if (typeof this.walletBalanceKobo === "number") {
        return Number((this.walletBalanceKobo / 100).toFixed(2));
    }
    return Number(this.walletBalance || 0);
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
