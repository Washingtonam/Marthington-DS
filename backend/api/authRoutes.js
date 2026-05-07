const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Resend } = require("resend");

const User = require("../models/User");

const router = express.Router();

// ==============================
// 📧 RESEND CONFIG
// ==============================
const resend = new Resend(process.env.RESEND_API_KEY);

console.log("📧 RESEND CHECK:", {
  keyLoaded: !!process.env.RESEND_API_KEY
});

// ==============================
// 🔐 REGISTER
// ==============================
router.post("/register", async (req, res) => {
  try {
    let { firstName, lastName, nin, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    email = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName: firstName || "",
      lastName: lastName || "",
      nin: nin || "",
      email,
      password: hashedPassword,
    });

    res.json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
        units: newUser.units || 0,
        role: newUser.role,
      },
    });

  } catch (error) {
    console.error("❌ REGISTER ERROR:", error);
    res.status(500).json({
      error: error.message || "Registration failed",
    });
  }
});

// ==============================
// 🔐 LOGIN
// ==============================
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
      });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }

    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        units: user.units || 0,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    res.status(500).json({
      error: error.message || "Login failed",
    });
  }
});

// ==============================
// 🔐 CHANGE PASSWORD
// ==============================
router.post("/change-password", async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        error: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (error) {
    console.error("❌ CHANGE PASSWORD ERROR:", error);
    res.status(500).json({
      error: "Failed to update password",
    });
  }
});

// ==============================
// 🔥 FORGOT PASSWORD (RESEND)
// ==============================
router.post("/forgot-password", async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    email = email.toLowerCase().trim();

    console.log("📩 Reset request:", email);

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        message: "If email exists, reset link has been sent",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    console.log("🔗 Reset Link:", resetLink);

    const response = await resend.emails.send({
      from: "Xcombinator <onboarding@resend.dev>",
      to: user.email,
      subject: "Reset Your Password",
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    console.log("✅ EMAIL SENT:", response);

    res.json({
      message: "Reset link sent to your email",
    });

  } catch (error) {
    console.error("❌ RESEND ERROR:", error);

    res.status(500).json({
      error: "Failed to send reset email",
    });
  }
});

// ==============================
// 🔥 RESET PASSWORD
// ==============================
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired token",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({
      message: "Password reset successful",
    });

  } catch (error) {
    console.error("❌ RESET PASSWORD ERROR:", error);
    res.status(500).json({
      error: "Failed to reset password",
    });
  }
});

module.exports = router;