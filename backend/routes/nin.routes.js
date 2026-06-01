const express = require("express");
const axios = require("axios");
const Joi = require("joi");
const mongoose = require("mongoose");
const router = express.Router();

const User = require("../models/User.model");
const ServiceRequest = require("../models/ServiceRequest.model");
const Transaction = require("../models/transaction.model");
const Pricing = require("../models/Pricing.model");
const { verifyToken, isAdmin } = require("../shared/authGuard");
const { validateServiceRequest, validateVerification } = require("../shared/validators");
const {
  SUPER_ADMIN_EMAIL,
  NIN_VERIFY_URL,
  NIN_PHONE_URL,
  NIN_TRACKING_URL,
  NIN_DEMOGRAPHY_URL,
  NIN_API_TIMEOUT,
  UNITS_REQUIRED
} = require("../config/constants");

// ...existing code from modules_old/services/nin.routes.js...
// (All route handlers as in the old file)

module.exports = router;
