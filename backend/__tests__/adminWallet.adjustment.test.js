jest.mock("../models/User.model", () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock("../models/AuditLog.model", () => ({ create: jest.fn().mockResolvedValue({}) }));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const Transaction = require("../models/transaction.model");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { verifyToken } = require("../shared/authGuard");
const adminRouter = require("../routes/admin.routes");

const accountId = "507f1f77bcf86cd799439011";
const app = express();
app.use(express.json());
app.use("/api/admin", verifyToken, adminRouter);

describe("admin wallet adjustment", () => {
  let actor;
  let saveTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    actor = {
      id: accountId,
      _id: accountId,
      email: "root@example.test",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    };
    User.findById.mockResolvedValue(actor);
    User.findByIdAndUpdate.mockResolvedValue({
      ...actor,
      walletBalance: 25,
      walletBalanceKobo: 2500,
    });
    saveTransaction = jest.spyOn(Transaction.prototype, "save").mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const tokenForActor = () => jwt.sign({ id: accountId }, process.env.JWT_SECRET || JWT_SECRET_FALLBACK);

  it("credits the super-admin's own wallet and records an admin credit", async () => {
    const response = await request(app)
      .post("/api/admin/adjust-funds")
      .set("Authorization", `Bearer ${tokenForActor()}`)
      .send({ userId: accountId, amount: 25, action: "add", note: "Service application funding" });

    expect(response.status).toBe(200);
    expect(response.body.data.balanceAfter).toBe(25);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      accountId,
      { $inc: { walletBalanceKobo: 2500, walletBalance: 25 } },
      { returnDocument: "after" }
    );
    expect(saveTransaction).toHaveBeenCalledTimes(1);
    expect(saveTransaction.mock.instances[0].type).toBe("admin_credit");
  });

  it("keeps super-admin wallet deductions blocked", async () => {
    const response = await request(app)
      .post("/api/admin/adjust-funds")
      .set("Authorization", `Bearer ${tokenForActor()}`)
      .send({ userId: accountId, amount: 5, action: "deduct" });

    expect(response.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("accepts admin adjustment transaction types in the ledger schema", async () => {
    const entry = new Transaction({
      userId: accountId,
      type: "admin_credit",
      amount: 25,
      amountKobo: 2500,
      status: "success",
      reference: "ADMIN_ADD_TEST",
    });

    await expect(entry.validate()).resolves.toBeUndefined();
  });

  it("still denies wallet adjustments from ordinary admins", async () => {
    actor.role = "admin";

    const response = await request(app)
      .post("/api/admin/adjust-funds")
      .set("Authorization", `Bearer ${tokenForActor()}`)
      .send({ userId: accountId, amount: 25, action: "add" });

    expect(response.status).toBe(403);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});