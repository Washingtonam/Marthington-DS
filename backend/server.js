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
  allowedHeaders: ["Content-Type", "Authorization", "email"], // Matches custom headers passed by your frontend
  credentials: true,
  optionsSuccessStatus: 200 // Fixes potential preflight issues on older mobile gateways/browsers
};

// Apply CORS globally across all routes immediately
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
// 🚀 CLEAN MODULAR PIPELINE ROUTE CONFIGURATIONS
// ==============================================================
app.use("/api/auth", authRoutes);       // Mounts /api/auth/register, /api/auth/login

// 👥 USER ROUTING MAP & ALIASES
app.use("/api/users", userRoutes);     // Core Plural Route: Mounts /api/users/balance, etc.
app.use("/api/user", userRoutes);      // 👈 ALIAS 1: Catching singular frontend calls like /api/user/requests/:id

// 💰 FINANCE ROUTING MAP & ALIASES
app.use("/api/finance", financeRoutes); // Core Finance Route: Mounts /api/finance/submit-payment
app.use("/api/admin", financeRoutes);   // Admin Dashboard Route: Maps /api/admin/payments

// ==============================================================
// 🔄 ROOT PATH ALIASING MIDDLEWARE FOR EXACT FRONTEND MATCHES
// ==============================================================
// 👈 ALIAS 2: Explicitly intercept root-level /api/balance and map it cleanly to user sub-routes
app.use("/api/balance", (req, res, next) => {
  req.url = "/balance"; 
  userRoutes(req, res, next);
});

// 🏢 ADDITIONAL DOCUMENT / IDENTITY SERVICES ROUTES
app.use("/api/services", ninServicesRoutes); // Mounts /api/services/request, /api/services/verify
app.use("/api/cac", cacRoutes);         // Mounts /api/cac/submit, /api/cac/history

// ==============================
// 💰 PRICING SEED PROTECTION
// ==============================
app.get("/api/pricing", async (req, res) => {
  try {
    const pricing = await Pricing.findOne();

    if (!pricing) {
      return res.json({
        nin: {
          unitPrice: 250,
          agentPrice: 200,
          mode: "bundle",
        },
        cacServices: {
          soleProprietorship: 28000,
          partnership: 32000,
          limited1M: 40000
        },
        ninServices: {
          selfService: {
            emailRetrieval: 4500,
            deviceUnlink: 5500
          }
        }
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