require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");

// Models
const Pricing = require("./modules/services/Pricing.model");
const ServiceRequest = require("./modules/services/ServiceRequest.model");
const CacRequest = require("./modules/services/CacRequest.model");
const User = require("./modules/users/User.model");

// Routes
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/users.routes");
const financeRoutes = require("./modules/finance/finance.routes");
const ninServicesRoutes = require("./modules/services/nin.routes");
const cacRoutes = require("./modules/services/cac.routes");
const auditRoutes = require("./modules/admin/auditRoutes"); // NEW: Import Audit Routes

const app = express();

// ==============================
// ✅ MIDDLEWARE & CORS
// ==============================
const allowedOrigins = [
  "http://localhost:5173",
  "https://www.xcombinator.com.ng",
  "https://xcombinator.com.ng"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ==============================
// 🛠️ AUTH INTERCEPTOR & USER POPULATION
// ==============================
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : (req.body?.token || req.query?.token);
  
  if (token) {
    req.headers.authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id); // Populates req.user for audit logs
    } catch (e) {
      console.error("Auth Token Invalid");
    }
  }
  next();
});

// ==============================
// 🎯 API ROUTES
// ==============================

// Balance Endpoints
const getBalanceResponse = async (req) => {
  let user = req.user; // Use populated user if available
  if (!user) {
    const email = req.body.email || req.query.email || req.headers.email;
    if (email) user = await User.findOne({ email: email.toLowerCase().trim() });
  }

  return user ? 
    { success: true, units: user.units ?? 0, balance: user.balance ?? user.units ?? 0, credit: user.units ?? 0, wallet: user.units ?? 0 } :
    { success: true, units: 0, balance: 0, credit: 0, wallet: 0 };
};

app.post("/api/balance", async (req, res) => res.json(await getBalanceResponse(req)));
app.get("/api/balance", async (req, res) => res.json(await getBalanceResponse(req)));

// Requests History
app.get("/api/user/requests/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId || userId === "undefined") return res.json([]);
    const [services, cacRequests] = await Promise.all([
      ServiceRequest.find({ userId }).lean(),
      CacRequest.find({ userId }).lean()
    ]);
    const combined = [...services.map(s => ({ ...s, pipelineSource: "service" })), 
                      ...cacRequests.map(c => ({ ...c, pipelineSource: "cac" }))]
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(combined);
  } catch (error) { res.json([]); }
});

// Modular Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/services", ninServicesRoutes);
app.use("/api/cac", cacRoutes);
app.use("/api/admin", financeRoutes);
app.use("/api/admin/audit-logs", auditRoutes); // NEW: Mount Audit Route

app.get("/api/pricing", async (req, res) => {
  try {
    const pricing = await Pricing.findOne() || {
      nin: { unitPrice: 250, agentPrice: 200, mode: "bundle" },
      cacServices: { soleProprietorship: 28000, partnership: 32000, limited1M: 40000 },
      ninServices: { selfService: { emailRetrieval: 4500, deviceUnlink: 5500 } }
    };
    res.json(pricing);
  } catch (err) { res.status(500).json({ message: "Config error" }); }
});

// ==============================
// 🚀 SERVER INIT
// ==============================
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Engine online on port ${PORT}`));
}).catch(err => {
  console.error("Database connection failed", err);
  process.exit(1);
});