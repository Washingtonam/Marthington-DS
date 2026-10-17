const { randomUUID } = require("crypto");
const mongoose = require("mongoose");

const WildThoughtSchema = new mongoose.Schema({
  _id: { type: String, default: randomUUID },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  venture: { type: String, trim: true, default: "", maxlength: 100 },
  category: {
    type: String,
    required: true,
    enum: ["Business improvement", "Client lead", "Marketing partnership", "Other"],
  },
  body: { type: String, required: true, trim: true, maxlength: 5000 },
  followUp: { type: String, trim: true, default: "", maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

WildThoughtSchema.index({ createdBy: 1, updatedAt: -1 });

module.exports = mongoose.models.WildThought || mongoose.model("WildThought", WildThoughtSchema);
