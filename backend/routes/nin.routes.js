const express = require("express");
const axios = require("axios");
const Joi = require("joi");
const mongoose = require("mongoose");
const router = express.Router();

const servicesController = require("../controllers/services.controller");
const User = require("../models/User.model");
const ServiceRequest = require("../models/ServiceRequest.model");
const VerificationRequest = require("../models/VerificationRequest.model");
const Transaction = require("../models/transaction.model");
const Pricing = require("../models/Pricing.model");
const { createVerificationRequestRecord } = require("../services/verification.service");
const { verifyToken, isAdmin } = require("../shared/authGuard");
const { validateVerification } = require("../shared/validators");
const {
  SUPER_ADMIN_EMAIL,
  NIN_VERIFY_URL,
  NIN_PHONE_URL,
  NIN_TRACKING_URL,
  NIN_DEMOGRAPHY_URL,
  NIN_API_TIMEOUT,
  UNITS_REQUIRED
} = require("../config/constants");

const API_KEY = process.env.NIN_API_KEY;

// Each legacy unit is treated as ₦250 => 25000 kobo
const KOBO_PER_UNIT = 25000;

// ==============================================================
// 🧾 ROUTE 1: SUBMIT MANUAL NIMC / CAC / MODIFICATION REQUESTS
// ==============================================================
router.post("/request", verifyToken, servicesController.submitServiceRequest);

// ==============================================================
// 📦 ROUTE 1B: LIST SERVICE REQUESTS WITH SERVER-SIDE FILTERS
// ==============================================================
router.get("/requests", verifyToken, servicesController.getServiceRequests);

// ==============================================================
// ⚡ ROUTE 2: INSTANT AUTOMATED THIRD-PARTY NIN RECOVERY / VERIFY
// ==============================================================

async function axiosPostWithRetry(url, payload, options = {}, maxRetries = 2) {
  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      if (attempt > 0) {
        console.log(`VERIFY RETRY: attempt ${attempt} of ${maxRetries} for URL ${url}`);
      }
      return await axios.post(url, payload, options);
    } catch (error) {
      lastError = error;
      const recoverable = !error.response || error.message === 'Network Error' || error.code === 'ECONNABORTED' || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || (error.response && error.response.status >= 500);
      console.warn(`VERIFY RETRY ERROR [attempt ${attempt}]`, {
        url,
        message: error.message,
        code: error.code,
        status: error.response?.status,
        retryable: recoverable,
      });

      if (!recoverable || attempt === maxRetries) {
        throw error;
      }

      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      attempt += 1;
    }
  }

  throw lastError;
}

