const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");

const User = require("../models/User.model");
const { verifyToken } = require("../shared/authGuard");
const { JWT_EXPIRY, SUPER_ADMIN_EMAIL } = require("../config/constants");

const router = express.Router();

// ...existing code from modules_old/auth/auth.routes.js...
// (All route handlers as in the old file)

module.exports = router;
