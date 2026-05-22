const mongoose = require("mongoose");
const fs = require("fs");

// ==============================
// 🔥 MONGODB CONNECTION
// ==============================
const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...");

    if (!process.env.MONGO_URI) {
      console.log("❌ MONGO_URI missing");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB ERROR:", error.message);
    process.exit(1);
  }
};

// ==============================
// 📄 JSON (FOR PRICING ONLY)
// ==============================
const dbPath = "./db.json";

const readDB = () => {
  try {
    const data = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading DB:", error);
    return {};
  }
};

const writeDB = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing DB:", error);
  }
};

module.exports = {
  connectDB,
  readDB,
  writeDB,
};