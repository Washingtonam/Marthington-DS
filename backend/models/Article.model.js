const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 160 },
  summary: { type: String, trim: true, maxlength: 500, default: "" },
  category: { type: String, trim: true, maxlength: 80, default: "NIMC Guide" },
  body: { type: String, required: true, maxlength: 200000 },
  sourceName: { type: String, trim: true, maxlength: 160, default: "" },
  sourceUrl: { type: String, trim: true, maxlength: 2048, default: "" },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  publishedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

articleSchema.index({ status: 1, publishedAt: -1 });

module.exports = mongoose.models.Article || mongoose.model("Article", articleSchema);