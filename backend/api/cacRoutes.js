const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const CacRequest = require("../models/CacRequest");
// 🔥 Import Pricing model to pull real-time live engine rates
const Pricing = require("../models/Pricing");

// ==========================================
// 📥 SUBMIT NEW CAC REGISTRATION
// ==========================================
router.post("/submit", async (req, res) => {
  try {
    const { 
      userId, 
      serviceType, 
      businessName1, 
      businessName2, 
      companyEmail,
      companyPhone,
      category,
      state,
      lga,
      shopNo,
      streetAddress,
      proprietors,
      witness,
      secretary 
    } = req.body;

    if (!userId || !serviceType || !businessName1 || !businessName2) {
      return res.status(400).json({ message: "Missing required core fields" });
    }

    // 📥 FETCH LIVE PRICING RECORD FROM DATABASE ENGINES
    const platformPricing = await Pricing.findOne();
    
    // Fallbacks guarantee protection if administrative record documents aren't hydrated yet
    const soleCost = platformPricing?.cacServices?.soleProprietorship ?? 28000;
    const partnerCost = platformPricing?.cacServices?.partnership ?? 32000;
    const limitedCost = platformPricing?.cacServices?.limited1M ?? 40000;
    const userUnitPrice = platformPricing?.nin?.unitPrice || 215;

    // Dynamically assign processing thresholds cost boundaries
    let cost = 0;
    if (serviceType === "sole_proprietorship") cost = soleCost;
    else if (serviceType === "partnership") cost = partnerCost;
    else if (serviceType === "limited_1m") cost = limitedCost;
    else if (serviceType === "custom_ngo") cost = 0;
    else {
      return res.status(400).json({ message: "Invalid service variant selected" });
    }

    // Verify user profile and balance limits
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User profile not found" });

    // Calculate structural units required against live administrative database configuration
    const unitsRequired = Math.ceil(cost / userUnitPrice); 
    
    if (user.units < unitsRequired && cost > 0) {
      return res.status(400).json({ 
        message: `Insufficient units. You need ${unitsRequired} units (₦${cost.toLocaleString()}) for this action.` 
      });
    }

    // Deduct units allocation from balance profile execution pipeline
    if (cost > 0) {
      user.units -= unitsRequired;
      await user.save();
    }

    // Log tracking collection document
    const newCacJob = await CacRequest.create({
      userId,
      serviceType,
      amountCharged: cost,
      businessName1,
      businessName2,
      companyEmail,
      companyPhone,
      category,
      state,
      lga,
      shopNo,
      streetAddress,
      proprietors,
      witness,
      secretary
    });

    // Create record context mapping in overarching main transaction array
    await Transaction.create({
      userId,
      type: "CAC_REGISTRATION",
      amount: cost,
      units: unitsRequired,
      status: "completed", 
      proof: `CAC Submission ID: ${newCacJob._id}`
    });

    res.json({ 
      message: "CAC Registration submitted successfully!", 
      jobId: newCacJob._id,
      remainingUnits: user.units 
    });

  } catch (error) {
    console.error("🔥 CAC SUBMISSION ERROR:", error);
    res.status(500).json({ message: "Server encountered an operational failure", error: error.message });
  }
});

// ==========================================
// 📜 FETCH USER INDIVIDUAL CAC LOGS
// ==========================================
router.get("/user-history/:userId", async (req, res) => {
  try {
    const history = await CacRequest.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

module.exports = router;