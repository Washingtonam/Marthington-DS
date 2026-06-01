const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const User = require("../models/User.model");
const Transaction = require("../models/transaction.model");
const AuditLog = require("../models/AuditLog.model");
const Pricing = require("../models/Pricing.model");
const { verifyToken, isAdmin } = require("../shared/authGuard");

// =========================================================================
// 🧠 SAFE SCHEMA COMPILATION & MODEL RESOLUTION
// =========================================================================
// Structural safety wrappers prevent application startup loops and schema structural rejections.
let ServiceRequest;
try {
  ServiceRequest = mongoose.model("ServiceRequest");
} catch {
  const dynamicSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
  ServiceRequest = mongoose.model("ServiceRequest", dynamicSchema);
}

let CACRequest;
try {
  CACRequest = mongoose.model("CacRequest");
} catch {
  const dynamicCacSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
  CACRequest = mongoose.model("CacRequest", dynamicCacSchema);
}

const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Access denied: Super admin token signature required" });
  }
  next();
};

// =========================================================================
// 🚀 ADMINISTRATIVE OPERATION ENDPOINTS
// =========================================================================

// 📥 FIXES 404 CONSOLE ERROR: UNIFIED CENTRAL PIPELINE FOR REQUEST ENTITIES
// Handles pagination, matching statuses (pending, approved, completed), and coordinates cross-model streams.
router.get("/requests", isAdmin, async (req, res) => {
  try {
    let { page = 1, limit = 20, status } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));

    // Construct precise cross-model filter queries
    const filterQuery = {};
    if (status) {
      filterQuery.status = String(status).toLowerCase();
    }

    // Execute safe structural operations concurrently
    const [nimcRequests, cacRequests] = await Promise.all([
      ServiceRequest.find(filterQuery)
        .populate("userId", "email firstName lastName phoneNumber")
        .lean(),
      CACRequest.find(filterQuery)
        .populate("userId", "email firstName lastName phoneNumber")
        .lean()
    ]);

    // Format fields seamlessly into a unified pipeline stream
    const normalizedNimc = nimcRequests.map(r => ({ ...r, pipelineSource: "nimc" }));
    const normalizedCac = cacRequests.map(r => ({ ...r, pipelineSource: "cac" }));

    // Merge operations chronologically (Newest items floating to top)
    const combinedCollection = [...normalizedNimc, ...normalizedCac].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    // Compute localized system pagination profiles 
    const totalRecords = combinedCollection.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const startIndex = (page - 1) * limit;
    const paginatedSlice = combinedCollection.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: paginatedSlice,
      pagination: {
        total: totalRecords,
        page,
        pages: totalPages,
        limit
      }
    });
  } catch (error) {
    console.error("🔥 CENTRAL PIPELINE REQUEST STREAM ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to assemble systemic registration requests pipeline." });
  }
});

// 🚀 FAST DASHBOARD PERFORMANCE STATS
router.get("/stats", isAdmin, async (req, res) => {
  try {
    const [totalUsers, totalTransactions, pendingPayments, balanceData] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      Transaction.countDocuments({ type: "UNIT_ADD", status: "pending" }),
      User.aggregate([
        { $group: { _id: null, total: { $sum: { $ifNull: ["$balance", 0] } } } }
      ])
    ]);

    res.json({
      success: true,
      totalUsers,
      totalTransactions,
      pendingPayments,
      totalBalance: balanceData[0]?.total || 0
    });
  } catch (err) {
    console.error("STATS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to compile aggregate system dashboard stats" });
  }
});

// 📥 NIMC PIPELINE ROUTE
router.get("/nimc-requests", isAdmin, async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate("userId", "email firstName lastName phoneNumber")
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("🔥 ADMIN NIMC REQUESTS api ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to api NIMC pipeline requests" });
  }
});

// 🏢 CAC PIPELINE ROUTE
router.get("/cac-requests", isAdmin, async (req, res) => {
  try {
    const requests = await CACRequest.find()
      .populate("userId", "email firstName lastName phoneNumber")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("🔥 ADMIN CAC REQUESTS api ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to api CAC business registry requests" });
  }
});

