jest.mock("../models/User.model", () => ({ findById: jest.fn() }));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { verifyToken } = require("../shared/authGuard");
const adminRouter = require("../routes/admin.routes");

const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
const app = express();
app.use(express.json());
app.use("/api/admin", verifyToken, adminRouter);

const makeToken = (role) => jwt.sign({ id: "reviewer-1", email: "reviewer@example.com", role }, secret);

const makeAgent = () => ({
  id: "agent-1",
  _id: "agent-1",
  role: "user",
  status: "active",
  approvalStatus: "pending",
  save: jest.fn().mockResolvedValue(undefined),
});

describe("admin agent approval actions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("approves a pending agent and records the reviewer", async () => {
    const agent = makeAgent();
    User.findById.mockImplementation(async (id) => id === "reviewer-1"
      ? { id: "reviewer-1", _id: "reviewer-1", email: "reviewer@example.com", role: "super_admin", status: "active", approvalStatus: "approved" }
      : agent);

    const response = await request(app)
      .put("/api/admin/user/agent-1/approve")
      .set("Authorization", `Bearer ${makeToken("super_admin")}`);

    expect(response.status).toBe(200);
    expect(agent.approvalStatus).toBe("approved");
    expect(agent.reviewedBy).toBe("reviewer-1");
    expect(agent.reviewedAt).toBeInstanceOf(Date);
    expect(agent.save).toHaveBeenCalledTimes(1);
  });

  it("rejects a pending agent without suspending the account", async () => {
    const agent = makeAgent();
    User.findById.mockImplementation(async (id) => id === "reviewer-1"
      ? { id: "reviewer-1", _id: "reviewer-1", email: "reviewer@example.com", role: "super_admin", status: "active", approvalStatus: "approved" }
      : agent);

    const response = await request(app)
      .put("/api/admin/user/agent-1/reject")
      .set("Authorization", `Bearer ${makeToken("super_admin")}`);

    expect(response.status).toBe(200);
    expect(agent.approvalStatus).toBe("rejected");
    expect(agent.status).toBe("active");
  });

  it("prevents non-super-admins from approving applications", async () => {
    User.findById.mockResolvedValue({
      id: "reviewer-1",
      _id: "reviewer-1",
      email: "agent@example.com",
      role: "admin",
      status: "active",
      approvalStatus: "approved",
    });

    const response = await request(app)
      .put("/api/admin/user/agent-1/approve")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(response.status).toBe(403);
    expect(User.findById).toHaveBeenCalledTimes(1);
  });
});