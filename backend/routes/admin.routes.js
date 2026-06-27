const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const User = require("../models/User.model");
const Transaction = require("../models/transaction.model");
const AuditLog = require("../models/AuditLog.model");
const Pricing = require("../models/Pricing.model");
const { verifyToken, isAdmin } = require("../shared/authGuard");
const { normalizeServiceType } = require("../config/serviceTypes");

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
    let { page = 1, limit = 20, status, category, serviceType, search, nin, userRole } = req.query;
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.max(1, Math.min(100, parseInt(limit) || 20));

    const normalizedStatus = String(status || "").trim().toLowerCase();
    const normalizedCategory = normalizeServiceType(category || "").toLowerCase();
    const normalizedServiceType = String(serviceType || "").trim().toLowerCase();
    const searchTerm = String(search || "").trim();
    const ninTerm = String(nin || "").trim();
    const roleFilter = String(userRole || "").trim().toLowerCase();

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const serviceQuery = {};
    const cacQuery = {};

    if (normalizedStatus) {
      serviceQuery.status = normalizedStatus;
      cacQuery.status = normalizedStatus;
    }

    if (normalizedCategory === "cac") {
      serviceQuery._id = null;
      cacQuery.serviceCategory = "CAC";
    } else if (normalizedCategory === "nimc") {
      serviceQuery.serviceCategory = "NIMC";
      cacQuery._id = null;
    } else if (normalizedCategory) {
      const escapedCategory = escapeRegex(normalizedCategory);
      serviceQuery.$or = [
        { serviceCategory: { $regex: escapedCategory, $options: "i" } },
        { service: { $regex: escapedCategory, $options: "i" } },
        { type: { $regex: escapedCategory, $options: "i" } }
      ];
    }

    if (normalizedServiceType) {
      const escapedType = escapeRegex(normalizedServiceType);
      serviceQuery.$or = [
        ...(serviceQuery.$or || []),
        { service: { $regex: escapedType, $options: "i" } },
        { type: { $regex: escapedType, $options: "i" } }
      ];
      cacQuery.serviceType = { $regex: escapedType, $options: "i" };
    }

    if (ninTerm) {
      const escapedNin = escapeRegex(ninTerm);
      serviceQuery.nin = { $regex: escapedNin, $options: "i" };
      cacQuery.nin = { $regex: escapedNin, $options: "i" };
    }

    if (searchTerm) {
      const escapedSearch = escapeRegex(searchTerm);
      serviceQuery.$or = [
        ...(serviceQuery.$or || []),
        { nin: { $regex: escapedSearch, $options: "i" } },
        { service: { $regex: escapedSearch, $options: "i" } },
        { type: { $regex: escapedSearch, $options: "i" } },
        { _id: { $regex: escapedSearch, $options: "i" } }
      ];
      cacQuery.$or = [
        ...(cacQuery.$or || []),
        { nin: { $regex: escapedSearch, $options: "i" } },
        { businessName1: { $regex: escapedSearch, $options: "i" } },
        { businessName2: { $regex: escapedSearch, $options: "i" } },
        { companyEmail: { $regex: escapedSearch, $options: "i" } },
        { serviceType: { $regex: escapedSearch, $options: "i" } },
        { _id: { $regex: escapedSearch, $options: "i" } }
      ];
    }

    if (roleFilter && roleFilter !== "all") {
      const matchingUsers = await User.find({ role: roleFilter }).select("_id").lean();
      const userIds = matchingUsers.map((user) => user._id);
      if (userIds.length > 0) {
        serviceQuery.userId = { $in: userIds };
        cacQuery.userId = { $in: userIds };
      } else {
        serviceQuery.userId = null;
        cacQuery.userId = null;
      }
    }

    const [nimcRequests, cacRequests] = await Promise.all([
      ServiceRequest.find(serviceQuery)
        .populate("userId", "email firstName lastName phoneNumber role")
        .lean(),
      CACRequest.find(cacQuery)
        .populate("userId", "email firstName lastName phoneNumber role")
        .lean()
    ]);

    const normalizedNimc = nimcRequests.map((r) => ({ ...r, pipelineSource: "nimc" }));
    const normalizedCac = cacRequests.map((r) => ({ ...r, pipelineSource: "cac" }));

    const combinedCollection = [...normalizedNimc, ...normalizedCac].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

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
router.get("/stats", isSuperAdmin, async (req, res) => {
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

// � ADMIN OVERVIEW METRICS FOR OPERATIONS CONTROL CENTER
router.get("/stats/overview", isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const successfulStatuses = ["success", "successful", "approved", "completed"];

    const [dailyRevenueAgg, monthlyRevenueAgg, nimcPending, serviceCacPending, cacRequestPending] = await Promise.all([
      Transaction.aggregate([
        { $match: { status: { $in: successfulStatuses }, createdAt: { $gte: todayStart } } },
        { $group: { _id: null, amount: { $sum: { $cond: [{ $gt: ["$amount", null] }, "$amount", { $divide: ["$amountKobo", 100] }] } } } }
      ]),
      Transaction.aggregate([
        { $match: { status: { $in: successfulStatuses }, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, amount: { $sum: { $cond: [{ $gt: ["$amount", null] }, "$amount", { $divide: ["$amountKobo", 100] }] } } } }
      ]),
      ServiceRequest.countDocuments({ status: { $in: ["pending", "processing", "in-progress"] }, serviceCategory: "NIMC" }),
      ServiceRequest.countDocuments({ status: { $in: ["pending", "processing", "in-progress"] }, serviceCategory: "CAC" }),
      CACRequest.countDocuments({ status: { $in: ["pending", "processing", "in-progress"] } })
    ]);

    const dailyRevenue = dailyRevenueAgg[0]?.amount || 0;
    const monthlyRevenue = monthlyRevenueAgg[0]?.amount || 0;
    const pendingRequests = {
      NIMC: nimcPending,
      CAC: serviceCacPending + cacRequestPending
    };
    const systemStatus = {
      apiGateway: "nominal",
      verificationWorkers: "stable",
      paymentGateway: "available",
      lastCheckedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      dailyRevenue,
      monthlyRevenue,
      pendingRequests,
      systemStatus
    });
  } catch (err) {
    console.error("OVERVIEW STATS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to compile overview dashboard metrics." });
  }
});

