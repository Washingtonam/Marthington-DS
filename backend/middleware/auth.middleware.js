const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { SUPER_ADMIN_EMAIL, JWT_SECRET_FALLBACK } = require("../config/constants");

const isAdmin = async (req, res, next) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing or invalid Authorization header" });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    
    // Decode JWT token
    const JWT_SECRET = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
    }

    // Fetch user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // Check admin privileges
    const isSuper = decoded.email === SUPER_ADMIN_EMAIL?.toLowerCase().trim();
    if (user.role !== "admin" && user.role !== "super_admin" && !isSuper) {
      return res.status(403).json({ success: false, message: "Administrative clearance required" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(500).json({ success: false, message: "Auth sequence failure" });
  }
};

module.exports = { isAdmin };