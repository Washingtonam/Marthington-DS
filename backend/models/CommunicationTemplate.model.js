const mongoose = require("mongoose");

const communicationTemplateSchema = new mongoose.Schema({
  key: { type: String, trim: true, unique: true, sparse: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  channel: { type: String, enum: ["email", "whatsapp", "both"], required: true },
  subject: { type: String, trim: true, maxlength: 120, default: "" },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

module.exports = mongoose.models.CommunicationTemplate
  || mongoose.model("CommunicationTemplate", communicationTemplateSchema);