// � COMMAND-GATEWAY: UNIFIED REQUEST STATUS MANAGEMENT
router.post("/requests/:id/status", isAdmin, async (req, res) => {
  const { id } = req.params;
  const { action, comment } = req.body;
  const adminEmail = req.user.email;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format." });
    }

    const normalizedAction = String(action || "").toLowerCase();
    const allowedActions = ["approve", "reject", "flag"];
    if (!allowedActions.includes(normalizedAction)) {
      return res.status(400).json({ success: false, message: "Invalid action. Allowed values are approve, reject, flag." });
    }

    const [serviceRecord, cacRecord] = await Promise.all([
      ServiceRequest.findById(id),
      CACRequest.findById(id)
    ]);

    const record = serviceRecord || cacRecord;
    if (!record) {
      return res.status(404).json({ success: false, message: "Request ID not found in any registered collection." });
    }

    const statusMap = {
      approve: "approved",
      reject: "rejected",
      flag: "flagged"
    };
    const newStatus = statusMap[normalizedAction];

    record.status = newStatus;
    if (!Array.isArray(record.statusHistory)) {
      record.statusHistory = [];
    }
    record.statusHistory.push({
      status: newStatus,
      note: comment || `${adminEmail} set request status to ${newStatus}`,
      createdAt: new Date()
    });

    record.markModified("status");
    record.markModified("statusHistory");
    await record.save();

    try {
      await AuditLog.create({
        action: `REQUEST_${newStatus.toUpperCase()}`,
        performedBy: adminEmail,
        userId: record.userId || null,
        amount: record.amount || 0,
        note: `Action ${normalizedAction} performed on request ${id}. Comment: ${comment || "None"}`
      });
    } catch (auditErr) {
      console.warn("Audit log skipped during status update:", auditErr.message);
    }

    return res.json({
      success: true,
      message: `Request successfully marked as ${newStatus}`,
      data: record
    });
  } catch (err) {
    console.error("🔥 REQUEST STATUS COMMAND ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to update request status." });
  }
});

// �🔄 UNIFIED OPERATIONS LIFECYCLE CONTROLLER
router.put("/update-status/:targetModule/:id", isAdmin, async (req, res) => {
  const { targetModule, id } = req.params;
  const { status, note } = req.body; 
  const adminEmail = req.user.email;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid system document identification signature format." });
    }

    const normalizedModule = String(targetModule).toLowerCase();
    if (!["cac", "nimc", "service"].includes(normalizedModule)) {
      return res.status(400).json({ success: false, message: "Invalid pipeline module tracking assignment type profile." });
    }

    const TargetModel = normalizedModule === "cac" ? CACRequest : ServiceRequest;
    const normalizedStatus = String(status).toLowerCase();

    const record = await TargetModel.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Requested application profile reference context not found." });
    }

    // Safely configure structural historical arrays using atomic paths to avoid Mongoose validation rejections
    record.status = normalizedStatus;
    
    if (!record.statusHistory || !Array.isArray(record.statusHistory)) {
      record.statusHistory = [];
    }

    record.statusHistory.push({
      status: normalizedStatus,
      note: note || `Application transition to ${normalizedStatus} authorized by ${adminEmail}`,
      createdAt: new Date()
    });

    // Enforce modification flags for raw schemaless properties
    record.markModified("status");
    record.markModified("statusHistory");

    await record.save();

    // Secondary logging processing via sandboxed internal try-catch mechanics
    try {
      await AuditLog.create({
        action: `UPDATE_${normalizedModule.toUpperCase()}_STATUS`,
        performedBy: adminEmail,
        userId: record.userId || null,
        amount: record.amount || 0,
        note: `Record ${id} shifted to ${normalizedStatus}. Comment: ${note || 'None'}`
      });
    } catch (logErr) {
      console.warn("Audit log background compilation bypassed cleanly:", logErr.message);
    }

    res.json({ success: true, message: `Pipeline document successfully marked as ${normalizedStatus}`, data: record });
  } catch (err) {
    console.error("🔥 UNIFIED STATUS TRANSITION ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to transform application pipeline lifecycle state environment variables." });
  }
});

