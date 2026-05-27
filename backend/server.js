require("dotenv").config();
const app = require("./app"); // Import the configured app
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Engine online on port ${PORT}`);
  });
}).catch(err => {
  console.error("Database connection failed", err);
  process.exit(1);
});