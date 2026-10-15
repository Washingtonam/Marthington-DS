jest.mock("../models/User.model", () => ({ findById: jest.fn() }));
jest.mock("../models/SystemSettings.model", () => ({ findOneAndUpdate: jest.fn() }));
jest.mock("../models/AuditLog.model", () => ({ create: jest.fn() }));
jest.mock("../services/commission.service", () => ({
  awardCommissionIfEligible: jest.fn(),
}));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../models/User.model");
const SystemSettings = require("../models/SystemSettings.model");
const AuditLog = require("../models/AuditLog.model");
const { awardCommissionIfEligible } = require("../services/commission.service");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { verifyToken } = require("../shared/authGuard");
const adminRouter = require("../routes/admin.routes");
const ServiceRequest = mongoose.model("ServiceRequest");
const CacRequest = mongoose.model("CacRequest");

const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
const app = express();
app.use(express.json());
app.use("/api/admin", verifyToken, adminRouter);

const makeToken = () => jwt.sign({ id: "reviewer-1" }, secret);

describe("admin commission settings routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockImplementation(async (id) => ({
      id,
      _id: id,
      email: "reviewer@example.com",
      role: id === "super-admin-1" ? "super_admin" : "admin",
      status: "active",
      approvalStatus: "approved",
    }));
  });

  it("returns the current commission configuration to admins", async () => {
    SystemSettings.findOneAndUpdate.mockResolvedValue({
      commissionType: "PERCENTAGE",
      commissionValue: 10,
    });

    const response = await request(app)
      .get("/api/admin/settings/commission")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.settings).toEqual({
      commissionType: "PERCENTAGE",
      commissionValue: 10,
    });
  });

  it("rejects commission updates from non-super-admin users", async () => {
    const response = await request(app)
      .put("/api/admin/settings/commission")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ commissionType: "FLAT", commissionValue: 2000 });

    expect(response.status).toBe(403);
    expect(SystemSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects percentage values above 100", async () => {
    User.findById.mockResolvedValueOnce({
      id: "super-admin-1",
      _id: "super-admin-1",
      email: "root@example.com",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });

    const response = await request(app)
      .put("/api/admin/settings/commission")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ commissionType: "PERCENTAGE", commissionValue: 101 });

    expect(response.status).toBe(400);
    expect(SystemSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("saves valid commission values with the acting admin id", async () => {
    User.findById.mockResolvedValueOnce({
      id: "super-admin-1",
      _id: "super-admin-1",
      email: "root@example.com",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });
    SystemSettings.findOneAndUpdate.mockResolvedValue({
      commissionType: "FLAT",
      commissionValue: 2500,
    });

    const response = await request(app)
      .put("/api/admin/settings/commission")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ commissionType: "FLAT", commissionValue: 2500 });

    expect(response.status).toBe(200);
    expect(SystemSettings.findOneAndUpdate).toHaveBeenCalledWith(
      { key: "global" },
      {
        $set: {
          commissionType: "FLAT",
          commissionValue: 2500,
          updatedBy: "super-admin-1",
        },
        $setOnInsert: { key: "global" },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  });

  it("awards commission when a request transitions to completed", async () => {
    const record = {
      _id: "507f1f77bcf86cd799439011",
      userId: "agent-1",
      status: "processing",
      statusHistory: [],
      save: jest.fn().mockResolvedValue(undefined),
      markModified: jest.fn(),
    };
    jest.spyOn(ServiceRequest, "findById").mockResolvedValue(record);
    jest.spyOn(CacRequest, "findById").mockResolvedValue(null);
    awardCommissionIfEligible.mockResolvedValue({ awarded: true });
    AuditLog.create.mockResolvedValue({});

    const response = await request(app)
      .post("/api/admin/requests/507f1f77bcf86cd799439011/status")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ action: "complete" });

    expect(response.status).toBe(200);
    expect(record.status).toBe("completed");
    expect(awardCommissionIfEligible).toHaveBeenCalledWith({ request: record });
  });
});
