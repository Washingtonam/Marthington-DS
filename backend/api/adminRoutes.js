const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const AuditLog = require("../models/AuditLog");
const Pricing = require("../models/Pricing");

// Safe Model Resolution for Service pipelines to protect against initialization crashes
let ServiceRequest;
try {
  ServiceRequest = mongoose.model("ServiceRequest");
} catch {
  const dynamicSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
  ServiceRequest = mongoose.model("ServiceRequest", dynamicSchema);
}

// Dynamic resolution for CAC model tracking
let CACRequest;
try {
  CACRequest = mongoose.model("CacRequest");
} catch {
  const dynamicCacSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
  CACRequest = mongoose.model("CacRequest", dynamicCacSchema);
}

// ==============================
// 🔐 AUTH MIDDLEWARE (Unified & Secure)
// ==============================
const isAdmin = async (req, res, next) => {
  try {
    const email = req.headers["email"];

    if (!email) {
      return res.status(401).json({ message: "Unauthorized: Missing Email Header" });
    }

    const user = await User.findOne({ email }).lean();

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!["admin", "super_admin"].includes(user.role)) {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("AUTH ERROR:", err);
    res.status(500).json({ message: "Auth failed" });
  }
};

const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied: Super admin authority required" });
  }
  next();
};

// ==============================
// 🚀 FAST DASHBOARD STATS
// ==============================
router.get("/stats", isAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalTransactions,
      pendingPayments,
      balanceData
    ] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      Transaction.countDocuments({
        type: "UNIT_ADD",
        status: "pending"
      }),
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$balance" }
          }
        }
      ])
    ]);

    res.json({
      totalUsers,
      totalTransactions,
      pendingPayments,
      totalBalance: balanceData[0]?.total || 0
    });
  } catch (err) {
    console.error("STATS ERROR:", err);
    res.status(500).json({ message: "Failed to load stats" });
  }
});

// ==========================================
// 📥 NIMC PIPELINE: FETCH ALL NIMC REQUESTS
// ==========================================
router.get("/nimc-requests", isAdmin, async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate("userId", "email firstName lastName phoneNumber")
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("🔥 ADMIN NIMC REQUESTS FETCH ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch NIMC pipeline requests" });
  }
});

// ==========================================
// 🏢 CAC PIPELINE: FETCH ALL CAC REGISTRATIONS
// ==========================================
router.get("/cac-requests", isAdmin, async (req, res) => {
  try {
    const requests = await CACRequest.find()
      .populate("userId", "email firstName lastName phoneNumber")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("🔥 ADMIN CAC REQUESTS FETCH ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch CAC business registry requests" });
  }
});

// ==========================================
// 🔄 UNIFIED OPERATIONS STATUS UPDATE CONTROLLER
// ==========================================
router.put("/update-status/:targetModule/:id", isAdmin, async (req, res) => {
  const { targetModule, id } = req.params;
  const { status, note } = req.body; 
  const adminEmail = req.user.email;

  try {
    // Select correct data repository module target
    const TargetModel = targetModule === "cac" ? CACRequest : ServiceRequest;
    
    const normalizedStatus = String(status).toLowerCase();

    // Check if item exists before altering attributes
    const record = await TargetModel.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Requested application profile context not found." });
    }

    // Perform updates using atomic setters to keep schema history happy
    record.status = normalizedStatus;
    
    if (record.statusHistory) {
      record.statusHistory.push({
        status: normalizedStatus,
        note: note || `Application transition to ${normalizedStatus} authorized by ${adminEmail}`,
        createdAt: new Date()
      });
    }

    await record.save();

    // Side-chain logging inside unified operational system audit trails
    try {
      await AuditLog.create({
        action: `UPDATE_${targetModule.toUpperCase()}_STATUS`,
        performedBy: adminEmail,
        userId: record.userId || null,
        amount: record.amount || 0,
        note: `Record ${id} shifted to ${normalizedStatus}. Comment: ${note || 'None'}`
      });
    } catch (logErr) {
      console.warn("Audit tracking step skipped cleanly:", logErr.message);
    }

    res.json({ success: true, message: `Pipeline document successfully marked as ${normalizedStatus}`, data: record });
  } catch (err) {
    console.error("🔥 UNIFIED STATUS TRANSITION ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to modulate application timeline lifecycle state." });
  }
});

