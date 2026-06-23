# Paystack Integration - Environment Setup Guide

## Overview
This project uses **Paystack** as the primary payment gateway for X-Combinator. The integration provides secure wallet funding with automated credit verification via webhooks.

## Environment Variables

### Backend (.env)
```bash
# Paystack Secret Key (Server-side only - DO NOT expose)
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx  # Production
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx  # Development
```

**Where to find:**
1. Log in to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Navigate to Settings → API Keys & Webhooks
3. Copy the **Secret Key** (starts with `sk_`)

### Frontend (.env.local or .env)
```bash
# Paystack Public Key (Safe to expose - used in frontend)
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx  # Production
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx  # Development
```

**Where to find:**
1. Log in to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Navigate to Settings → API Keys & Webhooks
3. Copy the **Public Key** (starts with `pk_`)

## Webhook Configuration

### Setup Paystack Webhook
1. Go to [Paystack Dashboard](https://dashboard.paystack.com/) → Settings → API Keys & Webhooks
2. Under "Webhooks", add a new webhook endpoint:
   - **URL:** `https://your-domain.com/api/payments/webhook`
   - **Events:** Select `charge.success`
3. Copy the webhook secret (if needed for additional validation)

### Expected Webhook Headers
- **x-paystack-signature** - HMAC-SHA512 signature for verification

### Webhook Response Format
```json
{
  "event": "charge.success",
  "data": {
    "id": 12345,
    "reference": "PAY_xxxxxxxxxxxxx_1717419600000",
    "amount": 50000,
    "currency": "NGN",
    "status": "success",
    "paid_at": "2026-06-03T10:31:00.000Z",
    "customer": {
      "id": 123,
      "email": "user@example.com"
    }
  }
}
```

## Payment Flow

### Frontend to Backend
1. User enters amount on wallet page
2. Frontend calls `POST /api/payments/init` with amount
3. Backend creates pending transaction and returns reference
4. Frontend opens Paystack checkout modal with reference
5. User completes payment in Paystack modal

### Paystack to Backend (Webhook)
1. Payment is completed on Paystack
2. Paystack sends `charge.success` webhook to `/api/payments/webhook`
3. Backend verifies HMAC-SHA512 signature using PAYSTACK_SECRET_KEY
4. Backend finds transaction by reference
5. Backend validates amount matches
6. Backend atomically credits user wallet
7. Backend updates transaction status to "success"
8. Backend logs audit trail

## Testing

### Test Mode
Use test keys (starting with `pk_test_` and `sk_test_`) for development:
- Frontend: `VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx`
- Backend: `PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx`

### Test Card Details
- **Card Number:** `4111111111111111`
- **Expiry:** `12/99`
- **CVV:** `123`
- **OTP:** `123456` (when prompted)

### Webhook Testing
Use [Postman](https://www.postman.com/) or `curl` to test webhooks:

```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: YOUR_SIGNATURE_HERE" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "PAY_test_1234567890",
      "amount": 50000,
      "status": "success",
      "customer": {
        "email": "test@example.com"
      }
    }
  }'
```

## Troubleshooting

### "VITE_PAYSTACK_PUBLIC_KEY is not configured"
- **Cause:** Frontend environment variable missing
- **Fix:** Add `VITE_PAYSTACK_PUBLIC_KEY` to frontend `.env` or `.env.local`
- **Verify:** Run `echo $VITE_PAYSTACK_PUBLIC_KEY` in frontend directory

### "PAYSTACK_SECRET_KEY is not configured"
- **Cause:** Backend environment variable missing
- **Fix:** Add `PAYSTACK_SECRET_KEY` to backend `.env`
- **Verify:** Check that `.env` file exists in backend directory

### Webhook Signature Verification Failed
- **Cause:** `PAYSTACK_SECRET_KEY` is incorrect or webhook was tampered with
- **Fix:** 
  1. Verify correct secret key is set
  2. Check webhook request headers for `x-paystack-signature`
  3. View backend logs for calculated vs expected hash values

### Payment Not Crediting Wallet
- **Cause:** Multiple possible issues
- **Debug Steps:**
  1. Check backend logs for webhook processing errors
  2. Verify transaction was created with correct reference
  3. Check database for transaction record with `status: "success"`
  4. Verify user email matches between payment and transaction
  5. Check wallet balance update in audit logs

### HMAC Signature Mismatch
- **Symptoms:** Backend logs show "Signature verification failed"
- **Common Causes:**
  - Secret key changed recently
  - Different secret key in test vs production environment
  - Webhook payload was modified in transit
- **Solution:**
  1. Verify PAYSTACK_SECRET_KEY matches Paystack dashboard
  2. Restart backend server after changing env variables
  3. Check Paystack dashboard for webhook signing errors

## Security Checklist

- [ ] Backend uses HMAC-SHA512 for signature verification
- [ ] `PAYSTACK_SECRET_KEY` is never exposed to frontend
- [ ] `VITE_PAYSTACK_PUBLIC_KEY` is safe to expose
- [ ] Webhook endpoint validates all requests with signature
- [ ] Database uses atomic operations for wallet updates
- [ ] Transaction amounts are validated before wallet credit
- [ ] All payment events are logged with audit trail
- [ ] Duplicate webhooks are handled with idempotency checks

## File Structure

Key files implementing Paystack integration:
- Backend webhook handler: `backend/controllers/payment.controller.js` → `handlePaystackWebhook()`
- Backend routes: `backend/routes/payment.routes.js`
- Frontend wallet: `frontend/src/pages/wallet/Wallet.jsx`
- Frontend fund modal: `frontend/src/components/FundWallet.jsx`
- Frontend SDK loader: `frontend/index.html` (Paystack script tag)

## Support

For issues or questions about Paystack integration:
1. Check [Paystack Documentation](https://paystack.com/docs)
2. Review backend console logs for error details
3. Check browser DevTools Network tab for frontend errors
4. Verify webhook delivery status in Paystack Dashboard → Logs

