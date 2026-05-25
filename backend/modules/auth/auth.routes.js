const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");

// Localized feature path configuration
const User = require("../users/User.model");
const { verifyToken } = require("../../shared/authGuard");
const { JWT_EXPIRY, SUPER_ADMIN_EMAIL } = require("../../config/constants");

const router = express.Router();

// ==============================
// 📧 RESEND CONFIG
// ==============================
const resend = new Resend(process.env.RESEND_API_KEY);

// ==============================
// 🔐 REGISTER
// ==============================
router.post("/register", async (req, res) => {
  try {
    let { firstName, lastName, nin, email, password, confirmPassword } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match",
      });
    }

    // Sanitize inputs
    email = email.toLowerCase().trim();
    firstName = (firstName || "").trim();
    lastName = (lastName || "").trim();
    nin = (nin || "").trim();

    // Validate password strength
    if (password.length < 12) {
      return res.status(400).json({
        error: "Password must be at least 12 characters long",
      });
    }

    const hasPasswordUppercase = /[A-Z]/.test(password);
    const hasPasswordLowercase = /[a-z]/.test(password);
    const hasPasswordNumbers = /[0-9]/.test(password);
    const hasPasswordSpecial = /[!@#$%^&*]/.test(password);

    if (!hasPasswordUppercase || !hasPasswordLowercase || !hasPasswordNumbers || !hasPasswordSpecial) {
      return res.status(400).json({
        error: "Password must contain uppercase, lowercase, numbers, and special characters (!@#$%^&*)",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Explicit check: If it's your primary email, automatically enforce super_admin role
    let assignedRole = "user";
    if (email === SUPER_ADMIN_EMAIL) {
      assignedRole = "super_admin";
    }

    const newUser = await User.create({
      firstName: firstName || "",
      lastName: lastName || "",
      nin: nin || "",
      email,
      password: hashedPassword,
      role: assignedRole, // Dynamic role assignment
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
        units: newUser.units || 0,
        role: newUser.role,
      },
    });

  } catch (error) {
    console.error("❌ REGISTER ERROR:", error.message);
    res.status(500).json({
      error: "Registration failed",
      code: "REGISTRATION_FAILED"
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

    // Double check system fallback safety: ensure role matches email on-login
    if (user.email === "washingtonamedu@gmail.com" && user.role !== "super_admin") {
      user.role = "super_admin";
    }

    user.lastLogin = new Date();
    await user.save();

    // Generate JWT Token for seamless frontend storage and cross-platform mobile compatibility
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Token remains active for 7 days
    );

    res.json({
      message: "Login successful",
      token, // Passed down back to frontend application instances
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
// 🔐 CHANGE PASSWORD (AUTHENTICATED)
// ==============================
router.post("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Pulled directly from verifyToken payload safely

    if (!currentPassword || !newPassword) {
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

    await resend.emails.send({
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