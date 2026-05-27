const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["UNIT_ADD", "UNIT_DEDUCT", "NIN", "BVN", "SERVICE", "NIN_AUTO", "credit", "debit"], required: true },
    amount: { type: Number, default: 0 },
    units: { type: Number, default: 0 },
    unitsUsed: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "approved", "rejected", "success", "successful", "failed"], default: "pending" },
    description: String,
    reference: { type: String, unique: true, sparse: true },
    proof: String
}, { timestamps: true });

module.exports = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);