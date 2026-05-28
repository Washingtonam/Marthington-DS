const express = require("express");

const User = require("./User.model");
const { verifyToken, isAdmin } = require("../../shared/authGuard");

// Lazy-loaded model definitions for localized structural feature calls
// (These paths look straight into your adjacent modules folder structure seamlessly)
const Transaction = require("../../models/transaction.model");
const ServiceRequest = require("../services/ServiceRequest.model");
const CacRequest = require("../services/CacRequest.model");

const router = express.Router();

// ==============================
// 🔥 GET USER UNITS (SECURED VIA JWT)
// ==============================
router.get("/balance", verifyToken, async (req, res) => {
  try {
    // Securely pull identity straight from token string instead of loose body values
    const userId = req.user.id; 

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      units: user.units || 0,     // ✅ Legacy units still available for backward compatibility
      walletBalance: user.walletBalance || 0,
      walletBalanceKobo: user.walletBalanceKobo || 0,
      balance: user.balance || 0, // optional legacy field
    });

  } catch (error) {
    console.error("🔥 BALANCE ERROR:", error.message);
    return res.status(500).json({
      error: "Failed to api balance",
    });
  }
});

// ==============================
// 📜 GET USER TRANSACTIONS (SECURED VIA JWT)
// ==============================
router.get("/transactions", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Securely pulled from request payload

    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 });

    // 🔥 NORMALIZE RESPONSE FOR FRONTEND
    const formatted = transactions.map(tx => ({
      _id: tx._id,
      type: tx.type,
      nin: tx.nin || null,
      amount: tx.amount || 0,
      units: tx.units || tx.unitsUsed || 0,
      status: tx.status,
      createdAt: tx.createdAt,
    }));

    return res.json(formatted);

  } catch (error) {
    console.error("🔥 TRANSACTION ERROR:", error.message);
    return res.status(500).json({
      error: "Failed to api transactions",
    });
  }
});

// ==============================================================
// 📥 GET COMBINED USER REQUESTS HISTORY (SECURED VIA JWT)
// ==============================================================
router.get("/requests/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Fully token authenticated

    // Execute database scans concurrently to save memory cycles
    const [services, cacRequests] = await Promise.all([
      ServiceRequest.find({ userId }).lean(),
      CacRequest.find({ userId }).lean()
    ]);

    // Tag and normalize properties so your client UI identifies layout components clearly
    const normalizedServices = services.map(s => ({ 
      ...s, 
      pipelineSource: "service" 
    }));
    
    const normalizedCac = cacRequests.map(c => ({ 
      ...c, 
      pipelineSource: "cac" 
    }));

    // Merge the arrays and sort descending by newest creation dates
    const combinedHistory = [...normalizedServices, ...normalizedCac].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      count: combinedHistory.length,
      data: combinedHistory
    });

  } catch (error) {
    console.error("🔥 INDIVIDUAL USER REQUESTS ERROR:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Server error querying target user data logs." 
    });
  }
});

// ==============================================================
// 🛠️ ADMIN ROUTE: GET ALL REGISTERED SYSTEM USERS (FOR ADMIN CONTROL)
// ==============================================================
router.get("/admin/all-users", verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error("🔥 ADMIN USERS LOG ERROR:", error.message);
    return res.status(500).json({ success: false, message: "Failed to api user index." });
  }
});

module.exports = router;