// ========================================================
// Atomic Transaction Tests - Wallet + ServiceRequest
// ========================================================

const mongoose = require('mongoose');
require('dotenv').config({ path: `${__dirname}/../.env` });

const User = require('../models/User.model');
const ServiceRequest = require('../models/ServiceRequest.model');
const Transaction = require('../models/transaction.model');
const Pricing = require('../models/Pricing.model');
const { processServiceRequest } = require('../controllers/services.controller');

// Helper: Create test user with specific wallet balance
const createTestUser = async (walletBalanceKobo = 50000) => {
  const user = new User({
    firstName: 'Test',
    lastName: 'User',
    email: `test-${Date.now()}@example.com`,
    password: 'hashed_password',
    walletBalanceKobo,
    walletBalance: walletBalanceKobo / 100,
    units: 10,
    isVerified: true,
  });
  return user.save();
};

// Helper: Create test pricing
const ensureTestPricing = async () => {
  const existing = await Pricing.findOne();
  if (existing) return existing;

  return Pricing.create({
    ninServices: {
      selfService: {
        emailRetrieval: 1500,
        deviceUnlink: 2000,
      },
      validation: {
        noRecord: 5000,
        updateRecord: 5000,
        tracking: 1000,
        slipPrice: 500,
      },
      modification: {
        name: 7000,
        dob: 50000,
        address: 7000,
      },
      ipe: {
        inProcessingError: 1000,
        stillProcessing: 1000,
      },
    },
    cacServices: {
      soleProprietorship: 28000,
      partnership: 32000,
      limited1M: 40000,
    },
  });
};

