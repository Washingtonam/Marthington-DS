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
// 📥 ADMIN ROUTES
// ==============================================================

router.get("/payments", verifyToken, isAdmin, async (req, res) => {
  try {
    const payments = await Transaction.find({ type: "UNIT_ADD" })
      .populate("userId", "firstName lastName email units")
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payments." });
  }
});

router.post("/payments/:id/approve", verifyToken, isAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Transaction.findById(req.params.id).session(session);
    if (!payment || payment.status !== "pending") {
      throw new Error("Invalid transaction or already processed.");
    }

    const user = await User.findById(payment.userId).session(session);
    if (!user) throw new Error("User not found.");

    const pricing = await Pricing.findOne().session(session);
    const unitsToAdd = payment.units || Math.floor(payment.amount / (pricing?.nin?.unitPrice || 250));

    // Update user balance
    const unitsBefore = user.units || 0;
    user.units = unitsBefore + unitsToAdd;
    await user.save({ session });

    // Update payment status
    payment.status = "approved";
    payment.units = unitsToAdd;
    await payment.save({ session });

    // Create Audit Log
    await AuditLog.create([{ 
      action: "APPROVE_PAYMENT", 
      performedBy: req.user.email, 
      userId: user._id, 
      amount: payment.amount, 
      unitsAdded: unitsToAdd, 
      unitsBefore: unitsBefore, 
      unitsAfter: user.units 
    }], { session });

    await session.commitTransaction();
    res.json({ message: "Approved successfully.", units: user.units });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: "Approval failed.", error: error.message });
  } finally {
    session.endSession();
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