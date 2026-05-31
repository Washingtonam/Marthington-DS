// backend/controllers/services.controller.js
const CacRequest = require('../models/CacRequest.model');
const ServiceRequest = require('../models/ServiceRequest.model');
const Pricing = require('../models/Pricing.model');

// Example: Logic from modules/services/cac.routes.js
exports.getAllCacRequests = async (req, res) => {
  // ...existing logic from cac.routes.js...
};

// Example: Logic from modules/services/nin.routes.js
exports.getAllNinRequests = async (req, res) => {
  // ...existing logic from nin.routes.js...
};

// Example: Logic from modules/services/Pricing.model.js (if any controller logic exists)
exports.getPricing = async (req, res) => {
  // ...existing logic from Pricing.model.js or cac.routes.js...
};
