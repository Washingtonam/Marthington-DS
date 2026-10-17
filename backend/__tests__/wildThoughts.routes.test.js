jest.mock("../models/User.model", () => ({ findById: jest.fn() }));
jest.mock("../models/WildThought.model", () => ({
  find: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
}));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const WildThought = require("../models/WildThought.model");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { verifyToken } = require("../shared/authGuard");
const adminRouter = require("../routes/admin.routes");

const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
const app = express();
app.use(express.json());
app.use("/api/admin", verifyToken, adminRouter);

const tokenFor = (id) => jwt.sign({ id }, secret);
const thoughtData = {
  title: "Market BMS to retailers",
  venture: "Marthington BMS",
  category: "Marketing partnership",
  body: "Contact performance marketers and test a small pilot.",
  followUp: "Ask for their pilot budget and SaaS examples.",
};

describe("super-admin Wild Thoughts routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockImplementation(async (id) => ({
      id,
      _id: id,
      role: id === "wild-super-admin" ? "super_admin" : "admin",
      status: "active",
      approvalStatus: "approved",
    }));
  });

  it("lists only the authenticated super admin's thoughts", async () => {
    const query = { sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
    WildThought.find.mockReturnValue(query);

    const response = await request(app)
      .get("/api/admin/wild-thoughts")
      .set("Authorization", `Bearer ${tokenFor("wild-super-admin")}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, thoughts: [] });
    expect(WildThought.find).toHaveBeenCalledWith({ createdBy: "wild-super-admin" });
  });

  it("rejects non-super-admin access", async () => {
    const response = await request(app)
      .get("/api/admin/wild-thoughts")
      .set("Authorization", `Bearer ${tokenFor("regular-admin")}`);

    expect(response.status).toBe(403);
    expect(WildThought.find).not.toHaveBeenCalled();
  });

  it("validates required fields before creating a thought", async () => {
    const response = await request(app)
      .post("/api/admin/wild-thoughts")
      .set("Authorization", `Bearer ${tokenFor("wild-super-admin")}`)
      .send({ ...thoughtData, category: "Unapproved category" });

    expect(response.status).toBe(400);
    expect(WildThought.create).not.toHaveBeenCalled();
  });

  it("creates a thought scoped to the authenticated super admin", async () => {
    WildThought.create.mockImplementation(async (thought) => thought);

    const response = await request(app)
      .post("/api/admin/wild-thoughts")
      .set("Authorization", `Bearer ${tokenFor("wild-super-admin")}`)
      .send({ ...thoughtData, id: "legacy-thought-1" });

    expect(response.status).toBe(201);
    expect(WildThought.create).toHaveBeenCalledWith({
      ...thoughtData,
      _id: "legacy-thought-1",
      createdBy: "wild-super-admin",
    });
  });

  it("updates and deletes only thoughts owned by the authenticated super admin", async () => {
    WildThought.findOneAndUpdate.mockResolvedValue({ _id: "idea-1", ...thoughtData, title: "Updated" });
    WildThought.findOneAndDelete.mockResolvedValue({ _id: "idea-1" });

    const updateResponse = await request(app)
      .put("/api/admin/wild-thoughts/idea-1")
      .set("Authorization", `Bearer ${tokenFor("wild-super-admin")}`)
      .send({ title: "Updated" });
    const deleteResponse = await request(app)
      .delete("/api/admin/wild-thoughts/idea-1")
      .set("Authorization", `Bearer ${tokenFor("wild-super-admin")}`);

    expect(updateResponse.status).toBe(200);
    expect(WildThought.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "idea-1", createdBy: "wild-super-admin" },
      { $set: { title: "Updated" } },
      { new: true, runValidators: true },
    );
    expect(deleteResponse.status).toBe(200);
    expect(WildThought.findOneAndDelete).toHaveBeenCalledWith({
      _id: "idea-1",
      createdBy: "wild-super-admin",
    });
  });
});
