const express = require("express");
const cors = require("cors");
const app = express();

// Allowed frontend origins for production (explicit - do not use '*')
const allowedOrigins = new Set([
    process.env.FRONTEND_URL, // e.g. https://www.xcombinator.com.ng
    process.env.FRONTEND_URL_NAKED, // optional: https://xcombinator.com.ng
    "https://www.xcombinator.com.ng",
    "https://xcombinator.com.ng",
].filter(Boolean));

// CORS middleware with dynamic origin check to support credentials
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. curl, server-side)
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error("CORS policy: This origin is not allowed."), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "email"],
    preflightContinue: false,
};

// Middleware - apply CORS and handle preflight
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// Routes
// We group these by service. The controller logic is now hidden inside these routes.
app.use("/api/auth", require("./modules/auth/auth.routes"));
app.use("/api/finance", require("./modules/finance/finance.routes"));
app.use("/api/users", require("./modules/users/users.routes"));
// Match frontend expectations:
// - /api/services/*  -> core services routes (verify, request, etc.)
// - /api/cac/*       -> CAC service routes
app.use("/api/services", require("./modules/services/nin.routes"));
app.use("/api/cac", require("./modules/services/cac.routes"));

// Administrative routes (frontend calls /api/admin/*)
app.use("/api/admin", require("./modules/admin/admin.routes"));

// Public pricing endpoint (frontend requests GET /api/pricing)
app.get("/api/pricing", async (req, res) => {
    try {
        const Pricing = require("./modules/services/Pricing.model");
        const pricing = await Pricing.getPricing();
        res.json(pricing);
    } catch (err) {
        console.error("PRICING_FETCH_ERROR:", err);
        res.status(500).json({ message: "Failed to load pricing" });
    }
});

module.exports = app;