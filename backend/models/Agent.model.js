const mongoose = require("mongoose");

const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  whatsapp: { type: String, required: true, trim: true, maxlength: 20 },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

AgentSchema.index({ name: 1 });
AgentSchema.index({ whatsapp: 1 });

module.exports = mongoose.models.Agent || mongoose.model("Agent", AgentSchema);
