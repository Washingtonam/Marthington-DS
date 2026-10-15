jest.mock("../models/User.model", () => ({ findById: jest.fn(), findOne: jest.fn() }));
jest.mock("../models/Agent.model", () => ({
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock("../models/AgentJob.model", () => ({
  find: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const Agent = require("../models/Agent.model");
const AgentJob = require("../models/AgentJob.model");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { verifyToken } = require("../shared/authGuard");
const adminRouter = require("../routes/admin.routes");

const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
const app = express();
app.use(express.json());
app.use("/api/admin", verifyToken, adminRouter);
const token = jwt.sign({ id: "ordinary-admin" }, secret);

describe("agent management authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({
      id: "ordinary-admin",
      _id: "ordinary-admin",
      email: "admin@example.test",
      role: "admin",
      status: "active",
      approvalStatus: "approved",
    });
  });

  it.each([
    ["get", "/api/admin/agents"],
    ["post", "/api/admin/agents"],
    ["get", "/api/admin/agents/jobs"],
    ["post", "/api/admin/agents/jobs"],
    ["patch", "/api/admin/agents/jobs/507f1f77bcf86cd799439011/status"],
  ])("denies ordinary admins access to CRM endpoint %s %s", async (method, path) => {
    const response = await request(app)[method](path)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(Agent.find).not.toHaveBeenCalled();
    expect(Agent.create).not.toHaveBeenCalled();
    expect(AgentJob.find).not.toHaveBeenCalled();
    expect(AgentJob.create).not.toHaveBeenCalled();
    expect(AgentJob.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("allows a super admin to create a validated manual agent", async () => {
    User.findById.mockResolvedValueOnce({
      id: "super-admin",
      _id: "super-admin",
      email: "root@example.test",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });
    Agent.create.mockResolvedValue({
      toObject: () => ({ _id: "agent-1", name: "Sample Agent", whatsapp: "2348000000000" }),
    });

    const response = await request(app)
      .post("/api/admin/agents")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Sample Agent", whatsapp: "+234 800 000 0000" });

    expect(response.status).toBe(201);
    expect(response.body.agent.name).toBe("Sample Agent");
    expect(Agent.create).toHaveBeenCalledWith({
      name: "Sample Agent",
      whatsapp: "+2348000000000",
      createdBy: "super-admin",
    });
  });

  it("updates a manual agent and rejects invalid phone numbers", async () => {
    User.findById.mockResolvedValue({
      id: "super-admin",
      _id: "super-admin",
      email: "root@example.test",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });
    const savedAgent = {
      _id: "507f1f77bcf86cd799439011",
      name: "Updated Agent",
      whatsapp: "+2348000000000",
      active: true,
    };
    Agent.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(savedAgent),
    });

    const response = await request(app)
      .put("/api/admin/agents/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Agent", whatsapp: "+234 800 000 0000" });

    expect(response.status).toBe(200);
    expect(response.body.agent.name).toBe("Updated Agent");
    expect(Agent.findByIdAndUpdate).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      { name: "Updated Agent", whatsapp: "+2348000000000" },
      { new: true, runValidators: true },
    );

    const invalidResponse = await request(app)
      .put("/api/admin/agents/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsapp: "invalid" });

    expect(invalidResponse.status).toBe(400);
    expect(Agent.findByIdAndUpdate).toHaveBeenCalledTimes(1);
  });

  it("only links logged work to approved registered user accounts", async () => {
    User.findById.mockResolvedValue({
      id: "super-admin",
      _id: "super-admin",
      email: "root@example.test",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });
    User.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    const response = await request(app)
      .post("/api/admin/agents/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerType: "registered",
        registeredUserId: "507f1f77bcf86cd799439011",
        serviceType: "name-modification",
        amount: 100,
        formData: {},
      });

    expect(response.status).toBe(404);
    expect(User.findOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439011",
      role: "user",
      status: { $ne: "suspended" },
      approvalStatus: "approved",
    });
    expect(AgentJob.create).not.toHaveBeenCalled();
  });
});
