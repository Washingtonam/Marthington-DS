jest.mock("../models/User.model", () => ({ findById: jest.fn() }));
jest.mock("../models/SystemSettings.model", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("../shared/cloudinary", () => ({ uploadToCloudinary: jest.fn() }));

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const User = require("../models/User.model");
const SystemSettings = require("../models/SystemSettings.model");
const { uploadToCloudinary } = require("../shared/cloudinary");
const { JWT_SECRET_FALLBACK } = require("../config/constants");
const { verifyToken } = require("../shared/authGuard");
const adminRouter = require("../routes/admin.routes");
const brandingRouter = require("../routes/branding.routes");

const secret = process.env.JWT_SECRET || JWT_SECRET_FALLBACK;
const app = express();
app.use(express.json());
app.use("/api/branding", brandingRouter);
app.use("/api/admin", verifyToken, adminRouter);
const token = jwt.sign({ id: "branding-user" }, secret);

describe("business branding routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockImplementation(async (id) => ({
      id,
      _id: id,
      role: id === "branding-super-admin" ? "super_admin" : "user",
      status: "active",
      approvalStatus: "approved",
    }));
  });

  it("returns shared branding through the public read endpoint", async () => {
    SystemSettings.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          businessName: "Example Identity",
          businessTagline: "Identity services",
          businessLogoUrl: "https://cdn.example/logo.png",
        }),
      }),
    });

    const response = await request(app).get("/api/branding");

    expect(response.status).toBe(200);
    expect(response.body.branding).toEqual({
      businessName: "Example Identity",
      businessTagline: "Identity services",
      businessLogoUrl: "https://cdn.example/logo.png",
    });
  });

  it("denies branding changes to ordinary accounts", async () => {
    const response = await request(app)
      .put("/api/admin/settings/branding")
      .set("Authorization", `Bearer ${token}`)
      .send({ businessName: "Unauthorized", businessTagline: "Not allowed" });

    expect(response.status).toBe(403);
    expect(SystemSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("persists branding changes for an authenticated super admin", async () => {
    User.findById.mockResolvedValueOnce({
      id: "branding-super-admin",
      _id: "branding-super-admin",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });
    SystemSettings.findOneAndUpdate.mockResolvedValue({
      businessName: "Updated Identity",
      businessTagline: "Services, simplified",
      businessLogoUrl: "",
    });

    const response = await request(app)
      .put("/api/admin/settings/branding")
      .set("Authorization", `Bearer ${jwt.sign({ id: "branding-super-admin" }, secret)}`)
      .send({ businessName: "Updated Identity", businessTagline: "Services, simplified" });

    expect(response.status).toBe(200);
    expect(response.body.branding.businessName).toBe("Updated Identity");
    expect(SystemSettings.findOneAndUpdate).toHaveBeenCalledWith(
      { key: "global" },
      {
        $set: {
          businessName: "Updated Identity",
          businessTagline: "Services, simplified",
          updatedBy: "branding-super-admin",
        },
        $setOnInsert: { key: "global" },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  });

  it("uploads an accepted logo image and saves the hosted URL", async () => {
    User.findById.mockResolvedValueOnce({
      id: "branding-super-admin",
      _id: "branding-super-admin",
      role: "super_admin",
      status: "active",
      approvalStatus: "approved",
    });
    uploadToCloudinary.mockResolvedValue("https://cdn.example/uploaded-logo.png");
    SystemSettings.findOneAndUpdate.mockResolvedValue({
      businessName: "Updated Identity",
      businessTagline: "Services, simplified",
      businessLogoUrl: "https://cdn.example/uploaded-logo.png",
    });

    const response = await request(app)
      .put("/api/admin/settings/branding")
      .set("Authorization", `Bearer ${jwt.sign({ id: "branding-super-admin" }, secret)}`)
      .field("businessName", "Updated Identity")
      .field("businessTagline", "Services, simplified")
      .attach("logo", Buffer.from("logo-content"), { filename: "logo.png", contentType: "image/png" });

    expect(response.status).toBe(200);
    expect(response.body.branding.businessLogoUrl).toBe("https://cdn.example/uploaded-logo.png");
    expect(uploadToCloudinary).toHaveBeenCalledWith("data:image/png;base64,bG9nby1jb250ZW50", "branding");
  });
});
