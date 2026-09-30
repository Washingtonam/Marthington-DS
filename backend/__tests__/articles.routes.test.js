jest.mock("../models/User.model", () => ({ findById: jest.fn() }));
jest.mock("../models/Article.model", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  exists: jest.fn(),
  create: jest.fn(),
}));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const Article = require("../models/Article.model");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { verifyToken } = require("../shared/authGuard");
const { publicRouter, adminRouter } = require("../routes/articles.routes");

const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
const app = express();
app.use(express.json());
app.use("/api/articles", publicRouter);
app.use("/api/admin/articles", verifyToken, adminRouter);

const makeQuery = (result) => {
  const query = {
    select: jest.fn(() => query),
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(result),
  };
  return query;
};

const makeToken = (role = "super_admin") => jwt.sign(
  { id: "admin-1", email: "admin@example.com", role },
  secret
);

describe("article routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Article.countDocuments.mockResolvedValue(0);
  });

  it("lists only published articles whose publish date has arrived", async () => {
    Article.find.mockReturnValue(makeQuery([]));

    const response = await request(app).get("/api/articles");

    expect(response.status).toBe(200);
    expect(Article.find).toHaveBeenCalledWith({
      status: "published",
      publishedAt: { $lte: expect.any(Date) },
    });
  });

  it("does not resolve draft articles through their public slug", async () => {
    Article.findOne.mockReturnValue(makeQuery(null));

    const response = await request(app).get("/api/articles/private-draft");

    expect(response.status).toBe(404);
    expect(Article.findOne).toHaveBeenCalledWith({
      slug: "private-draft",
      status: "published",
      publishedAt: { $lte: expect.any(Date) },
    });
  });

  it("requires a super-admin to access publishing endpoints", async () => {
    User.findById.mockResolvedValue({
      id: "admin-1",
      _id: "admin-1",
      email: "agent@example.com",
      role: "user",
      status: "active",
      approvalStatus: "approved",
    });

    const response = await request(app)
      .get("/api/admin/articles")
      .set("Authorization", `Bearer ${makeToken("user")}`);

    expect(response.status).toBe(403);
    expect(Article.find).not.toHaveBeenCalled();
  });
});