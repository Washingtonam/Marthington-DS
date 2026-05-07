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