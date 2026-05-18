const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const CacRequest = require("../models/CacRequest");

// Pricing mapping matched against your layout specification
const CAC_PRICING = {
  sole_proprietorship: 28000,
  partnership: 32000,
  limited_1m: 40000,
  custom_ngo: 0
};

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

    const cost = CAC_PRICING[serviceType];
    if (cost === undefined) {
      return res.status(400).json({ message: "Invalid service variant selected" });
    }

    // Verify user profile and balance limits
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User profile not found" });

    // Validate if user balance (converted units equivalent or explicit currency mapping) covers costs
    // Assuming your system uses explicit currency equivalent units (e.g. 1 unit = N215)
    // Modify calculation if your balance is stored natively in Naira currency values
    const unitsRequired = Math.ceil(cost / 215); 
    
    if (user.units < unitsRequired && cost > 0) {
      return res.status(400).json({ 
        message: `Insufficient units. You need ${unitsRequired} units (₦${cost.toLocaleString()}) for this action.` 
      });
    }

    // Deduct units allocation from balance profile
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
      status: "completed", // Deducted transaction tracking profile status
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