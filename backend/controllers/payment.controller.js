const crypto = require("crypto");
const User = require("../models/User.model");
const Transaction = require("../models/transaction.model");
const AuditLog = require("../models/AuditLog.model");

/**
 * Verify Flutterwave webhook signature using HMAC-SHA256
 * @param {string} signature - The verif-hash or x-flw-signature header
 * @param {Buffer} rawBody - The raw request body
 * @param {string} secret - The Flutterwave secret key
 * @returns {boolean} - True if signature is valid
 */
function verifyFlutterwaveSignature(signature, rawBody, secret) {
  if (!signature || !secret) return false;
  const payload = rawBody.toString("utf8");
  const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return hash === signature;
}

/**
 * Handle Flutterwave charge.completed webhook event
 * - Verifies webhook signature
 * - Links payment to Transaction record by reference
 * - Updates User wallet atomically using $inc
 * - Updates Transaction status to 'success'
 * - Creates AuditLog entry
 * 
 * @param {Object} req - Express request object with Flutterwave webhook header and raw body
 * @param {Object} res - Express response object
 */
const handleFlutterwaveWebhook = async (req, res) => {
  const startTime = Date.now();
  let transaction = null;
  let user = null;

  try {
    const signature = req.headers["verif-hash"] || req.headers["x-flw-signature"];
    const secret = process.env.FLW_SECRET_KEY;

    // ========================================
    // STEP 1: Security Validation
    // ========================================
    if (!secret) {
      console.error("❌ FLW_SECRET_KEY is not configured");
      return res.status(500).json({
        success: false,
        message: "Payment webhook is not configured correctly.",
      });
    }

    if (!signature) {
      console.warn("❌ Webhook received without signature header");
      return res.status(400).json({
        success: false,
        message: "Invalid webhook request: missing signature.",
      });
    }

    const rawBody = req.rawBody || req.body;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      console.warn("❌ Webhook received with invalid raw body");
      return res.status(400).json({
        success: false,
        message: "Invalid webhook payload.",
      });
    }

    // Verify HMAC-SHA256 signature
    if (!verifyFlutterwaveSignature(signature, rawBody, secret)) {
      console.warn("⚠️  Webhook signature mismatch - potential spoofing attempt");
      return res.status(401).json({
        success: false,
        message: "Invalid signature - webhook verification failed.",
      });
    }

    // ========================================
    // STEP 2: Parse Webhook Payload
    // ========================================
    let event;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch (parseError) {
      console.error("❌ Failed to parse webhook payload", parseError);
      return res.status(400).json({
        success: false,
        message: "Malformed webhook payload.",
      });
    }

    // ========================================
    // STEP 3: Filter by Event Type
    // ========================================
    if (event.event !== "charge.completed") {
      // Acknowledge other events but don't process
      console.log(`ℹ️  Webhook received: ${event.event} - no action taken`);
      return res.status(200).json({
        success: true,
        message: `Webhook acknowledged: ${event.event}`,
      });
    }

    // ========================================
    // STEP 4: Extract Payment Details
    // ========================================
    const amount = Number(event.data?.amount || 0);
    const amountKobo = Math.round(amount * 100);
    const reference = String(event.data?.tx_ref || event.data?.reference || "").trim();
    const flutterwaveTransactionId = event.data?.id;
    const customerEmail = String(event.data?.customer?.email || "").toLowerCase().trim();
    const metadata = event.data?.meta || event.data?.metadata || {};
    const paymentSource = String(metadata?.source || "").trim().toUpperCase();
    const isXcombinatorSource = paymentSource === "XCOMBINATOR";

    if (!reference || amountKobo <= 0) {
      console.warn("❌ Webhook missing required payment details", {
        reference,
        amountKobo,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid payment event payload: missing reference or amount.",
      });
    }

    console.log(`✅ Processing charge.completed event:`, {
      reference,
      amountKobo,
      email: customerEmail,
      flutterwaveTxId: flutterwaveTransactionId,
      source: paymentSource || "UNKNOWN",
    });

    if (isXcombinatorSource) {
      console.log("🔎 XCOMBINATOR metadata source detected - updating Xcombinator database");
    } else {
      console.log("🔎 Non-XCOMBINATOR source detected - executing other website payment flow");
      // If your other website uses a different payment model, implement that path here.
    }

    // ========================================
    // STEP 5: Find Transaction by Reference
    // ========================================
    transaction = await Transaction.findOne({ reference }).exec();

    if (!transaction) {
      console.warn(`❌ Transaction not found for reference: ${reference}`);
      return res.status(404).json({
        success: false,
        message: "Transaction not found in database.",
      });
    }

    // ========================================
    // STEP 6: Validate Amount Match
    // ========================================
    if (transaction.amountKobo !== amountKobo) {
      console.error(`❌ Amount mismatch for reference ${reference}`, {
        expected: transaction.amountKobo,
        received: amountKobo,
      });
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match transaction.",
      });
    }

    // ========================================
    // STEP 7: Prevent Duplicate Processing
    // ========================================
    if (transaction.status === "success" || transaction.status === "successful") {
      console.warn(`⚠️  Transaction ${reference} already processed`);
      return res.status(200).json({
        success: true,
        message: "Payment already processed.",
        isDuplicate: true,
      });
    }

    // ========================================
    // STEP 8: Find User
    // ========================================
    user = await User.findById(transaction.userId).exec();

    if (!user) {
      console.error(`❌ User not found for transaction ${reference}`, {
        userId: transaction.userId,
      });
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    // ========================================
    // STEP 9: ATOMIC Update - Wallet Balance
    // ========================================
    // Capture balance BEFORE increment for audit trail
    const balanceBefore = user.walletBalanceKobo || 0;

    // Use atomic $inc operation to prevent race conditions
    let updatedUser;
    if (isXcombinatorSource) {
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          $inc: {
            walletBalanceKobo: amountKobo,
            walletBalance: amountKobo / 100,
          },
        },
        { returnDocument: 'after' }
      ).exec();
    } else {
      // Non-XCOMBINATOR source: use the existing payment logic for your other site.
      // Replace this block with your other site's database update if it differs.
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          $inc: {
            walletBalanceKobo: amountKobo,
            walletBalance: amountKobo / 100,
          },
        },
        { returnDocument: 'after' }
      ).exec();
    }

    if (!updatedUser) {
      console.error(`❌ Failed to update user wallet for ${user._id}`);
      return res.status(500).json({
        success: false,
        message: "Failed to credit wallet.",
      });
    }

    const balanceAfter = updatedUser.walletBalanceKobo;

    console.log(`✅ Wallet updated for user ${user._id}:`, {
      before: balanceBefore,
      after: balanceAfter,
      credited: amountKobo,
    });

    // ========================================
    // STEP 10: Update Transaction Status
    // ========================================
    transaction.status = "success";
    await transaction.save();

    console.log(`✅ Transaction ${reference} status updated to 'success'`);

    // ========================================
    // STEP 11: Create Audit Log
    // ========================================
    try {
      const auditLog = new AuditLog({
        action: "FLUTTERWAVE_CREDIT",
        performedBy: "system:flutterwave-webhook",
        userId: user._id,
        amount: amountKobo,
        balanceBefore,
        balanceAfter,
        note: `Flutterwave payment confirmed | Reference: ${reference} | Flutterwave TX ID: ${flutterwaveTransactionId}`,
      });
      await auditLog.save();

      console.log(`✅ Audit log created for transaction ${reference}`);
    } catch (auditErr) {
      console.error(`⚠️  Failed to create audit log for ${reference}:`, auditErr.message);
      // Don't fail the webhook - audit logging is non-critical
    }

    // ========================================
    // STEP 12: Success Response
    // ========================================
    const duration = Date.now() - startTime;
    console.log(`✅ Flutterwave webhook processed successfully in ${duration}ms`);

    return res.status(200).json({
      success: true,
      message: "Payment confirmed and wallet credited.",
      data: {
        userId: user._id,
        userEmail: user.email,
        reference,
        amountKobo,
        walletBalanceNaira: (balanceAfter / 100).toFixed(2),
        walletBalanceKobo: balanceAfter,
        processingTime: `${duration}ms`,
      },
    });

  } catch (error) {
    console.error("❌ Flutterwave webhook processing error:", {
      message: error.message,
      stack: error.stack,
      reference: transaction?.reference,
      userId: user?._id,
    });

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Verify a payment manually (for testing or user verification)
 * This endpoint is user-facing and allows users to check payment status
 * WITHOUT updating wallets (wallet updates only via webhook)
 * 
 * @param {Object} req - Express request with { reference }
 * @param {Object} res - Express response
 */
const verifyPaymentManual = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required.",
      });
    }

    const transaction = await Transaction.findOne({ reference }).exec();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
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
    return res.status(500).json({
      success: false,
      message: "Verification failed.",
    });
  }
};

