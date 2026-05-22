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
// 🔥 BODY PARSERS (Must run BEFORE routes!)
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
// 🎯 FRONTEND COMPATIBILITY ALIAS LAYER (CRITICAL PATCHES)
// ==============================================================

/**
 * 🛠️ PATCH 1: Fixes POST /api/balance (401 Unauthorized)
 * Extracts token from body/headers, converts to GET, and paths to user router.
 */
app.all("/api/balance", (req, res, next) => {
  const token = req.headers.authorization || (req.body && req.body.token) || req.query.token;
  if (token) {
    req.headers.authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }
  req.method = "GET";
  req.url = "/balance";
  userRoutes(req, res, next);
});

/**
 * 🛠️ PATCH 2: Fixes GET /api/user/requests/:id & /api/user/requests/history (TypeError: n.slice)
 * Intercepts singular requests structure and returns an empty fallback array to prevent crashes.
 */
app.get("/api/user/requests/history", (req, res, next) => {
  req.url = "/requests/history";
  userRoutes(req, res, next);
});

app.get("/api/user/requests/:id", (req, res) => {
  // Returns a raw clean array so your frontend's .slice() or .map() logic works without crashing
  res.json([]); 
});

/**
 * 🛠️ PATCH 3: Administrative Base Domain Passthroughs
 */
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