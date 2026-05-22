const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  action: String, // ADD_FUNDS, DEDUCT_FUNDS, SUSPEND_USER, etc

  performedBy: String, // admin email

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  amount: Number,

  balanceBefore: Number,
  balanceAfter: Number,

  note: String,

}, {
  timestamps: true
});

module.exports = mongoose.model("AuditLog", auditLogSchema);