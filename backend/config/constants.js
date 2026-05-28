// ========================================================
// CENTRALIZED CONSTANTS - All app-wide config values
// ========================================================

// Authentication
module.exports.JWT_EXPIRY = "7d";
module.exports.RESET_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
module.exports.JWT_SECRET_FALLBACK = "your-secret-key-change-in-production";

// Admin
module.exports.SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "admin@xcombinator.com";

// File Upload
module.exports.FILE_UPLOAD_LIMIT = "10mb";
module.exports.MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Pricing & Units
module.exports.UNIT_PRICING_FALLBACK = {
  nin: { unitPrice: 215 },
  cacServices: { soleProprietorship: 28000, partnership: 32000, limited1M: 40000 }
};

module.exports.SERVICE_RATES = {
  noRecord: 5000,
  updateRecord: 5000,
  modificationVerify: 5000,
  vnin: 5000,
  inProcessing: 1000,
  stillProcessing: 1000,
  newEnrollment: 1000,
  invalidTracking: 1000,
  nameCorrection: 7000,
  dob: 50000,
  addressMapping: 7000,
  phoneSync: 7000,
  trackingLookup: 1000,
  emailRetrieval: 4500,
  deviceUnlink: 5500
};

// NIN API Configuration
module.exports.NIN_VERIFY_URL = process.env.NIN_VERIFY_URL || "https://ninbvnportal.com.ng/api/nin-verification";
module.exports.NIN_PHONE_URL = process.env.NIN_PHONE_URL || "https://ninbvnportal.com.ng/api/nin-phone";
module.exports.NIN_TRACKING_URL = process.env.NIN_TRACKING_URL || "https://ninbvnportal.com.ng/api/nin-tracking";
module.exports.NIN_DEMOGRAPHY_URL = process.env.NIN_DEMOGRAPHY_URL || "https://ninbvnportal.com.ng/api/nin-demography";

// API Timeouts
module.exports.NIN_API_TIMEOUT = 15000; // 15 seconds

// Verification Configuration
module.exports.UNITS_REQUIRED = {
  standard: 1,
  phone: 2,
  demographic: 2,
  tracking: 2
};

// Pagination
module.exports.DEFAULT_PAGE_SIZE = 20;
module.exports.MAX_PAGE_SIZE = 100;

const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  throw new Error(
    "Missing required environment variable FRONTEND_URL. This is required for CORS and frontend callbacks."
  );
}

// CORS Origins
module.exports.CORS_ORIGINS = [FRONTEND_URL];

// Frontend URLs
module.exports.FRONTEND_URLs = {
  production: FRONTEND_URL,
  staging: process.env.FRONTEND_STAGING_URL
};
