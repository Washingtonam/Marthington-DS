const mongoose = require('mongoose');
const User = require('../models/User.model');
const ServiceRequest = require('../models/ServiceRequest.model');
const Transaction = require('../models/transaction.model');
const Pricing = require('../models/Pricing.model');
const { processServiceRequest } = require('../controllers/services.controller');

describe('customer pricing tiers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('defaults users without a stored tier to Standard', () => {
    const user = new User({
      email: 'legacy-user@example.com',
      password: 'hashed-password',
    });

    expect(user.pricingTier).toBe('standard');
  });

  it('charges the server-selected tier price, ignores a submitted amount, and snapshots the price', async () => {
    const user = {
      email: 'reseller@example.com',
      pricingTier: 'reseller',
      walletBalanceKobo: 500000,
      walletBalance: 5000,
    };
    const updatedUser = {
      walletBalanceKobo: 425000,
      getWalletBalanceNaira: () => 4250,
    };
    const service = {
      serviceCode: 'test-service',
      category: 'NIMC',
      name: 'Test Service',
      type: 'test',
      status: 'active',
      price: 1000,
      tierPrices: { standard: 1000, reseller: 750 },
      cost: 400,
      metadata: { formFields: [] },
    };
    const pricing = { serviceCatalog: [service], ninServices: {}, cacServices: {} };
    const session = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn(),
    };
    const savedRequest = { _id: 'request-1' };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(session);
    jest.spyOn(User, 'findById').mockReturnValue({
      session: jest.fn().mockResolvedValue(user),
    });
    jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue(updatedUser);
    jest.spyOn(ServiceRequest, 'create').mockImplementation(async ([request]) => {
      Object.assign(savedRequest, request);
      return [savedRequest];
    });
    jest.spyOn(Transaction, 'create').mockResolvedValue([]);
    jest.spyOn(Pricing, 'getPricing').mockResolvedValue(pricing);
    jest.spyOn(Pricing, 'getDefaultServiceCatalog').mockReturnValue([service]);

    const { savedRequest: result } = await processServiceRequest({
      userId: 'user-1',
      service: 'test-service',
      type: 'test',
      amount: 1,
      nin: '12345678901',
      slipType: 'none',
      formData: {},
    });

    expect(result.amount).toBe(750);
    expect(result.amountKobo).toBe(75000);
    expect(result.priceAtTimeOfRequest).toBe(750);
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'user-1', walletBalanceKobo: { $gte: 75000 } },
      { $inc: { walletBalanceKobo: -75000 } },
      { returnDocument: 'after', session },
    );
    expect(Transaction.create).toHaveBeenCalledWith([
      expect.objectContaining({ amount: 750, amountKobo: 75000 }),
    ], { session });

    service.tierPrices.reseller = 600;
    expect(result.amount).toBe(750);
    expect(result.priceAtTimeOfRequest).toBe(750);
  });
});
