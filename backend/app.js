const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const User = require("./modules/users/User.model");

// Routes
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/users.routes");
const financeRoutes = require("./modules/finance/finance.routes");
const ninServicesRoutes = require("./modules/services/nin.routes");
const cacRoutes = require("./modules/services/cac.routes");
const auditRoutes = require("./modules/admin/auditRoutes");

const app = express();

// ✅ MIDDLEWARE
app.use(cors({
  origin: ["https://www.xcombinator.com.ng", "https://xcombinator.com.ng", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 🛠️ AUTH INTERCEPTOR
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : (req.body?.token || req.query?.token);
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (e) {
      console.error("Auth Token Invalid");
    }
  }
  next();
});

// 🎯 API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/services", ninServicesRoutes);
app.use("/api/cac", cacRoutes);
app.use("/api/admin/audit-logs", auditRoutes);

// Export app for the server
module.exports = app;