// ==============================
// 📥 ADMIN GET ALL USER UNIT/PAYMENT REQUESTS
// ==============================
router.get("/payments", isAdmin, async (req, res) => {
  try {
    const payments = await Transaction.find({
      type: "UNIT_ADD",
    })
      .populate("userId", "email units")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error("🔥 FETCH PAYMENTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

// ==============================
// ✅ APPROVE PAYMENT REQUEST
// ==============================
router.post("/payments/:id/approve", isAdmin, async (req, res) => {
  try {
    const adminEmail = req.user.email;

    const payment = await Transaction.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment request not found" });

    if (payment.status !== "pending") {
      return res.status(400).json({
        message: `Cannot approve a ${payment.status} payment`,
      });
    }

    const user = await User.findById(payment.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const pricing = await Pricing.findOne();
    const pricePerUnit = pricing?.nin?.unitPrice || 215;

    let unitsToAdd = payment.units;

    if (!unitsToAdd || unitsToAdd < 1) {
      unitsToAdd = Math.floor(payment.amount / pricePerUnit);
    }

    if (unitsToAdd < 1) {
      return res.status(400).json({
        message: "Amount too small to generate units",
      });
    }

    const beforeUnits = user.units;

    user.units += unitsToAdd;
    await user.save();

    payment.status = "approved";
    payment.units = unitsToAdd;
    await payment.save();

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
      message: `Approved. ${unitsToAdd} units added successfully.`,
      units: user.units,
    });
  } catch (error) {
    console.error("🔥 APPROVAL ERROR:", error);
    res.status(500).json({
      message: "Approval failed",
      error: error.message,
    });
  }
});

// ==============================
// ❌ REJECT PAYMENT REQUEST
// ==============================
router.post("/payments/:id/reject", isAdmin, async (req, res) => {
  try {
    const payment = await Transaction.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        message: `Cannot reject a ${payment.status} payment`,
      });
    }

    payment.status = "rejected";
    await payment.save();

    res.json({ message: "Payment request rejected successfully" });
  } catch (error) {
    console.error("🔥 REJECT ERROR:", error);
    res.status(500).json({ message: "Rejection failed" });
  }
});

// ==============================
// 👥 GET USERS
// ==============================
router.get("/users", isAdmin, async (req, res) => {
  try {
    let { page = 1, limit = 20, search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      data: users,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("FETCH USERS ERROR:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// ==============================
// 📊 TRANSACTIONS (PAGINATED)
// ==============================
router.get("/transactions", isAdmin, async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const total = await Transaction.countDocuments();
    const transactions = await Transaction.find()
      .populate("userId", "email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      data: transactions,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error("TRANSACTION ERROR:", err);
    res.status(500).json({ message: "Error fetching transactions" });
  }
});

// ==============================
// 📜 AUDIT LOGS
// ==============================
router.get("/audit-logs", isAdmin, async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .populate("userId", "email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      data: logs,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error("AUDIT ERROR:", err);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

// ==============================
// 🔥 ADMIN CONTROL MAPPINGS
// ==============================
router.put("/user/:id/make-admin", isAdmin, isSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "super_admin") return res.status(400).json({ message: "Cannot modify super admin" });

    user.role = "admin";
    await user.save();
    res.json({ message: "User promoted to admin", user });
  } catch (err) {
    console.error("MAKE ADMIN ERROR:", err);
    res.status(500).json({ message: "Failed to promote user" });
  }
});

router.put("/user/:id/remove-admin", isAdmin, isSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "super_admin") return res.status(400).json({ message: "Cannot modify super admin" });

    user.role = "user";
    await user.save();
    res.json({ message: "Admin removed", user });
  } catch (err) {
    console.error("REMOVE ADMIN ERROR:", err);
    res.status(500).json({ message: "Failed to remove admin" });
  }
});

