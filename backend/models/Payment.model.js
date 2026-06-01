const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  amount: Number,
  proof: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
}, {
  timestamps: true
});

// Use the safe export pattern
module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);