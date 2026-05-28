const express = require("express");
const cors = require("cors");
const app = express();

const frontendOrigin = process.env.FRONTEND_URL;
if (!frontendOrigin) {
    throw new Error(
        "Missing required environment variable FRONTEND_URL. Set it to your deployed frontend origin."
    );
}

// Middleware
app.use(cors({ 
    origin: frontendOrigin,
    credentials: true, 
    allowedHeaders: ["Content-Type", "Authorization", "email"] 
}));
app.use(express.json({ limit: "10mb" }));

// Routes
// We group these by service. The controller logic is now hidden inside these routes.
app.use("/api/auth", require("./modules/auth/auth.routes"));
app.use("/api/finance", require("./modules/finance/finance.routes"));
app.use("/api/users", require("./modules/users/users.routes"));
app.use("/api/services/nin", require("./modules/services/nin.routes"));
app.use("/api/services/cac", require("./modules/services/cac.routes"));

module.exports = app;