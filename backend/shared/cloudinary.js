const cloudinary = require("cloudinary").v2;

// ==============================
// ☁️ CLOUDINARY CONFIG
// ==============================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==============================
// 🚀 UPLOAD FUNCTION
// ==============================
const uploadToCloudinary = async (file, folder = "xcombinator") => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: "auto",
    });

    return result.secure_url;

  } catch (err) {
    console.error("❌ CLOUDINARY ERROR:", err);
    throw err;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
};

// Ensure the provided value is a Cloudinary-hosted URL. If the value appears to be
// a data URL or a local/base64 image, upload it and return the secure URL.
const isDataUrl = (str) => typeof str === 'string' && /^data:.*;base64,/.test(str);
const isHttpUrl = (str) => typeof str === 'string' && /^(https?:)?\/\//i.test(str);

const ensureUploaded = async (value, folder = 'uploads') => {
  if (!value) return null;
  if (isHttpUrl(value)) return value;
  // For any non-http string (likely base64), attempt upload
  if (isDataUrl(value) || typeof value === 'string') {
    return await uploadToCloudinary(value, folder);
  }
  return null;
};

module.exports.ensureUploaded = ensureUploaded;