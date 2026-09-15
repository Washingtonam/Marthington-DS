const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    type: {
      type: String,
      enum: ["info", "warning", "success", "critical"],
      default: "info",
    },
    isActive: { type: Boolean, default: false },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    targetType: {
      type: String,
      enum: ["global", "page", "service"],
      default: "global",
    },
    targetValue: { type: String, trim: true, default: "" },
    dismissible: { type: Boolean, default: true },
    displayMode: {
      type: String,
      enum: ["everyVisit", "oncePerSession", "oncePerUser"],
      default: "everyVisit",
    },
    priority: { type: Number, min: 0, max: 100, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ isActive: 1, startsAt: 1, endsAt: 1, priority: -1 });
notificationSchema.index({ targetType: 1, targetValue: 1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
