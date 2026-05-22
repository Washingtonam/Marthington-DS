const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const ServiceRequest = require("../models/ServiceRequest");
const Pricing = require("../models/Pricing");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// ✅ GOOGLE SHEETS & CLOUDINARY UTILS
const { addToSheets } = require("../utils/googleSheets");
const { uploadToCloudinary } = require("../utils/cloudinary");

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
    console.error("AUTH MIDDLEWARE ERROR:", err);
    res.status(500).json({ message: "Auth failed" });
  }
};

// ==============================
// 📤 CREATE SERVICE REQUEST (NIN, SELF-SERVICE & CAC UNIFIED)
// ==============================
router.post("/nin-services/request", async (req, res) => {
  try {
    const {
      userId,
      service, 
      type,    
      nin,
      slipType,
      proof,
      passport,
      formData
    } = req.body;

    const userEmail = req.headers["email"] || req.body.email || formData?.email || "anonymous@xcombinator.com";

    if (!service || !type) {
      return res.status(400).json({ message: "Missing required core parameters: service or type" });
    }

    // 🛡️ REFIXED VALIDATION LAYER: Safe verification check for ObjectIds
    let resolvedUserId = userId;
    
    // Check if the incoming ID is empty, undefined as a string, or structurally invalid
    if (!resolvedUserId || resolvedUserId === "undefined" || !mongoose.Types.ObjectId.isValid(resolvedUserId)) {
      // Create a dedicated system tracking ID for unauthenticated self-service actions
      resolvedUserId = new mongoose.Types.ObjectId(); 
    }

    if (service !== "self-service" && service !== "selfService" && !proof) {
      return res.status(400).json({ message: "Missing required payment proof parameter for this service context" });
    }

    const pricing = await Pricing.findOne() || new Pricing({});
    let basePrice = undefined;

    if (service === "validation") {
      basePrice = pricing.ninServices?.validation?.[type];
    } else if (service === "ipe") {
      basePrice = pricing.ninServices?.ipe?.[type];
    } else if (service === "modification") {
      basePrice = pricing.ninServices?.modification?.[type];
    } else if (service === "cac") {
      basePrice = pricing.cacServices?.[type];
    } else if (service === "self-service" || service === "selfService") {
      const selfServiceConfig = pricing.ninServices?.selfService || pricing.ninServices?.["self-service"];
      
      if (type === "emailRetrieval") {
        basePrice = selfServiceConfig?.emailRetrieval ?? 1500;
      } else if (type === "deviceUnlink") {
        basePrice = selfServiceConfig?.deviceUnlink ?? 2000;
      } else {
        basePrice = selfServiceConfig?.[type] ?? 1500;
      }
    }

    if (basePrice === undefined || basePrice === null) {
      const fallbackPrices = {
        name: 12000,
        phone: 12000,
        address: 12000,
        dob: 50000,
        emailRetrieval: 1500,
        deviceUnlink: 2000,
        noRecord: 1000,
        updateRecord: 1150,
        validateModification: 1150
      };
      basePrice = fallbackPrices[type];
      
      if (basePrice === undefined || basePrice === null) {
        return res.status(400).json({ message: "Invalid dynamic engine profile matrix mismatch" });
      }
    }

    let slipCost = 0;
    if (service === "validation") {
      slipCost = slipType === "none" ? 0 : pricing.ninServices?.slipPrice || 0;
    }

    const total = basePrice + slipCost;

    let proofUrl = "";
    let passportUrl = "";

    try {
      if (proof && typeof proof === "string" && proof.startsWith("data:")) {
        proofUrl = await uploadToCloudinary(proof, "xcombinator/proofs");
      } else if (proof && typeof proof === "string") {
        proofUrl = proof;
      }

      if (passport && typeof passport === "string" && passport.startsWith("data:")) {
        passportUrl = await uploadToCloudinary(passport, "xcombinator/passports");
      } else if (passport && typeof passport === "string") {
        passportUrl = passport;
      }
    } catch (uploadErr) {
      console.error("❌ CLOUDINARY UPLOAD ERROR:", uploadErr.message);
      return res.status(500).json({ message: "Resource upload failed. Please try again." });
    }

    // 🧾 CREATE SERVICE REQUEST
    const request = await ServiceRequest.create({
      userId: resolvedUserId, // Safe, valid mongoose ObjectId
      service,
      type,
      nin: nin || "N/A",
      slipType: slipType || "none",
      amount: total,
      proof: proofUrl || "N/A",
      passport: passportUrl || "N/A",
      formData: formData || {},
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          note: "Self-service request entry registered cleanly"
        }
      ]
    });

    // 💰 CREATE TRANSACTION RECORD
    await Transaction.create({
      type: "SERVICE",
      amount: total,
      status: "pending",
      userId: resolvedUserId, // Clean connection reference mapping
      nin: nin || "N/A",
      proof: proofUrl || "N/A",
      requestId: request._id,
    });

    // 📊 GOOGLE SHEETS PIPELINE
    try {
      await addToSheets({
        summary: [
          new Date().toLocaleString(),
          userEmail,
          service.toUpperCase(),
          type,
          nin || "N/A",
          total,
          "pending"
        ],
        fullData: [
          new Date().toLocaleString(),
          userEmail,
          service.toUpperCase(),
          type,
          nin || "N/A",
          JSON.stringify(formData || {}, null, 2)
        ]
      });
    } catch (sheetErr) {
      console.error("❌ SHEET SYNC ERRROR:", sheetErr);
    }

    res.json({
      message: "Request processed and recorded successfully",
      request,
    });

  } catch (err) {
    console.error("❌ CREATE REQUEST COMPILATION ERROR:", err);
    res.status(500).json({ message: "Failed to compile service submission" });
  }
});

