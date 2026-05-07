const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const ServiceRequest = require("../models/ServiceRequest");
const Pricing = require("../models/Pricing");
const Transaction = require("../models/Transaction");

// ✅ GOOGLE SHEETS
const { addToSheets } = require("../utils/googleSheets");

// ✅ CLOUDINARY
const { uploadToCloudinary } = require("../utils/cloudinary");

// ==============================
// 📤 CREATE REQUEST
// ==============================
router.post("/nin-services/request", async (req, res) => {
  try {
    const {
      userId,
      email,
      service,
      type,
      nin,
      slipType,
      proof,
      passport,
      formData
    } = req.body;

    if (!userId || !service || !type || !nin || !proof) {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

    const pricing = await Pricing.getPricing();

    let basePrice = 0;

    if (service === "validation") {
      basePrice = pricing.ninServices.validation?.[type];
    } else if (service === "ipe") {
      basePrice = pricing.ninServices.ipe?.[type];
    } else if (service === "modification") {
      basePrice = pricing.ninServices.modification?.[type];
    }

    if (!basePrice) {
      return res.status(400).json({
        message: "Invalid service type selected",
      });
    }

    let slipCost = 0;

    if (service === "validation") {
      slipCost =
        slipType === "none"
          ? 0
          : pricing.ninServices.slipPrice || 0;
    }

    const total = basePrice + slipCost;

    // ==============================
    // ☁️ CLOUDINARY UPLOADS
    // ==============================
    let proofUrl = "";
    let passportUrl = "";

    try {

      console.log("☁️ Uploading proof...");

      proofUrl = await uploadToCloudinary(
        proof,
        "xcombinator/proofs"
      );

      console.log("✅ Proof uploaded");

      if (passport) {

        console.log("☁️ Uploading passport...");

        passportUrl = await uploadToCloudinary(
          passport,
          "xcombinator/passports"
        );

        console.log("✅ Passport uploaded");
      }

    } catch (uploadErr) {

      console.error("❌ CLOUDINARY UPLOAD FAILED:", uploadErr);

      return res.status(500).json({
        message: "File upload failed"
      });
    }

    // ==============================
    // 🧾 CREATE REQUEST
    // ==============================
    const request = await ServiceRequest.create({
      userId,
      service,
      type,
      nin,
      slipType: slipType || "none",
      amount: total,

      // ✅ CLOUDINARY URLS
      proof: proofUrl,
      passport: passportUrl,

      formData: formData || {},

      status: "pending",

      statusHistory: [
        {
          status: "pending",
          note: "Request submitted"
        }
      ]
    });

    // ==============================
    // 💰 CREATE TRANSACTION
    // ==============================
    await Transaction.create({
      type: "SERVICE",
      amount: total,
      status: "pending",
      userId,
      nin,

      // ✅ CLOUDINARY URL
      proof: proofUrl,

      requestId: request._id,
    });

    // ==============================
    // 📊 GOOGLE SHEETS
    // ==============================
    try {

      console.log("📊 Sending to Google Sheets...");

      await addToSheets({
        summary: [
          new Date().toLocaleString(),
          email || "N/A",
          service,
          type,
          nin,
          total,
          "pending"
        ],

        fullData: [
          new Date().toLocaleString(),
          email || "N/A",
          service,
          type,
          nin,
          JSON.stringify(formData || {}, null, 2)
        ]
      });

      console.log("✅ GOOGLE SHEETS SUCCESS");

    } catch (sheetErr) {

      console.error(
        "❌ GOOGLE SHEETS FAILED:",
        sheetErr
      );
    }

    // ==============================
    // ✅ SUCCESS RESPONSE
    // ==============================
    res.json({
      message: "Request submitted successfully",
      request,
    });

  } catch (err) {

    console.error(
      "❌ CREATE REQUEST ERROR:",
      err
    );

    res.status(500).json({
      message: "Failed to submit request"
    });
  }
});


// ==============================
// 📥 ADMIN GET REQUESTS
// ==============================
router.get("/admin/requests", async (req, res) => {
  try {

    let {
      page = 1,
      limit = 20,
      status
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    const total =
      await ServiceRequest.countDocuments(query);

    const data =
      await ServiceRequest.find(query)
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

    console.error(
      "FETCH REQUESTS ERROR:",
      err
    );

    res.status(500).json({
      message: "Failed to fetch requests"
    });
  }
});


// ==============================
// ✅ APPROVE
// ==============================
router.post("/admin/requests/:id/approve", async (req, res) => {
  try {

    const request =
      await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Request not found"
      });
    }

    request.status = "approved";

    request.statusHistory.push({
      status: "approved",
      note: "Approved by admin"
    });

    await request.save();

    await Transaction.findOneAndUpdate(
      { requestId: request._id },
      { status: "approved" }
    );

    res.json({
      message: "Approved"
    });

  } catch (err) {

    console.error(
      "APPROVE ERROR:",
      err
    );

    res.status(500).json({
      message: "Approval failed"
    });
  }
});


