jest.mock("../models/User.model", () => ({ findById: jest.fn(), find: jest.fn() }));
jest.mock("../models/Agent.model", () => ({ find: jest.fn() }));
jest.mock("../models/NimcFep.model", () => ({ find: jest.fn() }));
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
  findOne: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn(),
  updateMany: jest.fn(),
}));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const Agent = require("../models/Agent.model");
const NimcFep = require("../models/NimcFep.model");
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
    SupportMessage.aggregate.mockResolvedValue([]);
    SupportMessage.updateMany.mockResolvedValue({ modifiedCount: 0 });
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
    SupportMessage.updateMany.mockResolvedValue({ modifiedCount: 2 });

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
    expect(SupportMessage.updateMany).toHaveBeenCalledWith(
      { conversationId: conversation._id, senderRole: "user", readByAdminAt: null },
      { $set: { readByAdminAt: expect.any(Date) } },
    );
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
    expect(SupportMessage.updateMany).toHaveBeenCalledWith(
      { conversationId: conversation._id, senderRole: "user", readByAdminAt: null },
      { $set: { readByAdminAt: expect.any(Date) } },
    );
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
    expect(SupportMessage.updateMany).not.toHaveBeenCalled();
  });

  it("loads older support messages using a validated message cursor", async () => {
    const conversationId = "0123456789abcdef01234567";
    const cursorId = "1123456789abcdef01234567";
    const cursorCreatedAt = new Date("2026-10-15T10:00:00.000Z");
    SupportConversation.findById.mockResolvedValue({ _id: conversationId });
    SupportMessage.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: cursorId, createdAt: cursorCreatedAt }),
    });
    const olderMessages = Array.from({ length: 51 }, (_, index) => ({
      _id: `message-${index}`,
      text: `Message ${index}`,
    }));
    SupportMessage.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(olderMessages),
        }),
      }),
    });

    const response = await request(app)
      .get(`/api/admin/communications/conversations/${conversationId}/messages?before=${cursorId}`)
      .set("Authorization", authHeader("support-admin"));

    expect(response.status).toBe(200);
    expect(response.body.messages).toHaveLength(50);
    expect(response.body.messages[0].text).toBe("Message 49");
    expect(response.body.messages[49].text).toBe("Message 0");
    expect(response.body.hasMore).toBe(true);
    expect(SupportMessage.find).toHaveBeenCalledWith({
      conversationId,
      $or: [
        { createdAt: { $lt: cursorCreatedAt } },
        { createdAt: cursorCreatedAt, _id: { $lt: cursorId } },
      ],
    });
  });

  it("rejects an invalid message cursor", async () => {
    const conversationId = "0123456789abcdef01234567";
    SupportConversation.findById.mockResolvedValue({ _id: conversationId });

    const response = await request(app)
      .get(`/api/admin/communications/conversations/${conversationId}/messages?before=not-an-object-id`)
      .set("Authorization", authHeader("support-admin"));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid message cursor.");
    expect(SupportMessage.find).not.toHaveBeenCalled();
  });

  it("returns unread conversations for the Communications inbox badge", async () => {
    SupportConversation.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{
            _id: "0123456789abcdef01234567",
            userId: "agent-user",
            lastUserMessageAt: new Date("2026-10-15T10:00:00.000Z"),
            lastUserMessageId: "message-3",
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
    SupportMessage.aggregate.mockResolvedValue([{ _id: "0123456789abcdef01234567", unreadCount: 3 }]);

    const response = await request(app)
      .get("/api/admin/communications/conversations")
      .set("Authorization", authHeader("support-admin"));

    expect(response.status).toBe(200);
    expect(response.body.conversations[0]).toEqual(expect.objectContaining({
      unreadCount: 3,
      lastUserMessageId: "message-3",
      user: expect.objectContaining({ name: "Ayo Agent" }),
    }));
    expect(SupportMessage.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          conversationId: { $in: ["0123456789abcdef01234567"] },
          senderRole: "user",
          readByAdminAt: null,
        },
      },
      { $group: { _id: "$conversationId", unreadCount: { $sum: 1 } } },
    ]);
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

  it("sends a saved email template to an active FEP in the super admin's directory", async () => {
    const fepId = "507f1f77bcf86cd799439021";
    const templateId = "507f1f77bcf86cd799439022";
    CommunicationTemplate.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        name: "Welcome",
        channel: "email",
        subject: "Hello {{name}}",
        message: "Welcome to {{company}} in {{city}}, {{name}}!",
      }),
    });
    NimcFep.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: fepId, name: "Grace FEP", email: "grace@example.com" }]),
    });
    sendEmail.mockResolvedValue({ data: { id: "email-fep" } });

    const response = await request(app)
      .post(`/api/admin/communications/templates/${templateId}/send`)
      .set("Authorization", authHeader("super-admin"))
      .send({ recipients: [{ id: fepId, type: "fep" }] });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, sent: 1, failed: 0 });
    expect(NimcFep.find).toHaveBeenCalledWith({
      _id: { $in: [fepId] },
      createdBy: "super-admin",
      active: { $ne: false },
    });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "grace@example.com",
      subject: "Hello Grace FEP",
      text: "Welcome to VOLSUS Energy Limited in Benin City, Grace FEP!",
    }));
  });
});
