jest.mock("../models/User.model", () => ({ findById: jest.fn() }));

const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { verifyToken } = require("../shared/authGuard");

const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;

const makeRequest = () => ({
  headers: { authorization: `Bearer ${jwt.sign({ id: "user-1", email: "agent@example.com", role: "user" }, secret)}` },
});

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("verifyToken account approval", () => {
  beforeEach(() => User.findById.mockReset());

  it("blocks a pending account even when its JWT is valid", async () => {
    User.findById.mockResolvedValue({
      id: "user-1",
      _id: "user-1",
      email: "agent@example.com",
      role: "user",
      status: "active",
      approvalStatus: "pending",
    });
    const req = makeRequest();
    const res = makeResponse();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "ACCOUNT_PENDING_APPROVAL" }));
    expect(next).not.toHaveBeenCalled();
  });

  it("uses current approved account data for a valid token", async () => {
    User.findById.mockResolvedValue({
      id: "user-1",
      _id: "user-1",
      email: "agent@example.com",
      role: "user",
      status: "active",
      approvalStatus: "approved",
    });
    const req = makeRequest();
    const res = makeResponse();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(req.user).toEqual({ id: "user-1", _id: "user-1", email: "agent@example.com", role: "user" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("continues to block suspended accounts", async () => {
    User.findById.mockResolvedValue({
      id: "user-1",
      _id: "user-1",
      email: "agent@example.com",
      role: "user",
      status: "suspended",
      approvalStatus: "approved",
    });
    const req = makeRequest();
    const res = makeResponse();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns a temporary service error when account lookup fails", async () => {
    User.findById.mockRejectedValue(new Error("database unavailable"));
    const req = makeRequest();
    const res = makeResponse();
    const next = jest.fn();
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});