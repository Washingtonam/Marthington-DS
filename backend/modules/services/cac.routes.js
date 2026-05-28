const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const User = require("../users/User.model");
const Transaction = require("../../models/transaction.model");
const CacRequest = require("./CacRequest.model");
const Pricing = require("./Pricing.model");
const { verifyToken, isAdmin } = require("../../shared/authGuard");
const { SUPER_ADMIN_EMAIL } = require("../../config/constants");
const { validateCacRegistration } = require("../../shared/validators");

router.post("/submit", verifyToken, async (req, res) => {
  // 1. Validate incoming data
  const { error } = validateCacRegistration.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const { serviceType, businessName1, businessName2, companyEmail, companyPhone, category, state, lga, shopNo, streetAddress, proprietors, witness, secretary } = req.body;

    const platformPricing = await Pricing.findOne().session(session);
    const rates = { sole_proprietorship: platformPricing?.cacServices?.soleProprietorship ?? 28000, partnership: platformPricing?.cacServices?.partnership ?? 32000, limited_1m: platformPricing?.cacServices?.limited1M ?? 40000, custom_ngo: 0 };
    
    const cost = rates[serviceType];
    const userUnitPrice = platformPricing?.nin?.unitPrice || 215;
    const unitsRequired = Math.ceil(cost / userUnitPrice);

    const user = await User.findById(userId).session(session);
    if (user.units < unitsRequired && cost > 0) throw new Error(`Insufficient units. Required: ${unitsRequired}`);

    // Deduct units atomically to prevent race conditions
    if (cost > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { units: -unitsRequired } },
        { new: true, session }
      );
      if (!updatedUser) throw new Error("Failed to update user units");
      user.units = updatedUser.units;
    }

    // Persist Registry
    const [newCacJob] = await CacRequest.create([{
      userId, serviceType, amountCharged: cost, businessName1, businessName2, companyEmail, companyPhone, category, state, lga, shopNo, streetAddress, proprietors, witness, secretary,
      statusHistory: [{ status: "pending", note: "Corporate pipeline structure initialized." }]
    }], { session });

    // Track Transaction
    await Transaction.create([{
      userId, type: "SERVICE", amount: cost, unitsUsed: unitsRequired, status: "success", 
      proof: `CAC ID: ${newCacJob._id}`
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, message: "Filing queued successfully!", jobId: newCacJob._id, remainingUnits: user.units });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// ... (History and Admin routes remain similar but keep them secure)

router.get("/history", verifyToken, async (req, res) => {
  try {
    const history = await CacRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) { res.status(500).json({ message: "Failed to load logs." }); }
});

router.get("/user-history/:id", verifyToken, async (req, res) => {
  try {
    const targetId = req.params.id;
    const isOwner = req.user && req.user.id === targetId;
    const isAdminRole = req.user && ["admin", "super_admin"].includes(req.user.role);
    if (!isOwner && !isAdminRole) {
      return res.status(403).json({ message: "Forbidden: insufficient privileges" });
    }
    const records = await CacRequest.find({ userId: targetId }).sort({ createdAt: -1 }).lean();
    res.json(records);
  } catch (error) {
    console.error("🔥 CAC USER HISTORY ALIAS ERROR:", error);
    res.status(500).json({ message: "Failed to load CAC user history." });
  }
});

// ✅ Get CAC requests for a specific user (owner or admin only)
router.get("/user-requests/:id", verifyToken, async (req, res) => {
  try {
    const targetId = req.params.id;

    // Allow access if requester is the owner, a platform admin, or super admin email
    const isOwner = req.user && (req.user.id === targetId || req.user._id === targetId);
    const isAdminRole = req.user && (req.user.role === "admin" || req.user.role === "super_admin");
    const isSuperAdminEmail = req.user && req.user.email === SUPER_ADMIN_EMAIL;

    if (!isOwner && !isAdminRole && !isSuperAdminEmail) {
      return res.status(403).json({ message: "Forbidden: insufficient privileges" });
    }

    const records = await CacRequest.find({ userId: targetId }).sort({ createdAt: -1 }).lean();
    return res.json(records);
  } catch (error) {
    console.error("🔥 CAC USER REQUESTS ERROR:", error);
    return res.status(500).json({ message: "Failed to load user CAC requests" });
  }
});

router.get("/admin/requests", verifyToken, isAdmin, async (req, res) => {
  try {
    const records = await CacRequest.find().populate("userId", "firstName lastName email").sort({ createdAt: -1 });
    res.json({ success: true, data: records });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;