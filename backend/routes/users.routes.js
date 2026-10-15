const express = require("express");
const usersController = require("../controllers/users.controller");

const User = require("../models/User.model");
const AuditLog = require("../models/AuditLog.model");
const { verifyToken, isAdmin } = require("../shared/authGuard");
const { SUPER_ADMIN_EMAIL } = require("../config/constants");

// Lazy-loaded model definitions for localized structural feature calls
const Transaction = require("../models/transaction.model");
const ServiceRequest = require("../models/ServiceRequest.model");
const CacRequest = require("../models/CacRequest.model");
const Pricing = require("../models/Pricing.model");
const PayoutDetails = require("../models/PayoutDetails.model");

const router = express.Router();

const getPayoutSummary = (details) => details ? ({
  bankName: details.bankName,
  accountName: details.accountName,
  accountNumberMasked: `••••••${details.accountNumber.slice(-4)}`,
  updatedAt: details.updatedAt,
}) : null;

router.get("/commission", verifyToken, async (req, res) => {
  try {
    const [user, transactions, services, payoutDetails] = await Promise.all([
      User.findById(req.user.id).select("commissionBalance commissionBalanceKobo").lean(),
      Transaction.find({ userId: req.user.id, type: "COMMISSION" })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Pricing.getServiceCatalog(),
      PayoutDetails.findOne({ userId: req.user.id }).select("bankName accountName accountNumber updatedAt").lean(),
    ]);

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const commissionBalanceKobo = Number(user.commissionBalanceKobo ?? Math.round(Number(user.commissionBalance || 0) * 100));
    return res.json({
      success: true,
      balance: Number((commissionBalanceKobo / 100).toFixed(2)),
      balanceKobo: commissionBalanceKobo,
      payoutDetails: getPayoutSummary(payoutDetails),
      history: transactions.map((transaction) => ({
        id: transaction._id,
        amount: Number(transaction.amountKobo != null
          ? Number(transaction.amountKobo) / 100
          : transaction.amount || 0),
        description: transaction.description || "Commission earned",
        createdAt: transaction.createdAt,
        status: transaction.status,
      })),
      services: services
        .filter((service) => service.status === "active"
          && ["FLAT", "PERCENTAGE"].includes(service.commissionType)
          && Number(service.commissionValue) > 0)
        .map((service) => ({
          serviceCode: service.serviceCode,
          name: service.name,
          category: service.category,
          price: Number(service.price || 0),
          commissionType: service.commissionType,
          commissionValue: Number(service.commissionValue),
        })),
    });
  } catch (error) {
    console.error("USER COMMISSION SUMMARY ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load commission summary." });
  }
});

router.put("/commission/payout-details", verifyToken, async (req, res) => {
  const bankName = typeof req.body?.bankName === "string" ? req.body.bankName.trim() : "";
  const accountName = typeof req.body?.accountName === "string" ? req.body.accountName.trim() : "";
  const accountNumber = typeof req.body?.accountNumber === "string" ? req.body.accountNumber.trim() : "";

  if (!bankName || bankName.length > 100) {
    return res.status(400).json({ success: false, message: "Enter a bank name (up to 100 characters)." });
  }
  if (!accountName || accountName.length > 120) {
    return res.status(400).json({ success: false, message: "Enter the account holder name (up to 120 characters)." });
  }
  if (!/^\d{10}$/.test(accountNumber)) {
    return res.status(400).json({ success: false, message: "Enter a valid 10-digit account number." });
  }

  try {
    const payoutDetails = await PayoutDetails.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          bankName,
          accountName,
          accountNumber,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    return res.json({
      success: true,
      message: "Bank details saved for your commission payouts.",
      payoutDetails: getPayoutSummary(payoutDetails),
    });
  } catch (error) {
    console.error("USER PAYOUT DETAILS UPDATE ERROR:", error);
    return res.status(502).json({ success: false, message: "Could not save your bank details. Please try again." });
  }
});

