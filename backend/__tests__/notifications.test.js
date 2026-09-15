const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const {
  isWithinSchedule,
  matchesTarget,
  validatePayload,
} = require("../routes/notifications.routes");

const signToken = (role) => jwt.sign(
  { id: "admin-user-1", email: "admin@example.com", role },
  process.env.JWT_SECRET || "test-jwt-secret"
);

describe("notification rules and access", () => {
  it("accepts a currently active scheduled notification", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    expect(isWithinSchedule({ startsAt: "2026-09-15T11:00:00.000Z", endsAt: "2026-09-15T13:00:00.000Z" }, now)).toBe(true);
  });

  it("rejects notifications outside their schedule", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    expect(isWithinSchedule({ startsAt: "2026-09-15T13:00:00.000Z" }, now)).toBe(false);
    expect(isWithinSchedule({ endsAt: "2026-09-15T11:00:00.000Z" }, now)).toBe(false);
  });

  it("matches global, page, and service targets", () => {
    expect(matchesTarget({ targetType: "global" }, "/anything", "")).toBe(true);
    expect(matchesTarget({ targetType: "page", targetValue: "/nin-services" }, "/nin-services", "")).toBe(true);
    expect(matchesTarget({ targetType: "service", targetValue: "/nin-services/modification" }, "/nin-services", "/nin-services/modification")).toBe(true);
    expect(matchesTarget({ targetType: "page", targetValue: "/cac-services" }, "/nin-services", "")).toBe(false);
  });

  it("rejects malformed scheduling and targeting payloads", () => {
    expect(validatePayload({ title: "Notice", message: "Hello", targetType: "unknown" })).toBe("targetType is invalid.");
    expect(validatePayload({ title: "Notice", message: "Hello", startsAt: "bad-date" })).toBe("startsAt must be a valid date.");
    expect(validatePayload({ title: "Notice", message: "Hello", targetType: "page" })).toBe("targetValue is required for page and service notifications.");
    expect(validatePayload({ title: "Notice", message: "Hello", startsAt: "2026-09-15T13:00:00Z", endsAt: "2026-09-15T12:00:00Z" })).toBe("endsAt must be after startsAt.");
  });

  it("keeps notification management restricted to super admins", async () => {
    const regularAdmin = await request(app)
      .get("/api/admin/notifications")
      .set("Authorization", `Bearer ${signToken("admin")}`);
    expect(regularAdmin.status).toBe(403);
  });

  it("returns client validation errors before touching the database", async () => {
    const response = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${signToken("super_admin")}`)
      .send({ title: "", message: "", targetType: "global" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("title is required.");
  });
});