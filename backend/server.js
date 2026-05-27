require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db"); // We use the professional config file

const PORT = process.env.PORT || 5000;

// Connect to DB then start the listener
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Engine online on port ${PORT}`);
    });
}).catch(err => {
    console.error("❌ Startup failed:", err.message);
    process.exit(1);
});