router.post("/verify", verifyToken, async (req, res) => {
  const { error } = validateVerification.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const userId = req.user.id;
  const { method, nin, phone, tracking_id, firstname, surname, gender, birthdate } = req.body;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    const pricing = await Pricing.getPricing();
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ error: "User profile context not found." });
    }

    const isSuperAdmin = user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
    const unitPriceNaira = pricing.nin?.unitPrice ?? 250;

    if (nin === "00000000000") {
      const mockCostKobo = Math.round(unitPriceNaira * 100);
      if (!isSuperAdmin) {
        const updatedUser = await User.findOneAndUpdate(
          { _id: userId, walletBalanceKobo: { $gte: mockCostKobo } },
          { $inc: { walletBalanceKobo: -mockCostKobo } },
          { returnDocument: 'after', session }
        );

        if (!updatedUser) {
          await session.abortTransaction();
          session.endSession();
          return res.status(402).json({ error: "Insufficient wallet balance." });
        }
        user.walletBalanceKobo = updatedUser.walletBalanceKobo;
      }

      const mockData = { firstname: "JOHN", surname: "TEST", nin: "00000000000", birthdate: "1995-01-01", gender: "Male" };
      const { requestId } = await createVerificationRequestRecord({
        userId: user._id,
        method,
        nin: "00000000000",
        unitsRequired: isSuperAdmin ? 0 : 1,
        costKobo: mockCostKobo,
        apiResponseData: mockData,
        VerificationRequestModel: { create: async (docs) => VerificationRequest.create(docs, { session }) },
        TransactionModel: { create: async (docs) => Transaction.create(docs, { session }) },
      });

      await session.commitTransaction();
      session.endSession();
      return res.json({ status: "success", data: mockData, walletBalance: user.getWalletBalanceNaira(), requestId });
    }

    let unitsRequired = UNITS_REQUIRED[method] || UNITS_REQUIRED.standard;
    const costKobo = Math.round(unitsRequired * unitPriceNaira * 100);
    if (!isSuperAdmin) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, walletBalanceKobo: { $gte: costKobo } },
        { $inc: { walletBalanceKobo: -costKobo } },
        { returnDocument: 'after', session }
      );
      if (!updatedUser) {
        await session.abortTransaction();
        session.endSession();
        return res.status(402).json({ error: "Insufficient wallet balance." });
      }
      user.walletBalanceKobo = updatedUser.walletBalanceKobo;
    }

    let url = "";
    let payload = {};
    if (method === "nin") { url = NIN_VERIFY_URL; payload = { nin, consent: true }; }
    else if (method === "phone") { url = NIN_PHONE_URL; payload = { phone, consent: true }; }
    else if (method === "tracking") { url = NIN_TRACKING_URL; payload = { tracking_id, consent: true }; }
    else if (method === "demographic") { url = NIN_DEMOGRAPHY_URL; payload = { firstname, lastname: surname, gender: gender?.toLowerCase(), dob: birthdate, consent: true }; }

        const response = await axiosPostWithRetry(url, payload, { headers: { "x-api-key": API_KEY, "Content-Type": "application/json" }, timeout: NIN_API_TIMEOUT });
    
    // Validate response structure before accessing properties
    const responseSchema = Joi.object({
      data: Joi.object().required()
    }).unknown(true);
    
    const { error: responseError } = responseSchema.validate(response.data);
    if (responseError) {
      return res.status(502).json({ error: "Invalid response from verification service", code: "INVALID_RESPONSE" });
    }
    
    const cleanData = response.data?.data?.data || response.data?.data || response.data;

    const { requestId } = await createVerificationRequestRecord({
      userId: user._id,
      method,
      nin,
      phone,
      tracking_id,
      firstname,
      surname,
      gender,
      birthdate,
      unitsRequired,
      costKobo,
      apiResponseData: cleanData,
      VerificationRequestModel: { create: async (docs) => VerificationRequest.create(docs, { session }) },
      TransactionModel: { create: async (docs) => Transaction.create(docs, { session }) },
    });

    await session.commitTransaction();
    session.endSession();

    return res.json({ status: "success", data: cleanData, unitsUsed: unitsRequired, walletBalance: user.getWalletBalanceNaira(), requestId });
  } catch (error) {
    console.error("VERIFY ERROR - Request:", { method, url: error.config?.url });
    console.error("VERIFY ERROR - Response:", error.response?.status, error.response?.data);
    if (session && session.inTransaction()) {
      try { await session.abortTransaction(); } catch (e) { /* ignore */ }
      session.endSession();
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({ error: "API authentication failed", code: "API_AUTH_FAILED" });
    }
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: "Verification service timeout", code: "SERVICE_TIMEOUT" });
    }
    return res.status(500).json({ error: "Identity verification engine failure.", code: "VERIFY_FAILED" });
  }
});

// ==============================================================
// 🛠️ ROUTE 3: FETCH A SINGLE SERVICE REQUEST BY ID
// ==============================================================
router.get("/request/:id", verifyToken, servicesController.getRequestById);

// ==============================================================
// 🛠️ ROUTE 4: ADMIN CORE OVERVIEW
// ==============================================================
router.get("/admin/requests", verifyToken, isAdmin, async (req, res) => {
  try {
    const requests = await ServiceRequest.find().populate("userId", "firstName lastName email").sort({ createdAt: -1 });
    return res.json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;