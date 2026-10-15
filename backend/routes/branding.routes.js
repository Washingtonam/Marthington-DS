const express = require("express");
const SystemSettings = require("../models/SystemSettings.model");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const settings = await SystemSettings.findOne({ key: "global" })
      .select("businessName businessTagline businessLogoUrl")
      .lean();
    return res.json({
      success: true,
      branding: {
        businessName: settings?.businessName || "Marthington",
        businessTagline: settings?.businessTagline || "Digital Services",
        businessLogoUrl: settings?.businessLogoUrl || "",
      },
    });
  } catch (error) {
    console.error("PUBLIC BRANDING READ ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load business branding." });
  }
});

module.exports = router;
