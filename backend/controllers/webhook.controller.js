const crypto = require("crypto");
const User = require("../models/User.model");
const Transaction = require("../models/transaction.model");
const AuditLog = require("../models/AuditLog.model");

const verifyFlutterwaveSignature = (signature, secret, rawBody) => {
  if (!signature || !secret) {
    return false;
  }

  if (signature === secret) {
    return true;
  }

  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody || "");
  if (!payload) {
    return false;
  }

  const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return hash === signature;
};

const summarizeEvent = (event) => {
  const data = event?.data || {};
  return {
    event: event?.event,
    status: data?.status,
    txRef: data?.tx_ref || data?.reference || data?.txRef || data?.transaction_ref,
    txId: data?.id,
    amount: data?.amount,
    customerEmail: data?.customer?.email,
    paymentType: data?.payment_type || data?.payment_method,
  };
};

const handleWebhook = async (req, res) => {
  const startedAt = Date.now();

  try {
    const signature = req.headers["verif-hash"] || req.headers["x-flw-signature"] || req.headers["x-flutterwave-signature"];
    const secret = process.env.FLW_SECRET_HASH;
    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {})));
    const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody || "");

    console.log("[FLW_WEBHOOK] webhook received", {
      receivedAt: new Date().toISOString(),
      signaturePresent: Boolean(signature),
      signaturePreview: signature ? `${signature.slice(0, 12)}...` : null,
      secretConfigured: Boolean(secret),
      rawBodyLength: rawBody?.length || 0,
      contentType: req.headers["content-type"],
      bodyPreview: bodyText.slice(0, 400),
    });

    if (!secret) {
      console.error("[FLW_WEBHOOK] FLW_SECRET_HASH is not configured");
      return res.status(500).json({ success: false, message: "Webhook secret is not configured." });
    }

    if (!signature) {
      console.error("[FLW_WEBHOOK] Missing signature header");
      return res.status(400).json({ success: false, message: "Missing signature header." });
    }

    const signatureMatch = verifyFlutterwaveSignature(signature, secret, rawBody);
    console.log("[FLW_WEBHOOK] signature check result", {
      signatureMatch,
      receivedSignature: signature,
      expectedSignature: secret,
      bodyPreview: bodyText.slice(0, 200),
    });

    if (!signatureMatch) {
      console.error("[FLW_WEBHOOK] Signature verification failed", {
        receivedSignature: signature,
        expectedSignature: secret,
        secretConfigured: Boolean(secret),
      });
      return res.status(401).json({ success: false, message: "Signature verification failed." });
    }

    let event;
    try {
      event = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("[FLW_WEBHOOK] Failed to parse webhook payload", parseError);
      return res.status(400).json({ success: false, message: "Malformed webhook payload." });
    }

    const eventSummary = summarizeEvent(event);
    console.log("[FLW_WEBHOOK] parsed event", eventSummary);

    const normalizedStatus = String(event?.data?.status || event?.status || "").toLowerCase();
    const isCompletedEvent = event?.event === "charge.completed" || ["successful", "success", "completed"].includes(normalizedStatus);

    if (!isCompletedEvent) {
      console.log("[FLW_WEBHOOK] ignoring non-completion event", {
        eventType: event?.event,
        normalizedStatus,
      });
      return res.status(200).json({ success: true, message: "Ignored non-completion event." });
    }

    const txRef = String(eventSummary.txRef || "").trim();
    const txId = String(eventSummary.txId || "").trim();
    const payloadAmount = Number(eventSummary.amount || 0);
    const payloadAmountKobo = Math.round(payloadAmount * 100);

    console.log("[FLW_WEBHOOK] payload mapping", {
      txRef,
      txId,
      payloadAmount,
      payloadAmountKobo,
      normalizedStatus,
    });

    if (!txRef) {
      console.error("[FLW_WEBHOOK] Missing tx_ref/reference in payload", eventSummary);
      return res.status(400).json({ success: false, message: "Missing transaction reference in webhook payload." });
    }

    const transaction = await Transaction.findOne({ reference: txRef }).exec();
    console.log("[FLW_WEBHOOK] transaction lookup", {
      txRef,
      found: Boolean(transaction),
      transactionId: transaction?._id?.toString(),
      existingStatus: transaction?.status,
      existingAmountKobo: transaction?.amountKobo,
      existingAmount: transaction?.amount,
    });

    if (!transaction) {
      console.error("[FLW_WEBHOOK] transaction not found in database", { txRef });
      return res.status(404).json({ success: false, message: "Transaction not found in database." });
    }

    if (["success", "successful"].includes(transaction.status)) {
      console.log("[FLW_WEBHOOK] transaction already processed", { txRef, status: transaction.status });
      return res.status(200).json({ success: true, message: "Transaction already processed.", duplicate: true });
    }

    const amountForWalletKobo = Math.max(Number(transaction.amountKobo || 0), payloadAmountKobo || 0);
    const amountForWalletNaira = Number((amountForWalletKobo / 100).toFixed(2));

    console.log("[FLW_WEBHOOK] wallet credit calculation", {
      transactionAmountKobo: transaction.amountKobo,
      payloadAmountKobo,
      amountForWalletKobo,
      amountForWalletNaira,
    });

    const user = await User.findById(transaction.userId).exec();
    console.log("[FLW_WEBHOOK] user lookup", {
      userId: transaction.userId,
      found: Boolean(user),
      email: user?.email,
      walletBalance: user?.walletBalance,
      walletBalanceKobo: user?.walletBalanceKobo,
    });

    if (!user) {
      console.error("[FLW_WEBHOOK] user not found for transaction", { transactionId: transaction._id, userId: transaction.userId });
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      {
        $inc: {
          walletBalanceKobo: amountForWalletKobo,
          walletBalance: amountForWalletNaira,
        },
      },
      { new: true, runValidators: true }
    ).exec();

    console.log("[FLW_WEBHOOK] wallet update result", {
      userId: user._id,
      updatedWalletBalance: updatedUser?.walletBalance,
      updatedWalletBalanceKobo: updatedUser?.walletBalanceKobo,
    });

    if (!updatedUser) {
      console.error("[FLW_WEBHOOK] wallet update failed", { userId: user._id, amountForWalletKobo });
      return res.status(500).json({ success: false, message: "Failed to update wallet balance." });
    }

    transaction.status = ["successful", "success", "completed"].includes(normalizedStatus) ? "success" : transaction.status;
    transaction.gatewayResponse = normalizedStatus || event?.event || "unknown";
    transaction.paymentMethod = eventSummary.paymentType || "flutterwave";
    transaction.externalReference = txId || txRef;
    transaction.amountKobo = amountForWalletKobo;
    transaction.amount = amountForWalletNaira;

    try {
      await transaction.save();
      console.log("[FLW_WEBHOOK] transaction updated", {
        transactionId: transaction._id,
        status: transaction.status,
        amountKobo: transaction.amountKobo,
      });
    } catch (dbError) {
      console.error("[FLW_WEBHOOK] failed to update transaction record", dbError);
      return res.status(500).json({ success: false, message: "Transaction record update failed." });
    }

    try {
      await new AuditLog({
        action: "FLUTTERWAVE_WEBHOOK_CREDIT",
        performedBy: "system:flutterwave-webhook",
        userId: user._id,
        amount: amountForWalletKobo,
        balanceBefore: user.walletBalanceKobo || 0,
        balanceAfter: updatedUser.walletBalanceKobo,
        note: `Flutterwave wallet funding | Reference: ${txRef} | Flutterwave TX ID: ${txId} | Amount: ${amountForWalletNaira}`,
      }).save();
    } catch (auditError) {
      console.error("[FLW_WEBHOOK] audit log failed", auditError);
    }

    console.log("[FLW_WEBHOOK] success response sent", {
      txRef,
      userId: user._id,
      processingTimeMs: Date.now() - startedAt,
    });

    return res.status(200).json({
      success: true,
      message: "Wallet credited successfully.",
      data: {
        txRef,
        amountKobo: amountForWalletKobo,
        amountNaira: amountForWalletNaira,
        walletBalanceKobo: updatedUser.walletBalanceKobo,
        walletBalance: updatedUser.walletBalance,
      },
    });
  } catch (error) {
    console.error("[FLW_WEBHOOK] unexpected error", error);
    return res.status(500).json({ success: false, message: "Webhook processing failed." });
  }
};

module.exports = { handleWebhook, verifyFlutterwaveSignature };