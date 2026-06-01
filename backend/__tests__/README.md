# Atomic Transaction Tests - Documentation

## Overview

This test suite validates the **atomic transaction pattern** used in the NIN Portal to ensure wallet deductions and service requests are always in sync.

## What This Tests

### ✅ Test 1: Happy Path (Sufficient Funds)
- **Scenario:** User has wallet balance ≥ service cost
- **Validates:**
  - Wallet is deducted correctly
  - ServiceRequest is created
  - Transaction record is created
  - Response includes updated wallet balance
  - Works across all service types (validation, modification, ipe, CAC)

### ✅ Test 2: Sad Path (Insufficient Funds)
- **Scenario:** User has wallet balance < service cost
- **Validates:**
  - Error is thrown
  - **Wallet is NOT deducted** (transaction rolled back)
  - **ServiceRequest is NOT created** (transaction rolled back)
  - **Transaction record is NOT created** (transaction rolled back)
  - Complete rollback ensures no partial state

### ✅ Test 3: Atomicity Guarantee
- **Scenario:** Multiple sequential transactions
- **Validates:**
  - Wallet balance always matches sum of service requests
  - No "orphaned" wallet deductions without matching requests
  - No "orphaned" requests without matching wallet deductions
  - Core invariant: `count(requests) > 0` ⟺ `wallet_deducted > 0`

### ✅ Test 4: Super Admin Bypass
- **Scenario:** Admin submits request with 0 wallet balance
- **Validates:**
  - Super admin can submit without funds check
  - Wallet is NOT deducted for admin submissions
  - Request is created successfully

### ✅ Test 5: Wallet Sync (Naira ↔ Kobo)
- **Scenario:** Currency consistency after transactions
- **Validates:**
  - `walletBalance` (Naira) = `walletBalanceKobo / 100`
  - `getWalletBalanceNaira()` returns correct value
  - Floating-point precision is maintained

### ✅ Test 6: Status History Tracking
- **Scenario:** Service request lifecycle
- **Validates:**
  - `statusHistory` array is initialized
  - First entry has `pending` status
  - Timestamp is recorded

---

## How to Run

### Prerequisites
```bash
# Ensure MongoDB is running (local or remote via .env)
# Install dependencies (including Jest)
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run Only Transaction Tests
```bash
jest __tests__/transactions.test.js
```

### Run Specific Test Suite
```bash
jest __tests__/transactions.test.js -t "Happy Path"
```

---

## Understanding the Output

### Successful Test Run
```
PASS  __tests__/transactions.test.js (12.5s)
  Atomic Transaction Pattern - Wallet + ServiceRequest
    Happy Path: Sufficient Funds
      ✓ should deduct wallet AND create ServiceRequest atomically (234ms)
      ✓ should handle multiple service types correctly (567ms)
    Sad Path: Insufficient Funds
      ✓ should NOT deduct wallet if funds insufficient (123ms)
    Atomicity Guarantee
      ✓ should maintain wallet + request consistency (145ms)
      ✓ should prevent partial state (189ms)
    Super Admin Bypass
      ✓ should allow super admin to submit without wallet deduction (98ms)
    Wallet Sync - Naira ↔ Kobo
      ✓ should keep walletBalance and walletBalanceKobo in sync (67ms)
    Status History Tracking
      ✓ should initialize statusHistory with pending status (56ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

---

## Key Benefits

### 🛡️ Immediate Peace of Mind
- **No guessing:** The code proves atomicity works
- **Automated verification:** Don't manually check balances anymore
- **Before deploying:** Run tests to ensure nothing broke

### 📈 Scalability
- **Add new services:** Test still validates atomicity
- **Future changes:** Test catches regressions immediately
- **Team confidence:** Everyone knows the wallet logic is sound

### ⚡ Efficiency
- **Post-deployment:** No manual smoke tests needed
- **CI/CD integration:** Tests can run automatically on every commit
- **Cost savings:** Catch bugs before production, not after

---

## Test Architecture

### MongoDB Transaction Pattern
Each test uses `mongoose.startSession()` with `withTransaction()` to ensure atomicity:

```javascript
const session = await mongoose.startSession();
await session.withTransaction(async () => {
  // 1. Fetch pricing
  // 2. Check user balance
  // 3. Deduct wallet (atomic)
  // 4. Create ServiceRequest (same session)
  // 5. Create Transaction record (same session)
  // Auto-rollback if any step fails
});
```

### Test Data Isolation
- Each test creates fresh test users
- Test collections are cleaned between runs
- No cross-test contamination
- Database state is deterministic

---

## Debugging Failed Tests

### Test Fails: "Insufficient funds"
- Check MongoDB is running
- Verify `.env` has `MONGODB_URI` set
- Run: `mongo` or use MongoDB Atlas

### Test Fails: "User not found"
- Ensure User model is connected to MongoDB
- Check User schema is correct
- Verify indexes are created

### Test Fails: "Wallet balance mismatch"
- Check `processServiceRequest()` logic
- Verify `$inc` operator is working
- Run with `--verbose` flag for more details

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Test Atomic Transactions

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:5.0
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

---

## Next Steps

1. **Run the test suite:** `npm test`
2. **Review coverage:** `npm run test:coverage`
3. **Add to CI/CD:** Commit tests to git, set up GitHub Actions
4. **Monitor:** Run tests before each production deployment
5. **Expand:** Add tests for admin approval flow, edge cases

---

## Support

- **Questions?** Check the test file inline comments
- **Report issues?** Add a test case that reproduces the bug
- **Need help?** Review `__tests__/transactions.test.js` for examples