// ==============================
// ❌ REJECT
// ==============================
router.post("/admin/requests/:id/reject", async (req, res) => {
  try {

    const { reason } = req.body;

    const request =
      await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Request not found"
      });
    }

    request.status = "rejected";

    request.statusHistory.push({
      status: "rejected",
      note: reason || "Rejected by admin"
    });

    await request.save();

    await Transaction.findOneAndUpdate(
      { requestId: request._id },
      { status: "rejected" }
    );

    res.json({
      message: "Rejected"
    });

  } catch (err) {

    console.error(
      "REJECT ERROR:",
      err
    );

    res.status(500).json({
      message: "Rejection failed"
    });
  }
});


// ==============================
// 📤 UPLOAD RESULT SLIP
// ==============================
router.post("/admin/requests/:id/upload-slip", async (req, res) => {
  try {

    const { pdf } = req.body;

    if (!pdf) {
      return res.status(400).json({
        message: "PDF required"
      });
    }

    const request =
      await ServiceRequest.findById(req.params.id);

    request.resultSlip = pdf;
    request.status = "completed";

    request.statusHistory.push({
      status: "completed",
      note: "Slip uploaded and completed"
    });

    await request.save();

    await Transaction.findOneAndUpdate(
      { requestId: request._id },
      { status: "success" }
    );

    res.json({
      message: "Completed"
    });

  } catch (err) {

    console.error(
      "UPLOAD ERROR:",
      err
    );

    res.status(500).json({
      message: "Upload failed"
    });
  }
});


// ==============================
// 💬 ADD COMMENT
// ==============================
router.post("/admin/requests/:id/comment", async (req, res) => {
  try {

    const { text, by } = req.body;

    const request =
      await ServiceRequest.findById(req.params.id);

    request.comments.push({
      text,
      by,
      role: "admin"
    });

    await request.save();

    res.json({
      message: "Comment added"
    });

  } catch (err) {

    console.error(
      "COMMENT ERROR:",
      err
    );

    res.status(500).json({
      message: "Failed to add comment"
    });
  }
});


// ==============================
// 🧠 SAVE ADMIN NOTE
// ==============================
router.put("/admin/requests/:id/note", async (req, res) => {
  try {

    const { note } = req.body;

    const request =
      await ServiceRequest.findById(req.params.id);

    request.adminNotes = note;

    await request.save();

    res.json({
      message: "Note saved"
    });

  } catch (err) {

    console.error(
      "NOTE ERROR:",
      err
    );

    res.status(500).json({
      message: "Failed to save note"
    });
  }
});


// ==============================
// 👤 USER GET OWN REQUESTS
// ==============================
router.get("/user/requests/:userId", async (req, res) => {
  try {

    let {
      page = 1,
      limit = 10
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = {
      userId:
        new mongoose.Types.ObjectId(
          req.params.userId
        )
    };

    const total =
      await ServiceRequest.countDocuments(query);

    const data =
      await ServiceRequest.find(query)
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

    console.error(
      "USER REQUEST ERROR:",
      err
    );

    res.status(500).json({
      message: "Failed to fetch user requests"
    });
  }
});

module.exports = router;