/**
 * Get wallet balance and transaction history for authenticated user
 * 
 * @param {Object} req - Express request with user context
 * @param {Object} res - Express response
 */
const getWalletStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const user = await User.findById(userId).select(
      "email walletBalance walletBalanceKobo"
    ).exec();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const recentTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("reference type amountKobo status createdAt")
      .exec();

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
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet status.",
    });
  }
};

/**
 * Initiate a Flutterwave payment placeholder reference (Frontend → Backend)
 * 
 * - Creates a pending Transaction record
 * - Generates a unique payment reference
 * - Returns reference to frontend for Flutterwave modal
 * 
 * Called by: Frontend FundWallet component (POST /api/payments/init)
 * Returns: { success: true, reference: "PAY_xxxxx" }
 * 
 * Flow:
 * 1. Frontend user enters amount and clicks "Pay"
 * 2. Frontend calls this endpoint (authenticated)
 * 3. Backend creates Transaction with status 'pending'
 * 4. Backend returns reference
 * 5. Frontend opens Flutterwave modal with reference
 * 6. User completes payment on Flutterwave
 * 7. Flutterwave sends webhook to backend (charge.completed)
 * 8. Webhook finds Transaction by reference and credits wallet
 * 
 * @param {Object} req - Express request with user context and { amount }
 * @param {Object} res - Express response
 */
