jest.mock("../models/User.model", () => ({ findById: jest.fn() }));
jest.mock("../models/Article.model", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  exists: jest.fn(),
  create: jest.fn(),
}));
jest.mock("../shared/cloudinary", () => ({ uploadToCloudinary: jest.fn() }));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const Article = require("../models/Article.model");
const { uploadToCloudinary } = require("../shared/cloudinary");
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

  it("sanitizes article markup before saving", async () => {
    User.findById.mockResolvedValue({
      id: "admin-1",
      _id: "admin-1",
      email: "admin@example.com",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });
    Article.exists.mockResolvedValue(false);
    Article.create.mockImplementation(async (payload) => payload);

    const response = await request(app)
      .post("/api/admin/articles")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({
        title: "Safe guide",
        body: '<p>Hello <a href="https://example.com" onclick="alert(1)">source</a><script>alert(1)</script></p>',
      });

    expect(response.status).toBe(201);
    expect(Article.create.mock.calls[0][0].body).toBe('<p>Hello <a href="https://example.com">source</a></p>');
  });

  it("rejects rich-text bodies that contain only empty paragraphs", async () => {
    User.findById.mockResolvedValue({
      id: "admin-1",
      _id: "admin-1",
      email: "admin@example.com",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });

    const response = await request(app)
      .post("/api/admin/articles")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ title: "Empty guide", body: "<p><br></p>" });

    expect(response.status).toBe(400);
    expect(Article.create).not.toHaveBeenCalled();
  });

  it("uploads article images to Cloudinary for super-admins", async () => {
    User.findById.mockResolvedValue({
      id: "admin-1",
      _id: "admin-1",
      email: "admin@example.com",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });
    uploadToCloudinary.mockResolvedValue("https://res.cloudinary.com/example/image/upload/article.png");

    const response = await request(app)
      .post("/api/admin/articles/image")
      .set("Authorization", `Bearer ${makeToken()}`)
      .attach("image", Buffer.from("image-bytes"), { filename: "guide.png", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(response.body.url).toBe("https://res.cloudinary.com/example/image/upload/article.png");
    expect(uploadToCloudinary).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/), "articles");
  });
});