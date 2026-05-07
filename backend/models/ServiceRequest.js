const mongoose = require("mongoose");

// ==============================
// 💬 COMMENT SCHEMA (CHAT STYLE)
// ==============================
const commentSchema = new mongoose.Schema({
  text: String,
  by: String,
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "admin",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// ==============================
// 🧾 STATUS HISTORY
// ==============================
const statusHistorySchema = new mongoose.Schema({
  status: String,
  note: String,
  date: {
    type: Date,
    default: Date.now,
  },
});

// ==============================
// 🧾 SERVICE REQUEST
// ==============================
const serviceRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  service: {
    type: String,
    enum: ["validation", "ipe", "modification"],
  },

  type: String,
  nin: String,

  slipType: {
    type: String,
    enum: ["none", "regular", "standard", "premium"],
    default: "none",
  },

  amount: Number,
  proof: String,

  // =========================
  // 🔥 FULL FORM DATA
  // =========================
  formData: {
    type: Object,
    default: {},
  },

  // =========================
  // 🧠 ADMIN NOTES (PRIVATE)
  // =========================
  adminNotes: {
    type: String,
    default: "",
  },

  // =========================
  // 💬 COMMENTS
  // =========================
  comments: [commentSchema],

  // =========================
  // 📊 STATUS
  // =========================
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "completed"],
    default: "pending",
  },

  // =========================
  // 🧾 STATUS HISTORY
  // =========================
  statusHistory: {
    type: [statusHistorySchema],
    default: [],
  },

  // =========================
  // 📎 RESULT
  // =========================
  resultSlip: String,

}, { timestamps: true });


// ==============================
// 🔥 SAFE STATUS TRACKING (FIXED FINAL)
// ==============================
serviceRequestSchema.pre("save", function () {

  // 🛑 ensure array exists
  if (!this.statusHistory) {
    this.statusHistory = [];
  }

  // 🔥 track only when status changes
  if (this.isModified("status")) {

    const lastStatus =
      this.statusHistory.length > 0
        ? this.statusHistory[this.statusHistory.length - 1].status
        : null;

    if (lastStatus !== this.status) {
      this.statusHistory.push({
        status: this.status,
        note: `Status changed to ${this.status}`,
      });
    }
  }

});


// ==============================
// 🚀 INDEX OPTIMIZATION
// ==============================
serviceRequestSchema.index({ status: 1 });
serviceRequestSchema.index({ userId: 1 });
serviceRequestSchema.index({ createdAt: -1 });
serviceRequestSchema.index({ service: 1 });
serviceRequestSchema.index({ type: 1 });

// ==============================
// ✅ SAFE EXPORT
// ==============================
module.exports =
  mongoose.models.ServiceRequest ||
  mongoose.model("ServiceRequest", serviceRequestSchema);