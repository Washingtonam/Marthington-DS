const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "SupportConversation", required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderRole: { type: String, enum: ["user", "admin", "super_admin"], required: true },
  senderName: { type: String, required: true, trim: true, maxlength: 160 },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  readByAdminAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.models.SupportMessage
  || mongoose.model("SupportMessage", supportMessageSchema);
