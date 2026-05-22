const express = require("express");

const User = require("../models/User");
const Transaction = require("../models/Transaction");
// 💡 Added model imports to pull unified individual histories safely
const ServiceRequest = require("../models/ServiceRequest");
const CacRequest = require("../models/CacRequest");

const router = express.Router();

// ==============================
// 🔥 GET USER UNITS (MAIN SYSTEM)
// ==============================
router.post("/balance", async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      units: user.units || 0,     // ✅ PRIMARY SYSTEM
      balance: user.balance || 0, // optional (legacy)
    });

  } catch (error) {
    console.error("🔥 BALANCE ERROR:", error.message);

    return res.status(500).json({
      error: "Failed to fetch balance",
    });
  }
});

// ==============================
// 📜 GET USER TRANSACTIONS
// ==============================
router.post("/transactions", async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

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
      error: "Failed to fetch transactions",
    });
  }
});

// ==============================================================
// 📥 GET COMBINED USER REQUESTS HISTORY (Resolves Frontend 404 loops)
// ==============================================================
router.get("/requests/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID parameter required" });
    }

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

module.exports = router;