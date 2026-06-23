const crypto = require("crypto");
const User = require("../models/User.model");
const Transaction = require("../models/transaction.model");
const AuditLog = require("../models/AuditLog.model");

/**
 * Verify Paystack webhook signature using HMAC-SHA512
 * @param {string} signature - The x-paystack-signature header
 * @param {Buffer} rawBody - The raw request body
 * @param {string} secret - The Paystack secret key
 * @returns {boolean} - True if signature is valid
 */
function verifyPaystackSignature(signature, rawBody, secret) {
  if (!signature || !secret) return false;
  const payload = rawBody.toString("utf8");
  const hash = crypto.createHmac("sha512", secret).update(payload).digest("hex");
  return hash === signature;
}

/**
 * Handle Paystack charge.success webhook event
 * - Verifies webhook signature using HMAC-SHA512
 * - Links payment to Transaction record by reference
 * - Updates User wallet atomically using $inc
 * - Updates Transaction status to 'success'
 * - Creates AuditLog entry with comprehensive logging
 * - Logs detailed error information for troubleshooting
 * 
 * @param {Object} req - Express request object with Paystack webhook header and raw body
 * @param {Object} res - Express response object
 */
const handlePaystackWebhook = async (req, res) => {
  const startTime = Date.now();
  let transaction = null;
  let user = null;

  try {
    const signature = req.headers["x-paystack-signature"];
    const secret = process.env.PAYSTACK_SECRET_KEY;

    // ========================================
    // STEP 1: Security Validation
    // ========================================
    if (!secret) {
      console.error("❌ PAYSTACK_SECRET_KEY is not configured");
      console.error("⚠️  Webhook received but cannot verify - check .env configuration");
      return res.status(500).json({
        success: false,
        message: "Payment webhook is not configured correctly.",
      });
    }

    if (!signature) {
      console.warn("❌ Webhook received without x-paystack-signature header");
      console.warn("⚠️  Possible network tampering or misconfiguration");
      return res.status(400).json({
        success: false,
        message: "Invalid webhook request: missing signature.",
      });
    }

    const rawBody = req.rawBody || req.body;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      console.error("❌ Webhook received with invalid raw body type");
      console.error("   Type:", typeof rawBody, "Is Buffer:", Buffer.isBuffer(rawBody));
      return res.status(400).json({
        success: false,
        message: "Invalid webhook payload.",
      });
    }

    // Verify HMAC-SHA512 signature
    if (!verifyPaystackSignature(signature, rawBody, secret)) {
      const payload = rawBody.toString("utf8");
      const calculatedHash = crypto.createHmac("sha512", secret).update(payload).digest("hex");
      console.error("❌ Webhook signature mismatch - potential spoofing attempt");
      console.error("   Expected:", signature);
      console.error("   Calculated:", calculatedHash);
      console.error("   Payload length:", payload.length);
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
      console.error("   Raw body:", rawBody.toString("utf8").substring(0, 200));
      return res.status(400).json({
        success: false,
        message: "Malformed webhook payload.",
      });
    }

    // ========================================
    // STEP 3: Filter by Event Type
    // ========================================
    if (event.event !== "charge.success") {
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
    const amountKobo = amount; // Paystack returns amount in kobo already
    const reference = String(event.data?.reference || "").trim();
    const paystackTransactionId = event.data?.id;
    const customerEmail = String(event.data?.customer?.email || "").toLowerCase().trim();
    const authorizationUrl = event.data?.authorization?.authorization_url || "";
    const paymentMethod = event.data?.authorization?.card_type || "card";

    if (!reference || amountKobo <= 0) {
      console.error("❌ Webhook missing required payment details");
      console.error("   Reference:", reference);
      console.error("   Amount (Kobo):", amountKobo);
      console.error("   Event:", JSON.stringify(event, null, 2).substring(0, 500));
      return res.status(400).json({
        success: false,
        message: "Invalid payment event payload: missing reference or amount.",
      });
    }

    console.log(`✅ Processing charge.success event from Paystack:`, {
      reference,
      amountKobo,
      amountNaira: (amountKobo / 100).toFixed(2),
      email: customerEmail,
      paystackTxId: paystackTransactionId,
      paymentMethod,
      timestamp: new Date().toISOString(),
    });

    // ========================================
    // STEP 5: Find Transaction by Reference
    // ========================================
    transaction = await Transaction.findOne({ reference }).exec();

    if (!transaction) {
      console.error(`❌ Transaction not found in database`);
      console.error(`   Reference: ${reference}`);
      console.error(`   This could indicate:`);
      console.error(`   - Transaction initiation failed on frontend`);
      console.error(`   - Reference mismatch between frontend and backend`);
      console.error(`   - Frontend not calling /api/payments/init before checkout`);
      return res.status(404).json({
        success: false,
        message: "Transaction not found in database.",
      });
    }

    // ========================================
    // STEP 6: Validate Amount Match
    // ========================================
    if (transaction.amountKobo !== amountKobo) {
      console.error(`❌ Amount mismatch detected for reference ${reference}`);
      console.error(`   Expected: ₦${(transaction.amountKobo / 100).toFixed(2)} (${transaction.amountKobo} kobo)`);
      console.error(`   Received: ₦${(amountKobo / 100).toFixed(2)} (${amountKobo} kobo)`);
      console.error(`   This could indicate price manipulation or double-charging`);
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match transaction.",
      });
    }

    // ========================================
    // STEP 7: Prevent Duplicate Processing
    // ========================================
    if (transaction.status === "success" || transaction.status === "successful") {
      console.warn(`⚠️  Transaction ${reference} already processed (duplicate webhook)`);
      console.warn(`   Paystack may retry webhooks if no 200 response was received`);
      console.warn(`   This is normal - idempotency check prevented duplicate credit`);
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
    try {
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
    } catch (updateErr) {
      console.error(`❌ Failed to atomically update user wallet`);
      console.error(`   User ID: ${user._id}`);
      console.error(`   Amount: ₦${(amountKobo / 100).toFixed(2)}`);
      console.error(`   Error: ${updateErr.message}`);
      throw updateErr;
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
        action: "PAYSTACK_CREDIT",
        performedBy: "system:paystack-webhook",
        userId: user._id,
        amount: amountKobo,
        balanceBefore,
        balanceAfter,
        note: `Paystack wallet funding | Reference: ${reference} | Paystack TX ID: ${paystackTransactionId} | Method: ${paymentMethod} | Email: ${customerEmail}`,
      });
      await auditLog.save();

      console.log(`✅ Audit log created for transaction ${reference}`);
    } catch (auditErr) {
      console.error(`⚠️  Failed to create audit log for ${reference}:`, auditErr.message);
      console.error(`   Error details:`, auditErr);
      // Don't fail the webhook - audit logging is non-critical
    }

    // ========================================
    // STEP 12: Success Response
    // ========================================
    const duration = Date.now() - startTime;
    console.log(`✅ Paystack webhook processed successfully in ${duration}ms`);
    console.log(`   ✓ Signature verified`);
    console.log(`   ✓ Transaction found and validated`);
    console.log(`   ✓ Amount match confirmed`);
    console.log(`   ✓ Wallet updated atomically`);
    console.log(`   ✓ Audit log created`);

    return res.status(200).json({
      success: true,
      message: "Payment confirmed and wallet credited.",
      data: {
        userId: user._id,
        userEmail: user.email,
        reference,
        amountKobo,
        amountNaira: (amountKobo / 100).toFixed(2),
        walletBalanceNaira: (balanceAfter / 100).toFixed(2),
        walletBalanceKobo: balanceAfter,
        processingTime: `${duration}ms`,
      },
    });

  } catch (error) {
    console.error("❌ CRITICAL: Paystack webhook processing failed");
    console.error("   Error type:", error.name);
    console.error("   Message:", error.message);
    console.error("   Stack:", error.stack);
    console.error("   Reference:", transaction?.reference);
    console.error("   User ID:", user?._id);
    console.error("   Timestamp:", new Date().toISOString());
    console.error("   This error should be investigated immediately");

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
 * Initiate a Paystack payment placeholder reference (Frontend → Backend)
 * 
 * - Creates a pending Transaction record
 * - Generates a unique payment reference
 * - Returns reference to frontend for Paystack integration
 * 
 * Called by: Frontend FundWallet component (POST /api/payments/init)
 * Returns: { success: true, reference: "PAY_xxxxx" }
 * 
 * Flow:
 * 1. Frontend user enters amount and clicks "Pay"
 * 2. Frontend calls this endpoint (authenticated)
 * 3. Backend creates Transaction with status 'pending'
 * 4. Backend returns reference
 * 5. Frontend opens Paystack checkout with reference
 * 6. User completes payment on Paystack
 * 7. Paystack sends webhook to backend (charge.success)
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
    const reference = `PAY_${randomPart}_${timestamp}`;

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
      description: `Paystack wallet funding`,
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
  handlePaystackWebhook,
  initiatePayment,
  verifyPaymentManual,
  getWalletStatus,
};
