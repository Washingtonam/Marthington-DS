// backend/routes/finance.routes.js
const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const { verifyToken, isAdmin } = require('../shared/authGuard');

// User Routes
router.post('/submit-payment', verifyToken, financeController.submitPaymentReceipt);

// Admin Routes
router.get('/payments', verifyToken, isAdmin, financeController.getPendingPayments);
router.post('/payments/:id/approve', verifyToken, isAdmin, financeController.approvePayment);

module.exports = router;
