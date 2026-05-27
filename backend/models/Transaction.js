const mongoose = require("mongoose");

/**
 * Transaction Schema - Wallet Migration v2
 * 
 * Tracks all financial transactions in the wallet system
 * Supports both legacy (units-based) and new (Naira-based) transactions
 * 
 * Purpose: Record and audit all wallet movements (credits/debits)
 * Linked to: User.walletBalance & User.units (deprecated)
 */
const transactionSchema = new mongoose.Schema(
  {
    // ==============================
    // 👤 USER REFERENCE
    // ==============================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ==============================
    // 💰 TRANSACTION TYPE & AMOUNT
    // ==============================
    type: {
      type: String,
      enum: ["UNIT_ADD", "UNIT_DEDUCT", "NIN", "BVN", "SERVICE", "NIN_AUTO", "credit", "debit"],
      required: true,
      description: "Transaction type - legacy types (UNIT_*) or new types (credit/debit)",
    },

    // NAIRA-BASED SYSTEM (New)
    amount: {
      type: Number,
      default: 0,
      description: "Amount in Naira (NGN) - for new Naira-based transactions",
    },

    // LEGACY UNITS-BASED SYSTEM (Deprecated but kept for backward compatibility)
    units: {
      type: Number,
      default: 0,
      description: "[DEPRECATED] Legacy units - kept for data migration",
    },

    unitsUsed: {
      type: Number,
      default: 0,
      description: "[DEPRECATED] Units consumed in legacy system",
    },

    cost: {
      type: Number,
      default: 0,
      description: "Service cost in Naira",
    },

    profit: {
      type: Number,
      default: 0,
      description: "Profit margin (for analytics)",
    },

    // ==============================
    // 📌 STATUS & REFERENCE
    // ==============================
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "success", "successful", "failed"],
      default: "pending",
      description: "Transaction status",
    },

    description: {
      type: String,
      trim: true,
      description: "Human-readable description (e.g., 'NIN Verification', 'Payment Received')",
    },

    reference: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      description: "Unique reference (Paystack reference, transaction ID, etc.)",
    },

    // ==============================
    // 🔗 ASSOCIATIONS
    // ==============================
    nin: {
      type: String,
      description: "NIN number (if applicable)",
    },

    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRequest",
      description: "Associated service request",
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      description: "Associated payment",
    },

    // ==============================
    // 📊 OPTIONAL METADATA
    // ==============================
    proof: {
      type: String,
      default: null,
      description: "Cloudinary URL for payment receipt/proof",
    },

    notes: {
      type: String,
      description: "Additional notes (failure reason, etc.)",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      description: "Flexible field for additional data (service type, method, etc.)",
    },
  },
  {
    timestamps: true,
  }
);

// ==============================
// 🔥 INDEXES FOR PERFORMANCE
// ==============================
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ requestId: 1 });

// ==============================
// ✅ SAFE EXPORT
// ==============================
module.exports = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);