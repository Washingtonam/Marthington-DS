const mongoose = require("mongoose");

const paymentRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  amount: {
    type: Number,
    required: true,
  },
  proof: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
}, {
  timestamps: true
});

// Use the safe export pattern
module.exports = mongoose.models.PaymentRequest || mongoose.model("PaymentRequest", paymentRequestSchema);
