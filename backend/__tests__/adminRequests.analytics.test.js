jest.mock("../models/User.model", () => ({
  findById: jest.fn(),
  find: jest.fn(),
}));

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");
const User = require("../models/User.model");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { verifyToken } = require("../shared/authGuard");
const adminRouter = require("../routes/admin.routes");

const ServiceRequest = mongoose.model("ServiceRequest");
const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
const app = express();
app.use(express.json());
app.use("/api/admin", verifyToken, adminRouter);

describe("admin service request analytics", () => {
  let createServiceIndex;
  let createCacIndex;
  let aggregate;

  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({
      id: "super-admin",
      _id: "super-admin",
      email: "root@example.test",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });
    createServiceIndex = jest.spyOn(ServiceRequest.collection, "createIndex").mockResolvedValue("index");
    createCacIndex = jest.spyOn(mongoose.model("CacRequest").collection, "createIndex").mockResolvedValue("index");
    aggregate = jest.spyOn(ServiceRequest, "aggregate").mockReturnValue({
      allowDiskUse: jest.fn().mockResolvedValue([{
        data: [],
        meta: [{ total: 8 }],
        analytics: [{
          totalRequests: 8,
          totalAmount: 145000,
          pending: 3,
          inProgress: 1,
          completed: 3,
          rejected: 1,
        }],
        services: [{
          _id: "Name Modification",
          count: 5,
          totalAmount: 90000,
          completed: 3,
        }, {
          _id: "DOB Modification",
          count: 3,
          totalAmount: 55000,
          completed: 0,
        }],
      }]),
    });
  });

  afterEach(() => {
    createServiceIndex.mockRestore();
    createCacIndex.mockRestore();
    aggregate.mockRestore();
  });

  test("returns aggregate totals and per-service metrics for the filtered request set", async () => {
    const token = jwt.sign({ id: "super-admin" }, secret);
    const response = await request(app)
      .get("/api/admin/requests?fromDate=2025-04-01&maxAmount=50000")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.analytics).toEqual({
      totalRequests: 8,
      totalAmount: 145000,
      pending: 3,
      inProgress: 1,
      completed: 3,
      rejected: 1,
      services: [
        { service: "Name Modification", count: 5, totalAmount: 90000, completed: 3, completionRate: 60 },
        { service: "DOB Modification", count: 3, totalAmount: 55000, completed: 0, completionRate: 0 },
      ],
    });

    const pipeline = aggregate.mock.calls[0][0];
    const facet = pipeline.find((stage) => stage.$facet).$facet;
    expect(pipeline[0].$match.createdAt.$gte.toISOString()).toBe("2025-04-01T00:00:00.000Z");
    expect(pipeline[0].$match.$and).toEqual(expect.arrayContaining([
      expect.objectContaining({
        $or: expect.arrayContaining([
          { amount: { $lte: 50000 } },
          { amountCharged: { $lte: 50000 } },
        ]),
      }),
    ]));
    expect(facet.analytics).toEqual(expect.arrayContaining([
      expect.objectContaining({ $group: expect.objectContaining({ totalRequests: { $sum: 1 } }) }),
    ]));
    expect(facet.services).toEqual(expect.arrayContaining([
      expect.objectContaining({ $group: expect.objectContaining({ count: { $sum: 1 } }) }),
    ]));
    expect(facet.data[0]).toHaveProperty("$sort");
    expect(pipeline.some((stage) => stage.$sort)).toBe(false);
  });
});
