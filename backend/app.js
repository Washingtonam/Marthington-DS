
const express = require("express");
const cors = require("cors");
const { verifyToken } = require("./shared/authGuard");
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
    allowedHeaders: ["Content-Type", "Authorization", "email", "x-paystack-signature"],
    preflightContinue: false,
};

// Middleware - apply CORS and handle preflight
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Paystack webhook is handled under the payments router at POST /api/payments/webhook

// Capture raw request body for Paystack signature verification
app.use(express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
        if (buf && buf.length) {
            req.rawBody = buf;
        }
    },
}));

// Routes
// We group these by service. The controller logic is now hidden inside these routes.
// Match frontend expectations:
// - /api/services/*  -> core services routes (verify, request, etc.)
// - /api/cac/*       -> CAC service routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/finance", require("./routes/finance.routes"));
app.use("/api/payments", require("./routes/payment.routes"));
app.use("/api/users", require("./routes/users.routes"));
app.use("/api/user", require("./routes/users.routes"));
app.use("/api/services", require("./routes/nin.routes"));
app.use("/api/cac", require("./routes/cac.routes"));
app.use("/api/slips", require("./routes/slips.routes"));

// Administrative routes (frontend calls /api/admin/*)
app.use("/api/admin", verifyToken, require("./routes/admin.routes"));
app.use("/api/admin/audit-logs", verifyToken, require("./routes/auditRoutes"));

// Backwards compatibility alias for legacy transaction path
app.get("/api/transactions", verifyToken, async (req, res) => {
    try {
        const Transaction = require("./models/transaction.model");
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const [transactions, totalCount] = await Promise.all([
            Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Transaction.countDocuments({ userId: req.user.id })
        ]);

        const formatted = transactions.map(tx => ({
            _id: tx._id,
            type: tx.type,
            nin: tx.nin || null,
            amount: tx.amount || 0,
            units: tx.units || tx.unitsUsed || 0,
            status: tx.status,
            createdAt: tx.createdAt,
        }));

        res.json({
            success: true,
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            data: formatted
        });
    } catch (err) {
        console.error("DEPRECATED TRANSACTIONS ROUTE ERROR:", err);
        res.status(500).json({ error: "Failed to load transactions" });
    }
});

// Public pricing endpoint (frontend requests GET /api/pricing)
app.get("/api/pricing", async (req, res) => {
    try {
        const Pricing = require("./models/Pricing.model");
        const pricing = await Pricing.getPricing();
        res.json(pricing);
    } catch (err) {
        console.error("PRICING_FETCH_ERROR:", err);
        res.status(500).json({ message: "Failed to load pricing" });
    }
});

module.exports = app;