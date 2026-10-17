const mongoose = require("mongoose");

const OutsourcedAgentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  whatsapp: { type: String, trim: true, maxlength: 20, default: "" },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
  notes: { type: String, trim: true, maxlength: 500, default: "" },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

OutsourcedAgentSchema.index({ name: 1 });

module.exports = mongoose.models.OutsourcedAgent || mongoose.model("OutsourcedAgent", OutsourcedAgentSchema);
