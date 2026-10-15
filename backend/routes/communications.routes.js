const express = require("express");
const mongoose = require("mongoose");
const { Resend } = require("resend");
const Agent = require("../models/Agent.model");
const CommunicationTemplate = require("../models/CommunicationTemplate.model");
const SupportConversation = require("../models/SupportConversation.model");
const SupportMessage = require("../models/SupportMessage.model");
const User = require("../models/User.model");
const { isAdmin } = require("../shared/authGuard");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const emailSender = process.env.RESEND_FROM_EMAIL || "Marthington <onboarding@resend.dev>";

const DEFAULT_TEMPLATES = [
  {
    key: "agent-onboarding-email",
    name: "Agent onboarding",
    category: "Onboarding",
    channel: "email",
    subject: "Welcome to Marthington, {{name}}",
    message: "Hello {{name}},\n\nWelcome to Marthington. We’re excited to have you on our agent network. Sign in to explore the platform, review available services, and reach out if you need help getting started.\n\nBest,\nThe Marthington team",
  },
  {
    key: "agent-congratulations-whatsapp",
    name: "Congratulations",
    category: "Congratulations",
    channel: "whatsapp",
    subject: "",
    message: "Congratulations, {{name}}! We’re delighted to celebrate your success. Thank you for being part of the Marthington agent network.",
  },
  {
    key: "agent-job-completed-whatsapp",
    name: "Successful job completion",
    category: "Job update",
    channel: "whatsapp",
    subject: "",
    message: "Hello {{name}}, congratulations on completing a successful job! We appreciate your excellent work and continued partnership.",
  },
];

const isSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Super admin access required." });
  }
  return next();
};

const getSenderName = (user) => (
  [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || "Support"
);

const normalizeMessage = (value, maxLength = 2000) => (
  typeof value === "string" ? value.trim().slice(0, maxLength) : ""
);

const hasUnreadMessage = (lastMessageId, readMessageId, lastMessageAt, readAt) => {
  if (lastMessageId && readMessageId) {
    return String(lastMessageId) !== String(readMessageId);
  }
  if (lastMessageId && lastMessageAt && readAt && lastMessageAt.getTime() === readAt.getTime()) {
    return true;
  }
  return Boolean(lastMessageAt && (!readAt || lastMessageAt > readAt));
};

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
}[character]));

const personalizeTemplate = (value, contact) => value
  .replaceAll("{{name}}", contact.name || "there")
  .replaceAll("{{email}}", contact.email || "");

const saveMessage = async (conversation, user, text) => {
  const message = await SupportMessage.create({
    conversationId: conversation._id,
    senderId: user.id,
    senderRole: user.role,
    senderName: getSenderName(user),
    text,
  });
  conversation.lastMessage = text;
  conversation.lastMessageAt = message.createdAt;
  if (user.role === "user") {
    conversation.lastUserMessageAt = message.createdAt;
    conversation.lastUserMessageId = message._id;
    conversation.userReadAt = message.createdAt;
  } else {
    conversation.lastAdminMessageAt = message.createdAt;
    conversation.lastAdminMessageId = message._id;
    conversation.adminReadMessageId = conversation.lastUserMessageId || null;
    conversation.adminReadAt = message.createdAt;
  }
  await conversation.save();
  return message;
};

const customerRouter = express.Router();
const adminRouter = express.Router();

customerRouter.get("/conversation", async (req, res) => {
  try {
    const conversation = await SupportConversation.findOne({ userId: req.user.id });
    if (!conversation) return res.json({ success: true, conversation: null, messages: [] });
    if (hasUnreadMessage(
      conversation.lastAdminMessageId,
      conversation.userReadMessageId,
      conversation.lastAdminMessageAt,
      conversation.userReadAt,
    )) {
      conversation.userReadMessageId = conversation.lastAdminMessageId || null;
      conversation.userReadAt = new Date();
      await conversation.save();
    }
    const messages = await SupportMessage.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ success: true, conversation, messages: messages.reverse() });
  } catch (error) {
    console.error("SUPPORT CONVERSATION LOAD ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not load your support conversation." });
  }
});

customerRouter.get("/conversation/unread-count", async (req, res) => {
  try {
    const conversation = await SupportConversation.findOne({ userId: req.user.id })
      .select("lastAdminMessageAt lastAdminMessageId userReadAt userReadMessageId")
      .lean();
    const unread = conversation && hasUnreadMessage(
      conversation.lastAdminMessageId,
      conversation.userReadMessageId,
      conversation.lastAdminMessageAt,
      conversation.userReadAt,
    );
    return res.json({
      success: true,
      unreadCount: unread ? 1 : 0,
      latestMessageAt: unread ? conversation.lastAdminMessageAt : null,
      latestMessageId: unread ? conversation.lastAdminMessageId : null,
    });
  } catch (error) {
    console.error("SUPPORT UNREAD COUNT LOAD ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not load support notification count." });
  }
});

