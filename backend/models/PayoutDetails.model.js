const mongoose = require("mongoose");

const payoutDetailsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  bankName: { type: String, required: true, trim: true, maxlength: 100 },
  accountName: { type: String, required: true, trim: true, maxlength: 120 },
  accountNumber: { type: String, required: true, match: /^\d{10}$/ },
  proofPublicId: { type: String, required: true, trim: true },
  proofFormat: { type: String, enum: ["pdf", "jpg", "png"], required: true },
}, { timestamps: true });

module.exports = mongoose.models.PayoutDetails
  || mongoose.model("PayoutDetails", payoutDetailsSchema);
