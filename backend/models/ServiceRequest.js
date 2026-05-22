const mongoose = require("mongoose");

const ServiceRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: false // Fallback friendly to avoid workspace token rejection loops
  },
  service: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
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
    required: true
  },
  proof: {
    type: String,
    default: "N/A"
  },
  passport: {
    type: String,
    default: "N/A"
  },
  // Handles structural variations inside modern identity service requests cleanly
  formData: {
    type: mongoose.Schema.Types.Mixed, 
    default: {}
  },
  // 🔄 ALIGNED ENUM STRINGS TO REJECT MATCH CODES
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

// Checks if the model already exists in Mongoose memory before creating a new one
module.exports = mongoose.models.ServiceRequest || mongoose.model("ServiceRequest", ServiceRequestSchema);