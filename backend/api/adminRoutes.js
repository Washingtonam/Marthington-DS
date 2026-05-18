const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const AuditLog = require("../models/AuditLog");
const Pricing = require("../models/Pricing");

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
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin only" });
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
    const pricePerUnit = pricing?.nin?.unitPrice || 215; // Set defaults to match your platform setup

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
// 🔥 ADMIN CONTROL LEVEL SETTINGS (PROMOTIONS, SUSPENSIONS, PRICING)
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

router.put("/pricing", isAdmin, async (req, res) => {
  try {
    let pricing = await Pricing.findOne();
    if (!pricing) pricing = new Pricing({});

    Object.assign(pricing.nin, {
      unitPrice: req.body.unitPrice ?? pricing.nin.unitPrice,
      agentPrice: req.body.agentPrice ?? pricing.nin.agentPrice,
      mode: req.body.mode ?? pricing.nin.mode,
    });

    if (req.body.validation) Object.assign(pricing.ninServices.validation, req.body.validation);
    if (req.body.ipe) Object.assign(pricing.ninServices.ipe, req.body.ipe);
    if (req.body.modification) Object.assign(pricing.ninServices.modification, req.body.modification);
    if (req.body.slipPrice !== undefined) pricing.ninServices.slipPrice = req.body.slipPrice;

    await pricing.save();
    res.json({ message: "Pricing updated", pricing });
  } catch (err) {
    console.error("PRICING ERROR:", err);
    res.status(500).json({ message: "Failed to update pricing" });
  }
});

module.exports = router;