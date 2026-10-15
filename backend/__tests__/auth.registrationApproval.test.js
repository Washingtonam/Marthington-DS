jest.mock("../models/User.model", () => ({ findOne: jest.fn(), create: jest.fn(), findById: jest.fn() }));
jest.mock("../models/AuditLog.model", () => ({ create: jest.fn() }));

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const AuditLog = require("../models/AuditLog.model");
const { JWT_SECRET_FALLBACK, SUPER_ADMIN_EMAIL } = require("../config/constants");
const authRouter = require("../routes/auth.routes");

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

const registration = (email = "agent@example.com") => ({
  firstName: "Agent",
  lastName: "Example",
  nin: "12345678901",
  email,
  phone: "08031234567",
  address: "12 Example Street",
  state: "Lagos",
  lga: "Ikeja",
  password: "AgentPassword1!",
  confirmPassword: "AgentPassword1!",
});

describe("agent account approval during registration and login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("audits a user's password update without recording the password", async () => {
    const passwordHash = await bcrypt.hash("current-secret", 10);
    const user = {
      id: "user-id",
      _id: "user-id",
      email: "agent@example.com",
      role: "user",
      status: "active",
      approvalStatus: "approved",
      password: passwordHash,
      save: jest.fn().mockResolvedValue(undefined),
    };
    User.findById.mockResolvedValue(user);
    AuditLog.create.mockResolvedValue({});
    const token = jwt.sign({ id: "user-id" }, process.env.JWT_SECRET || JWT_SECRET_FALLBACK);

    const response = await request(app)
      .post("/api/auth/change-password")
      .auth(token, { type: "bearer" })
      .send({ currentPassword: "current-secret", newPassword: "new-secret" });

    expect(response.status).toBe(200);
    expect(await bcrypt.compare("new-secret", user.password)).toBe(true);
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      action: "USER_PROFILE_UPDATED",
      userId: "user-id",
      note: "User updated account details: password changed.",
    }));
    expect(JSON.stringify(AuditLog.create.mock.calls)).not.toContain("new-secret");
  });

  it("creates self-registered agents as pending and returns review status", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (data) => ({
      ...data,
      _id: "new-agent",
      walletBalance: 0,
      walletBalanceKobo: 0,
      units: 0,
    }));

    const response = await request(app).post("/api/auth/register").send(registration());

    expect(response.status).toBe(201);
    expect(response.body.user.approvalStatus).toBe("pending");
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ approvalStatus: "pending", role: "user" }));
  });

  it("keeps configured super-admin registration approved", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (data) => ({ ...data, _id: "root", units: 0 }));

    const response = await request(app).post("/api/auth/register").send(registration(SUPER_ADMIN_EMAIL));

    expect(response.status).toBe(201);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ approvalStatus: "approved", role: "super_admin" }));
  });

  it("requires a residential address, state, and local government", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...registration(), state: "", lga: "" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/address, state, and local government are required/i);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("stores the submitted residential location on the new account", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (data) => ({
      ...data,
      _id: "new-agent",
      walletBalance: 0,
      walletBalanceKobo: 0,
      units: 0,
    }));

    await request(app).post("/api/auth/register").send(registration());

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      address: "12 Example Street",
      state: "Lagos",
      lga: "Ikeja",
    }));
  });

  it("denies login while an agent application is pending", async () => {
    const password = await bcrypt.hash("AgentPassword1!", 10);
    User.findOne.mockResolvedValue({
      password,
      status: "active",
      approvalStatus: "pending",
      save: jest.fn(),
    });

    const response = await request(app).post("/api/auth/login").send({ email: "agent@example.com", password: "AgentPassword1!" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ACCOUNT_PENDING_APPROVAL");
  });

  it("issues a token after an agent has been approved", async () => {
    const password = await bcrypt.hash("AgentPassword1!", 10);
    User.findOne.mockResolvedValue({
      _id: "approved-agent",
      email: "agent@example.com",
      phone: "08031234567",
      password,
      status: "active",
      approvalStatus: "approved",
      role: "user",
      save: jest.fn(),
    });

    const response = await request(app).post("/api/auth/login").send({ email: "agent@example.com", password: "AgentPassword1!" });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
  });
});