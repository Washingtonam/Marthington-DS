const mongoose = require("mongoose");

const SUPER_ADMIN_EMAIL = "washingtonamedu@gmail.com";

const userSchema = new mongoose.Schema({
  // ==============================
  // 👤 BASIC INFO
  // ==============================
  firstName: { type: String, default: "", trim: true },
  lastName: { type: String, default: "", trim: true },
  nin: { type: String, default: "", trim: true },

  // ==============================
  // 📧 AUTH
  // ==============================
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
  },

  // ==============================
  // 💰 WALLET
  // ==============================
  units: {
    type: Number,
    default: 0,
    min: 0,
  },

  balance: {
    type: Number,
    default: 0,
    min: 0,
  },

  // ==============================
  // 🚦 STATUS
  // ==============================
  status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active",
  },

  // ==============================
  // 🔥 ROLE SYSTEM
  // ==============================
  role: {
    type: String,
    enum: ["user", "admin", "super_admin"],
    default: "user",
  },

  // ==============================
  // 📊 TRACKING
  // ==============================
  lastLogin: {
    type: Date,
    default: null,
  },

  // ==============================
  // 🔐 PASSWORD RESET SYSTEM
  // ==============================
  resetToken: {
    type: String,
    default: null,
  },

  resetTokenExpiry: {
    type: Date,
    default: null,
  },

}, {
  timestamps: true,
});


// ==========================================
// 🔥 FORCE SUPER ADMIN (SAFE MODERN SYNTAX)
// ==========================================
userSchema.pre("save", async function () {
  if (
    this.email &&
    this.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL
  ) {
    this.role = "super_admin";
    this.status = "active";
  }
  // No next() needed! Returning or completing an async function advances safely.
});


// ==========================================
// 🚫 PROTECT SUPER ADMIN DELETE (MODERN SYNTAX)
// ==========================================
userSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getFilter());

  if (doc && doc.email === SUPER_ADMIN_EMAIL) {
    throw new Error("Cannot delete super admin");
  }
});


// ==========================================
// 🚫 PROTECT SUPER ADMIN UPDATE (MODERN SYNTAX)
// ==========================================
userSchema.pre("findOneAndUpdate", async function () {
  const doc = await this.model.findOne(this.getFilter());

  if (doc && doc.email === SUPER_ADMIN_EMAIL) {
    // ❌ Block role downgrade
    if (this._update?.role && this._update.role !== "super_admin") {
      throw new Error("Cannot change super admin role");
    }

    // ❌ Block suspension
    if (this._update?.status === "suspended") {
      throw new Error("Cannot suspend super admin");
    }
  }
});


// ==============================
// 🚀 INDEX OPTIMIZATION
// ==============================
// Note: Email unique index is handled on the field property directly. 
// If you see warnings in logs, drop the "email_1" duplicate from Atlas.
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });


// ==============================
// ✅ SAFE EXPORT
// ==============================
module.exports = mongoose.models.User || mongoose.model("User", userSchema);