const express = require("express");
const router = express.Router();
const { submitPaymentReceipt, getPendingPayments, approvePayment } = require("../controllers/finance.controller");
const { verifyToken, isAdmin } = require("../../shared/authGuard");

// User Routes
router.post("/submit-payment", verifyToken, submitPaymentReceipt);

// Admin Routes
router.get("/payments", verifyToken, isAdmin, getPendingPayments);
router.post("/payments/:id/approve", verifyToken, isAdmin, approvePayment);

module.exports = router;