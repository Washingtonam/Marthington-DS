const express = require("express");
const router = express.Router();
const {
  generateDataSlip,
  generatePremiumSlip,
  generateLongSlip,
} = require("../shared/pdfGeneratorKit");

// ==============================
// 🔢 GENERATOR
// ==============================
const generateTrackingId = () => {
  return "TRK-" + Math.random().toString(36).substring(2, 10).toUpperCase();
};

const formatImage = (photo) => {
  if (!photo) return "";

  // already correct
  if (photo.startsWith("data:image")) {
    return photo;
  }

  // convert raw base64 → proper format
  return `data:image/png;base64,${photo}`;
};

// ==============================
// 🚀 MAIN ROUTE
// ==============================
router.post("/generate-nin-slip", async (req, res) => {
  try {
    const { data, type } = req.body;

    if (!data) {
      return res.status(400).json({ message: "No data provided" });
    }

    const trackingId = generateTrackingId();
    let pdfBuffer;

    // Generate PDF based on type using PDFKit
    if (type === "data") {
      pdfBuffer = await generateDataSlip({ ...data, trackingId }, trackingId);
    } else if (type === "premium") {
      pdfBuffer = await generatePremiumSlip({ ...data, trackingId }, trackingId);
    } else if (type === "long") {
      pdfBuffer = await generateLongSlip({ ...data, trackingId }, trackingId);
    } else {
      return res.status(400).json({ message: "Invalid slip type" });
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(500).json({ message: "PDF generation failed" });
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${type}-slip-${trackingId}.pdf`,
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error("🔥 PDF ERROR:", error);
    res.status(500).json({ message: "Slip generation failed", error: error.message });
  }
});


// =======================================================
// HTML generators removed - now using PDFKit directly
// All PDF generation is handled by pdfGeneratorKit.js
// =======================================================

module.exports = router;