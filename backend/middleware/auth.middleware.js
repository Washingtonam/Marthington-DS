const User = require("../models/User.model");
const { SUPER_ADMIN_EMAIL } = require("../config/constants");

const isAdmin = async (req, res, next) => {
  try {
    const email = req.headers["email"]?.toLowerCase().trim();
    if (!email) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing Email Header" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "User context not found" });
    }

    // Force super_admin role if email matches constant
    const isSuper = email === SUPER_ADMIN_EMAIL?.toLowerCase().trim();
    if (user.role !== "admin" && !isSuper) {
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