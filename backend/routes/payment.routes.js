const express = require("express");
const router = express.Router();
const { verifyToken } = require("../shared/authGuard");
const {
  initiatePayment,
  verifyPaymentManual,
  getWalletStatus,
  initiateCentralGatewayPayment,
  handleCentralGatewayCallback,
} = require("../controllers/payment.controller");
const { handleWebhook } = require("../controllers/webhook.controller");

/**
 * ========================================
 * PAYSTACK WEBHOOK ROUTE
 * ========================================
 * 
 * POST /api/payments/webhook
 * 
 * - Receives raw request body (NOT JSON-parsed automatically)
 * - Verifies Paystack webhook signature header (x-paystack-signature)
 * - Links payment to Transaction via reference
 * - Atomically credits user wallet
 * - Updates transaction status and creates audit log
 * - Comprehensive error logging for troubleshooting
 * 
 * SECURITY:
 * - Signature verification using HMAC-SHA512
 * - No authentication required (Paystack calls this server-to-server)
 * - Secret key must be in PAYSTACK_SECRET_KEY env var
 * 
 * ⚠️  IMPORTANT: This route must preserve the exact raw request payload for signature validation.
 * The global JSON parser now captures raw bytes via verify(), so this route can rely on req.rawBody.
 */
router.post("/webhook", handleWebhook);

/**
 * ========================================
 * INITIATE PAYMENT ROUTE (Frontend → Backend)
 * ========================================
 * 
 * POST /api/payments/init
 * 
 * - Creates a pending Transaction record
 * - Generates unique payment reference
 * - Returns reference for frontend checkout flow
 * 
 * AUTHENTICATION: Required (verifyToken)
 * 
 * REQUEST: { amount: 500 }
 * 
 * RESPONSE: {
 *   success: true,
 *   reference: "PAY_xxxxxxxxxxxxx_1717419600000",
 *   data: {
 *     reference: "PAY_xxxxxxxxxxxxx_1717419600000",
 *     amountKobo: 50000,
 *     amountNaira: "500.00",
 *     userId: "..."
 *   }
 * }
 * 
 * VALIDATION:
 * - Minimum amount: ₦100 (10000 kobo)
 * - Maximum amount: ₦5,000,000 (500000000 kobo)
 * - Amount must be positive
 * 
 * FLOW:
 * 1. Frontend user enters amount
 * 2. Frontend calls POST /api/payments/init (authenticated)
 * 3. Backend validates amount
 * 4. Backend creates Transaction with status "pending"
 * 5. Backend returns reference
 * 6. Frontend opens Paystack checkout with reference
 * 7. User completes payment
 * 8. Paystack sends webhook → charge.success
 * 9. Backend finds Transaction by reference, credits wallet
 */
router.post("/init", verifyToken, initiatePayment);

/**
 * ========================================
 * CENTRAL GATEWAY INITIATION ROUTE
 * ========================================
 *
 * POST /api/payments/init-central
 *
 * - Creates a pending transaction record
 * - Redirects the frontend to your central payment gateway app
 * - The gateway app sends a callback to /api/payments/gateway/callback
 * - Wallet is credited when the callback is verified
 */
router.post("/init-central", verifyToken, initiateCentralGatewayPayment);

router.post("/gateway/callback", handleCentralGatewayCallback);

/**
 * ========================================
 * MANUAL PAYMENT VERIFICATION ROUTE
 * ========================================
 * 
 * POST /api/payments/verify
 * 
 * - User-facing endpoint to check payment status
 * - Does NOT update wallet (webhook-only)
 * - Returns transaction details by reference
 * 
 * BODY: { reference: "string" }
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   data: {
 *     reference: "PAY_REF_xxx",
 *     status: "success",
 *     amountKobo: 50000,
 *     amountNaira: "500.00",
 *     type: "credit",
 *     createdAt: "2026-06-03T10:30:00Z",
 *     updatedAt: "2026-06-03T10:31:00Z"
 *   }
 * }
 */
router.post("/verify", verifyPaymentManual);

/**
 * ========================================
 * WALLET STATUS ROUTE
 * ========================================
 * 
 * GET /api/payments/wallet
 * 
 * - Requires authentication (verifyToken)
 * - Returns user's current wallet balance in both Naira and Kobo
 * - Returns last 10 transactions
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   data: {
 *     email: "user@example.com",
 *     walletBalanceNaira: "5000.50",
 *     walletBalanceKobo: 500050,
 *     recentTransactions: [
 *       {
 *         reference: "PAY_REF_xxx",
 *         type: "credit",
 *         amountNaira: "500.00",
 *         amountKobo: 50000,
 *         status: "success",
 *         date: "2026-06-03T10:31:00Z"
 *       }
 *     ]
 *   }
 * }
 */
router.get("/wallet", verifyToken, getWalletStatus);

module.exports = router;

