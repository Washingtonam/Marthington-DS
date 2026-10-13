const mongoose = require("mongoose");
const fs = require("fs");
require("dotenv").config();

const User = require("./models/User");

// connect DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

async function migrate() {
  try {
    const raw = fs.readFileSync("./utils/db.json");
    const db = JSON.parse(raw);

    const users = db.users || [];

    console.log(`🚀 Found ${users.length} users`);

    for (let u of users) {
      const exists = await User.findOne({ email: u.email });

      if (exists) {
        console.log(`⚠️ Skipped (already exists): ${u.email}`);
        continue;
      }

      await User.create({
        email: u.email,
        password: u.password, // already hashed
        balance: u.balance || 0,
        status: u.status || "active",
      });

      console.log(`✅ Migrated: ${u.email}`);
    }

    console.log("🎉 Migration completed!");
    process.exit();

  } catch (err) {
    console.error("🔥 Migration error:", err);
    process.exit(1);
  }
}

migrate();