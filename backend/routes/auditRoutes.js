const express = require("express");
const router = express.Router();
const AuditLog = require("./AuditLog.model");

// POST /api/admin/audit-logs
router.post("/", async (req, res) => {
  try {
    const { action, userId, amount, balanceBefore, balanceAfter, note } = req.body;
    
    const newLog = new AuditLog({
      action,
      userId,
      amount,
      balanceBefore,
      balanceAfter,
      note,
      performedBy: req.user?.email || "system" // Assuming you have auth middleware
    });

    await newLog.save();
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Audit Logging Error:", error);
    res.status(500).json({ message: "Failed to log activity" });
  }
});

module.exports = router;