/**
 * PAYSTACK WEBHOOK IMPLEMENTATION GUIDE
 * ======================================
 * 
 * This guide documents the automated Paystack payment verification system
 * implemented for X-Combinator to eliminate manual funding.
 * 
 * FILES CREATED/MODIFIED:
 * - controllers/payment.controller.js (NEW)
 * - routes/payment.routes.js (NEW)
 * - app.js (MODIFIED)
 * - controllers/webhook.controller.js (DEPRECATED - see backward compatibility section)
 * 
 * ========================================
 * ARCHITECTURE OVERVIEW
 * ========================================
 * 
 * When a user completes a Paystack payment:
 * 
 * 1. User makes payment on frontend
 * 2. Paystack sends HTTP POST to /api/payments/webhook
 * 3. Server verifies HMAC-SHA512 signature using PAYSTACK_SECRET_KEY
 * 4. Server finds Transaction by payment reference
 * 5. Server validates amount matches
 * 6. Server atomically increments User.walletBalanceKobo using MongoDB $inc
 * 7. Server updates Transaction.status to 'success'
 * 8. Server creates AuditLog entry (non-critical, won't fail webhook if it fails)
 * 9. Server returns 200 OK to Paystack
 * 
 * This prevents:
 * ✅ Manual funding delays
 * ✅ Race conditions (atomic $inc)
 * ✅ Duplicate processing (checks status)
 * ✅ Spoofed webhooks (signature verification)
 * ✅ Man-in-the-middle attacks (HMAC-SHA512)
 * ✅ Amount mismatches (validates against Transaction)
 * 
 * ========================================
 * ENDPOINTS
 * ========================================
 * 
 * 1. POST /api/payments/webhook
 *    - Paystack server-to-server webhook
 *    - No authentication required
 *    - Receives raw body (NOT JSON-parsed)
 *    - Returns: { success: true/false, data: {...} }
 * 
 *    Security:
 *    - Verifies x-paystack-signature header
 *    - HMAC-SHA512 using PAYSTACK_SECRET_KEY
 *    - Rejects if signature doesn't match
 * 
 *    Processing:
 *    - Finds Transaction by reference
 *    - Validates amount in Kobo
 *    - Prevents duplicate processing
 *    - Atomically credits wallet
 *    - Updates transaction status
 *    - Creates audit log
 * 
 * 2. POST /api/payments/verify
 *    - User-facing endpoint to check payment status
 *    - No authentication required
 *    - Does NOT update wallet
 *    - Returns transaction details by reference
 * 
 *    Request: { reference: "PAYSTACK_REF_xxx" }
 *    Response: {
 *      success: true,
 *      data: {
 *        reference: "PAYSTACK_REF_xxx",
 *        status: "success|pending|failed",
 *        amountKobo: 50000,
 *        amountNaira: "500.00",
 *        type: "credit",
 *        createdAt: "...",
 *        updatedAt: "..."
 *      }
 *    }
 * 
 * 3. GET /api/payments/wallet
 *    - Get wallet balance and recent transactions
 *    - Requires authentication (bearer token)
 *    - Returns current balance in Naira and Kobo
 *    - Returns last 10 transactions
 * 
 *    Response: {
 *      success: true,
 *      data: {
 *        email: "user@example.com",
 *        walletBalanceNaira: "5000.50",
 *        walletBalanceKobo: 500050,
 *        recentTransactions: [...]
 *      }
 *    }
 * 
 * ========================================
 * ENVIRONMENT CONFIGURATION
 * ========================================
 * 
 * Required in .env:
 * 
 * PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
 * 
 * Get from: https://dashboard.paystack.com/#/settings/developer
 * 
 * Test Key: sk_test_xxxxxxxxxxxxx (for development)
 * Live Key: sk_live_xxxxxxxxxxxxx (for production)
 * 
 * ========================================
 * PAYSTACK DASHBOARD CONFIGURATION
 * ========================================
 * 
 * 1. Log into https://dashboard.paystack.com
 * 2. Go to Settings → Webhooks
 * 3. Add webhook URL:
 *    https://your-backend.com/api/payments/webhook
 * 4. Select events: Charge (Successful)
 * 5. Save
 * 
 * Paystack will automatically send verification event.
 * Check logs to confirm delivery.
 * 
 * ========================================
 * SECURITY CONSIDERATIONS
 * ========================================
 * 
 * 1. SIGNATURE VERIFICATION (✅ IMPLEMENTED)
 *    - All webhooks must have valid x-paystack-signature header
 *    - Calculated using HMAC-SHA512 with PAYSTACK_SECRET_KEY
 *    - Invalid signature = 401 Unauthorized
 * 
 * 2. AMOUNT VALIDATION (✅ IMPLEMENTED)
 *    - Compares webhook amount with Transaction.amountKobo
 *    - Prevents incorrect payments crediting wrong amounts
 *    - Returns 400 Bad Request if mismatch
 * 
 * 3. DUPLICATE PREVENTION (✅ IMPLEMENTED)
 *    - Checks if Transaction.status is already 'success'
 *    - Paystack may retry webhook if no 200 OK response
 *    - Returns 200 OK without re-processing duplicates
 * 
 * 4. ATOMIC OPERATIONS (✅ IMPLEMENTED)
 *    - Uses MongoDB $inc operator for wallet updates
 *    - Prevents race conditions if webhook fires twice
 *    - Each increment is atomic at database level
 * 
 * 5. USER VALIDATION (✅ IMPLEMENTED)
 *    - Finds User by Transaction.userId
 *    - Won't process if user record missing
 *    - Transaction serves as source of truth
 * 
 * 6. ROLE-BASED ACCESS (✅ IMPLEMENTED)
 *    - GET /api/payments/wallet requires authentication
 *    - verifyToken middleware ensures user can only see own wallet
 *    - No admin override needed for payment verification
 * 
 * ========================================
 * ERROR HANDLING
 * ========================================
 * 
 * The webhook controller handles these failure scenarios:
 * 
 * 1. Missing PAYSTACK_SECRET_KEY
 *    → 500 Internal Server Error
 *    → Check .env configuration
 * 
 * 2. Missing x-paystack-signature header
 *    → 400 Bad Request
 *    → Paystack not sending signature (configuration issue)
 * 
 * 3. Invalid/mismatched signature
 *    → 401 Unauthorized
 *    → Potential spoofing attempt
 * 
 * 4. Malformed JSON payload
 *    → 400 Bad Request
 *    → Paystack sending corrupted data
 * 
 * 5. Non-charge.success event (e.g., charge.failed)
 *    → 200 OK (acknowledged but not processed)
 *    → Only charge.success events update wallets
 * 
 * 6. Missing required fields (reference, amount)
 *    → 400 Bad Request
 *    → Incomplete webhook payload
 * 
 * 7. Transaction not found by reference
 *    → 404 Not Found
 *    → Reference doesn't match any Transaction
 *    → User may need to retry or contact support
 * 
 * 8. Amount mismatch
 *    → 400 Bad Request
 *    → Webhook amount ≠ Transaction amount
 *    → Possible tampering or calculation error
 * 
 * 9. User not found
 *    → 404 Not Found
 *    → Transaction exists but User record missing
 *    → Database consistency issue
 * 
 * 10. Wallet update failed
 *     → 500 Internal Server Error
 *     → Database write error
 *     → Webhook will be retried by Paystack
 * 
 * 11. Audit log creation failed
 *     → Logged as warning, webhook still succeeds
 *     → Audit logging is non-critical
 * 
 * ========================================
 * TESTING
 * ========================================
 * 
 * 1. LOCAL TESTING (without real Paystack)
 * 
 *    Use curl to simulate webhook:
 * 
 *    ```bash
 *    PAYLOAD='{"event":"charge.success","data":{"reference":"REF123","amount":50000,"id":12345,"customer":{"email":"test@example.com"}}}'
 *    
 *    SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha512 -hmac "sk_test_xxxxx" | cut -d' ' -f2)
 *    
 *    curl -X POST http://localhost:5000/api/payments/webhook \
 *      -H "Content-Type: application/json" \
 *      -H "x-paystack-signature: $SIGNATURE" \
 *      -d "$PAYLOAD"
 *    ```
 * 
 * 2. PAYSTACK SANDBOX TESTING
 * 
 *    - Create Paystack sandbox account
 *    - Use test keys (sk_test_xxxxx)
 *    - Use test cards: 4084084084084081 (any future expiry, any CVC)
 *    - Deploy backend to staging
 *    - Register webhook URL in sandbox dashboard
 *    - Make test payment and verify webhook fires
 * 
 * 3. PRODUCTION DEPLOYMENT
 * 
 *    - Switch to live keys (sk_live_xxxxx)
 *    - Register webhook URL in live dashboard
 *    - Monitor logs for webhook activity
 *    - Set up alerts for failed webhooks
 *    - Test with real payment at low amount
 * 
 * ========================================
 * MONITORING & DEBUGGING
 * ========================================
 * 
 * Log messages to watch for:
 * 
 * ✅ "✅ Processing charge.success event:"
 *    - Webhook received and validated
 *    - Check reference, amount, email
 * 
 * ✅ "✅ Wallet updated for user {userId}:"
 *    - Wallet successfully incremented
 *    - Check before/after balances
 * 
 * ✅ "✅ Transaction {reference} status updated to 'success'"
 *    - Transaction marked as complete
 * 
 * ✅ "✅ Audit log created for transaction {reference}"
 *    - Audit trail recorded
 * 
 * ❌ "❌ Webhook signature mismatch"
 *    - Invalid signature (spoofing attempt or key mismatch)
 *    - Verify PAYSTACK_SECRET_KEY in .env
 * 
 * ❌ "❌ Transaction not found for reference:"
 *    - Reference doesn't match any Transaction
 *    - May indicate user didn't initiate payment first
 * 
 * ❌ "❌ Amount mismatch for reference"
 *    - Webhook amount ≠ Transaction amount
 *    - Possible tampering or Paystack calculation error
 * 
 * ⚠️  "⚠️  Transaction {reference} already processed"
 *    - Webhook fired again (duplicate)
 *    - Normal if Paystack retried, no action needed
 * 
 * ⚠️  "⚠️  Failed to create audit log"
 *    - Audit logging failed but payment was processed
 *    - Wallet was still credited, payment still marked success
 *    - Check database connectivity
 * 
 * ========================================
 * BACKWARD COMPATIBILITY
 * ========================================
 * 
 * The old webhook endpoint /api/webhooks/paystack still works:
 * 
 * OLD ENDPOINT: POST /api/webhooks/paystack
 * NEW ENDPOINT: POST /api/payments/webhook
 * 
 * Both point to the same new payment.controller.js implementation.
 * 
 * The old webhook.controller.js is deprecated but kept for reference.
 * 
 * MIGRATION:
 * 1. Update Paystack dashboard to new endpoint URL
 * 2. Gradually phase out old endpoint
 * 3. Delete webhook.controller.js after verification period
 * 
 * ========================================
 * FLOW DIAGRAM
 * ========================================
 * 
 * User             Frontend           Backend              Paystack
 *  |                   |                  |                    |
 *  |-- Pay Amount -----|                  |                    |
 *  |                   |-- Request ------|-- Initiate ------->|
 *  |                   |<-- Auth URL ---|                      |
 *  |-- Open Auth Page -|                  |                    |
 *  |                   |                  |                    |
 *  |-- Enter Card -|   |                  |                    |
 *  |                   |                  |              |-- Process
 *  |                   |                  |              |
 *  |                   |                  |<-- Webhook --|
 *  |                   |                  |
 *  |                   |                  |-- Verify Signature
 *  |                   |                  |-- Find Transaction
 *  |                   |                  |-- Update Wallet (Atomic $inc)
 *  |                   |                  |-- Update Transaction Status
 *  |                   |                  |-- Create AuditLog
 *  |                   |                  |-- Return 200 OK
 *  |                   |                  |
 *  |                   |<-- Poll Wallet --|
 *  |                   |<-- Balance ----  |
 *  |-- Show Success |  |                  |
 *  |                   |                  |
 * 
 * ========================================
 * PRODUCTION CHECKLIST
 * ========================================
 * 
 * Before deploying to production:
 * 
 * [ ] PAYSTACK_SECRET_KEY set to live key (sk_live_xxxxx)
 * [ ] MongoDB User and Transaction models deployed
 * [ ] MongoDB AuditLog model deployed
 * [ ] payment.controller.js deployed
 * [ ] payment.routes.js deployed
 * [ ] app.js updated with payment routes
 * [ ] Webhook endpoint registered in Paystack dashboard
 * [ ] Test webhook received (check logs)
 * [ ] Rate limiting configured (optional)
 * [ ] Error monitoring set up (Sentry, etc.)
 * [ ] Audit logs monitored for anomalies
 * [ ] Database backups configured
 * [ ] Rollback plan documented
 * 
 */
