const crypto = require("crypto");
const axios = require("axios");
const Flutterwave = require("flutterwave-node-v3");
const User = require("../models/User.model");
const Transaction = require("../models/transaction.model");
const AuditLog = require("../models/AuditLog.model");
const { normalizeAmountKobo, buildCentralGatewayCheckoutUrl, creditWalletForSuccessfulPayment, verifyGatewaySignature, isSuccessfulGatewayStatus, selectSignatureHeader, resolveCentralCallbackUrl } = require("../shared/paymentBridge");

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

    const flwTransactionClient = flw.Transaction || flw.Transactions;

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

    const verificationResponse = await flwTransactionClient.verify({ id: txId });
    const verificationData = verificationResponse?.data || verificationResponse;

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

    const flwTransactionClient = flw.Transaction || flw.Transactions;
    const flutterwaveSecretKey = process.env.FLW_SECRET_KEY;
    let payloadData;

    if (!flutterwaveSecretKey) {
      throw new Error("FLW_SECRET_KEY is not configured.");
    }

    if (typeof flwTransactionClient?.initialize === "function") {
      const response = await flwTransactionClient.initialize(initializePayload);
      payloadData = response?.data?.data || response?.data || response;
    } else {
      const response = await axios.post(
        `${process.env.FLW_API_BASE_URL || "https://api.flutterwave.com"}/v3/payments`,
        initializePayload,
        {
          headers: {
            Authorization: `Bearer ${flutterwaveSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      payloadData = response?.data?.data || response?.data;
    }

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

const initiateCentralGatewayPayment = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { amount, gatewayUrl, callbackUrl, appName = 'marthington' } = req.body;
    const amountKobo = normalizeAmountKobo(amount);

    if (!amountKobo || amountKobo <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount. Amount must be greater than 0.' });
    }

    if (amountKobo < 10000) {
      return res.status(400).json({ success: false, message: 'Minimum amount is ₦100' });
    }

    if (amountKobo > 500000000) {
      return res.status(400).json({ success: false, message: 'Maximum amount is ₦5,000,000' });
    }

    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const timestamp = Date.now();
    const randomPart = crypto.randomBytes(8).toString('hex').toUpperCase();
    const reference = `CENTRAL_${randomPart}_${timestamp}`;

    const transaction = new Transaction({
      userId,
      type: 'credit',
      amount: Number((amountKobo / 100).toFixed(2)),
      amountKobo,
      status: 'pending',
      reference,
      description: 'Central gateway wallet funding',
    });
    await transaction.save();

    const gatewayBaseUrl = String(gatewayUrl || process.env.CENTRAL_PAYMENT_GATEWAY_URL || '').trim();
    if (!gatewayBaseUrl) {
      return res.status(500).json({ success: false, message: 'Central payment gateway URL is not configured.' });
    }

    const finalCallbackUrl = resolveCentralCallbackUrl({ callbackUrl, env: process.env });
    const checkoutUrl = buildCentralGatewayCheckoutUrl({
      gatewayUrl: gatewayBaseUrl,
      reference,
      amount: Number((amountKobo / 100).toFixed(2)),
      userId,
      email: user.email,
      callbackUrl: finalCallbackUrl,
      appName,
    });

    return res.status(200).json({
      success: true,
      message: 'Central gateway payment initialized.',
      reference,
      checkoutUrl,
      data: {
        reference,
        amountKobo,
        amountNaira: (amountKobo / 100).toFixed(2),
        userId,
      },
    });
  } catch (error) {
    console.error('Central gateway initiation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initialize central gateway payment.', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

const handleCentralGatewayCallback = async (req, res) => {
  try {
    const signature = selectSignatureHeader(req.headers);
    const secret = process.env.CENTRAL_PAYMENT_GATEWAY_SECRET;
    const rawPayload = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})));
    const payloadText = Buffer.isBuffer(rawPayload) ? rawPayload.toString('utf8') : String(rawPayload || '');

    if (!secret) {
      return res.status(500).json({ success: false, message: 'Central gateway secret is not configured.' });
    }

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing signature header.' });
    }

    const payload = JSON.parse(payloadText);
    const status = String(payload?.status || payload?.state || '').trim();
    const isValid = verifyGatewaySignature({ payload: payloadText, signature, secret }) || verifyGatewaySignature({ payload: payloadText, signature, secret, algorithm: 'sha512' });
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid gateway signature.' });
    }

    if (!isSuccessfulGatewayStatus(status)) {
      return res.status(200).json({ success: true, message: 'Payment is not yet successful.', ignored: true });
    }
    const reference = String(payload?.reference || payload?.tx_ref || payload?.transaction_ref || '').trim();
    const amountKobo = normalizeAmountKobo(payload?.amount || payload?.amount_kobo || payload?.total_amount || 0);
    const gateway = String(payload?.gateway || payload?.provider || 'central-gateway').trim();
    const externalReference = String(payload?.external_reference || payload?.transaction_id || payload?.reference || reference).trim();
    const paymentMethod = String(payload?.payment_method || payload?.method || gateway).trim();
    const actionType = String(payload?.action_type || payload?.actionType || payload?.type || '').trim().toUpperCase();

    if (actionType && actionType !== 'FUND_WALLET') {
      return res.status(200).json({ success: true, message: 'Ignored non-wallet action.', ignored: true });
    }

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Missing payment reference.' });
    }

    const transaction = await Transaction.findOne({ reference }).exec();
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    if (transaction.status === 'success' || transaction.status === 'successful') {
      return res.status(200).json({ success: true, message: 'Transaction already processed.', duplicate: true });
    }

    const result = await creditWalletForSuccessfulPayment({
      userId: transaction.userId,
      amountKobo: amountKobo || transaction.amountKobo || 0,
      reference,
      gateway,
      externalReference,
      paymentMethod,
      source: gateway,
    });

    return res.status(200).json({
      success: true,
      message: 'Wallet credited successfully.',
      data: {
        reference,
        amountKobo: amountKobo || transaction.amountKobo || 0,
        walletBalanceKobo: result.walletBalanceKobo,
        walletBalance: result.walletBalance,
      },
    });
  } catch (error) {
    console.error('Central gateway callback error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process central gateway callback.' });
  }
};

module.exports = {
  handleFlutterwaveWebhook,
  initiatePayment,
  verifyPaymentManual,
  getWalletStatus,
  initiateCentralGatewayPayment,
  handleCentralGatewayCallback,
};