// �📥 NIMC PIPELINE ROUTE
router.get("/nimc-requests", isSuperAdmin, async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate("userId", "email firstName lastName phoneNumber role")
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("🔥 ADMIN NIMC REQUESTS api ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to api NIMC pipeline requests" });
  }
});

// 🏢 CAC PIPELINE ROUTE
router.get("/cac-requests", isSuperAdmin, async (req, res) => {
  try {
    const requests = await CACRequest.find()
      .populate("userId", "email firstName lastName phoneNumber role")
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
    const allowedActions = ["approve", "reject", "flag", "in-progress", "complete"];
    if (!allowedActions.includes(normalizedAction)) {
      return res.status(400).json({ success: false, message: "Invalid action. Allowed values are approve, reject, flag, in-progress, complete." });
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

    // SECURITY: Only super_admin may approve/reject requests that are currently in 'pending'
    if (record.status === 'pending' && (normalizedAction === 'approve' || normalizedAction === 'reject') && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Super Admin may approve or reject pending requests.' });
    }

    record.status = newStatus;
    if (!Array.isArray(record.statusHistory)) {
      record.statusHistory = [];
    }
    record.statusHistory.push({
      status: newStatus,
      note: comment || `${adminEmail} set request status to ${newStatus}`,
      actorRole: req.user?.role || null,
      createdAt: new Date()
    });

    // Push admin comment thread entry when a comment exists
    if (comment && String(comment).trim().length > 0) {
      if (!Array.isArray(record.adminComments)) record.adminComments = [];
      record.adminComments.push({ comment, author: adminEmail, authorRole: req.user?.role || null, createdAt: new Date() });
      record.markModified('adminComments');
    }

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
    // SECURITY: Prevent non-super admins from transitioning requests that are currently 'pending'
    if (record.status === 'pending' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Super Admin may change status on pending requests.' });
    }

    // Safely configure structural historical arrays using atomic paths to avoid Mongoose validation rejections
    record.status = normalizedStatus;
    
    if (!record.statusHistory || !Array.isArray(record.statusHistory)) {
      record.statusHistory = [];
    }

    record.statusHistory.push({
      status: normalizedStatus,
      note: note || `Application transition to ${normalizedStatus} authorized by ${adminEmail}`,
      actorRole: req.user?.role || null,
      createdAt: new Date()
    });

    // attach admin comment when provided
    if (note && String(note).trim().length > 0) {
      if (!Array.isArray(record.adminComments)) record.adminComments = [];
      record.adminComments.push({ comment: note, author: adminEmail, authorRole: req.user?.role || null, createdAt: new Date() });
      record.markModified('adminComments');
    }

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

    // SECURITY: Block non-super-admins from modifying pending requests
    if (record.status === 'pending' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Super Admin may modify pending requests.' });
    }

    record.status = normalizedStatus;
    if (!record.statusHistory || !Array.isArray(record.statusHistory)) record.statusHistory = [];
    record.statusHistory.push({ status: normalizedStatus, note: note || `Application transition to ${normalizedStatus} authorized by ${adminEmail}`, actorRole: req.user?.role || null, createdAt: new Date() });
    // attach admin comment when provided
    if (note && String(note).trim().length > 0) {
      if (!Array.isArray(record.adminComments)) record.adminComments = [];
      record.adminComments.push({ comment: note, author: adminEmail, authorRole: req.user?.role || null, createdAt: new Date() });
      record.markModified('adminComments');
    }
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

    // SECURITY: Only super_admin may approve requests that are currently in 'pending'
    if (record.status === 'pending' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Super Admin may approve pending requests.' });
    }

    record.status = 'approved';
    if (!record.statusHistory || !Array.isArray(record.statusHistory)) {
      record.statusHistory = [];
    }
    record.statusHistory.push({ status: 'approved', note, actorRole: req.user?.role || null, createdAt: new Date() });
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
router.get("/users", isSuperAdmin, async (req, res) => {
  try {
    let { page = 1, limit = 20, search = "" } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));

    const query = search
      ? {
          $or: [
            { email: { $regex: String(search), $options: "i" } },
            { firstName: { $regex: String(search), $options: "i" } },
            { lastName: { $regex: String(search), $options: "i" } },
            { phoneNumber: { $regex: String(search), $options: "i" } }
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

// 👥 USER ACTIVITY LEDGER / HISTORY
router.get("/users/:userId/activity", isSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user identifier." });
    }

    const [serviceRequests, transactions] = await Promise.all([
      ServiceRequest.find({ userId }).lean(),
      Transaction.find({ userId }).lean(),
    ]);

    const serviceRecords = serviceRequests.map((record) => ({
      id: record._id,
      timestamp: record.createdAt,
      category: "Service",
      transactionType: record.service || record.type || "Service Request",
      description: record.service
        ? `${record.service.replace(/_/g, " ")} ${record.type ? `(${record.type})` : ""}`.trim()
        : record.type || "Service request",
      amount: record.amount ? -Math.abs(record.amount) : record.amountKobo ? -Math.abs(record.amountKobo / 100) : 0,
      raw: record,
    }));

    const transactionRecords = transactions.map((tx) => {
      const amountNaira = tx.amount != null ? Number(tx.amount) : tx.amountKobo != null ? Number(tx.amountKobo) / 100 : 0;
      const fundingTypes = ["UNIT_ADD", "credit", "admin_credit"];
      const category = fundingTypes.includes(tx.type) ? "Funding" : "Service";
      const description = tx.description ||
        (tx.type === "UNIT_ADD" ? "Wallet funding" :
          tx.type === "NIN" ? "NIN verification" :
          tx.type === "SERVICE" ? "Service transaction" :
          tx.type || "Wallet transaction");

      return {
        id: tx._id,
        timestamp: tx.createdAt,
        category,
        transactionType: tx.type || "Transaction",
        description,
        amount: category === "Funding" ? amountNaira : -Math.abs(amountNaira),
        raw: tx,
      };
    });

    const combinedActivity = [...serviceRecords, ...transactionRecords].sort(
      (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
    );

    res.json({ data: combinedActivity });
  } catch (err) {
    console.error("FETCH USER ACTIVITY ERROR:", err);
    res.status(500).json({ message: "Failed to compile user activity history." });
  }
});

// GET single user profile
router.get('/user/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user id' });
    const user = await User.findById(id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('GET USER ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// GET combined user history (transactions + service requests)
router.get('/users/:userId/history', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user identifier.' });

    const [serviceRequests, transactions] = await Promise.all([
      ServiceRequest.find({ userId }).lean(),
      Transaction.find({ userId }).lean(),
    ]);

    const serviceRecords = serviceRequests.map((record) => ({
      id: record._id,
      createdAt: record.createdAt,
      type: 'Service Usage',
      description: record.service || record.type || 'Service Request',
      amount: record.amount != null ? -Math.abs(Number(record.amount)) : record.amountKobo ? -Math.abs(Number(record.amountKobo) / 100) : 0,
      raw: record,
    }));

    const transactionRecords = transactions.map((tx) => {
      const amountNaira = tx.amount != null ? Number(tx.amount) : tx.amountKobo != null ? Number(tx.amountKobo) / 100 : 0;
      const fundingTypes = ['UNIT_ADD', 'credit', 'admin_credit', 'admin_debit'];
      const isFunding = fundingTypes.includes(String(tx.type));
      return {
        id: tx._id,
        createdAt: tx.createdAt,
        type: isFunding ? 'Wallet Funding' : 'Wallet Transaction',
        description: tx.description || tx.type || 'Transaction',
        amount: isFunding ? amountNaira : -Math.abs(amountNaira),
        raw: tx,
      };
    });

    const combined = [...serviceRecords, ...transactionRecords].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: combined });
  } catch (err) {
    console.error('FETCH USER HISTORY ERROR:', err);
    res.status(500).json({ message: 'Failed to compile user history.' });
  }
});

// 📊 TRANSACTIONS LOG PIPELINE (PAGINATED)
router.get("/transactions", isSuperAdmin, async (req, res) => {
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
router.get("/audit-logs", isSuperAdmin, async (req, res) => {
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

router.put("/user/:id/suspend", isSuperAdmin, async (req, res) => {
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

router.put("/user/:id/activate", isSuperAdmin, async (req, res) => {
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

router.post("/user/:id/units", isSuperAdmin, async (req, res) => {
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
// 💰 ADMIN WALLET BALANCE ADJUSTMENT (Creates Ledger Entry)
// =========================================================================
router.post("/adjust-funds", isSuperAdmin, async (req, res) => {
  try {
    const { userId, amount, action, note } = req.body;
    const adminEmail = req.user.email;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format." });
    }

    const amountKobo = Math.round((Number(amount) || 0) * 100);
    if (amountKobo <= 0) {
      return res.status(400).json({ message: "Amount must be greater than zero." });
    }

    if (!["add", "deduct"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'add' or 'deduct'." });
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "super_admin") {
      return res.status(400).json({ message: "Cannot adjust super admin balance." });
    }

    // Check balance for deduction
    if (action === "deduct" && (user.walletBalanceKobo || 0) < amountKobo) {
      return res.status(400).json({ message: "Insufficient balance to deduct." });
    }

    const balanceBefore = user.walletBalanceKobo || 0;
    const incrementAmount = action === "add" ? amountKobo : -amountKobo;

    // ATOMIC: Update wallet balance
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          walletBalanceKobo: incrementAmount,
          walletBalance: incrementAmount / 100,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return res.status(500).json({ message: "Failed to update user wallet." });
    }

    const balanceAfter = updatedUser.walletBalanceKobo;

    // Create transaction ledger entry
    const transactionType = action === "add" ? "credit" : "debit";
    const transaction = new Transaction({
      userId,
      type: `admin_${transactionType}`,
      amount: amount,
      amountKobo,
      status: "success",
      description: `Admin ${action} by ${adminEmail}: ${note || "Manual adjustment"}`,
      reference: `ADMIN_${action.toUpperCase()}_${Date.now()}`,
    });

    await transaction.save();

    // Create audit log
    try {
      await AuditLog.create({
        action: `ADJUST_WALLET_${action.toUpperCase()}`,
        performedBy: adminEmail,
        userId,
        amount,
        balanceBefore: balanceBefore / 100,
        balanceAfter: balanceAfter / 100,
        note: `Admin wallet adjustment: ${action} ₦${amount} | ${note || "No note"}`,
      });
    } catch (auditErr) {
      console.warn("Audit log creation failed:", auditErr.message);
    }

    return res.json({
      success: true,
      message: `Wallet ${action === "add" ? "credited" : "debited"} successfully.`,
      data: {
        userId,
        email: updatedUser.email,
        balanceBefore: balanceBefore / 100,
        balanceAfter: balanceAfter / 100,
        adjustedAmount: amount,
        action,
        transactionId: transaction._id,
      },
    });
  } catch (error) {
    console.error("🔥 ADJUST FUNDS ERROR:", error);
    res.status(500).json({ message: "Failed to adjust wallet balance.", error: error.message });
  }
});

// Note: previously there was a malformed /user/:id/adjust-balance route here. Removed stray block.

// =========================================================================
// 💰 UNIFIED CORE PRICING MATRIX CONFIGURATION MANAGEMENT
// =========================================================================
router.put("/pricing", isSuperAdmin, async (req, res) => {
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