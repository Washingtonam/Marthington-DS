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
const auditRoutes = require("./modules/admin/auditRoutes");

const app = express();

// ==============================
// ✅ MIDDLEWARE & CORS
// ==============================
app.use(cors({
  origin: ["https://www.xcombinator.com.ng", "https://xcombinator.com.ng", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ==============================
// 🛠️ AUTH INTERCEPTOR
// ==============================
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

// ==============================
// 🎯 API ROUTES
// ==============================

// Balance Endpoints
const getBalanceResponse = async (req) => {
  let user = req.user;
  if (!user && (req.body.email || req.query.email)) {
    const email = req.body.email || req.query.email;
    user = await User.findOne({ email: email.toLowerCase().trim() });
  }
  return user ? 
    { success: true, units: user.units ?? 0, balance: user.units ?? 0 } :
    { success: true, units: 0, balance: 0 };
};

app.post("/api/balance", async (req, res) => res.json(await getBalanceResponse(req)));
app.get("/api/balance", async (req, res) => res.json(await getBalanceResponse(req)));

// Combined User Requests Route
// Note: Frontend must call: api.get(`/cac/user-requests/${userId}`)
app.get("/api/cac/user-requests/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const [services, cacRequests] = await Promise.all([
      ServiceRequest.find({ userId }).lean(),
      CacRequest.find({ userId }).lean()
    ]);
    const combined = [...services.map(s => ({ ...s, pipelineSource: "service" })), 
                      ...cacRequests.map(c => ({ ...c, pipelineSource: "cac" }))]
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(combined);
  } catch (error) { 
    console.error("Error fetching user requests:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch requests",
      code: "USER_REQUESTS_FETCH_FAILED"
    }); 
  }
});

// Modular Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/services", ninServicesRoutes);
app.use("/api/cac", cacRoutes);
app.use("/api/admin/audit-logs", auditRoutes);

app.get("/api/pricing", async (req, res) => {
  try {
    const pricing = await Pricing.findOne() || {
      nin: { unitPrice: 215 },
      cacServices: { soleProprietorship: 28000, partnership: 32000, limited1M: 40000 }
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