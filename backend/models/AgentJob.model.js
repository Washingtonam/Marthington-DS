const mongoose = require("mongoose");

const AgentJobSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", default: null },
  registeredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  customerType: { type: String, enum: ["manual", "registered"], required: true },
  agentName: { type: String, required: true, trim: true, maxlength: 120 },
  agentEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
  agentWhatsapp: { type: String, trim: true, maxlength: 20, default: "" },
  serviceCode: { type: String, trim: true, maxlength: 100, default: "" },
  serviceCategory: { type: String, trim: true, maxlength: 80, default: "" },
  serviceType: { type: String, required: true, trim: true, maxlength: 100 },
  formData: { type: mongoose.Schema.Types.Mixed, default: {} },
  amount: { type: Number, min: 0, default: 0 },
  status: {
    type: String,
    enum: ["pending", "in-progress", "completed", "cancelled"],
    default: "pending",
  },
  statusHistory: [{
    status: { type: String, required: true },
    note: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  }],
  adminComments: [{
    author: { type: String, default: "" },
    authorRole: { type: String, default: "super_admin" },
    comment: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

AgentJobSchema.pre("validate", function validateCustomerReference() {
  if (Boolean(this.agentId) === Boolean(this.registeredUserId)) {
    this.invalidate("agentId", "A job must be linked to exactly one manual agent or registered account.");
  }
  if (this.customerType === "manual" && !this.agentId) {
    this.invalidate("agentId", "A manual agent is required.");
  }
  if (this.customerType === "registered" && !this.registeredUserId) {
    this.invalidate("registeredUserId", "A registered account is required.");
  }
});

AgentJobSchema.index({ agentId: 1, createdAt: -1 });
AgentJobSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AgentJob || mongoose.model("AgentJob", AgentJobSchema);
