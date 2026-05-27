const express = require("express");
const cors = require("cors");
const app = express();

// Middleware
app.use(cors({ 
    origin: ["https://xcombinator.com.ng", "http://localhost:5173"], 
    credentials: true, 
    allowedHeaders: ["Content-Type", "Authorization", "email"] 
}));
app.use(express.json({ limit: "10mb" }));

// Routes
// We group these by service. The controller logic is now hidden inside these routes.
app.use("/api/auth", require("./modules/auth/auth.routes"));
app.use("/api/finance", require("./modules/finance/finance.routes"));
app.use("/api/services/nin", require("./modules/services/nin.routes"));
app.use("/api/services/cac", require("./modules/services/cac.routes"));

module.exports = app;