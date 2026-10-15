const express = require("express");
const router = express.Router();
const { submitPaymentReceipt, initiateFlutterwavePayment, getPendingPayments, approvePayment, rejectPayment, verifyFlutterwaveTransaction } = require("../controllers/finance.controller");
const { getFinancialReport } = require("../controllers/financialReports.controller");
const { verifyToken, isAdmin } = require("../shared/authGuard");
const isSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Super admin access required." });
  }
  return next();
};

// User Routes
router.post("/submit-payment", verifyToken, submitPaymentReceipt);
router.post("/initiate-flutterwave", verifyToken, initiateFlutterwavePayment);
router.post("/verify-flutterwave", verifyToken, verifyFlutterwaveTransaction);
router.get("/reports", verifyToken, isSuperAdmin, getFinancialReport);

// Admin Routes
router.get("/payments", verifyToken, isAdmin, getPendingPayments);
router.post("/payments/:id/approve", verifyToken, isAdmin, approvePayment);
router.post("/payments/:id/reject", verifyToken, isAdmin, rejectPayment);

module.exports = router;