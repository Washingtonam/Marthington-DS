const mongoose = require("mongoose");

const NimcFepSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  whatsapp: { type: String, required: true, trim: true, maxlength: 20 },
  email: { type: String, trim: true, lowercase: true, default: "", maxlength: 254 },
  notes: { type: String, trim: true, default: "", maxlength: 500 },
  active: { type: Boolean, default: true },
  company: { type: String, default: "VOLSUS Energy Limited", immutable: true },
  city: { type: String, default: "Benin City", immutable: true },
  state: { type: String, default: "Edo", immutable: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

NimcFepSchema.index({ createdBy: 1, name: 1 });

module.exports = mongoose.models.NimcFep || mongoose.model("NimcFep", NimcFepSchema);
