const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Transaction = require("./Transaction.model");
const User = require("../users/User.model");
const Pricing = require("../services/Pricing.model");
const { verifyToken, isAdmin } = require("../../shared/authGuard");

// Fallback dynamic AuditLog model compile
let AuditLog;
try {
  AuditLog = mongoose.model("AuditLog");
} catch {
  const auditSchema = new mongoose.Schema({
    action: String,
    performedBy: String,
    userId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    unitsAdded: Number,
    unitsBefore: Number,
    unitsAfter: Number,
  }, { timestamps: true });
  AuditLog = mongoose.model("AuditLog", auditSchema);
}

// ==============================================================
// 📤 USER ROUTES
// ==============================================================
router.post("/submit-payment", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, proof, units } = req.body;

    if (!amount || !proof) return res.status(400).json({ message: "Amount and proof required." });
    
    const existingPending = await Transaction.findOne({ userId, type: "UNIT_ADD", status: "pending" });
    if (existingPending) return res.status(400).json({ message: "You already have a pending payment." });

    const payment = await Transaction.create({ type: "UNIT_ADD", amount, units: units || 0, status: "pending", userId, proof });
    res.json({ message: "Payment submitted successfully.", payment });
  } catch (error) {
    res.status(500).json({ message: "Submission failed.", error: error.message });
  }
});

router.get("/transactions", verifyToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).populate("requestId").sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: "Failed to load transactions." });
  }
});

// ==============================================================
// 📥 ADMIN ROUTES (Accessible via /api/admin/payments, etc.)
// ==============================================================

// Removed /admin prefix from path because it is mounted at /api/admin
router.get("/payments", verifyToken, isAdmin, async (req, res) => {
  try {
    const payments = await Transaction.find({ type: "UNIT_ADD" })
      .populate("userId", "firstName lastName email units")
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to api payments." });
  }
});

router.post("/payments/:id/approve", verifyToken, isAdmin, async (req, res) => {
  try {
    const payment = await Transaction.findById(req.params.id);
    if (!payment || payment.status !== "pending") return res.status(400).json({ message: "Invalid transaction." });

    const user = await User.findById(payment.userId);
    const pricing = await Pricing.findOne();
    const unitsToAdd = payment.units || Math.floor(payment.amount / (pricing?.nin?.unitPrice || 250));

    user.units += unitsToAdd;
    await user.save();

    payment.status = "approved";
    payment.units = unitsToAdd;
    await payment.save();

    await AuditLog.create({ action: "APPROVE_PAYMENT", performedBy: req.user.email, userId: user._id, amount: payment.amount, unitsAdded: unitsToAdd, unitsBefore: user.units - unitsToAdd, unitsAfter: user.units });

    res.json({ message: "Approved successfully.", units: user.units });
  } catch (error) {
    res.status(500).json({ message: "Approval failed.", error: error.message });
  }
});

router.post("/payments/:id/reject", verifyToken, isAdmin, async (req, res) => {
  try {
    const payment = await Transaction.findById(req.params.id);
    if (!payment || payment.status !== "pending") return res.status(400).json({ message: "Invalid transaction state." });

    payment.status = "rejected";
    await payment.save();
    res.json({ message: "Rejected successfully." });
  } catch (error) {
    res.status(500).json({ message: "Rejection failed." });
  }
});

module.exports = router;