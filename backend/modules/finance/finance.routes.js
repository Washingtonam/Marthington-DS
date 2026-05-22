const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Transaction = require("./Transaction.model");
const User = require("../users/User.model");
const Pricing = require("../services/Pricing.model");
const { verifyToken, isAdmin } = require("../../shared/authGuard");

// Fallback dynamic AuditLog model compile to ensure no startup compilation crashes
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
// 📤 USER ROUTE: SUBMIT MANUAL DEPOSIT PAYMENT RECEIPTPROOF
// ==============================================================
router.post("/submit-payment", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Securely pulled straight from verified token context
    const { amount, proof, units } = req.body;

    if (!amount || !proof) {
      return res.status(400).json({
        message: "Amount and deposit proof receipt asset are required parameters.",
      });
    }

    if (proof.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        message: "Image target metadata size is too large. Reduce file size constraints.",
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User profile record not found." });

    // 🔥 BLOCK MULTIPLE CONCURRENT PENDING RECEIPTS TO PREVENT FRAUD
    const existingPending = await Transaction.findOne({
      userId,
      type: "UNIT_ADD",
      status: "pending",
    });

    if (existingPending) {
      return res.status(400).json({
        message: "You already have an active pending payment settlement waiting review.",
      });
    }

    const payment = await Transaction.create({
      type: "UNIT_ADD",
      amount: Number(amount),
      units: Number(units) || 0,
      status: "pending",
      userId,
      proof,
    });

    res.json({
      message: "Payment transaction receipt submitted successfully for administration validation.",
      payment,
    });

  } catch (error) {
    console.error("🔥 SUBMIT FINANCE RECEIPT ERROR:", error);
    res.status(500).json({
      message: "Submission pipeline processing failed.",
      error: error.message,
    });
  }
});

// ==============================================================
// 📜 USER ROUTE: SECURELY INDEVELOP USER WALLET TRANSACTION LEDGERS
// ==============================================================
router.get("/transactions", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Securely extracted tracking parameters

    const transactions = await Transaction.find({ userId })
      .populate("requestId")
      .sort({ createdAt: -1 });

    res.json(transactions);

  } catch (err) {
    console.error("FETCH TRANSACTIONS LOG ERROR:", err);
    res.status(500).json({ message: "Failed to load personalized transaction indices." });
  }
});

// ==============================================================
// 📥 ADMIN ROUTE: RETRIEVE ALL SYSTEM SUBMITTED UNIT FUNDING TICKETS
// ==============================================================
router.get("/admin/payments", verifyToken, isAdmin, async (req, res) => {
  try {
    const payments = await Transaction.find({ type: "UNIT_ADD" })
      .populate("userId", "firstName lastName email units")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error("🔥 ADMIN FETCH PAYMENTS LOG ERROR:", error);
    res.status(500).json({ message: "Failed to collect incoming ledger requests tracking." });
  }
});

// ==============================================================
// ✅ ADMIN ROUTE: APPROVE MANUAL WALLET TOP-UP & ASSIGN UNITS
// ==============================================================
router.post("/admin/payments/:id/approve", verifyToken, isAdmin, async (req, res) => {
  try {
    const adminEmail = req.user.email; // Pulled safely straight out of verified token context payload
    const payment = await Transaction.findById(req.params.id);
    
    if (!payment) return res.status(404).json({ message: "Target ledger sheet identifier not found." });

    // 🔥 GUARD CONTROL: ONLY REJECT/PENDING PROCESSING MODES CLEAR FOR ACTIONS
    if (payment.status !== "pending") {
      return res.status(400).json({
        message: `Cannot approve a lifecycle tracked transaction ticket holding status: '${payment.status}'`,
      });
    }

    const user = await User.findById(payment.userId);
    if (!user) return res.status(404).json({ message: "Target client account context missing." });

    const pricing = await Pricing.findOne();
    const pricePerUnit = pricing?.nin?.unitPrice || 250;

    let unitsToAdd = payment.units;

    // Fallback dynamic mathematical conversion calculation if custom parameters aren't parsed
    if (!unitsToAdd || unitsToAdd < 1) {
      unitsToAdd = Math.floor(payment.amount / pricePerUnit);
    }

    if (unitsToAdd < 1) {
      return res.status(400).json({
        message: "Financial settlement deposit volume too small to instantiate system utility credit value units.",
      });
    }

    const beforeUnits = user.units;

    // Mutate state vectors safely inside clean schema transaction chains
    user.units += unitsToAdd;
    await user.save();

    payment.status = "approved";
    payment.units = unitsToAdd;
    await payment.save();

    // Trigger internal logging parameters securely
    await AuditLog.create({
      action: "APPROVE_PAYMENT",
      performedBy: adminEmail,
      userId: user._id,
      amount: payment.amount,
      unitsAdded: unitsToAdd,
      unitsBefore: beforeUnits,
      unitsAfter: user.units,
    });

    res.json({
      message: `Approvals cleared cleanly. Allocated ${unitsToAdd} utility network balances to user profile tracking register.`,
      units: user.units,
    });

  } catch (error) {
    console.error("🔥 APPROVAL PIPELINE PROCESSING FAILED:", error);
    res.status(500).json({
      message: "Approval execution crash.",
      error: error.message,
    });
  }
});

// ==============================================================
// ❌ ADMIN ROUTE: REJECT FRAUDULENT OR UNMATCHED RECEIPTS
// ==============================================================
router.post("/admin/payments/:id/reject", verifyToken, isAdmin, async (req, res) => {
  try {
    const payment = await Transaction.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Target unit request ledger metadata not found." });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        message: `Cannot change state configuration tracking loops for active items marked: '${payment.status}'`,
      });
    }

    payment.status = "rejected";
    await payment.save();

    res.json({ message: "Deposit verification request rejected successfully." });

  } catch (error) {
    console.error("🔥 PROCESS REJECTION LOOP ERROR:", error);
    res.status(500).json({ message: "Rejection state pipeline failed to commit updates." });
  }
});

module.exports = router;