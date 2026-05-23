const express = require("express");
const router = express.Router();

const User = require("../users/User.model");
const Transaction = require("../finance/Transaction.model");
const CacRequest = require("./CacRequest.model");
const Pricing = require("./Pricing.model");
const { verifyToken, isAdmin } = require("../../shared/authGuard");

// ==============================================================
// 📥 SUBMIT NEW CAC REGISTRATION (SECURED VIA JWT)
// ==============================================================
router.post("/submit", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Secure identity reference from validation payload
    const { 
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

    if (!serviceType || !businessName1 || !businessName2) {
      return res.status(400).json({ message: "Missing required core business identification fields." });
    }

    //  api matrix conversion configurations
    const platformPricing = await Pricing.findOne();
    
    const soleCost = platformPricing?.cacServices?.soleProprietorship ?? 28000;
    const partnerCost = platformPricing?.cacServices?.partnership ?? 32000;
    const limitedCost = platformPricing?.cacServices?.limited1M ?? 40000;
    const userUnitPrice = platformPricing?.nin?.unitPrice || 215;

    // Isolate targeting operational costs
    let cost = 0;
    if (serviceType === "sole_proprietorship") cost = soleCost;
    else if (serviceType === "partnership") cost = partnerCost;
    else if (serviceType === "limited_1m") cost = limitedCost;
    else if (serviceType === "custom_ngo") cost = 0;
    else {
      return res.status(400).json({ message: "Invalid corporate structural classification target." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User account context not found." });

    // Deduct total structural credit score allocation 
    const unitsRequired = Math.ceil(cost / userUnitPrice); 
    
    if (user.units < unitsRequired && cost > 0) {
      return res.status(400).json({ 
        message: `Insufficient profile balance units. You require ${unitsRequired} units (₦${cost.toLocaleString()}) to initialize this registration transaction pipeline.` 
      });
    }

    if (cost > 0) {
      user.units -= unitsRequired;
      await user.save();
    }

    // Persist registry workspace data
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
      secretary,
      statusHistory: [{ status: "pending", note: "Corporate corporate pipeline structure initialized successfully." }]
    });

    // Write cross-cutting financial tracking ledger
    await Transaction.create({
      userId,
      type: "SERVICE", // Keep tracking aligned with global dashboard filter schemas cleanly
      amount: cost,
      unitsUsed: unitsRequired,
      status: "success", 
      proof: `CAC Submission ID Tracking Register reference: ${newCacJob._id}`
    });

    res.json({ 
      success: true,
      message: "Corporate registry filing compiled and queued successfully!", 
      jobId: newCacJob._id,
      remainingUnits: user.units 
    });

  } catch (error) {
    console.error("🔥 CAC PIPELINE REGISTER SUBMISSION CRASH ERROR:", error);
    res.status(500).json({ message: "Server registry compiler operational failure.", error: error.message });
  }
});

// ==============================================================
// 📜 USER ROUTE: SECURE PERSONAL RUNNING HISTORY INDEX LOGS
// ==============================================================
router.get("/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Secure extraction layer prevents context hijacking
    const history = await CacRequest.find({ userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to load individual tracking index logs." });
  }
});

// ==============================================================
// 🛠️ ADMIN ROUTE: RETRIEVE ALL SYSTEM PENDING REGISTRATION JOBS
// ==============================================================
router.get("/admin/requests", verifyToken, isAdmin, async (req, res) => {
  try {
    const records = await CacRequest.find()
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;