router.put("/user/:id/suspend", isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "super_admin") return res.status(400).json({ message: "Cannot suspend super admin" });

    user.status = "suspended";
    await user.save();
    res.json({ message: "User suspended" });
  } catch (err) {
    console.error("SUSPEND ERROR:", err);
    res.status(500).json({ message: "Failed to suspend user" });
  }
});

router.put("/user/:id/activate", isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    user.status = "active";
    await user.save();
    res.json({ message: "User activated" });
  } catch (err) {
    console.error("ACTIVATE ERROR:", err);
    res.status(500).json({ message: "Failed to activate user" });
  }
});

router.delete("/user/:id", isAdmin, isSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "super_admin") return res.status(400).json({ message: "Cannot delete super admin" });

    await User.findByIdAndDelete(req.params.id);
    await Transaction.deleteMany({ userId: req.params.id });
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

router.post("/user/:id/units", isAdmin, async (req, res) => {
  try {
    const { units, action } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (action === "add") user.units += units;
    if (action === "deduct") {
      if (user.units < units) return res.status(400).json({ message: "Insufficient units" });
      user.units -= units;
    }

    await user.save();
    res.json({ message: "Units updated", units: user.units });
  } catch (err) {
    console.error("UNITS ERROR:", err);
    res.status(500).json({ message: "Error updating units" });
  }
});

// ==============================
// 💰 UPDATE PRICING (Fully Unified for NIN, Self-Service & CAC Engines)
// ==============================
router.put("/pricing", isAdmin, async (req, res) => {
  try {
    let pricing = await Pricing.findOne();
    if (!pricing) pricing = new Pricing({});

    if (!pricing.nin) pricing.nin = {};
    if (!pricing.ninServices) pricing.ninServices = { validation: {}, selfService: {}, ipe: {}, modification: {} };
    if (!pricing.ninServices.selfService) pricing.ninServices.selfService = {};
    if (!pricing.cacServices) pricing.cacServices = {};

    Object.assign(pricing.nin, {
      unitPrice: req.body.unitPrice ?? pricing.nin.unitPrice,
      agentPrice: req.body.agentPrice ?? pricing.nin.agentPrice,
      mode: req.body.mode ?? pricing.nin.mode,
    });

    if (req.body.validation) Object.assign(pricing.ninServices.validation, req.body.validation);
    if (req.body.ipe) Object.assign(pricing.ninServices.ipe, req.body.ipe);
    if (req.body.modification) Object.assign(pricing.ninServices.modification, req.body.modification);
    if (req.body.slipPrice !== undefined) pricing.ninServices.slipPrice = req.body.slipPrice;

    if (req.body.selfService) {
      Object.assign(pricing.ninServices.selfService, {
        emailRetrieval: req.body.selfService.emailRetrieval ?? pricing.ninServices.selfService.emailRetrieval,
        deviceUnlink: req.body.selfService.deviceUnlink ?? pricing.ninServices.selfService.deviceUnlink,
      });
    }

    if (req.body.cacServices) {
      Object.assign(pricing.cacServices, {
        soleProprietorship: req.body.cacServices.soleProprietorship ?? pricing.cacServices.soleProprietorship,
        partnership: req.body.cacServices.partnership ?? pricing.cacServices.partnership,
        limited1M: req.body.cacServices.limited1M ?? pricing.cacServices.limited1M,
      });
    }

    pricing.markModified("nin");
    pricing.markModified("ninServices");
    pricing.markModified("ninServices.validation");
    pricing.markModified("ninServices.selfService");
    pricing.markModified("ninServices.ipe");
    pricing.markModified("ninServices.modification");
    pricing.markModified("cacServices");

    await pricing.save();
    res.json({ message: "Pricing engine models updated successfully across all matrix tiers.", pricing });
  } catch (err) {
    console.error("PRICING ERROR:", err);
    res.status(500).json({ message: "Failed to update pricing" });
  }
});

module.exports = router;