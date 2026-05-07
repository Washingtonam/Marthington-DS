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
const ninServicesRoutes = require("./api/ninServicesRoutes");

const Pricing = require("./models/Pricing");

const app = express();

// ==============================
// ✅ CORS (FIXED PROPERLY)
// ==============================
const allowedOrigins = [
  "http://localhost:5173",
  "https://www.xcombinator.com.ng",
  "https://xcombinator.com.ng"
];

app.use(cors({
  origin: function (origin, callback) {

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },

  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "email"
  ],

  credentials: true
}));

// 🔥 VERY IMPORTANT (THIS FIXES YOUR ISSUE)
app.options("*", cors());

// ==============================
// 🔥 BODY PARSER
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
// 🚀 ROUTES
// ==============================
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", verificationRoutes);
app.use("/api", paymentRoutes);
app.use("/api", transactionsRoutes);
app.use("/api", ninServicesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", slipRoutes);

// ==============================
// 💰 PRICING
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
      });
    }

    res.json(pricing);

  } catch (err) {
    console.error("PRICING ERROR:", err.message);
    res.status(500).json({ message: "Failed to fetch pricing" });
  }
});

// ==============================
// 🚀 START SERVER AFTER DB
// ==============================
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });