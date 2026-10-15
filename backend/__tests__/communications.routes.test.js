jest.mock("../models/User.model", () => ({ findById: jest.fn(), find: jest.fn() }));
jest.mock("../models/Agent.model", () => ({ find: jest.fn() }));
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn() } })),
}));
jest.mock("../models/CommunicationTemplate.model", () => ({
  updateOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock("../models/SupportConversation.model", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
}));
jest.mock("../models/SupportMessage.model", () => ({
  find: jest.fn(),
  create: jest.fn(),
}));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const Agent = require("../models/Agent.model");
const { Resend } = require("resend");
const CommunicationTemplate = require("../models/CommunicationTemplate.model");
const SupportConversation = require("../models/SupportConversation.model");
const SupportMessage = require("../models/SupportMessage.model");
const { verifyToken } = require("../shared/authGuard");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { customerRouter, adminRouter } = require("../routes/communications.routes");
const sendEmail = Resend.mock.results[0].value.emails.send;

const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
const app = express();
app.use(express.json());
app.use("/api/communications", verifyToken, customerRouter);
app.use("/api/admin/communications", verifyToken, adminRouter);

const authHeader = (id) => `Bearer ${jwt.sign({ id }, secret)}`;

describe("communications routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockImplementation(async (id) => ({
      id,
      _id: id,
      email: `${id}@example.com`,
      role: id === "support-admin" ? "admin" : id === "super-admin" ? "super_admin" : "user",
      status: "active",
      approvalStatus: "approved",
    }));
  });

  it("restricts message-template access to super admins", async () => {
    const response = await request(app)
      .get("/api/admin/communications/templates")
      .set("Authorization", authHeader("agent-user"));

    expect(response.status).toBe(403);
    expect(CommunicationTemplate.updateOne).not.toHaveBeenCalled();
  });

  it("seeds default templates and returns saved templates to super admins", async () => {
    CommunicationTemplate.updateOne.mockResolvedValue({});
    CommunicationTemplate.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: "template-1", name: "Agent onboarding" }]),
      }),
    });

    const response = await request(app)
      .get("/api/admin/communications/templates")
      .set("Authorization", authHeader("super-admin"));

    expect(response.status).toBe(200);
    expect(response.body.templates).toHaveLength(1);
    expect(CommunicationTemplate.updateOne).toHaveBeenCalledTimes(3);
  });

  it("stores a user's text message in their support conversation", async () => {
    const conversation = { _id: "0123456789abcdef01234567", save: jest.fn().mockResolvedValue(undefined) };
    const message = { _id: "message-1", text: "Please help", createdAt: new Date() };
    SupportConversation.findOneAndUpdate.mockResolvedValue(conversation);
    SupportMessage.create.mockResolvedValue(message);

    const response = await request(app)
      .post("/api/communications/conversation/messages")
      .set("Authorization", authHeader("agent-user"))
      .send({ text: "  Please help  " });

    expect(response.status).toBe(201);
    expect(SupportConversation.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: "agent-user" },
      { $setOnInsert: { userId: "agent-user", status: "open" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    expect(SupportMessage.create).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: "0123456789abcdef01234567",
      senderId: "agent-user",
      text: "Please help",
    }));
  });

  it("allows an authenticated admin to reply to a support conversation", async () => {
    const conversation = {
      _id: "0123456789abcdef01234567",
      lastUserMessageId: "agent-message-1",
      save: jest.fn().mockResolvedValue(undefined),
    };
    SupportConversation.findById.mockResolvedValue(conversation);
    SupportMessage.create.mockResolvedValue({ _id: "message-2", text: "We can help", createdAt: new Date() });

    const response = await request(app)
      .post("/api/admin/communications/conversations/0123456789abcdef01234567/messages")
      .set("Authorization", authHeader("support-admin"))
      .send({ text: "We can help" });

    expect(response.status).toBe(201);
    expect(SupportMessage.create).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: "0123456789abcdef01234567",
      senderId: "support-admin",
      senderRole: "admin",
      text: "We can help",
    }));
    expect(conversation.adminReadAt).toBeInstanceOf(Date);
    expect(conversation.adminReadMessageId).toBe("agent-message-1");
  });

  it("marks a conversation read when support opens the thread", async () => {
    const conversation = {
      _id: "0123456789abcdef01234567",
      lastUserMessageId: "agent-message-1",
      lastUserMessageAt: new Date("2026-10-15T09:59:00.000Z"),
      save: jest.fn().mockResolvedValue(undefined),
    };
    SupportConversation.findById.mockResolvedValue(conversation);
    SupportMessage.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    const response = await request(app)
      .get("/api/admin/communications/conversations/0123456789abcdef01234567/messages?markRead=true")
      .set("Authorization", authHeader("support-admin"));

    expect(response.status).toBe(200);
    expect(conversation.adminReadAt).toBeInstanceOf(Date);
    expect(conversation.adminReadMessageId).toBe("agent-message-1");
    expect(conversation.save).toHaveBeenCalledTimes(1);
  });

  it("does not mark a conversation read during passive inbox polling", async () => {
    const conversation = {
      _id: "0123456789abcdef01234567",
      lastUserMessageId: "agent-message-1",
      lastUserMessageAt: new Date("2026-10-15T09:59:00.000Z"),
      save: jest.fn().mockResolvedValue(undefined),
    };
    SupportConversation.findById.mockResolvedValue(conversation);
    SupportMessage.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    const response = await request(app)
      .get("/api/admin/communications/conversations/0123456789abcdef01234567/messages")
      .set("Authorization", authHeader("support-admin"));

    expect(response.status).toBe(200);
    expect(conversation.save).not.toHaveBeenCalled();
    expect(conversation.adminReadMessageId).toBeUndefined();
  });

  it("returns unread conversations for the Communications inbox badge", async () => {
    const sameTimestamp = new Date("2026-10-15T10:00:00.000Z");
    SupportConversation.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{
            _id: "0123456789abcdef01234567",
            userId: "agent-user",
            lastUserMessageAt: sameTimestamp,
            lastUserMessageId: "message-2",
            adminReadMessageId: "message-1",
            adminReadAt: sameTimestamp,
            lastMessage: "I need help",
          }]),
        }),
      }),
    });
    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{
          _id: "agent-user",
          firstName: "Ayo",
          lastName: "Agent",
          email: "ayo@example.com",
        }]),
      }),
    });

    const response = await request(app)
      .get("/api/admin/communications/conversations")
      .set("Authorization", authHeader("support-admin"));

    expect(response.status).toBe(200);
    expect(response.body.conversations[0]).toEqual(expect.objectContaining({
      unreadCount: 1,
      lastUserMessageId: "message-2",
      user: expect.objectContaining({ name: "Ayo Agent" }),
    }));
  });

  it("marks support replies as unread for the user until their inbox is opened", async () => {
    const readAt = new Date("2026-10-15T10:00:00.000Z");
    const replyAt = new Date("2026-10-15T10:01:00.000Z");
    const conversation = {
      _id: "0123456789abcdef01234567",
      lastAdminMessageAt: replyAt,
      lastAdminMessageId: "reply-message",
      userReadAt: replyAt,
      userReadMessageId: "previous-reply",
    };
    SupportConversation.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(conversation),
      }),
    });

    const unread = await request(app)
      .get("/api/communications/conversation/unread-count")
      .set("Authorization", authHeader("agent-user"));

    expect(unread.status).toBe(200);
    expect(unread.body.unreadCount).toBe(1);
    expect(unread.body.latestMessageId).toBe("reply-message");

    const savedConversation = {
      _id: conversation._id,
      lastAdminMessageAt: replyAt,
      lastAdminMessageId: "reply-message",
      save: jest.fn().mockResolvedValue(undefined),
    };
    SupportConversation.findOne.mockResolvedValue(savedConversation);
    SupportMessage.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    const opened = await request(app)
      .get("/api/communications/conversation")
      .set("Authorization", authHeader("agent-user"));

    expect(opened.status).toBe(200);
    expect(savedConversation.userReadAt).toBeInstanceOf(Date);
    expect(savedConversation.userReadMessageId).toBe("reply-message");
    expect(savedConversation.save).toHaveBeenCalledTimes(1);
  });

  it("sends personalized email from a saved template to selected offline agents", async () => {
    const agentId = "507f1f77bcf86cd799439011";
    const templateId = "507f1f77bcf86cd799439012";
    CommunicationTemplate.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        name: "Welcome",
        channel: "email",
        subject: "Hello {{name}}",
        message: "Welcome, {{name}}!",
      }),
    });
    Agent.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: agentId, name: "Ayo Agent", email: "ayo@example.com" }]),
    });
    sendEmail.mockResolvedValue({ data: { id: "email-1" } });

    const response = await request(app)
      .post(`/api/admin/communications/templates/${templateId}/send`)
      .set("Authorization", authHeader("super-admin"))
      .send({ recipients: [{ id: agentId, type: "manual" }] });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, sent: 1, failed: 0 });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "ayo@example.com",
      subject: "Hello Ayo Agent",
      text: "Welcome, Ayo Agent!",
    }));
  });
});
