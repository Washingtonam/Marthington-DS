const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ==========================================
// 🏢 IMPORT YOUR MODELS CLEANLY
// ==========================================
const ServiceRequest = require("../models/ServiceRequest");
const Transaction = require("../models/Transaction");
const Pricing = require("../models/Pricing");

// ==========================================
// ⚙️ HELPERS (Adjust paths if utils is elsewhere)
// ==========================================
// If you don't have these utils or they crash, the try/catch blocks below will catch them safely!
let uploadToCloudinary = async (fileStr, folder) => { return fileStr; }; 
let addToSheets = async (data) => { return true; };

try {
  const utils = require("../utils/cloudinary"); // Adjust if your file structure differs
  if (utils.uploadToCloudinary) uploadToCloudinary = utils.uploadToCloudinary;
} catch (e) {
  console.log("Using inline fallback for Cloudinary utility");
}

try {
  const sheets = require("../utils/googleSheets");
  if (sheets.addToSheets) addToSheets = sheets.addToSheets;
} catch (e) {
  console.log("Using inline fallback for Google Sheets utility");
}

// ==========================================
// 🚀 THE UNIFIED UNBREAKABLE POST ROUTE
// ==========================================
router.post("/request", async (req, res) => {
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

    // Grab or fallback user details safely
    const userEmail = req.headers["email"] || req.body.email || formData?.email || "customer@xcombinator.com";

    // 1. Core input parameter valid checks
    if (!service || !type) {
      return res.status(400).json({ message: "Missing required core parameters: service or type" });
    }

    // 🔄 STANDARDIZE FRONTEND KEYS TO MATCH BACKEND PRICING MATRIX EXPLICITLY
    let mappedType = type;
    if (service === "modification") {
      if (type === "name") mappedType = "nameCorrection";
      if (type === "phone") mappedType = "phoneSync";
      if (type === "address") mappedType = "addressMapping";
    }

    // 2. 🛡️ Prevent CastErrors from breaking the server thread
    let resolvedUserId;
    try {
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        resolvedUserId = new mongoose.Types.ObjectId(userId);
      } else {
        resolvedUserId = new mongoose.Types.ObjectId(); 
      }
    } catch (castErr) {
      resolvedUserId = new mongoose.Types.ObjectId();
    }

    // 3. 💰 Dynamic Pricing Matrix Engine Matching Your Dashboard Services
    const pricing = await Pricing.findOne() || {};
    let basePrice = undefined;

    const normalizedService = service.toLowerCase().replace("-", "");

    if (normalizedService === "validation") {
      basePrice = pricing.ninServices?.validation?.[mappedType];
    } else if (normalizedService === "ipe" || normalizedService === "ipeclearance") {
      basePrice = pricing.ninServices?.ipe?.[mappedType];
    } else if (normalizedService === "modification") {
      basePrice = pricing.ninServices?.modification?.[mappedType];
    } else if (normalizedService === "personalization" || normalizedService === "tracking") {
      basePrice = pricing.ninServices?.personalization?.[mappedType];
    } else if (normalizedService === "selfservice") {
      const selfServiceConfig = pricing.ninServices?.selfService || pricing.ninServices?.["self-service"];
      basePrice = selfServiceConfig?.[mappedType];
    }

    // 🛟 Hardcoded Dashboard Fallback Pricing Matrix
    if (basePrice === undefined || basePrice === null) {
      const globalDashboardPrices = {
        // Validation Module
        noRecord: 5000, updateRecord: 5000, modificationVerify: 5000, vnin: 5000,
        // IPE Clearance Module
        inProcessing: 1000, stillProcessing: 1000, newEnrollment: 1000, invalidTracking: 1000,
        // Modification Module
        nameCorrection: 7000, dob: 50000, addressMapping: 7000, phoneSync: 7000,
        // Personalization Module
        trackingLookup: 1000,
        // Selfservice Module
        emailRetrieval: 4500, deviceUnlink: 5500
      };
      basePrice = globalDashboardPrices[mappedType] ?? 1500; 
    }

    // Slips processing pricing configuration calculations
    let slipCost = 0;
    if (normalizedService === "validation" && slipType && slipType !== "none") {
      slipCost = pricing.ninServices?.slipPrice || 250;
    }

    const totalCalculatedAmount = basePrice + slipCost;

    // 4. Cloudinary File Processing Blankets
    let proofUrl = "N/A";
    let passportUrl = "N/A";

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
      console.error("⚠️ Cloudinary upload issue caught safely:", uploadErr.message);
      proofUrl = proof && proof.length > 100 ? "Pending Manual Check" : (proof || "N/A");
    }

    // 5. 🧾 Create Core Service Request Document inside MongoDB Atlas
    // Pass 'mappedType' if your database requires the longer format, or keep 'type' if your schema likes short names.
    const request = await ServiceRequest.create({
      userId: resolvedUserId,
      service: service, 
      type: mappedType, // 👈 Ensures backend consistency 
      nin: nin || "N/A",
      slipType: slipType || "none",
      amount: totalCalculatedAmount,
      proof: proofUrl,
      passport: passportUrl,
      formData: formData || {},
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          note: `New pipeline item registered for ${service} (${mappedType})`
        }
      ]
    });

    // 6. 💰 Log Associated Transaction entry cleanly for tracking
    await Transaction.create({
      type: "SERVICE",
      amount: totalCalculatedAmount,
      status: "pending",
      userId: resolvedUserId,
      nin: nin || "N/A",
      proof: proofUrl,
      requestId: request._id,
    });

    // 7. 📊 Async Google Sheets Log Pipeline Trigger
    try {
      await addToSheets({
        summary: [new Date().toLocaleString(), userEmail, service.toUpperCase(), mappedType, nin || "N/A", totalCalculatedAmount, "pending"],
        fullData: [new Date().toLocaleString(), userEmail, service.toUpperCase(), mappedType, nin || "N/A", JSON.stringify(formData || {})]
      });
    } catch (sheetErr) {
      console.error("Google Sheets synchronization safe bypass:", sheetErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Request compiled and submitted successfully to admin review panel.",
      request,
    });

  } catch (err) {
    console.error("❌ BACKEND PIPELINE COMPILATION FAILURE DETECTED:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to compile service submission inside the data matrix engine." 
    });
  }
});

module.exports = router;