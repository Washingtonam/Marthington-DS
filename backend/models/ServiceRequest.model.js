const mongoose = require("mongoose");

const ServiceRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true
  },
  service: {
    type: String,
    required: true // e.g., "validation", "modification", "nimc_manual"
  },
  type: {
    type: String,
    required: true // e.g., "nameCorrection", "trackingLookup", "vnin"
  },
  serviceCategory: {
    type: String,
    enum: ["NIMC", "CAC"],
    default: "NIMC"
  },
  nin: {
    type: String,
    default: "N/A"
  },
  slipType: {
    type: String,
    default: "none"
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  amountKobo: {
    type: Number,
    default: 0
  },
  priceAtTimeOfRequest: {
    type: Number,
    required: true,
    default: 0
  },
  unitsUsed: {
    type: Number,
    default: 0
  },
  proof: {
    type: String,
    default: "N/A"
  },
  passport: {
    type: String,
    default: "N/A"
  },
  formData: {
    type: mongoose.Schema.Types.Mixed, 
    default: {}
  },
  apiResponseData: {
    type: mongoose.Schema.Types.Mixed,
    default: null // Stores raw data directly returned by your third-party portal
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "rejected", "failed"],
    default: "pending"
  },
  statusHistory: [
    {
      status: { type: String },
      note: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.models.ServiceRequest || mongoose.model("ServiceRequest", ServiceRequestSchema);