customerRouter.post("/conversation/messages", async (req, res) => {
  const text = normalizeMessage(req.body?.text);
  if (!text) return res.status(400).json({ success: false, message: "Enter a text message before sending." });
  try {
    const conversation = await SupportConversation.findOneAndUpdate(
      { userId: req.user.id },
      { $setOnInsert: { userId: req.user.id, status: "open" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    const message = await saveMessage(conversation, req.user, text);
    return res.status(201).json({ success: true, conversation, message });
  } catch (error) {
    console.error("SUPPORT MESSAGE SEND ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not send your message." });
  }
});

adminRouter.get("/templates", isSuperAdmin, async (req, res) => {
  try {
    await Promise.all(DEFAULT_TEMPLATES.map(({ key, ...template }) => (
      CommunicationTemplate.updateOne(
        { key },
        { $setOnInsert: { key, ...template } },
        { upsert: true, setDefaultsOnInsert: true },
      )
    )));
    const templates = await CommunicationTemplate.find().sort({ category: 1, name: 1 }).lean();
    return res.json({ success: true, templates });
  } catch (error) {
    console.error("COMMUNICATION TEMPLATES LOAD ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not load communication templates." });
  }
});

adminRouter.post("/templates", isSuperAdmin, async (req, res) => {
  const name = normalizeMessage(req.body?.name, 100);
  const category = normalizeMessage(req.body?.category, 60);
  const channel = req.body?.channel;
  const subject = normalizeMessage(req.body?.subject, 120);
  const message = normalizeMessage(req.body?.message, 4000);
  if (!name || !category || !["email", "whatsapp", "both"].includes(channel) || !message) {
    return res.status(400).json({ success: false, message: "Enter a name, category, channel, and message for this template." });
  }
  if (channel !== "whatsapp" && !subject) {
    return res.status(400).json({ success: false, message: "Email templates need a subject." });
  }
  try {
    const template = await CommunicationTemplate.create({
      name, category, channel, subject, message, createdBy: req.user.id,
    });
    return res.status(201).json({ success: true, template });
  } catch (error) {
    console.error("COMMUNICATION TEMPLATE CREATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not create communication template." });
  }
});

adminRouter.put("/templates/:templateId", isSuperAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.templateId)) {
    return res.status(400).json({ success: false, message: "Invalid template ID." });
  }
  const name = normalizeMessage(req.body?.name, 100);
  const category = normalizeMessage(req.body?.category, 60);
  const channel = req.body?.channel;
  const subject = normalizeMessage(req.body?.subject, 120);
  const message = normalizeMessage(req.body?.message, 4000);
  if (!name || !category || !["email", "whatsapp", "both"].includes(channel) || !message) {
    return res.status(400).json({ success: false, message: "Enter a name, category, channel, and message for this template." });
  }
  if (channel !== "whatsapp" && !subject) {
    return res.status(400).json({ success: false, message: "Email templates need a subject." });
  }
  try {
    const template = await CommunicationTemplate.findByIdAndUpdate(
      req.params.templateId,
      { name, category, channel, subject, message },
      { new: true, runValidators: true },
    ).lean();
    if (!template) return res.status(404).json({ success: false, message: "Template not found." });
    return res.json({ success: true, template });
  } catch (error) {
    console.error("COMMUNICATION TEMPLATE UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not update communication template." });
  }
});

