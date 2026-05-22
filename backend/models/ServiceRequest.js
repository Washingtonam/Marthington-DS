const mongoose = require("mongoose");

const ServiceRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: false // Changed to false or fallback friendly to avoid validation rejection
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
  // 💡 CRITICAL: Ensure formData is typed to handle flexible mixed objects safely
  formData: {
    type: mongoose.Schema.Types.Mixed, 
    default: {}
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending"
  },
  statusHistory: [
    {
      status: String,
      note: String,
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("ServiceRequest", ServiceRequestSchema);