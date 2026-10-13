/**
 * DEPRECATED: This file uses Puppeteer which is heavy and slow on deployment.
 * 
 * NEW APPROACH: All PDF generation now uses PDFKit in pdfGeneratorKit.js
 * This is faster, lighter, and more reliable for deployment.
 * 
 * For backward compatibility, this file exports a wrapper that uses PDFKit instead.
 */

const { generateNINSlip } = require("./pdfGeneratorKit");

async function generateNINSlip_Deprecated(data) {
  console.warn("⚠️ Using deprecated generateNINSlip from pdfGenerator.js");
  console.warn("   Please update to use pdfGeneratorKit.js instead");
  return await generateNINSlip(data);
}

module.exports = { generateNINSlip: generateNINSlip_Deprecated };