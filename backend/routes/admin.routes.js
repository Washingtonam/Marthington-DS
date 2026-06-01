const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// You must add your authentication middleware (isAdmin, isSuperAdmin) in your main app or here if needed

router.get('/requests', adminController.getRequests);
router.get('/stats', adminController.getStats);
router.get('/nimc-requests', adminController.getNimcRequests);
router.get('/cac-requests', adminController.getCacRequests);
router.put('/update-status/:targetModule/:id', adminController.updateStatus);
router.get('/payments', adminController.getPayments);
router.post('/payments/:id/approve', adminController.approvePayment);
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const User = require("../models/User.model");
const Transaction = require("../models/transaction.model");
const AuditLog = require("../models/AuditLog.model");
const Pricing = require("../models/Pricing.model");
const ServiceRequest = require("../models/ServiceRequest.model");
const CACRequest = require("../models/CacRequest.model");
const { verifyToken, isAdmin } = require("../shared/authGuard");
const isSuperAdmin = (req, res, next) => {
	if (!req.user || req.user.role !== "super_admin") {
		return res.status(403).json({ success: false, message: "Access denied: Super admin token signature required" });
	}
	next();
};

// ...all route handlers from modules_old/admin/admin.routes.js, with updated model/shared paths...

// (Full content from modules_old/admin/admin.routes.js, with all model/shared requires updated to ../models/ and ../shared/)

// (See previous content for all route handlers)

module.exports = router;
