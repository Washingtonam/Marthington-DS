require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

// ==============================================================
// 📦 UNIFIED FEATURE MODULE ROUTE IMPORTS
// ==============================================================
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/users.routes");
const financeRoutes = require("./modules/finance/finance.routes");
const ninServicesRoutes = require("./modules/services/nin.routes");
const cacRoutes = require("./modules/services/cac.routes");

// Models
const Pricing = require("./modules/services/Pricing.model");
const ServiceRequest = require("./modules/services/ServiceRequest.model");
const CacRequest = require("./modules/services/CacRequest.model");

const app = express();

// ==============================
// ✅ CORS SETUP (GLOBAL & PREFLIGHT)
// ==============================
const allowedOrigins = [
  "http://localhost:5173",
  "https://www.xcombinator.com.ng",
  "https://xcombinator.com.ng"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "email"],
  credentials: true,
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ==============================
// 🔥 BODY PARSERS
// ==============================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ==============================
// 🧠 HEALTH CHECK
// ==============================
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// ==============================================================
// 🎯 FRONTEND COMPATIBILITY LAYER (AIRTIGHT COMPATIBILITY PATCHES)
// ==============================================================

/**
 * 🛠️ PATCH 1: Global Authorization Token Injector
 * If the frontend hook emits requests without headers, we attempt to capture 
 * the token from the request body or query params before it hits authGuard middleware.
 */
app.use((req, res, next) => {
  const token = req.headers.authorization || (req.body && req.body.token) || req.query.token;
  if (token && !req.headers.authorization) {
    req.headers.authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }
  next();
});

/**
 * 🛠️ PATCH 2: Bulletproof POST /api/balance route interceptor
 */
app.all("/api/balance", (req, res, next) => {
  req.method = "GET";
  req.url = "/balance";
  userRoutes(req, res, next);
});

/**
 * 🛠️ PATCH 3: Flat Array Processor for User Requests (Fixes n.slice crash)
 * Completely eliminates the 404/Object mapping mismatch by executing the query 
 * directly and returning a flat array payload matching line 50 of Dashboard.jsx.
 */
app.get("/api/user/requests/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const [services, cacRequests] = await Promise.all([
      ServiceRequest.find({ userId }).lean(),
      CacRequest.find({ userId }).lean()
    ]);

    const normalizedServices = services.map(s => ({ ...s, pipelineSource: "service" }));
    const normalizedCac = cacRequests.map(c => ({ ...c, pipelineSource: "cac" }));

    const combinedHistory = [...normalizedServices, ...normalizedCac].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Return direct array so data.slice(0, 4) executes successfully!
    return res.json(combinedHistory);
  } catch (error) {
    console.error("🔥 FLAT DASHBOARD REQUESTS ERROR:", error.message);
    return res.json([]); // Return safe array fallback to ensure frontend never breaks
  }
});

// Admin Route Mapping Fallbacks
app.use("/api/admin/payments", financeRoutes); 
app.use("/api/admin", financeRoutes);          
app.use("/api/user", userRoutes);              

// ==============================================================
// 🚀 CLEAN STANDARD MODULAR PIPELINE ROUTE CONFIGURATIONS
// ==============================================================
app.use("/api/auth", authRoutes);       
app.use("/api/users", userRoutes);     
app.use("/api/finance", financeRoutes); 
app.use("/api/services", ninServicesRoutes); 
app.use("/api/cac", cacRoutes);        

// ==============================
// 💰 PRICING SEED PROTECTION
// ==============================
app.get("/api/pricing", async (req, res) => {
  try {
    const pricing = await Pricing.findOne();
    if (!pricing) {
      return res.json({
        nin: { unitPrice: 250, agentPrice: 200, mode: "bundle" },
        cacServices: { soleProprietorship: 28000, partnership: 32000, limited1M: 40000 },
        ninServices: { selfService: { emailRetrieval: 4500, deviceUnlink: 5500 } }
      });
    } 
    res.json(pricing);
  } catch (err) {
    console.error("PRICING ERROR:", err.message);
    res.status(500).json({ message: "Failed to fetch pricing config matrix." });
  }
});

// ==============================
// 🛑 404 FALLBACK HANDLER
// ==============================
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: `Endpoint Not Found on Engine Matrix: ${req.method} ${req.originalUrl}` 
  });
});

// ==============================
// 🚀 SERVER INITIALIZATION
// ==============================
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    app.listen(PORT, () => {
      console.log(`🚀 Modular Engine running smoothly on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });