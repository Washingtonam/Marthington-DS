const crypto = require("crypto");
const Flutterwave = require("flutterwave-node-v3");
const User = require("../models/User.model");
const Transaction = require("../models/transaction.model");
const AuditLog = require("../models/AuditLog.model");

const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY || process.env.VITE_FLW_PUBLIC_KEY || "",
  process.env.FLW_SECRET_KEY || ""
);

function verifyFlutterwaveSignature(signature, rawBody, secret) {
  if (!signature || !secret || !rawBody) return false;
  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return hash === signature;
}

const handleFlutterwaveWebhook = async (req, res) => {
  const startTime = Date.now();
  let transaction = null;
  let user = null;

  try {
    const signature = req.headers["verif-hash"] || req.headers["x-flw-signature"] || req.headers["x-flutterwave-signature"];
    const secret = process.env.FLW_SECRET_HASH;

    if (!secret) {
      console.error("FLW_SECRET_HASH is not configured");
      return res.status(500).json({ success: false, message: "Payment webhook is not configured correctly." });
    }

    if (!signature) {
      return res.status(400).json({ success: false, message: "Invalid webhook request: missing signature." });
    }

    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {})));
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      return res.status(400).json({ success: false, message: "Invalid webhook payload." });
    }

    if (!verifyFlutterwaveSignature(signature, rawBody, secret)) {
      return res.status(401).json({ success: false, message: "Invalid signature - webhook verification failed." });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch (parseError) {
      console.error("Failed to parse webhook payload", parseError);
      return res.status(400).json({ success: false, message: "Malformed webhook payload." });
    }

    if (event.event !== "charge.completed") {
      return res.status(200).json({ success: true, message: `Webhook acknowledged: ${event.event}` });
    }

    const txId = String(event.data?.id || "").trim();
    const reference = String(event.data?.tx_ref || event.data?.reference || "").trim();
    const amountKobo = Math.round(Number(event.data?.amount || 0) * 100);
    const customerEmail = String(event.data?.customer?.email || "").toLowerCase().trim();
    const paymentMethod = event.data?.payment_type || "card";

    if (!reference || !txId || amountKobo <= 0) {
      return res.status(400).json({ success: false, message: "Invalid payment event payload." });
    }

    transaction = await Transaction.findOne({ reference }).exec();
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found in database." });
    }

    if (transaction.status === "success" || transaction.status === "successful") {
      return res.status(200).json({ success: true, message: "Payment already processed.", isDuplicate: true });
    }

    const verificationResponse = await flw.Transactions.verify({ id: txId });
    const verificationData = verificationResponse?.data?.data;

    if (!verificationData || !["successful", "success"].includes(verificationData.status)) {
      return res.status(400).json({ success: false, message: "Flutterwave payment is not yet successful." });
    }

    user = await User.findById(transaction.userId).exec();
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    const balanceBefore = user.walletBalanceKobo || 0;
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { walletBalanceKobo: amountKobo, walletBalance: amountKobo / 100 } },
      { returnDocument: "after" }
    ).exec();

    if (!updatedUser) {
      return res.status(500).json({ success: false, message: "Failed to credit wallet." });
    }

    transaction.status = "success";
    transaction.gatewayResponse = verificationData.status;
    transaction.paymentMethod = paymentMethod;
    transaction.externalReference = txId;
    await transaction.save();

    try {
      await new AuditLog({
        action: "FLUTTERWAVE_CREDIT",
        performedBy: "system:flutterwave-webhook",
        userId: user._id,
        amount: amountKobo,
        balanceBefore,
        balanceAfter: updatedUser.walletBalanceKobo,
        note: `Flutterwave wallet funding | Reference: ${reference} | Flutterwave TX ID: ${txId} | Method: ${paymentMethod} | Email: ${customerEmail}`,
      }).save();
    } catch (auditErr) {
      console.error("Failed to create audit log", auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Payment confirmed and wallet credited.",
      data: {
        userId: user._id,
        userEmail: user.email,
        reference,
        amountKobo,
        amountNaira: (amountKobo / 100).toFixed(2),
        walletBalanceNaira: (updatedUser.walletBalanceKobo / 100).toFixed(2),
        walletBalanceKobo: updatedUser.walletBalanceKobo,
        processingTime: `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    console.error("Flutterwave webhook processing failed", error);
    return res.status(500).json({ success: false, message: "Webhook processing failed." });
  }
};

const verifyPaymentManual = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: "Payment reference is required." });
    }

    const transaction = await Transaction.findOne({ reference }).exec();
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    return res.status(200).json({
      success: true,
      data: {
        reference,
        status: transaction.status,
        amountKobo: transaction.amountKobo,
        amountNaira: (transaction.amountKobo / 100).toFixed(2),
        type: transaction.type,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    console.error("Manual payment verification error:", error);
    return res.status(500).json({ success: false, message: "Verification failed." });
  }
};

const getWalletStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).select("email walletBalance walletBalanceKobo").exec();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const recentTransactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10).select("reference type amountKobo status createdAt").exec();

    return res.status(200).json({
      success: true,
      data: {
        email: user.email,
        walletBalanceNaira: (user.walletBalanceKobo / 100).toFixed(2),
        walletBalanceKobo: user.walletBalanceKobo,
        recentTransactions: recentTransactions.map((tx) => ({
          reference: tx.reference,
          type: tx.type,
          amountNaira: (tx.amountKobo / 100).toFixed(2),
          amountKobo: tx.amountKobo,
          status: tx.status,
          date: tx.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Wallet status fetch error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch wallet status." });
  }
};

const initiatePayment = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { amount } = req.body;
    const amountKobo = Number(amount) ? Math.round(Number(amount) * 100) : 0;

    if (!amountKobo || amountKobo <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount. Amount must be greater than 0." });
    }

    if (amountKobo < 10000) {
      return res.status(400).json({ success: false, message: "Minimum amount is ₦100" });
    }

    if (amountKobo > 500000000) {
      return res.status(400).json({ success: false, message: "Maximum amount is ₦5,000,000" });
    }

    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const timestamp = Date.now();
    const randomPart = crypto.randomBytes(8).toString("hex").toUpperCase();
    const reference = `FLW_${randomPart}_${timestamp}`;

    const transaction = new Transaction({
      userId,
      type: "credit",
      amount: Number((amountKobo / 100).toFixed(2)),
      amountKobo,
      status: "pending",
      reference,
      description: "Flutterwave wallet funding",
    });
    await transaction.save();

    const flutterwaveSubaccount = process.env.FLW_OPAY_SUBACCOUNT_ID;
    const initializePayload = {
      tx_ref: reference,
      amount: Number((amountKobo / 100).toFixed(2)),
      currency: "NGN",
      redirect_url: `${process.env.FRONTEND_URL || "https://xcombinator.onrender.com"}/wallet?flutterwave=success`,
      customer: { email: user.email },
      meta: { source: String(req.body.source || process.env.FLW_PAYMENT_SOURCE || "XCOMBINATOR").trim() },
    };

    if (flutterwaveSubaccount) {
      initializePayload.subaccounts = [{ id: flutterwaveSubaccount, transaction_split_ratio: 1 }];
    }

    const response = await flw.Transactions.initialize(initializePayload);
    const payloadData = response?.data?.data;

    if (!payloadData) {
      throw new Error("Invalid response from Flutterwave initialization.");
    }

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully.",
      reference,
      authorizationUrl: payloadData.link || payloadData.authorization_url,
      data: {
        reference,
        amountKobo,
        amountNaira: (amountKobo / 100).toFixed(2),
        userId,
      },
    });
  } catch (error) {
    console.error("Flutterwave payment initiation error:", error);
    return res.status(500).json({ success: false, message: "Failed to initialize payment.", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

module.exports = {
  handleFlutterwaveWebhook,
  initiatePayment,
  verifyPaymentManual,
  getWalletStatus,
};
