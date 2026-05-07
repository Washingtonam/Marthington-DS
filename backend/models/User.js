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


// ==============================
// 🔥 FORCE SUPER ADMIN (SAFE)
// ==============================
userSchema.pre("save", function () {
  if (
    this.email &&
    this.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL
  ) {
    this.role = "super_admin";
    this.status = "active";
  }
});


// ==============================
// 🚫 PROTECT SUPER ADMIN DELETE
// ==============================
userSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getFilter());

  if (doc && doc.email === SUPER_ADMIN_EMAIL) {
    throw new Error("Cannot delete super admin");
  }
});


// ==============================
// 🚫 PROTECT SUPER ADMIN UPDATE
// ==============================
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
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });


// ==============================
// ✅ SAFE EXPORT
// ==============================
module.exports =
  mongoose.models.User ||
  mongoose.model("User", userSchema);