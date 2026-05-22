require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./utils/db");

const authRoutes = require("./api/authRoutes");
const userRoutes = require("./api/userRoutes");
const verificationRoutes = require("./api/verificationRoutes");
const paymentRoutes = require("./api/paymentRoutes");
const adminRoutes = require("./api/adminRoutes");
const slipRoutes = require("./api/slipRoutes");
const transactionsRoutes = require("./api/transactionsRoutes");

const cacRoutes = require("./api/cacRoutes");
const ninServicesRoutes = require("./api/ninServicesRoutes");
const Pricing = require("./models/Pricing");

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
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "email"],
  credentials: true,
  optionsSuccessStatus: 200 // Fixes potential preflight issues on older browsers/gateways
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
  res.json({ status: "OK" });
});

// ==============================
// 🚀 ROUTE CONFIGURATIONS
// ==============================
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", verificationRoutes);
app.use("/api", paymentRoutes);
app.use("/api", transactionsRoutes);
app.use("/api/nin-services", ninServicesRoutes); 
app.use("/api/admin", adminRoutes); // 👈 This maps explicitly to /api/admin/*
app.use("/api", slipRoutes);
app.use("/api/cac", cacRoutes);

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
    res.status(500).json({ message: "Failed to fetch pricing" });
  }
});

// ==============================
// 🛑 404 FALLBACK HANDLER
// ==============================
// This ensures that any incorrect endpoint returns a clean JSON error message 
// instead of breaking the frontend fetch pipeline with raw HTML.
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: `Endpoint Not Found: ${req.method} ${req.originalUrl}` 
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
      console.log(`🚀 Server running smoothly on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });