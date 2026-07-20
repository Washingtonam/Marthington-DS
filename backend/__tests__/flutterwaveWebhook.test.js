const crypto = require("crypto");
const { verifyFlutterwaveSignature } = require("../controllers/webhook.controller");

describe("verifyFlutterwaveSignature", () => {
  it("accepts a valid HMAC-SHA256 signature for the raw payload", () => {
    const secret = "flutterwave-secret";
    const payload = JSON.stringify({ event: "charge.completed", data: { tx_ref: "FLW_TEST_123" } });
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    expect(verifyFlutterwaveSignature(signature, secret, payload)).toBe(true);
  });

  it("rejects a signature generated from a different payload", () => {
    const secret = "flutterwave-secret";
    const payload = JSON.stringify({ event: "charge.completed", data: { tx_ref: "FLW_TEST_123" } });
    const otherPayload = JSON.stringify({ event: "charge.completed", data: { tx_ref: "FLW_TEST_999" } });
    const signature = crypto.createHmac("sha256", secret).update(otherPayload).digest("hex");

    expect(verifyFlutterwaveSignature(signature, secret, payload)).toBe(false);
  });
});