router.put("/profile", verifyToken, async (req, res) => {
  try {
    const allowedFields = ["firstName", "lastName", "email", "phone"];
    const submittedFields = Object.keys(req.body || {});
    if (!submittedFields.length || submittedFields.some((field) => !allowedFields.includes(field))) {
      return res.status(400).json({ success: false, message: "Submit one or more supported account fields." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const changedFields = [];
    for (const field of ["firstName", "lastName"]) {
      if (req.body[field] === undefined) continue;
      if (typeof req.body[field] !== "string" || req.body[field].trim().length > 100) {
        return res.status(400).json({ success: false, message: `${field} must be 100 characters or fewer.` });
      }
      const nextValue = req.body[field].trim();
      if (user[field] !== nextValue) {
        changedFields.push(`${field}: "${user[field] || "(empty)"}" -> "${nextValue || "(empty)"}"`);
        user[field] = nextValue;
      }
    }

    if (req.body.email !== undefined) {
      if (typeof req.body.email !== "string") {
        return res.status(400).json({ success: false, message: "Enter a valid email address." });
      }
      const email = req.body.email.trim().toLowerCase();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email address." });
      }
      if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(400).json({ success: false, message: "This email address is reserved." });
      }
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } }).select("_id").lean();
      if (existingUser) return res.status(409).json({ success: false, message: "That email address is already in use." });
      if (user.email !== email) {
        changedFields.push(`email: "${user.email || "(empty)"}" -> "${email}"`);
        user.email = email;
      }
    }

    if (req.body.phone !== undefined) {
      if (typeof req.body.phone !== "string") {
        return res.status(400).json({ success: false, message: "Enter a valid WhatsApp number." });
      }
      const rawPhone = req.body.phone.trim();
      const phone = rawPhone.replace(/[^\d+]/g, "");
      if (rawPhone && !/^\+?\d{7,15}$/.test(phone)) {
        return res.status(400).json({ success: false, message: "Enter a valid WhatsApp number." });
      }
      if (user.phone !== phone) {
        changedFields.push(`WhatsApp number: "${user.phone || "(empty)"}" -> "${phone || "(empty)"}"`);
        user.phone = phone;
      }
    }

    if (changedFields.length) {
      await user.save();
      try {
        await AuditLog.create({
          action: "USER_PROFILE_UPDATED",
          performedBy: user.email,
          userId: user._id,
          note: `User updated account details: ${changedFields.join("; ")}.`,
        });
      } catch (auditError) {
        console.warn("User account audit log creation failed:", auditError.message);
      }
    }

    const updatedUser = await User.findById(user._id).select("-password").lean();
    return res.json({ success: true, message: "Account details updated.", data: updatedUser });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "That email address is already in use." });
    }
    console.error("USER PROFILE UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update account details." });
  }
});

// ==============================
// 🔥 GET USER UNITS (SECURED VIA JWT)
// ==============================
router.get("/balance", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; 
    const user = await User.findById(userId)
      .select("walletBalance walletBalanceKobo units commissionBalance commissionBalanceKobo")
      .lean()
      .exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const walletBalanceKobo = user.walletBalanceKobo || 0;
    const walletBalance = Number((walletBalanceKobo / 100).toFixed(2));
    const commissionBalanceKobo = Number(user.commissionBalanceKobo ?? Math.round(Number(user.commissionBalance || 0) * 100));
    const commissionBalance = Number((commissionBalanceKobo / 100).toFixed(2));

    return res.json({
      units: user.units || 0,
      walletBalance,
      walletBalanceKobo,
      balance: user.balance || 0,
      commissionBalance,
      commissionBalanceKobo,
    });
  } catch (error) {
    console.error("🔥 BALANCE ERROR:", error.message);
    return res.status(500).json({
      error: "Failed to api balance",
    });
  }
});

router.get("/wallet", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select("walletBalance walletBalanceKobo units commissionBalance commissionBalanceKobo")
      .lean()
      .exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const walletBalanceKobo = user.walletBalanceKobo || 0;
    const walletBalance = Number((walletBalanceKobo / 100).toFixed(2));
    const commissionBalanceKobo = Number(user.commissionBalanceKobo ?? Math.round(Number(user.commissionBalance || 0) * 100));
    const commissionBalance = Number((commissionBalanceKobo / 100).toFixed(2));

    return res.json({
      units: user.units || 0,
      walletBalance,
      walletBalanceKobo,
      balance: user.balance || 0,
      commissionBalance,
      commissionBalanceKobo,
    });
  } catch (error) {
    console.error("🔥 WALLET ERROR:", error.message);
    return res.status(500).json({
      error: "Failed to api wallet",
    });
  }
});

// ==============================
// 📜 GET USER TRANSACTIONS (SECURED VIA JWT)
// ==============================
router.get("/transactions", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Securely pulled from request payload
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [transactions, totalCount] = await Promise.all([
      Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments({ userId })
    ]);

    const formatted = transactions.map(tx => ({
      _id: tx._id,
      type: tx.type,
      nin: tx.nin || null,
      amount: tx.amount || 0,
      units: tx.units || tx.unitsUsed || 0,
      status: tx.status,
      createdAt: tx.createdAt,
    }));

    return res.json({
      success: true,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      data: formatted
    });

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
router.get("/requests/history", verifyToken, usersController.getUserRequests);

router.get("/requests/:id", verifyToken, async (req, res) => {
  try {
    const targetId = req.params.id;
    const isOwner = req.user && req.user.id === targetId;
    const isAdminRole = req.user && ["admin", "super_admin"].includes(req.user.role);
    if (!isOwner && !isAdminRole) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient privileges" });
    }

    const [services, cacRequests] = await Promise.all([
      ServiceRequest.find({ userId: targetId }).lean(),
      CacRequest.find({ userId: targetId }).lean()
    ]);

    const normalizedServices = services.map(s => ({ ...s, pipelineSource: "service" }));
    const normalizedCac = cacRequests.map(c => ({ ...c, pipelineSource: "cac" }));
    const combinedHistory = [...normalizedServices, ...normalizedCac].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      count: combinedHistory.length,
      data: combinedHistory
    });
  } catch (error) {
    console.error("🔥 USER REQUESTS ALIAS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load user requests." });
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