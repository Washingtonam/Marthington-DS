const crypto = require("crypto");
const User = require("../models/User.model");

const handlePaystackWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      console.error("PAYSTACK_SECRET_KEY is not configured");
      return res.status(500).json({ success: false, message: "Payment webhook is not configured correctly." });
    }

    if (!signature) {
      console.warn("Missing Paystack signature header");
      return res.status(400).json({ success: false, message: "Invalid webhook request: missing signature." });
    }

    const rawBody = req.body;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      console.warn("Paystack webhook received invalid raw body");
      return res.status(400).json({ success: false, message: "Invalid webhook payload." });
    }

    const payload = rawBody.toString("utf8");
    const hash = crypto.createHmac("sha512", secret).update(payload).digest("hex");

    if (hash !== signature) {
      console.warn("Paystack webhook signature mismatch", { expected: signature, actual: hash });
      return res.status(400).json({ success: false, message: "Invalid signature." });
    }

    let event;
    try {
      event = JSON.parse(payload);
    } catch (parseError) {
      console.error("Failed to parse Paystack webhook payload", parseError);
      return res.status(400).json({ success: false, message: "Malformed webhook payload." });
    }

    if (event.event !== "charge.success") {
      return res.status(200).json({ success: true, message: "Webhook received: no action taken." });
    }

    const amount = Number(event.data?.amount || 0);
    const email = String(event.data?.customer?.email || "").toLowerCase().trim();

    if (!email || amount <= 0) {
      console.warn("Paystack webhook missing required payment details", { email, amount });
      return res.status(400).json({ success: false, message: "Invalid payment event payload." });
    }

    const nairaAmount = Number((amount / 100).toFixed(2));

    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        $inc: {
          walletBalanceKobo: amount,
          walletBalance: nairaAmount,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      console.warn("Paystack webhook user not found", { email });
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Payment confirmed and wallet updated.",
      userId: updatedUser._id,
      walletBalance: updatedUser.walletBalance,
      walletBalanceKobo: updatedUser.walletBalanceKobo,
    });
  } catch (err) {
    console.error("Paystack webhook processing failed", err);
    return res.status(500).json({ success: false, message: "Webhook processing error." });
  }
};

module.exports = { handlePaystackWebhook };