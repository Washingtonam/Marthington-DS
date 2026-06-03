/**
 * PAYSTACK WALLET FUNDING INTEGRATION GUIDE
 * ==========================================
 * 
 * Complete guide for integrating automated Paystack payments into X-Combinator
 * 
 * FILES INVOLVED:
 * 
 * FRONTEND:
 * - src/components/FundWallet.jsx (NEW - React component with react-paystack)
 * - src/pages/wallet/Wallet.jsx (integrate FundWallet button here)
 * - .env (add VITE_PAYSTACK_PUBLIC_KEY)
 * 
 * BACKEND:
 * - controllers/payment.controller.js (handles webhook and payment init)
 * - routes/payment.routes.js (payment endpoints)
 * - .env (PAYSTACK_SECRET_KEY must be set)
 * 
 * ========================================
 * INSTALLATION STEPS
 * ========================================
 * 
 * 1. FRONTEND: Install react-paystack
 * 
 *    ```bash
 *    cd frontend
 *    npm install react-paystack
 *    ```
 * 
 * 2. FRONTEND: Add environment variables to .env
 * 
 *    ```env
 *    # Paystack Public Key (get from dashboard)
 *    VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
 *    
 *    # Or for development/testing:
 *    VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
 *    ```
 * 
 * 3. BACKEND: Ensure PAYSTACK_SECRET_KEY is in .env
 * 
 *    ```env
 *    PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
 *    # Or for testing:
 *    PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
 *    ```
 * 
 * 4. VERIFY: Restart backend and frontend servers
 * 
 *    ```bash
 *    # Backend
 *    npm start
 *    
 *    # Frontend (new terminal)
 *    npm run dev
 *    ```
 * 
 * ========================================
 * FRONTEND INTEGRATION
 * ========================================
 * 
 * The FundWallet component is a modal that handles:
 * - Amount input with quick buttons (₦500, ₦1000, ₦2500, ₦5000)
 * - Minimum (₦100) and maximum (₦5,000,000) validation
 * - Paystack modal integration via react-paystack
 * - Automatic wallet refresh on success
 * - Toast notifications for feedback
 * 
 * USAGE IN WALLET PAGE:
 * 
 * ```jsx
 * import { useState } from "react";
 * import FundWallet from "../../components/FundWallet";
 * 
 * export default function Wallet() {
 *   const [fundWalletOpen, setFundWalletOpen] = useState(false);
 * 
 *   return (
 *     <>
 *       <button onClick={() => setFundWalletOpen(true)}>
 *         Fund Wallet
 *       </button>
 * 
 *       <FundWallet 
 *         isOpen={fundWalletOpen} 
 *         onClose={() => setFundWalletOpen(false)} 
 *       />
 *     </>
 *   );
 * }
 * ```
 * 
 * COMPONENT PROPS:
 * - isOpen (boolean): Whether modal is visible
 * - onClose (function): Callback to close modal
 * 
 * DEPENDENCIES:
 * - react-paystack: Payment modal
 * - UserContext: Wallet state and refresh function
 * - ToastContext: Notifications
 * - axios: API calls
 * - framer-motion: Modal animations
 * - lucide-react: Icons
 * 
 * ========================================
 * BACKEND ENDPOINTS
 * ========================================
 * 
 * 1. POST /api/payments/init (Frontend Call)
 * 
 *    Initiates a payment by creating a pending transaction
 * 
 *    REQUEST:
 *    {
 *      "amount": 500
 *    }
 * 
 *    RESPONSE:
 *    {
 *      "success": true,
 *      "reference": "PAY_a1b2c3d4_1717419600000",
 *      "data": {
 *        "reference": "PAY_a1b2c3d4_1717419600000",
 *        "amountKobo": 50000,
 *        "amountNaira": "500.00",
 *        "userId": "64a3c1b9f4a2d1e8c9b0a1c2"
 *      }
 *    }
 * 
 *    AUTHENTICATION: Required (Bearer Token)
 *    
 *    VALIDATION:
 *    - Amount must be between ₦100 and ₦5,000,000
 *    - User must be authenticated
 * 
 * 2. POST /api/payments/webhook (Paystack Calls)
 * 
 *    Receives webhook from Paystack on successful payment
 *    - No authentication required (Paystack server-to-server)
 *    - Verifies x-paystack-signature header
 *    - Credits user wallet
 *    - Creates audit log
 * 
 *    REQUEST:
 *    {
 *      "event": "charge.success",
 *      "data": {
 *        "reference": "PAY_a1b2c3d4_1717419600000",
 *        "amount": 50000,
 *        "customer": { "email": "user@example.com" },
 *        "id": 12345
 *      }
 *    }
 * 
 *    RESPONSE:
 *    {
 *      "success": true,
 *      "message": "Payment confirmed and wallet credited.",
 *      "data": {
 *        "userId": "64a3c1b9f4a2d1e8c9b0a1c2",
 *        "reference": "PAY_a1b2c3d4_1717419600000",
 *        "amountKobo": 50000,
 *        "walletBalanceKobo": 550000
 *      }
 *    }
 * 
 * 3. POST /api/payments/verify (Manual Verification)
 * 
 *    User can check payment status by reference
 * 
 *    REQUEST:
 *    { "reference": "PAY_a1b2c3d4_1717419600000" }
 * 
 *    RESPONSE:
 *    {
 *      "success": true,
 *      "data": {
 *        "reference": "PAY_a1b2c3d4_1717419600000",
 *        "status": "success|pending|failed",
 *        "amountKobo": 50000,
 *        "amountNaira": "500.00"
 *      }
 *    }
 * 
 * 4. GET /api/payments/wallet (Authenticated)
 * 
 *    Get user's wallet balance and last 10 transactions
 * 
 *    RESPONSE:
 *    {
 *      "success": true,
 *      "data": {
 *        "email": "user@example.com",
 *        "walletBalanceNaira": "5500.00",
 *        "walletBalanceKobo": 550000,
 *        "recentTransactions": [...]
 *      }
 *    }
 * 
 * ========================================
 * PAYMENT FLOW
 * ========================================
 * 
 * 1. USER: Opens Wallet page, clicks "Fund Wallet"
 * 
 *    ↓
 * 
 * 2. FRONTEND: Shows FundWallet modal
 *    - User enters amount or clicks quick button
 * 
 *    ↓
 * 
 * 3. FRONTEND: User clicks "Pay with Paystack - ₦500"
 *    - Makes POST /api/payments/init call (authenticated)
 *    - Backend creates pending Transaction
 *    - Backend returns reference: "PAY_xxxxx_timestamp"
 * 
 *    ↓
 * 
 * 4. FRONTEND: Opens Paystack payment modal
 *    - Uses react-paystack library
 *    - Public key from environment variable
 *    - Reference from backend
 *    - User's email from UserContext
 * 
 *    ↓
 * 
 * 5. USER: Enters card details on Paystack
 *    - Completes 3D Secure / OTP if required
 * 
 *    ↓
 * 
 * 6. PAYSTACK: Processes payment
 *    - Charges card
 *    - Generates transaction ID
 * 
 *    ↓
 * 
 * 7. PAYSTACK: Sends webhook to /api/payments/webhook
 *    - Event: "charge.success"
 *    - Includes reference and amount
 *    - Includes x-paystack-signature header
 * 
 *    ↓
 * 
 * 8. BACKEND: Receives webhook
 *    - Verifies HMAC-SHA512 signature
 *    - Finds Transaction by reference
 *    - Validates amount matches
 *    - Atomically credits User.walletBalanceKobo
 *    - Updates Transaction.status = "success"
 *    - Creates AuditLog entry
 *    - Returns 200 OK
 * 
 *    ↓
 * 
 * 9. PAYSTACK: Confirms webhook delivery
 * 
 *    ↓
 * 
 * 10. FRONTEND: react-paystack fires onSuccess callback
 *     - Shows success toast: "✅ Payment successful! Your wallet will be updated automatically."
 *     - Calls apiUnits() to refresh balance from backend
 * 
 *    ↓
 * 
 * 11. USER: Wallet updated ✅
 *     - New balance reflects immediately
 *     - Modal closes after 2 seconds
 * 
 * ========================================
 * ERROR HANDLING
 * ========================================
 * 
 * FRONTEND ERRORS:
 * 
 * "Please log in to fund your wallet"
 *   → User not authenticated
 *   → Redirect to login
 * 
 * "Please enter a valid amount"
 *   → Amount is zero or empty
 *   → Ask user to enter amount
 * 
 * "Minimum deposit is ₦100"
 *   → Amount less than ₦100
 *   → Show minimum requirement
 * 
 * "Maximum deposit is ₦5,000,000"
 *   → Amount exceeds ₦5,000,000
 *   → Show maximum limit
 * 
 * "Missing VITE_PAYSTACK_PUBLIC_KEY"
 *   → Environment variable not set
 *   → Check .env file
 *   → Pay button will be disabled
 * 
 * "Failed to initialize payment"
 *   → Backend /api/payments/init call failed
 *   → User sees error toast
 *   → Possible causes:
 *     - Backend down
 *     - Network error
 *     - Invalid user context
 * 
 * "Payment failed. Please try again."
 *   → User closed payment modal
 *   → onClose handler triggered
 *   → User can retry
 * 
 * "Payment processed but failed to refresh wallet"
 *   → Payment succeeded but apiUnits() failed
 *   → User should refresh page manually
 *   → Wallet will be updated (webhook already processed)
 * 
 * BACKEND ERRORS:
 * 
 * 400 Bad Request: Invalid amount
 *   → Amount outside ₦100 to ₦5,000,000 range
 *   → Frontend should validate before sending
 * 
 * 404 Not Found: User not found
 *   → User ID in JWT doesn't exist in database
 *   → Database consistency issue
 * 
 * 401 Unauthorized: No valid JWT token
 *   → Token expired or invalid
 *   → User redirected to login
 * 
 * 500 Internal Server Error: Transaction creation failed
 *   → Database error
 *   → Check MongoDB connection
 * 
 * WEBHOOK ERRORS:
 * 
 * 400 Bad Request: Missing signature
 *   → Paystack not sending x-paystack-signature
 *   → Check Paystack webhook configuration
 * 
 * 401 Unauthorized: Signature mismatch
 *   → PAYSTACK_SECRET_KEY incorrect
 *   → Webhook being spoofed
 *   → Check .env configuration
 * 
 * 404 Not Found: Transaction not found
 *   → Reference doesn't match any Transaction
 *   → User never initiated payment
 *   → Possible Paystack error
 * 
 * 400 Bad Request: Amount mismatch
 *   → Webhook amount ≠ Transaction amount
 *   → Potential tampering
 *   → Payment rejected
 * 
 * ========================================
 * TESTING
 * ========================================
 * 
 * PAYSTACK SANDBOX (Recommended for testing):
 * 
 * 1. Create sandbox account at https://dashboard.paystack.com
 * 2. Get test keys (pk_test_xxx, sk_test_xxx)
 * 3. Set environment variables:
 * 
 *    FRONTEND:
 *    VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
 * 
 *    BACKEND:
 *    PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
 * 
 * 4. Use test card: 4084 0840 8408 4081
 *    - Any future expiry date
 *    - Any CVC (3 digits)
 *    - OTP: 123456
 * 
 * 5. Test payment flow:
 *    - Open Wallet page
 *    - Click "Fund Wallet"
 *    - Enter ₦100 or more
 *    - Click "Pay with Paystack"
 *    - Complete card details
 *    - Verify wallet balance updates
 * 
 * 6. Check backend logs for:
 *    ✅ "✅ Payment initiated for user..."
 *    ✅ "✅ Processing charge.success event:"
 *    ✅ "✅ Wallet updated for user..."
 *    ✅ "✅ Paystack webhook processed successfully"
 * 
 * LOCAL WEBHOOK TESTING (using curl):
 * 
 *    ```bash
 *    PAYLOAD='{"event":"charge.success","data":{"reference":"PAY_test_123","amount":50000,"id":12345,"customer":{"email":"test@example.com"}}}'
 * 
 *    SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha512 -hmac "sk_test_xxxxx" | cut -d' ' -f2)
 * 
 *    curl -X POST http://localhost:5000/api/payments/webhook \
 *      -H "Content-Type: application/json" \
 *      -H "x-paystack-signature: $SIGNATURE" \
 *      -d "$PAYLOAD"
 *    ```
 * 
 * ========================================
 * PRODUCTION DEPLOYMENT
 * ========================================
 * 
 * BEFORE DEPLOYING:
 * 
 * [ ] Switch to live keys (pk_live_xxx, sk_live_xxx)
 * [ ] Update .env with live keys
 * [ ] Register webhook URL in Paystack dashboard
 * [ ] Test with real payment at low amount (₦10-₦50)
 * [ ] Verify webhook delivery in Paystack logs
 * [ ] Set up error monitoring (Sentry, etc.)
 * [ ] Configure payment amount limits if needed
 * [ ] Set up daily transaction reports
 * [ ] Test refund process
 * [ ] Document support process for payment issues
 * [ ] Brief support team on new payment flow
 * 
 * PAYSTACK DASHBOARD WEBHOOK SETUP:
 * 
 * 1. Log into https://dashboard.paystack.com
 * 2. Settings → Webhooks
 * 3. Enter webhook URL:
 *    https://your-backend.com/api/payments/webhook
 * 4. Select event(s):
 *    - Charge (Successful) [✓]
 *    - Charge (Failed) [ ]
 * 5. Click "Add Webhook"
 * 6. Paystack will send test event
 * 7. Check backend logs for "✅ Webhook received and validated"
 * 
 * ========================================
 * MONITORING & MAINTENANCE
 * ========================================
 * 
 * LOGS TO MONITOR:
 * 
 * - "❌ Webhook signature mismatch" → Security issue
 * - "❌ Transaction not found" → Payment without transaction
 * - "❌ Amount mismatch" → Tampering attempt
 * - "⚠️  Transaction already processed" → Duplicate webhook (normal)
 * - "✅ Paystack webhook processed successfully" → All good
 * 
 * DATABASE QUERIES:
 * 
 * See all payments in last 24 hours:
 *    db.transactions.find({
 *      type: "credit",
 *      createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
 *    }).count()
 * 
 * Total payments today:
 *    db.transactions.aggregate([
 *      { $match: { type: "credit", status: "success" } },
 *      { $group: { _id: null, total: { $sum: "$amountKobo" } } }
 *    ])
 * 
 * Failed payments:
 *    db.transactions.find({ status: "pending", createdAt: { $lt: new Date(Date.now() - 24*60*60*1000) } })
 * 
 * ========================================
 * TROUBLESHOOTING
 * ========================================
 * 
 * "Payment modal doesn't open"
 *   → Check browser console for errors
 *   → Verify VITE_PAYSTACK_PUBLIC_KEY is set
 *   → Verify react-paystack is installed
 *   → Check Paystack account status (not suspended)
 * 
 * "Wallet doesn't update after payment"
 *   → Check backend logs for webhook delivery
 *   → Verify PAYSTACK_SECRET_KEY is correct
 *   → Check if Transaction was created in MongoDB
 *   → Check User wallet balance in database
 *   → Try refreshing page manually
 * 
 * "Duplicate charges"
 *   → Normal if webhook fires multiple times
 *   → Payment processed only once (status check prevents duplicates)
 *   → Check Transaction.status = "success"
 * 
 * "Webhook not being received"
 *   → Check Paystack webhook logs at dashboard.paystack.com
 *   → Verify webhook URL is public and accessible
 *   → Check firewall/security rules allowing Paystack IPs
 *   → Verify HTTPS certificate is valid
 *   → Test webhook delivery from Paystack dashboard
 * 
 */