// ==============================
// 📥 ADMIN GET ALL REQUESTS
// ==============================
router.get("/admin/requests", isAdmin, async (req, res) => {
  try {
    let { page = 1, limit = 20, status } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const total = await ServiceRequest.countDocuments(query);
    const data = await ServiceRequest.find(query)
      .populate("userId", "email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    console.error("FETCH ADMINISTRATIVE REQUESTS ERROR:", err);
    res.status(500).json({ message: "Failed to aggregate processing models" });
  }
});

// ==============================
// ✅ ADMINISTRATIVE APPROVAL
// ==============================
router.post("/admin/requests/:id/approve", isAdmin, async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Target document node not found" });
    }

    request.status = "approved";
    request.statusHistory.push({
      status: "approved",
      note: `Approved operationally by ${req.user.email}`
    });

    await request.save();

    await Transaction.findOneAndUpdate(
      { requestId: request._id },
      { status: "approved" }
    );

    res.json({ message: "State execution mutated to: APPROVED" });
  } catch (err) {
    console.error("STATE APPROVAL TRANSLATION ERROR:", err);
    res.status(500).json({ message: "Approval structural lifecycle mutation failure" });
  }
});

// ==============================
// ❌ ADMINISTRATIVE REJECTION
// ==============================
router.post("/admin/requests/:id/reject", isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Target document node not found" });
    }

    request.status = "rejected";
    request.statusHistory.push({
      status: "rejected",
      note: reason || `Rejected operationally by ${req.user.email}`
    });

    await request.save();

    await Transaction.findOneAndUpdate(
      { requestId: request._id },
      { status: "rejected" }
    );

    res.json({ message: "State execution mutated to: REJECTED" });
  } catch (err) {
    console.error("STATE REJECTION TRANSLATION ERROR:", err);
    res.status(500).json({ message: "Rejection structural lifecycle mutation failure" });
  }
});

// ==============================
// 📤 UPLOAD COMPLETED RESULT SLIP
// ==============================
router.post("/admin/requests/:id/upload-slip", isAdmin, async (req, res) => {
  try {
    const { pdf } = req.body;
    if (!pdf) {
      return res.status(400).json({ message: "Cryptographic secure PDF token asset identifier required" });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Target document node not found" });
    }

    request.resultSlip = pdf;
    request.status = "completed";
    request.statusHistory.push({
      status: "completed",
      note: `Finalized file system output attached by ${req.user.email}`
    });

    await request.save();

    await Transaction.findOneAndUpdate(
      { requestId: request._id },
      { status: "success" }
    );

    res.json({ message: "System node closed down seamlessly as: COMPLETED" });
  } catch (err) {
    console.error("RESULT SLIP UPDATE PIPELINE ERROR:", err);
    res.status(500).json({ message: "Failed to stitch processed binary response file link" });
  }
});

// ==============================
// 💬 ADD OPERATIONAL AUDIT COMMENT
// ==============================
router.post("/admin/requests/:id/comment", isAdmin, async (req, res) => {
  try {
    const { text, by } = req.body;
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Target document node not found" });
    }

    request.comments.push({
      text,
      by: by || req.user.email,
      role: "admin"
    });

    await request.save();
    res.json({ message: "Comment pushed into working runtime buffer tracking array" });
  } catch (err) {
    console.error("COMMENT THREAD MUTATION ERROR:", err);
    res.status(500).json({ message: "Failed to register text block stream append" });
  }
});

// ==============================
// 🧠 SAVE PRIVATE ADMIN NOTE
// ==============================
router.put("/admin/requests/:id/note", isAdmin, async (req, res) => {
  try {
    const { note } = req.body;
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Target document node not found" });
    }

    request.adminNotes = note;
    await request.save();

    res.json({ message: "Private administrative operational memory updated" });
  } catch (err) {
    console.error("METADATA NOTE PERSISTENCE ERROR:", err);
    res.status(500).json({ message: "Failed to update target memory variable" });
  }
});

// ==============================
// 👤 USER FETCH HISTORICAL LOGS
// ==============================
router.get("/user/requests/:userId", async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {
      userId: new mongoose.Types.ObjectId(req.params.userId)
    };

    const total = await ServiceRequest.countDocuments(query);
    const data = await ServiceRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("USER HISTORY HARVEST ENTRY FAILURE:", err);
    res.status(500).json({ message: "Failed to gather historical account records" });
  }
});

module.exports = router;