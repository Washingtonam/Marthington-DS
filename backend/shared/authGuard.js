const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { SUPER_ADMIN_EMAIL, JWT_SECRET_FALLBACK } = require("../config/constants");

// JWT Secret with fallback for development/deployed environments
const JWT_SECRET = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;

/**
 * Core authentication middleware to verify JWT from incoming headers
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access Denied: No authentication token provided.",
    });
  }

  const token = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      message: "Access Denied: Invalid or expired token.",
    });
  }

  let user;
  try {
    user = await User.findById(decoded.id);
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(503).json({ success: false, message: "Unable to verify account access. Please try again." });
  }

  if (!user) {
    return res.status(401).json({ success: false, message: "User not found" });
  }

  if (user.status === "suspended") {
    return res.status(403).json({ success: false, message: "Account suspended" });
  }

  if (user.approvalStatus !== "approved") {
    return res.status(403).json({
      success: false,
      message: user.approvalStatus === "pending" ? "Account pending approval" : "Account not approved",
      code: user.approvalStatus === "pending" ? "ACCOUNT_PENDING_APPROVAL" : "ACCOUNT_NOT_APPROVED",
    });
  }

  req.user = { id: user.id, _id: user._id, email: user.email, role: user.role };
  return next();
};

/**
 * Inline authorization helper check
 * Allows unconditional access to super admin email, or standard admin role.
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const isSuperAdminEmail = req.user.email === SUPER_ADMIN_EMAIL;
  const hasAdminRole = req.user.role === "super_admin" || req.user.role === "admin";

  if (isSuperAdminEmail || hasAdminRole) {
    return next();
  }

  return res.status(403).json({ 
    success: false, 
    message: "Forbidden: Administrative access required." 
  });
};

module.exports = { verifyToken, isAdmin };