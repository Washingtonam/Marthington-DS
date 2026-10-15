const mongoose = require("mongoose");

const supportConversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  status: { type: String, enum: ["open", "closed"], default: "open" },
  lastMessage: { type: String, default: "" },
  lastMessageAt: { type: Date, default: Date.now },
  lastUserMessageAt: { type: Date, default: null },
  lastUserMessageId: { type: mongoose.Schema.Types.ObjectId, default: null },
  lastAdminMessageAt: { type: Date, default: null },
  lastAdminMessageId: { type: mongoose.Schema.Types.ObjectId, default: null },
  adminReadAt: { type: Date, default: null },
  userReadAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.models.SupportConversation
  || mongoose.model("SupportConversation", supportConversationSchema);