// -------------------------------------------------------------------------
// Backwards-compatible endpoints for older frontend paths
//  - PUT /api/admin/status/:id           (used by some frontend builds)
//  - PUT /api/update-status/:id          (older legacy path without module)
// These will accept an optional `targetModule` in the body or query and
// delegate to the unified handler logic above.
// -------------------------------------------------------------------------
router.put("/status/:id", isAdmin, async (req, res) => {
  const id = req.params.id;
  const { status, note } = req.body;
  const adminEmail = req.user.email;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid system document identification signature format." });
    }

    const [cacRecord, serviceRecord] = await Promise.all([
      CACRequest.findById(id),
      ServiceRequest.findById(id)
    ]);

    const record = cacRecord || serviceRecord;
    if (!record) {
      return res.status(404).json({ success: false, message: "Requested application profile reference context not found." });
    }

    const normalizedModule = cacRecord ? 'cac' : 'nimc';
    const normalizedStatus = String(status).toLowerCase();

    record.status = normalizedStatus;
    if (!record.statusHistory || !Array.isArray(record.statusHistory)) record.statusHistory = [];
    record.statusHistory.push({ status: normalizedStatus, note: note || `Application transition to ${normalizedStatus} authorized by ${adminEmail}`, createdAt: new Date() });
    record.markModified("status");
    record.markModified("statusHistory");
    await record.save();

    try {
      await AuditLog.create({
        action: `UPDATE_${normalizedModule.toUpperCase()}_STATUS`,
        performedBy: adminEmail,
        userId: record.userId || null,
        amount: record.amount || 0,
        note: `Record ${id} shifted to ${normalizedStatus}. Comment: ${note || 'None'}`
      });
    } catch (logErr) {
      console.warn("Audit log background compilation bypassed cleanly:", logErr.message);
    }

    return res.json({ success: true, message: `Pipeline document successfully marked as ${normalizedStatus}`, data: record });
  } catch (err) {
    console.error("🔥 BACKWARD STATUS UPDATE ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to update status via compatibility endpoint." });
  }
});

async function updateRequestStatus({
  targetModule,
  id,
  status,
  note,
  adminEmail
}) {
  const TargetModel =
    targetModule === "cac" ? CACRequest : ServiceRequest;

  const record = await TargetModel.findById(id);

  if (!record) {
    throw new Error("Record not found");
  }

  record.status = status;

  if (!Array.isArray(record.statusHistory)) {
    record.statusHistory = [];
  }

  record.statusHistory.push({
    status,
    note,
    createdAt: new Date()
  });

  await record.save();

  return record;
}

// ✅ UNIVERSAL ADMIN REQUEST APPROVAL ENDPOINT
router.put("/approve-request/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const note = req.body.note || `Approved by ${req.user.email}`;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format." });
    }

    const [serviceRecord, cacRecord] = await Promise.all([
      ServiceRequest.findById(id),
      CACRequest.findById(id)
    ]);

    const record = serviceRecord || cacRecord;
    if (!record) {
      return res.status(404).json({ success: false, message: "Request ID not found in any registered collection." });
    }

    record.status = 'approved';
    if (!record.statusHistory || !Array.isArray(record.statusHistory)) {
      record.statusHistory = [];
    }
    record.statusHistory.push({ status: 'approved', note, createdAt: new Date() });
    record.markModified('status');
    record.markModified('statusHistory');
    await record.save();

    try {
      await AuditLog.create({
        action: 'APPROVE_REQUEST',
        performedBy: req.user.email,
        userId: record.userId || null,
        amount: record.amount || 0,
        note: `Request ${id} approved. ${note}`
      });
    } catch (auditErr) {
      console.warn('Audit log skipped during approval:', auditErr.message);
    }

    return res.json({ success: true, message: 'Request approved successfully.', data: record });
  } catch (error) {
    console.error('🔥 UNIFIED APPROVAL ROUTE ERROR:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve request.' });
  }
});

