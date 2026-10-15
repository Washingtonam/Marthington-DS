jest.mock("../models/User.model", () => ({ findById: jest.fn(), findOne: jest.fn(), find: jest.fn() }));
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
jest.mock("../models/Pricing.model", () => ({
  getPricing: jest.fn(),
  getDefaultServiceCatalog: jest.fn(),
}));
jest.mock("../models/AuditLog.model", () => ({ create: jest.fn(), find: jest.fn() }));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const Agent = require("../models/Agent.model");
const AgentJob = require("../models/AgentJob.model");
const Pricing = require("../models/Pricing.model");
const AuditLog = require("../models/AuditLog.model");
const Transaction = require("../models/transaction.model");
const bcrypt = require("bcryptjs");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { verifyToken } = require("../shared/authGuard");
const adminRouter = require("../routes/admin.routes");
const ServiceRequest = require("../models/ServiceRequest.model");

const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
const app = express();
app.use(express.json());
app.use("/api/admin", verifyToken, adminRouter);
const token = jwt.sign({ id: "ordinary-admin" }, secret);

describe("agent management authorization", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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
    ["put", "/api/admin/users/507f1f77bcf86cd799439011/profile"],
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

  it("includes user account update audit records in the audit profile history", async () => {
    jest.spyOn(ServiceRequest, "find").mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    jest.spyOn(Transaction, "find").mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    AuditLog.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{
        _id: "audit-update-1",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        note: "User updated account fields: email, WhatsApp number.",
      }]),
    });

    const response = await request(app)
      .get("/api/admin/users/507f1f77bcf86cd799439011/history")
      .auth(token, { type: "bearer" })

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "audit-update-1",
        type: "Account Update",
        description: "User updated account fields: email, WhatsApp number.",
      }),
    ]));
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
      .send({ name: "Sample Agent", whatsapp: "+234 800 000 0000", email: " Agent@Example.com " });

    expect(response.status).toBe(201);
    expect(response.body.agent.name).toBe("Sample Agent");
    expect(Agent.create).toHaveBeenCalledWith({
      name: "Sample Agent",
      whatsapp: "+2348000000000",
      email: "agent@example.com",
      createdBy: "super-admin",
    });
  });

    it("lets super admins update registered contact details and hashes optional passwords", async () => {
      const userId = "507f1f77bcf86cd799439011";
      const savedUser = {
        _id: userId,
        firstName: "Registered",
        lastName: "Agent",
        email: "agent@example.test",
        phone: "+2348000000000",
        role: "user",
        password: "old-hash",
        save: jest.fn().mockResolvedValue(undefined),
      };
      const updatedUserResponse = {
        _id: userId,
        firstName: "Updated",
        lastName: "Agent",
        email: "updated@example.test",
        phone: "+2348000000001",
        role: "user",
      };
      let targetLookups = 0;
      User.findById.mockImplementation((id) => {
        if (String(id) !== userId) {
          return Promise.resolve({
            id: "super-admin",
            _id: "super-admin",
            email: "root@example.test",
            role: "super_admin",
            status: "active",
            approvalStatus: "approved",
          });
        }
        targetLookups += 1;
        if (targetLookups === 1) return Promise.resolve(savedUser);
        return {
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(updatedUserResponse),
          }),
        };
      });
      User.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });
      AuditLog.create.mockResolvedValue({});
      const adminToken = jwt.sign({ id: "super-admin" }, secret);

      const response = await request(app)
        .put(`/api/admin/users/${userId}/profile`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          firstName: "Updated",
          email: "Updated@Example.Test",
          phone: "+234 800 000 0001",
          password: "new-secret",
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updatedUserResponse);
      expect(response.body.data.password).toBeUndefined();
      expect(savedUser.email).toBe("updated@example.test");
      expect(savedUser.phone).toBe("+2348000000001");
      expect(await bcrypt.compare("new-secret", savedUser.password)).toBe(true);
      expect(savedUser.save).toHaveBeenCalledTimes(1);
      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        action: "USER_PROFILE_UPDATED",
        userId,
        note: expect.not.stringContaining("new-secret"),
      }));
    });

    it("rejects attempts to assign the reserved super admin email to a user", async () => {
      const userId = "507f1f77bcf86cd799439011";
      const savedUser = { _id: userId, role: "user", save: jest.fn() };
      User.findById.mockImplementation((id) => String(id) === userId
        ? Promise.resolve(savedUser)
        : Promise.resolve({
          id: "super-admin",
          _id: "super-admin",
          email: "root@example.test",
          role: "super_admin",
          status: "active",
          approvalStatus: "approved",
        }));
      const adminToken = jwt.sign({ id: "super-admin" }, secret);

      const response = await request(app)
        .put(`/api/admin/users/${userId}/profile`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "admin@xcombinator.com" });

      expect(response.status).toBe(400);
      expect(savedUser.save).not.toHaveBeenCalled();
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

  it("returns account segment fields for every registered user contact", async () => {
    User.findById.mockResolvedValueOnce({
      id: "super-admin",
      _id: "super-admin",
      email: "root@example.test",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });
    const lastLogin = new Date("2025-01-10T12:00:00.000Z");
    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{
            _id: "507f1f77bcf86cd799439011",
            firstName: "Registered",
            lastName: "Account",
            email: "account@example.test",
            phone: "+2348000000000",
            role: "user",
            status: "active",
            approvalStatus: "approved",
            walletBalance: 120,
            walletBalanceKobo: 12000,
            lastLogin,
          }]),
        }),
      }),
    });
    Agent.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    });
    AgentJob.aggregate.mockResolvedValue([]);

    const response = await request(app)
      .get("/api/admin/agents")
      .set("Authorization", `Bearer ${jwt.sign({ id: "super-admin" }, secret)}`);

    expect(response.status).toBe(200);
    expect(response.body.registeredUsers[0]).toMatchObject({
      name: "Registered Account",
      status: "active",
      approvalStatus: "approved",
      walletBalance: 120,
      walletBalanceKobo: 12000,
      lastLogin: lastLogin.toISOString(),
    });
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

  it("uses the catalog price when a logged job amount is zero", async () => {
    const customerId = "507f1f77bcf86cd799439011";
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
        lean: jest.fn().mockResolvedValue({
          _id: customerId,
          firstName: "Registered",
          lastName: "Customer",
          email: "customer@example.test",
          phone: "+2348000000000",
        }),
      }),
    });
    Pricing.getPricing.mockResolvedValue({
      serviceCatalog: [{
        serviceCode: "modification-name",
        category: "NIMC",
        name: "Name Modification",
        status: "active",
        price: 12000,
      }],
    });
    AgentJob.create.mockResolvedValue({ _id: "job-1" });

    const response = await request(app)
      .post("/api/admin/agents/jobs")
      .set("Authorization", `Bearer ${jwt.sign({ id: "super-admin" }, secret)}`)
      .send({
        customerType: "registered",
        registeredUserId: customerId,
        serviceCode: "modification-name",
        serviceType: "Name Modification",
        amount: 0,
        formData: {},
      });

    expect(response.status).toBe(201);
    expect(AgentJob.create).toHaveBeenCalledWith(expect.objectContaining({
      serviceCode: "modification-name",
      serviceType: "Name Modification",
      amount: 12000,
    }));
  });
});
