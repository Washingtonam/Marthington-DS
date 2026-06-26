// backend/routes/services.routes.js
const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');

// Example routes (match your old modules/services/*.routes.js)
router.get('/cac', servicesController.getAllCacRequests);
router.get('/nin', servicesController.getAllNinRequests);
router.get('/requests', servicesController.getServiceRequests);
router.get('/pricing', servicesController.getPricing);

module.exports = router;
