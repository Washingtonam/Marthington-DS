const express = require("express");
const Notification = require("../models/Notification.model");
const { verifyToken } = require("../shared/authGuard");

const router = express.Router();
const adminRouter = express.Router();

const isSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Super admin access required." });
  }
  next();
};

const normalizeNotification = (notification) => ({
  ...notification,
  _id: notification._id?.toString(),
  startsAt: notification.startsAt ? new Date(notification.startsAt).toISOString() : null,
  endsAt: notification.endsAt ? new Date(notification.endsAt).toISOString() : null,
});

const isWithinSchedule = (notification, now = new Date()) => {
  const starts = notification.startsAt ? new Date(notification.startsAt) : null;
  const ends = notification.endsAt ? new Date(notification.endsAt) : null;
  return (!starts || starts <= now) && (!ends || ends >= now);
};

const matchesTarget = (notification, path, service) => {
  if (notification.targetType === "global") return true;
  if (notification.targetType === "page") return notification.targetValue === path;
  return notification.targetValue === service;
};

const editableFields = [
  "title",
  "message",
  "type",
  "isActive",
  "startsAt",
  "endsAt",
  "targetType",
  "targetValue",
  "dismissible",
  "displayMode",
  "priority",
];

const pickEditableFields = (body) => editableFields.reduce((payload, field) => {
  if (Object.prototype.hasOwnProperty.call(body, field)) payload[field] = body[field];
  return payload;
}, {});

const validatePayload = (body, { partial = false } = {}) => {
  const allowedTypes = ["info", "warning", "success", "critical"];
  const allowedTargets = ["global", "page", "service"];
  const allowedDisplayModes = ["everyVisit", "oncePerSession", "oncePerUser"];
  const targetType = body.targetType;
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;

  if (!partial && !String(body.title || "").trim()) return "title is required.";
  if (!partial && !String(body.message || "").trim()) return "message is required.";
  if (body.title !== undefined && !String(body.title).trim()) return "title cannot be empty.";
  if (body.message !== undefined && !String(body.message).trim()) return "message cannot be empty.";
  if (body.type !== undefined && !allowedTypes.includes(body.type)) return "type is invalid.";
  if (targetType !== undefined && !allowedTargets.includes(targetType)) return "targetType is invalid.";
  if (body.displayMode !== undefined && !allowedDisplayModes.includes(body.displayMode)) return "displayMode is invalid.";
  if (body.priority !== undefined && (!Number.isInteger(Number(body.priority)) || Number(body.priority) < 0 || Number(body.priority) > 100)) {
    return "priority must be an integer between 0 and 100.";
  }
  if (body.startsAt && Number.isNaN(startsAt.getTime())) return "startsAt must be a valid date.";
  if (body.endsAt && Number.isNaN(endsAt.getTime())) return "endsAt must be a valid date.";
  if (startsAt && endsAt && endsAt < startsAt) return "endsAt must be after startsAt.";
  if (targetType && targetType !== "global" && !String(body.targetValue || "").trim()) {
    return "targetValue is required for page and service notifications.";
  }
  return null;
};

router.get("/active", async (req, res) => {
  try {
    const path = String(req.query.path || "/");
    const service = String(req.query.service || "");
    const now = new Date();
    const notifications = await Notification.find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    const visible = notifications
      .filter((notification) => isWithinSchedule(notification, now))
      .filter((notification) => matchesTarget(notification, path, service))
      .map(normalizeNotification);

    res.json({ success: true, notifications: visible });
  } catch (error) {
    console.error("FETCH ACTIVE NOTIFICATIONS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch active notifications." });
  }
});

adminRouter.use(isSuperAdmin);

adminRouter.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ isActive: -1, priority: -1, createdAt: -1 }).lean();
    res.json({ success: true, notifications: notifications.map(normalizeNotification) });
  } catch (error) {
    console.error("FETCH NOTIFICATIONS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const validationError = validatePayload(req.body || {});
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const notification = await Notification.create({
      ...pickEditableFields(req.body || {}),
      createdBy: req.user?.id || null,
    });
    res.status(201).json({ success: true, notification: normalizeNotification(notification.toObject()) });
  } catch (error) {
    console.error("CREATE NOTIFICATION ERROR:", error);
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid notification data." });
    }
    res.status(500).json({ success: false, message: "Failed to create notification." });
  }
});

adminRouter.patch("/:id", async (req, res) => {
  try {
    const validationError = validatePayload(req.body || {}, { partial: true });
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: pickEditableFields(req.body || {}) },
      { new: true, runValidators: true }
    ).lean();
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found." });
    res.json({ success: true, notification: normalizeNotification(notification) });
  } catch (error) {
    console.error("UPDATE NOTIFICATION ERROR:", error);
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid notification data." });
    }
    res.status(500).json({ success: false, message: "Failed to update notification." });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id).lean();
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found." });
    res.json({ success: true, message: "Notification deleted." });
  } catch (error) {
    console.error("DELETE NOTIFICATION ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to delete notification." });
  }
});

adminRouter.patch("/:id/toggle", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found." });
    notification.isActive = !notification.isActive;
    await notification.save();
    res.json({ success: true, notification: normalizeNotification(notification.toObject()) });
  } catch (error) {
    console.error("TOGGLE NOTIFICATION ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to toggle notification." });
  }
});

module.exports = {
  router,
  adminRouter,
  isWithinSchedule,
  matchesTarget,
  validatePayload,
};
