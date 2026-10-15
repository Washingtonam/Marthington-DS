const mongoose = require("mongoose");

const supportConversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  status: { type: String, enum: ["open", "closed"], default: "open" },
  lastMessage: { type: String, default: "" },
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.SupportConversation
  || mongoose.model("SupportConversation", supportConversationSchema);
