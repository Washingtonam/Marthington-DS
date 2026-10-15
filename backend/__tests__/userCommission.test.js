jest.mock("../models/User.model", () => ({ findById: jest.fn(), findOne: jest.fn() }));
jest.mock("../models/transaction.model", () => ({ find: jest.fn() }));
jest.mock("../models/AuditLog.model", () => ({ create: jest.fn() }));
jest.mock("../models/Pricing.model", () => ({ getServiceCatalog: jest.fn() }));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const Transaction = require("../models/transaction.model");
const AuditLog = require("../models/AuditLog.model");
const Pricing = require("../models/Pricing.model");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const usersRouter = require("../routes/users.routes");

const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
const userId = "507f1f77bcf86cd799439011";
const authUser = {
  id: userId,
  _id: userId,
  email: "agent@example.test",
  role: "user",
  status: "active",
  approvalStatus: "approved",
};
const token = jwt.sign({ id: userId }, secret);
const app = express();
app.use(express.json());
app.use("/api/users", usersRouter);

describe("registered user commissions and profile updates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue(authUser);
  });

  it("returns commission balance, eligible service rates, and earned history to regular users", async () => {
    let lookupCount = 0;
    User.findById.mockImplementation(() => {
      lookupCount += 1;
      if (lookupCount === 1) return Promise.resolve(authUser);
      return {
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ commissionBalance: 12.5, commissionBalanceKobo: 1250 }),
        }),
      };
    });
    Transaction.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{
        _id: "commission-1",
        amountKobo: 500,
        description: "Completed request commission",
        status: "success",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      }]),
    });
    Pricing.getServiceCatalog.mockResolvedValue([
      {
        serviceCode: "active-service",
        name: "Active Service",
        category: "NIMC",
        status: "active",
        price: 5000,
        commissionType: "PERCENTAGE",
        commissionValue: 10,
      },
      {
        serviceCode: "paused-service",
        name: "Paused Service",
        category: "NIMC",
        status: "paused",
        price: 5000,
        commissionType: "FLAT",
        commissionValue: 100,
      },
    ]);

    const response = await request(app)
      .get("/api/users/commission")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.balance).toBe(12.5);
    expect(response.body.history).toHaveLength(1);
    expect(response.body.history[0].amount).toBe(5);
    expect(response.body.services).toEqual([expect.objectContaining({
      serviceCode: "active-service",
      commissionType: "PERCENTAGE",
      commissionValue: 10,
    })]);
    expect(Transaction.find).toHaveBeenCalledWith({ userId, type: "COMMISSION" });
    expect(Pricing.getServiceCatalog).toHaveBeenCalledTimes(1);
  });

  it("lets users update their own contact details and records an audit entry", async () => {
    const savedUser = {
      ...authUser,
      firstName: "Original",
      lastName: "Agent",
      phone: "+2348000000000",
      save: jest.fn().mockResolvedValue(undefined),
    };
    const safeUpdatedUser = {
      ...authUser,
      firstName: "Updated",
      lastName: "Agent",
      email: "updated@example.test",
      phone: "+2348000000001",
    };
    let lookupCount = 0;
    User.findById.mockImplementation(() => {
      lookupCount += 1;
      if (lookupCount === 1) return Promise.resolve(authUser);
      if (lookupCount === 2) return Promise.resolve(savedUser);
      return {
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(safeUpdatedUser),
        }),
      };
    });
    User.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
    AuditLog.create.mockResolvedValue({});

    const response = await request(app)
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Updated",
        lastName: "Agent",
        email: "Updated@Example.Test",
        phone: "+234 800 000 0001",
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(safeUpdatedUser);
    expect(response.body.data.password).toBeUndefined();
    expect(savedUser.email).toBe("updated@example.test");
    expect(savedUser.phone).toBe("+2348000000001");
    expect(savedUser.save).toHaveBeenCalledTimes(1);
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      action: "USER_PROFILE_UPDATED",
      userId,
      note: 'User updated account details: firstName: "Original" -> "Updated"; email: "agent@example.test" -> "updated@example.test"; WhatsApp number: "+2348000000000" -> "+2348000000001".',
    }));
  });
});
