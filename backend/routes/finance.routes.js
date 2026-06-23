const express = require("express");
const router = express.Router();
const { submitPaymentReceipt, initiateFlutterwavePayment, getPendingPayments, approvePayment, verifyFlutterwaveTransaction } = require("../controllers/finance.controller");
const { verifyToken, isAdmin } = require("../shared/authGuard");

// User Routes
router.post("/submit-payment", verifyToken, submitPaymentReceipt);
router.post("/initiate-flutterwave", verifyToken, initiateFlutterwavePayment);
router.post("/verify-flutterwave", verifyToken, verifyFlutterwaveTransaction);

// Admin Routes
router.get("/payments", verifyToken, isAdmin, getPendingPayments);
router.post("/payments/:id/approve", verifyToken, isAdmin, approvePayment);

module.exports = router;