const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const router = express.Router();

const User = require("../users/User.model");
const ServiceRequest = require("./ServiceRequest.model");
const Transaction = require("../../models/transaction.model");
const { ensureUploaded } = require("../../shared/cloudinary");
const { verifyToken, isAdmin } = require("../../shared/authGuard");
const { validateServiceRequest, validateVerification } = require("../../shared/validators");
const {
  SUPER_ADMIN_EMAIL,
  SERVICE_RATES,
  NIN_VERIFY_URL,
  NIN_PHONE_URL,
  NIN_TRACKING_URL,
  NIN_DEMOGRAPHY_URL,
  NIN_API_TIMEOUT,
  UNITS_REQUIRED
} = require("../../config/constants");

const API_KEY = process.env.NIN_API_KEY;

// Each legacy unit is treated as ₦250 => 25000 kobo
const KOBO_PER_UNIT = 25000;

// ==============================================================
// 🧾 ROUTE 1: SUBMIT MANUAL NIMC / CAC / MODIFICATION REQUESTS
// ==============================================================
router.post("/request", verifyToken, async (req, res) => {
  const { error } = validateServiceRequest.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const { service, type, nin, slipType, proof, passport, formData } = req.body;

    let mappedType = type;
    if (service === "modification") {
      if (type === "name") mappedType = "nameCorrection";
      if (type === "phone") mappedType = "phoneSync";
      if (type === "address") mappedType = "addressMapping";
    }

    const matrixRates = SERVICE_RATES;
    let basePrice = matrixRates[mappedType] ?? 1500;
    let slipCost = (String(service).toLowerCase() === "validation" && slipType && slipType !== "none") ? 250 : 0;
    const totalCalculatedAmount = basePrice + slipCost; // Naira
    const totalKobo = Math.round(Number(totalCalculatedAmount) * 100);

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    if (user.walletBalanceKobo == null) {
      user.walletBalanceKobo = Math.round((user.walletBalance || 0) * 100);
    }

    const isSuperAdmin = user.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();

    if (!isSuperAdmin && user.walletBalanceKobo < totalKobo) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
    }

    if (!isSuperAdmin) {
      user.walletBalanceKobo -= totalKobo;
      await user.save({ session });
    }

    // Ensure image fields are uploaded to Cloudinary (no raw base64 saved)
    const processedProof = proof ? await ensureUploaded(proof, 'service_proofs') : null;
    const processedPassport = passport ? await ensureUploaded(passport, 'service_passports') : null;

    const [savedRequest] = await ServiceRequest.create([
      {
        userId,
        service: String(service),
        type: String(mappedType),
        nin: nin ? String(nin) : "N/A",
        slipType: slipType ? String(slipType) : "none",
        amount: Number(totalCalculatedAmount),
        unitsUsed: 0,
        proof: processedProof || (proof ? "N/A" : "N/A"),
        passport: processedPassport || (passport ? "N/A" : "N/A"),
        formData: typeof formData === "object" ? formData : {},
        status: "pending",
        statusHistory: [{ status: "pending", note: "Initialized manual pipeline sequence successfully." }]
      }
    ], { session });

    await Transaction.create([{
      type: "SERVICE",
      amount: Number(totalCalculatedAmount),
      amountKobo: totalKobo,
      status: "success",
      userId,
      requestId: savedRequest._id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, message: "Submission compiled successfully.", request: savedRequest, walletBalance: user.getWalletBalanceNaira() });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ MANUAL SERVICE SUBMISSION ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================================================
// ⚡ ROUTE 2: INSTANT AUTOMATED THIRD-PARTY NIN RECOVERY / VERIFY
// ==============================================================
router.post("/verify", verifyToken, async (req, res) => {
  const { error } = validateVerification.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const userId = req.user.id;
  const { method, nin, phone, tracking_id, firstname, surname, gender, birthdate } = req.body;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ error: "User profile context not found." });
    }

    const isSuperAdmin = user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();

    if (nin === "00000000000") {
      // mock lookup for test NIN
      if (!isSuperAdmin && (user.walletBalanceKobo == null ? Math.round((user.walletBalance || 0) * 100) : user.walletBalanceKobo) < KOBO_PER_UNIT) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Insufficient wallet balance." });
      }

      if (!isSuperAdmin) {
        if (user.walletBalanceKobo == null) user.walletBalanceKobo = Math.round((user.walletBalance || 0) * 100);
        user.walletBalanceKobo -= KOBO_PER_UNIT;
        await user.save({ session });
      }

      const mockData = { firstname: "JOHN", surname: "TEST", nin: "00000000000", birthdate: "1995-01-01", gender: "Male" };
      await Transaction.create([{ type: "NIN", amount: KOBO_PER_UNIT/100, amountKobo: KOBO_PER_UNIT, unitsUsed: isSuperAdmin ? 0 : 1, status: "success", userId: user._id }], { session });
      await session.commitTransaction();
      session.endSession();
      return res.json({ status: "success", data: mockData, walletBalance: user.getWalletBalanceNaira() });
    }

    let unitsRequired = UNITS_REQUIRED[method] || UNITS_REQUIRED.standard;
    const costKobo = unitsRequired * KOBO_PER_UNIT;
    if (!isSuperAdmin) {
      if (user.walletBalanceKobo == null) user.walletBalanceKobo = Math.round((user.walletBalance || 0) * 100);
      if (user.walletBalanceKobo < costKobo) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Insufficient wallet balance." });
      }
      user.walletBalanceKobo -= costKobo;
      await user.save({ session });
    }

    let url = "";
    let payload = {};
    if (method === "nin") { url = NIN_VERIFY_URL; payload = { nin, consent: true }; }
    else if (method === "phone") { url = NIN_PHONE_URL; payload = { phone, consent: true }; }
    else if (method === "tracking") { url = NIN_TRACKING_URL; payload = { tracking_id, consent: true }; }
    else if (method === "demographic") { url = NIN_DEMOGRAPHY_URL; payload = { firstname, lastname: surname, gender: gender?.toLowerCase(), dob: birthdate, consent: true }; }

    const response = await axios.post(url, payload, { headers: { "x-api-key": API_KEY, "Content-Type": "application/json" }, timeout: NIN_API_TIMEOUT });
    
    // Validate response structure before accessing properties
    const responseSchema = Joi.object({
      data: Joi.object().required()
    }).unknown(true);
    
    const { error: responseError } = responseSchema.validate(response.data);
    if (responseError) {
      return res.status(502).json({ error: "Invalid response from verification service", code: "INVALID_RESPONSE" });
    }
    
    const cleanData = response.data?.data?.data || response.data?.data || response.data;

    // Persist service request and transaction under the same transaction session
    await ServiceRequest.create([{
      userId: user._id,
      service: "automated_lookup",
      type: method,
      nin: nin || "N/A",
      unitsUsed: unitsRequired,
      amount: costKobo / 100,
      amountKobo: costKobo,
      status: "completed",
      apiResponseData: cleanData,
      statusHistory: [{ status: "completed", note: "Automated identity payload sync completed." }]
    }], { session });

    await Transaction.create([{
      type: "NIN_AUTO",
      unitsUsed: isSuperAdmin ? 0 : unitsRequired,
      amount: costKobo / 100,
      amountKobo: costKobo,
      userId: user._id,
      status: "success"
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.json({ status: "success", data: cleanData, unitsUsed: unitsRequired, walletBalance: user.getWalletBalanceNaira() });
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
// 🛠️ ROUTE 3: ADMIN CORE OVERVIEW
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