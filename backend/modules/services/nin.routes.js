const express = require("express");
const axios = require("axios");
const router = express.Router();

const User = require("../users/User.model");
const ServiceRequest = require("./ServiceRequest.model");
const Transaction = require("../finance/Transaction.model");
const { verifyToken, isAdmin } = require("../../shared/authGuard");
const { validateServiceRequest, validateVerification } = require("../../shared/validators");

const API_KEY = process.env.NIN_API_KEY;
const SUPER_ADMIN_EMAIL = "washingtonamedu@gmail.com";

// ==============================================================
// 🧾 ROUTE 1: SUBMIT MANUAL NIMC / CAC / MODIFICATION REQUESTS
// ==============================================================
router.post("/request", verifyToken, async (req, res) => {
  const { error } = validateServiceRequest.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  try {
    const userId = req.user.id;
    const { service, type, nin, slipType, proof, passport, formData } = req.body;

    let mappedType = type;
    if (service === "modification") {
      if (type === "name") mappedType = "nameCorrection";
      if (type === "phone") mappedType = "phoneSync";
      if (type === "address") mappedType = "addressMapping";
    }

    const matrixRates = {
      noRecord: 5000, updateRecord: 5000, modificationVerify: 5000, vnin: 5000,
      inProcessing: 1000, stillProcessing: 1000, newEnrollment: 1000, invalidTracking: 1000,
      nameCorrection: 7000, dob: 50000, addressMapping: 7000, phoneSync: 7000,
      trackingLookup: 1000, emailRetrieval: 4500, deviceUnlink: 5500
    };
    
    let basePrice = matrixRates[mappedType] ?? 1500;
    let slipCost = (String(service).toLowerCase() === "validation" && slipType && slipType !== "none") ? 250 : 0;
    const totalCalculatedAmount = basePrice + slipCost;

    const savedRequest = await ServiceRequest.create({
      userId,
      service: String(service),
      type: String(mappedType),
      nin: nin ? String(nin) : "N/A",
      slipType: slipType ? String(slipType) : "none",
      amount: Number(totalCalculatedAmount),
      proof: proof || "N/A",
      passport: passport || "N/A",
      formData: typeof formData === "object" ? formData : {},
      status: "pending",
      statusHistory: [{ status: "pending", note: "Initialized manual pipeline sequence successfully." }]
    });

    await Transaction.create({
      type: "SERVICE",
      amount: Number(totalCalculatedAmount),
      status: "pending",
      userId,
      requestId: savedRequest._id
    });

    return res.status(200).json({ success: true, message: "Submission compiled successfully.", request: savedRequest });
  } catch (error) {
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
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User profile context not found." });

    const isSuperAdmin = user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();

    if (nin === "00000000000") {
      if (!isSuperAdmin && user.units < 1) return res.status(400).json({ error: "Insufficient balance units." });
      if (!isSuperAdmin) { user.units -= 1; await user.save(); }
      const mockData = { firstname: "JOHN", surname: "TEST", nin: "00000000000", birthdate: "1995-01-01", gender: "Male" };
      await Transaction.create({ type: "NIN", unitsUsed: isSuperAdmin ? 0 : 1, status: "success", userId: user._id });
      return res.json({ status: "success", data: mockData, units: user.units });
    }

    let unitsRequired = ["phone", "demographic", "tracking"].includes(method) ? 2 : 1;
    if (!isSuperAdmin && user.units < unitsRequired) return res.status(400).json({ error: "Insufficient wallet units." });

    let url = "";
    let payload = {};
    if (method === "nin") { url = "https://ninbvnportal.com.ng/api/nin-verification"; payload = { nin, consent: true }; }
    else if (method === "phone") { url = "https://ninbvnportal.com.ng/api/nin-phone"; payload = { phone, consent: true }; }
    else if (method === "tracking") { url = "https://ninbvnportal.com.ng/api/nin-tracking"; payload = { tracking_id, consent: true }; }
    else if (method === "demographic") { url = "https://ninbvnportal.com.ng/api/nin-demography"; payload = { firstname, lastname: surname, gender: gender?.toLowerCase(), dob: birthdate, consent: true }; }

    const response = await axios.post(url, payload, { headers: { "x-api-key": API_KEY, "Content-Type": "application/json" }, timeout: 15000 });
    const cleanData = response.data?.data?.data || response.data?.data || response.data;

    if (!isSuperAdmin) { user.units -= unitsRequired; await user.save(); }

    await ServiceRequest.create({
      userId: user._id, service: "automated_lookup", type: method, nin: nin || "N/A", unitsUsed: unitsRequired, status: "completed",
      apiResponseData: cleanData, statusHistory: [{ status: "completed", note: "Automated identity payload sync completed." }]
    });

    await Transaction.create({ type: "NIN_AUTO", unitsUsed: isSuperAdmin ? 0 : unitsRequired, userId: user._id, status: "success" });

    return res.json({ status: "success", data: cleanData, unitsUsed: unitsRequired, units: user.units });
  } catch (error) {
    console.error("VERIFY ERROR:", error.message);
    return res.status(500).json({ error: "Identity verification engine failure." });
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