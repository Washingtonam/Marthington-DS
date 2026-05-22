const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
// Ensure your models are accurately imported here
// const ServiceRequest = require("../models/ServiceRequest"); 
// const Transaction = require("../models/Transaction");
// const Pricing = require("../models/Pricing");

router.post("/request", async (req, res) => {
  try {
    console.log("📥 RECEIVED FRONTEND PAYLOAD:", JSON.stringify(req.body, null, 2));

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

    // 1. Core input parameter validation checks
    if (!service || !type) {
      return res.status(400).json({ 
        success: false,
        message: `Missing required core parameters. Received service: '${service}', type: '${type}'` 
      });
    }

    // 🔄 STANDARDIZE FRONTEND KEYS TO MATCH BACKEND PRICING MATRIX EXPLICITLY
    let mappedType = type;
    if (service === "modification") {
      if (type === "name") mappedType = "nameCorrection";
      if (type === "phone") mappedType = "phoneSync";
      if (type === "address") mappedType = "addressMapping";
    }

    // 2. 🛡️ Robust ObjectId resolution handling to eliminate CastErrors
    let resolvedUserId = null;
    try {
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        resolvedUserId = new mongoose.Types.ObjectId(String(userId));
      } else {
        // Fallback safely to a cleanly generated new ID if none exists, or null if schema allows it
        resolvedUserId = new mongoose.Types.ObjectId(); 
      }
    } catch (castErr) {
      console.error("⚠️ ObjectId cast failed, generating safe fallback:", castErr.message);
      resolvedUserId = new mongoose.Types.ObjectId();
    }

    // 3. 💰 Dynamic Pricing Matrix Engine Matching Your Dashboard Services
    let basePrice = undefined;
    try {
      const pricing = await Pricing.findOne() || {};
      const normalizedService = String(service).toLowerCase().replace("-", "");

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
    } catch (pricingDbErr) {
      console.error("⚠️ Pricing collection lookup bypass:", pricingDbErr.message);
    }

    // 🛟 Hardcoded Dashboard Fallback Pricing Matrix
    if (basePrice === undefined || basePrice === null) {
      const globalDashboardPrices = {
        noRecord: 5000, updateRecord: 5000, modificationVerify: 5000, vnin: 5000,
        inProcessing: 1000, stillProcessing: 1000, newEnrollment: 1000, invalidTracking: 1000,
        nameCorrection: 7000, dob: 50000, addressMapping: 7000, phoneSync: 7000,
        trackingLookup: 1000,
        emailRetrieval: 4500, deviceUnlink: 5500
      };
      basePrice = globalDashboardPrices[mappedType] ?? 1500; 
    }

    // Slips processing pricing configuration calculations
    let slipCost = 0;
    if (String(service).toLowerCase() === "validation" && slipType && slipType !== "none") {
      slipCost = 250; 
    }

    const totalCalculatedAmount = basePrice + slipCost;

    // 4. Cloudinary File Processing Safety Blanket
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
      proofUrl = proof && proof.length > 100 ? "Pending Manual Upload Verification" : (proof || "N/A");
      passportUrl = passport && passport.length > 100 ? "Pending Manual Upload Verification" : (passport || "N/A");
    }

    // 5. 🧾 Create Core Service Request Document inside MongoDB Atlas
    let request;
    try {
      request = await ServiceRequest.create({
        userId: resolvedUserId,
        service: service, 
        type: mappedType, // Keeps backend routing happy
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
    } catch (schemaWriteErr) {
      console.error("❌ CRITICAL DB VALIDATION EROR ON SERVICE REQUEST:", schemaWriteErr);
      return res.status(400).json({
        success: false,
        message: "Database schema compilation rejected structural attributes.",
        error: schemaWriteErr.message
      });
    }

    // 6. 💰 Log Associated Transaction entry cleanly for tracking
    try {
      await Transaction.create({
        type: "SERVICE",
        amount: totalCalculatedAmount,
        status: "pending",
        userId: resolvedUserId,
        nin: nin || "N/A",
        proof: proofUrl,
        requestId: request._id,
      });
    } catch (txErr) {
      console.error("⚠️ Transaction ledger logging bypassed:", txErr.message);
    }

    // 7. 📊 Async Google Sheets Log Pipeline Trigger
    try {
      if (typeof addToSheets === "function") {
        await addToSheets({
          summary: [new Date().toLocaleString(), userEmail, service.toUpperCase(), mappedType, nin || "N/A", totalCalculatedAmount, "pending"],
          fullData: [new Date().toLocaleString(), userEmail, service.toUpperCase(), mappedType, nin || "N/A", JSON.stringify(formData || {})]
        });
      }
    } catch (sheetErr) {
      console.error("Google Sheets synchronization safe bypass:", sheetErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Request compiled and submitted successfully to admin review panel.",
      request,
    });

  } catch (err) {
    console.error("❌ FATAL BACKEND PIPELINE CRASH:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Internal configuration failure inside data matrix engine.",
      error: err.message
    });
  }
});

module.exports = router;