adminRouter.post("/templates/:templateId/send", isSuperAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.templateId)) {
    return res.status(400).json({ success: false, message: "Invalid template ID." });
  }
  if (!Array.isArray(req.body?.recipients) || req.body.recipients.length === 0 || req.body.recipients.length > 50) {
    return res.status(400).json({ success: false, message: "Select between 1 and 50 email recipients." });
  }
  const recipients = [...new Map(req.body.recipients.map((recipient) => {
    if (!recipient || !["manual", "registered"].includes(recipient.type)
      || !mongoose.Types.ObjectId.isValid(String(recipient.id || ""))) return ["invalid", null];
    const normalized = { id: String(recipient.id), type: recipient.type };
    return [`${normalized.type}:${normalized.id}`, normalized];
  }))];
  if (recipients.some(([, recipient]) => !recipient)) {
    return res.status(400).json({ success: false, message: "One or more selected email recipients are invalid." });
  }
  const selectedRecipients = recipients.map(([, recipient]) => recipient);
  if (!resend) {
    return res.status(503).json({ success: false, message: "Email delivery is not configured. Set RESEND_API_KEY and try again." });
  }
  try {
    const template = await CommunicationTemplate.findById(req.params.templateId).lean();
    if (!template) return res.status(404).json({ success: false, message: "Template not found." });
    if (!["email", "both"].includes(template.channel)) {
      return res.status(400).json({ success: false, message: "This template is not configured for email." });
    }

    const manualIds = selectedRecipients.filter((recipient) => recipient.type === "manual").map((recipient) => recipient.id);
    const registeredIds = selectedRecipients.filter((recipient) => recipient.type === "registered").map((recipient) => recipient.id);
    const [manualAgents, registeredUsers] = await Promise.all([
      manualIds.length ? Agent.find({ _id: { $in: manualIds } }).lean() : [],
      registeredIds.length ? User.find({ _id: { $in: registeredIds }, role: "user" })
        .select("firstName lastName email")
        .lean() : [],
    ]);
    const contacts = [
      ...manualAgents.map((agent) => ({ id: String(agent._id), name: agent.name, email: agent.email || "" })),
      ...registeredUsers.map((user) => ({
        id: String(user._id),
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
        email: user.email,
      })),
    ];
    const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
    const deliveryResults = [];

    for (const recipient of selectedRecipients) {
      const contact = contactsById.get(recipient.id);
      if (!contact || !contact.email) {
        deliveryResults.push({ id: recipient.id, success: false, message: "No email address is saved for this agent." });
        continue;
      }
      const subject = personalizeTemplate(template.subject, contact);
      const text = personalizeTemplate(template.message, contact);
      const html = text.split(/\r?\n/).map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`).join("");
      try {
        const result = await resend.emails.send({ from: emailSender, to: contact.email, subject, text, html });
        if (result?.error) throw new Error("Email provider rejected the message.");
        deliveryResults.push({ id: recipient.id, name: contact.name, success: true });
      } catch (deliveryError) {
        console.error("COMMUNICATION EMAIL DELIVERY ERROR:", deliveryError);
        deliveryResults.push({ id: recipient.id, name: contact.name, success: false, message: "Email provider could not deliver this message." });
      }
    }

    const sent = deliveryResults.filter((result) => result.success).length;
    const failed = deliveryResults.length - sent;
    return res.status(failed ? 207 : 200).json({
      success: failed === 0,
      sent,
      failed,
      results: deliveryResults,
    });
  } catch (error) {
    console.error("COMMUNICATION EMAIL DISPATCH ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not send these emails." });
  }
});

adminRouter.get("/conversations", isAdmin, async (req, res) => {
  try {
    const conversations = await SupportConversation.find().sort({ lastMessageAt: -1 }).limit(100).lean();
    const users = await User.find({ _id: { $in: conversations.map((item) => item.userId) } })
      .select("firstName lastName email role status approvalStatus")
      .lean();
    const usersById = new Map(users.map((user) => [String(user._id), user]));
    return res.json({
      success: true,
      conversations: conversations.map((conversation) => {
        const user = usersById.get(String(conversation.userId));
        return {
          ...conversation,
          unreadCount: hasUnreadMessage(
            conversation.lastUserMessageId,
            conversation.adminReadMessageId,
            conversation.lastUserMessageAt,
            conversation.adminReadAt,
          )
            ? 1
            : 0,
          user: user ? {
            _id: user._id,
            name: getSenderName(user),
            email: user.email,
            status: user.status,
            approvalStatus: user.approvalStatus,
          } : null,
        };
      }),
    });
  } catch (error) {
    console.error("SUPPORT INBOX LOAD ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not load support conversations." });
  }
});

adminRouter.get("/conversations/:conversationId/messages", isAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.conversationId)) {
    return res.status(400).json({ success: false, message: "Invalid conversation ID." });
  }
  try {
    const conversation = await SupportConversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
    if (hasUnreadMessage(
      conversation.lastUserMessageId,
      conversation.adminReadMessageId,
      conversation.lastUserMessageAt,
      conversation.adminReadAt,
    )) {
      conversation.adminReadMessageId = conversation.lastUserMessageId || null;
      conversation.adminReadAt = new Date();
      await conversation.save();
    }
    const messages = await SupportMessage.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ success: true, conversation, messages: messages.reverse() });
  } catch (error) {
    console.error("SUPPORT THREAD LOAD ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not load this conversation." });
  }
});

adminRouter.post("/conversations/:conversationId/messages", isAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.conversationId)) {
    return res.status(400).json({ success: false, message: "Invalid conversation ID." });
  }
  const text = normalizeMessage(req.body?.text);
  if (!text) return res.status(400).json({ success: false, message: "Enter a text reply before sending." });
  try {
    const conversation = await SupportConversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
    const message = await saveMessage(conversation, req.user, text);
    return res.status(201).json({ success: true, conversation, message });
  } catch (error) {
    console.error("SUPPORT REPLY SEND ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not send your reply." });
  }
});

module.exports = { customerRouter, adminRouter };