// 📥 PAYMENTS VERIFICATION SUB-SYSTEM
router.get("/payments", isAdmin, async (req, res) => {
  try {
    const payments = await Transaction.find({ type: "UNIT_ADD" })
      .populate("userId", "email units")
      .sort({ createdAt: -1 })
      .lean();

    res.json(payments);
  } catch (error) {
    console.error("🔥 api PAYMENTS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to api ledger credit payment entries" });
  }
});

// ✅ APPROVE LEDGER WALLET FUNDING CONTEXT
router.post("/payments/:id/approve", isAdmin, async (req, res) => {
  try {
    const adminEmail = req.user.email;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Malformed Transaction Reference ID token identifier" });
    }

    const payment = await Transaction.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment authorization intent profile not found" });

    if (payment.status !== "pending") {
      return res.status(400).json({ message: `Cannot authorize historical transaction mapped as: ${payment.status}` });
    }

    const user = await User.findById(payment.userId);
    if (!user) return res.status(404).json({ message: "Target workspace wallet account structure absent" });

    const pricing = await Pricing.findOne().lean();
    const pricePerUnit = pricing?.nin?.unitPrice || 250;

    let unitsToAdd = payment.units;
    if (!unitsToAdd || unitsToAdd < 1) {
      unitsToAdd = Math.floor(payment.amount / pricePerUnit);
    }

    if (unitsToAdd < 1) {
      return res.status(400).json({ message: "Inbound capital allocation insufficient to generate minimal unit allocation thresholds" });
    }

    const beforeUnits = user.units || 0;

    user.units = (user.units || 0) + unitsToAdd;
    await user.save();

    payment.status = "approved";
    payment.units = unitsToAdd;
    await payment.save();

    try {
      await AuditLog.create({
        action: "APPROVE_PAYMENT",
        performedBy: adminEmail,
        userId: user._id,
        amount: payment.amount,
        unitsAdded: unitsToAdd,
        unitsBefore: beforeUnits,
        unitsAfter: user.units,
      });
    } catch (aud) {
      console.warn("Telemetry entry dropped during core transaction settlement execution:", aud.message);
    }

    res.json({
      message: `Systemic balance settlement finalized. ${unitsToAdd} resource units dispatched seamlessly.`,
      units: user.units,
    });
  } catch (error) {
    console.error("🔥 CLEARING SETTLEMENT ALLOCATION ERROR:", error);
    res.status(500).json({ message: "Ledger transaction structural approval runtime crash", error: error.message });
  }
});

// ❌ REJECT PAYMENT SEGMENT
router.post("/payments/:id/reject", isAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Malformed pipeline unique transaction object footprint token signature" });
    }

    const payment = await Transaction.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Credit application target request profile context not found." });

    if (payment.status !== "pending") {
      return res.status(400).json({ message: `Cannot invalidate transaction currently processing state contexts labeled: ${payment.status}` });
    }

    payment.status = "rejected";
    await payment.save();

    res.json({ message: "Inbound resource verification request record canceled successfully." });
  } catch (error) {
    console.error("🔥 REJECT ROUTE RUNTIME CRASH:", error);
    res.status(500).json({ message: "Transaction registry rejection failure status loop triggered" });
  }
});

// 👥 PAGINATED USERS REGISTRY DIRECTORY
router.get("/users", isAdmin, async (req, res) => {
  try {
    let { page = 1, limit = 20, search = "" } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));

    const query = search
      ? {
          $or: [
            { email: { $regex: String(search), $options: "i" } },
            { firstName: { $regex: String(search), $options: "i" } },
            { lastName: { $regex: String(search), $options: "i" } }
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
    res.status(500).json({ message: "Error mapping client network infrastructure logs." });
  }
});

// 📊 TRANSACTIONS LOG PIPELINE (PAGINATED)
router.get("/transactions", isAdmin, async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));

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
    res.status(500).json({ message: "Error compiling enterprise transaction audit records" });
  }
});

