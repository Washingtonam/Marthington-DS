const jwt = require("jsonwebtoken");

/**
 * Core authentication middleware to verify JWT from incoming headers
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false, 
        message: "Access Denied: No authentication token provided." 
      });
    }

    // Extract token string
    const token = authHeader.split(" ")[1];

    // Verify token using secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach decoded user data (id, email, role) straight to request object
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: "Access Denied: Invalid or expired token." 
    });
  }
};

/**
 * Inline authorization helper check
 * Allows unconditional access to super admin email, or standard admin role.
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const isSuperAdminEmail = req.user.email === "washingtonamedu@gmail.com";
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