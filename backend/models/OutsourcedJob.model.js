const mongoose = require("mongoose");

const OutsourcedJobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  agentName: { type: String, required: true, trim: true, maxlength: 120, default: "Abdul" },
  status: {
    type: String,
    enum: ["assigned", "in-progress", "completed", "cancelled"],
    default: "assigned",
  },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

OutsourcedJobSchema.index({ createdAt: -1 });

module.exports = mongoose.models.OutsourcedJob || mongoose.model("OutsourcedJob", OutsourcedJobSchema);
