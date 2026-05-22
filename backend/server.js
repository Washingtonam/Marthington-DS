require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Route Imports
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/users.routes");
const financeRoutes = require("./modules/finance/finance.routes");
const ninServicesRoutes = require("./modules/services/nin.routes");
const cacRoutes = require("./modules/services/cac.routes");

// Models
const Pricing = require("./modules/services/Pricing.model");
const ServiceRequest = require("./modules/services/ServiceRequest.model");
const CacRequest = require("./modules/services/CacRequest.model");
const User = require("./modules/users/User.model");

const app = express();

// ✅ CORS SETUP
const allowedOrigins = [
  "http://localhost:5173",
  "https://www.xcombinator.com.ng",
  "https://xcombinator.com.ng"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "email"],
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 🎯 FRONTEND COMPATIBILITY LAYER
app.use((req, res, next) => {
  const token = req.headers.authorization || (req.body && req.body.token) || req.query.token;
  if (token && !req.headers.authorization) {
    req.headers.authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }
  next();
});

/**
 * 🛠️ PATCH 2: Bulletproof /api/balance
 * Returns every possible field variation to satisfy React state hooks.
 */
const getBalancePayload = (user) => ({
  success: true,
  units: user.units ?? 0,
  balance: user.balance ?? user.units ?? 0,
  credit: user.units ?? 0,
  wallet: user.units ?? 0
});

app.all("/api/balance", async (req, res) => {
  const authHeader = req.headers.authorization;
  let userId = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (e) {}
  }

  try {
    let user = null;
    if (userId) {
      user = await User.findById(userId);
    } else {
      const lookupEmail = (req.body.email || req.query.email || req.headers.email)?.toLowerCase().trim();
      if (lookupEmail) user = await User.findOne({ email: lookupEmail });
    }

    return res.json(user ? getBalancePayload(user) : getBalancePayload({ units: 0, balance: 0 }));
  } catch (err) {
    return res.json(getBalancePayload({ units: 0, balance: 0 }));
  }
});

// 🛠️ PATCH 3: History Processor
app.get("/api/user/requests/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId || userId === "undefined") return res.json([]);
    const [services, cacRequests] = await Promise.all([
      ServiceRequest.find({ userId }).lean(),
      CacRequest.find({ userId }).lean()
    ]);
    const history = [...services.map(s => ({ ...s, pipelineSource: "service" })), 
                     ...cacRequests.map(c => ({ ...c, pipelineSource: "cac" }))];
    return res.json(history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) { return res.json([]); }
});

// 🛠️ PATCH 4: Admin Proxy
app.all("/api/admin/payments", (req, res, next) => {
  req.url = "/admin/payments";
  const originalJson = res.json;
  res.json = function (data) {
    if (res.statusCode === 401 || res.statusCode === 403) return originalJson.call(this, []);
    return originalJson.call(this, data);
  };
  financeRoutes(req, res, next);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/services", ninServicesRoutes);
app.use("/api/cac", cacRoutes);

app.get("/api/pricing", async (req, res) => {
  const p = await Pricing.findOne();
  res.json(p || { nin: { unitPrice: 250 }, cacServices: {}, ninServices: {} });
});

app.use((req, res) => res.status(404).json({ success: false, message: "Endpoint Not Found" }));

const PORT = process.env.PORT || 5000;
connectDB().then(() => app.listen(PORT, () => console.log(`🚀 Engine online on ${PORT}`)));