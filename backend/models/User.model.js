const mongoose = require("mongoose");
const { SUPER_ADMIN_EMAIL } = require("../config/constants");

const userSchema = new mongoose.Schema({
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    nin: { type: String, trim: true, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 0 },
    walletBalanceKobo: { type: Number, default: 0 },
    commissionBalance: { type: Number, default: 0 },
    commissionBalanceKobo: { type: Number, default: 0 },
    units: { type: Number, default: 0 },
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

    if (this.isModified("commissionBalanceKobo")) {
        this.commissionBalance = Number((this.commissionBalanceKobo || 0) / 100);
    } else if (this.isModified("commissionBalance")) {
        this.commissionBalanceKobo = Math.round((this.commissionBalance || 0) * 100);
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