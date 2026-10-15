const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    enum: ["global"],
    default: "global",
    unique: true,
  },
  commissionType: {
    type: String,
    enum: ["FLAT", "PERCENTAGE"],
    default: "FLAT",
  },
  commissionValue: {
    type: Number,
    min: 0.01,
    default: 2000,
  },
  businessName: {
    type: String,
    trim: true,
    maxlength: 100,
    default: "Marthington",
  },
  businessTagline: {
    type: String,
    trim: true,
    maxlength: 120,
    default: "Digital Services",
  },
  businessLogoUrl: {
    type: String,
    trim: true,
    maxlength: 2048,
    default: "",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.models.SystemSettings
  || mongoose.model("SystemSettings", systemSettingsSchema);