// 📜 SYSTEM AUDIT LOG REPOSITORY TRAIL
router.get("/audit-logs", isAdmin, async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));

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
    res.status(500).json({ message: "Failed to pull infrastructure operational audit files" });
  }
});

// =========================================================================
// 🔥 ACCESS CONTROL CONTEXT MUTATORS (SUPER_ADMIN CONTROL LAYER)
// =========================================================================
router.put("/user/:id/make-admin", isAdmin, isSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User workspace identity profile not found" });
    if (user.role === "super_admin") return res.status(400).json({ message: "Operation blocked: Immutable deployment target role signature" });

    user.role = "admin";
    await user.save();
    res.json({ message: "Account mapping level successfully elevated to system administrator role configuration.", user });
  } catch (err) {
    console.error("MAKE ADMIN ERROR:", err);
    res.status(500).json({ message: "Failed to elevate target workspace scope privileges" });
  }
});

router.put("/user/:id/remove-admin", isAdmin, isSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User account node entity trace broken" });
    if (user.role === "super_admin") return res.status(400).json({ message: "Operation rejected: Target security token instance immutable" });

    user.role = "user";
    await user.save();
    res.json({ message: "Administrative privilege matrix flags de-allocated successfully.", user });
  } catch (err) {
    console.error("REMOVE ADMIN ERROR:", err);
    res.status(500).json({ message: "Failed to downgrade targeted context node permissions" });
  }
});

router.put("/user/:id/suspend", isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User matching identifier signature not located" });
    if (user.role === "super_admin") return res.status(400).json({ message: "Security rule exception: Base root admin node suspension blocked" });

    user.status = "suspended";
    await user.save();
    res.json({ message: "Target account execution capability frozen successfully" });
  } catch (err) {
    console.error("SUSPEND ERROR:", err);
    res.status(500).json({ message: "System failure during active worker thread isolation setup execution" });
  }
});

router.put("/user/:id/activate", isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Requested operational user workspace matrix lost" });
    
    user.status = "active";
    await user.save();
    res.json({ message: "User communication channel metrics authorized and restored to active state successfully." });
  } catch (err) {
    console.error("ACTIVATE ERROR:", err);
    res.status(500).json({ message: "Failed to dispatch restoration trigger state context updates" });
  }
});

router.delete("/user/:id", isAdmin, isSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User structural directory reference null" });
    if (user.role === "super_admin") return res.status(400).json({ message: "System security protection: Core identity instance extraction forbidden" });

    await User.findByIdAndDelete(req.params.id);
    await Transaction.deleteMany({ userId: req.params.id });
    res.json({ message: "Identity credentials mapping records permanently expunged from system nodes successfully." });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to complete account lifecycle destruction script routines" });
  }
});

router.post("/user/:id/units", isAdmin, async (req, res) => {
  try {
    const { units, action } = req.body;
    const targetUnits = parseInt(units);
    if (isNaN(targetUnits) || targetUnits <= 0) {
      return res.status(400).json({ message: "Allocation value metrics must represent clean positive integers" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Target token node container context not identified" });

    if (action === "add") {
      user.units = (user.units || 0) + targetUnits;
    } else if (action === "deduct") {
      if ((user.units || 0) < targetUnits) return res.status(400).json({ message: "Account balance lacks sufficient capital depth to process deduction" });
      user.units = (user.units || 0) - targetUnits;
    } else {
      return res.status(400).json({ message: "Invalid transaction state instruction argument value." });
    }

    await user.save();
    res.json({ message: "Account system token properties re-indexed cleanly.", units: user.units });
  } catch (err) {
    console.error("UNITS ERROR:", err);
    res.status(500).json({ message: "Error mutating targeted allocation balance value arrays" });
  }
});

// =========================================================================
// 💰 UNIFIED CORE PRICING MATRIX CONFIGURATION MANAGEMENT
// =========================================================================
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
    res.status(500).json({ message: "Failed to update pricing engine registry thresholds" });
  }
});

module.exports = router;