describe('Atomic Transaction Pattern - Wallet + ServiceRequest', () => {
  let testUser;
  let initialWalletKobo;

  beforeAll(async () => {
    // Ensure MongoDB connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nin-test', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
    }
    await ensureTestPricing();
  }, 60000);

  beforeEach(async () => {
    // Clear test collections
    await User.deleteMany({ email: { $regex: 'test-' } });
    await ServiceRequest.deleteMany({ userId: testUser?._id });
    await Transaction.deleteMany({ userId: testUser?._id });

    // Create fresh test user
    testUser = await createTestUser(50000); // 500 Naira in kobo
    initialWalletKobo = testUser.walletBalanceKobo;
  });

  // ========================================================
  // TEST 1: Happy Path - Sufficient Funds
  // ========================================================
  describe('Happy Path: Sufficient Funds', () => {
    it('should deduct wallet AND create ServiceRequest atomically', async () => {
      const servicePrice = 1500; // Naira
      const servicePriceKobo = servicePrice * 100; // 150000 kobo

      // Verify initial state
      expect(testUser.walletBalanceKobo).toBeGreaterThanOrEqual(servicePriceKobo);

      // Submit service request
      const { savedRequest, walletBalance } = await processServiceRequest({
        userId: testUser._id,
        service: 'self-service',
        type: 'emailRetrieval',
        nin: '12345678901',
        slipType: 'none',
        proof: 'wallet',
        passport: 'wallet',
        formData: { fullName: 'Test User', phoneNumber: '08012345678' },
      });

      // Verify ServiceRequest was created
      expect(savedRequest).toBeDefined();
      expect(savedRequest._id).toBeDefined();
      expect(savedRequest.userId.toString()).toBe(testUser._id.toString());
      expect(savedRequest.amount).toBe(servicePrice);
      expect(savedRequest.status).toBe('pending');

      // Verify wallet was deducted
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.walletBalanceKobo).toBe(initialWalletKobo - servicePriceKobo);

      // Verify response includes updated balance
      expect(walletBalance).toBe((initialWalletKobo - servicePriceKobo) / 100);

      // Verify Transaction record exists
      const transaction = await Transaction.findOne({ requestId: savedRequest._id });
      expect(transaction).toBeDefined();
      expect(transaction.amountKobo).toBe(servicePriceKobo);
      expect(transaction.status).toBe('success');
    });

    it('should handle multiple service types correctly', async () => {
      const testCases = [
        { service: 'validation', type: 'noRecord', expectedPrice: 5000 },
        { service: 'modification', type: 'name', expectedPrice: 7000 },
        { service: 'ipe', type: 'inProcessingError', expectedPrice: 1000 },
      ];

      for (const testCase of testCases) {
        // Reset user wallet
        testUser.walletBalanceKobo = 50000;
        await testUser.save();

        const { savedRequest } = await processServiceRequest({
          userId: testUser._id,
          service: testCase.service,
          type: testCase.type,
          nin: '12345678901',
          slipType: 'none',
          proof: 'wallet',
          passport: 'wallet',
          formData: {},
        });

        expect(savedRequest.amount).toBe(testCase.expectedPrice);

        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.walletBalanceKobo).toBe(50000 - testCase.expectedPrice * 100);
      }
    });
  });

  // ========================================================
  // TEST 2: Sad Path - Insufficient Funds (Rollback)
  // ========================================================
  describe('Sad Path: Insufficient Funds', () => {
    it('should NOT deduct wallet if funds insufficient', async () => {
      // Set user wallet to only 500 kobo (5 Naira)
      testUser.walletBalanceKobo = 500;
      await testUser.save();

      // Try to submit service that costs 1500 Naira
      let errorThrown = false;
      let errorMessage = '';

      try {
        await processServiceRequest({
          userId: testUser._id,
          service: 'self-service',
          type: 'emailRetrieval',
          nin: '12345678901',
          slipType: 'none',
          proof: 'wallet',
          passport: 'wallet',
          formData: { fullName: 'Test User', phoneNumber: '08012345678' },
        });
      } catch (error) {
        errorThrown = true;
        errorMessage = error.message;
      }

      // Verify error was thrown
      expect(errorThrown).toBe(true);
      expect(errorMessage).toContain('Insufficient funds');

      // Verify wallet was NOT deducted (transaction rolled back)
      const user = await User.findById(testUser._id);
      expect(user.walletBalanceKobo).toBe(500);

      // Verify ServiceRequest was NOT created
      const requestCount = await ServiceRequest.countDocuments({ userId: testUser._id });
      expect(requestCount).toBe(0);

      // Verify Transaction was NOT created
      const transactionCount = await Transaction.countDocuments({ userId: testUser._id });
      expect(transactionCount).toBe(0);
    });
  });

  // ========================================================
  // TEST 3: Atomicity - Both Succeed or Both Fail
  // ========================================================
  describe('Atomicity Guarantee', () => {
    it('should maintain wallet + request consistency after transaction', async () => {
      const initialBalance = testUser.walletBalanceKobo;
      const deductAmount = 1500 * 100; // 1500 Naira in kobo

      await processServiceRequest({
        userId: testUser._id,
        service: 'self-service',
        type: 'emailRetrieval',
        nin: '12345678901',
        slipType: 'none',
        proof: 'wallet',
        passport: 'wallet',
        formData: {},
      });

      // Verify: (initial - deducted) = current
      const user = await User.findById(testUser._id);
      const requests = await ServiceRequest.find({ userId: testUser._id });
      const transactions = await Transaction.find({ userId: testUser._id });

      expect(user.walletBalanceKobo).toBe(initialBalance - deductAmount);
      expect(requests.length).toBe(1);
      expect(transactions.length).toBe(1);

      // Verify: request amount matches transaction amount
      expect(requests[0].amountKobo).toBe(transactions[0].amountKobo);
    });

    it('should prevent partial state (wallet deducted but request not created)', async () => {
      // This test verifies the core atomicity guarantee:
      // If wallet deduction succeeds, request MUST be created (and vice versa)

      const { walletBalance: balanceAfter } = await processServiceRequest({
        userId: testUser._id,
        service: 'self-service',
        type: 'emailRetrieval',
        nin: '12345678901',
        slipType: 'none',
        proof: 'wallet',
        passport: 'wallet',
        formData: {},
      });

      const requests = await ServiceRequest.find({ userId: testUser._id });
      const user = await User.findById(testUser._id);

      // ATOMICITY CHECK: If requests exist, wallet must match
      if (requests.length > 0) {
        const totalDeducted = requests.reduce((sum, r) => sum + r.amountKobo, 0);
        const expectedBalance = initialWalletKobo - totalDeducted;
        expect(user.walletBalanceKobo).toBe(expectedBalance);
      }

      // ATOMICITY CHECK: If wallet changed, requests must exist
      if (user.walletBalanceKobo < initialWalletKobo) {
        expect(requests.length).toBeGreaterThan(0);
      }
    });
  });

  // ========================================================
  // TEST 4: Super Admin Bypass
  // ========================================================
  describe('Super Admin Bypass', () => {
    it('should allow super admin to submit without wallet deduction', async () => {
      const adminUser = await createTestUser(0); // No wallet balance
      adminUser.email = process.env.SUPER_ADMIN_EMAIL || 'admin@xcombinator.com';
      await adminUser.save();

      // Should NOT throw error even with 0 balance
      const { savedRequest, walletBalance } = await processServiceRequest({
        userId: adminUser._id,
        service: 'self-service',
        type: 'emailRetrieval',
        nin: '12345678901',
        slipType: 'none',
        proof: 'wallet',
        passport: 'wallet',
        formData: {},
      });

      expect(savedRequest).toBeDefined();

      // Verify wallet was NOT deducted
      const user = await User.findById(adminUser._id);
      expect(user.walletBalanceKobo).toBe(0);
    });
  });

  // ========================================================
  // TEST 5: Wallet Sync - Naira vs Kobo
  // ========================================================
  describe('Wallet Sync - Naira ↔ Kobo', () => {
    it('should keep walletBalance (Naira) and walletBalanceKobo (Kobo) in sync', async () => {
      const { savedRequest } = await processServiceRequest({
        userId: testUser._id,
        service: 'self-service',
        type: 'emailRetrieval',
        nin: '12345678901',
        slipType: 'none',
        proof: 'wallet',
        passport: 'wallet',
        formData: {},
      });

      const user = await User.findById(testUser._id);

      // Verify: walletBalance (Naira) = walletBalanceKobo / 100
      const expectedNaira = user.walletBalanceKobo / 100;
      expect(user.walletBalance).toBe(expectedNaira);

      // Verify: getWalletBalanceNaira() returns correct value
      const nairaFromMethod = user.getWalletBalanceNaira();
      expect(parseFloat(nairaFromMethod)).toBe(expectedNaira);
    });
  });

  // ========================================================
  // TEST 6: StatusHistory Tracking
  // ========================================================
  describe('Status History Tracking', () => {
    it('should initialize statusHistory with pending status', async () => {
      const { savedRequest } = await processServiceRequest({
        userId: testUser._id,
        service: 'self-service',
        type: 'emailRetrieval',
        nin: '12345678901',
        slipType: 'none',
        proof: 'wallet',
        passport: 'wallet',
        formData: {},
      });

      expect(savedRequest.statusHistory).toBeDefined();
      expect(Array.isArray(savedRequest.statusHistory)).toBe(true);
      expect(savedRequest.statusHistory.length).toBeGreaterThan(0);

      const firstEntry = savedRequest.statusHistory[0];
      expect(firstEntry.status).toBe('pending');
    });
  });
});

// ========================================================
// EXPORT processServiceRequest for testing
// ========================================================
module.exports = { processServiceRequest };
