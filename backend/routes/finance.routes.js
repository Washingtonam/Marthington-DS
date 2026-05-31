// backend/routes/finance.routes.js
const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');

// Example routes (match your old modules/finance/finance.routes.js)
router.get('/payments', financeController.getAllPayments);
router.post('/payment-requests', financeController.createPaymentRequest);

module.exports = router;