const initiatePayment = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { amount } = req.body;

    // ========================================
    // VALIDATE INPUT
    // ========================================
    const amountKobo = Number(amount) ? Math.round(Number(amount) * 100) : 0;

    if (!amountKobo || amountKobo <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount. Amount must be greater than 0.",
      });
    }

    if (amountKobo < 10000) {
      // 100 Naira minimum
      return res.status(400).json({
        success: false,
        message: "Minimum amount is ₦100",
      });
    }

    if (amountKobo > 500000000) {
      // 5,000,000 Naira maximum
      return res.status(400).json({
        success: false,
        message: "Maximum amount is ₦5,000,000",
      });
    }

    // ========================================
    // FIND USER
    // ========================================
    const user = await User.findById(userId).exec();

    if (!user) {
      console.warn(`User not found for payment initiation: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // ========================================
    // GENERATE UNIQUE REFERENCE
    // ========================================
    // Reference format: PAY_xxxxxxxxxxxx_timestamp
    // Ensures uniqueness and includes timestamp for debugging
    const timestamp = Date.now();
    const randomPart = crypto.randomBytes(8).toString("hex").toUpperCase();
    const reference = `FLW_${randomPart}_${timestamp}`;

    // ========================================
    // CREATE PENDING TRANSACTION
    // ========================================
    const transaction = new Transaction({
      userId,
      type: "credit",
      amount: Number((amountKobo / 100).toFixed(2)), // Store as Naira
      amountKobo,
      status: "pending",
      reference,
      description: `Flutterwave payment to fund wallet`,
    });

    await transaction.save();

    console.log(`✅ Payment initiated for user ${userId}:`, {
      reference,
      amountKobo,
      amountNaira: (amountKobo / 100).toFixed(2),
    });

    // ========================================
    // RETURN REFERENCE TO FRONTEND
    // ========================================
    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully.",
      reference,
      data: {
        reference,
        amountKobo,
        amountNaira: (amountKobo / 100).toFixed(2),
        userId,
      },
    });

  } catch (error) {
    console.error("❌ Payment initiation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initialize payment.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  handleFlutterwaveWebhook,
  initiatePayment,
  verifyPaymentManual,
  getWalletStatus,
};
