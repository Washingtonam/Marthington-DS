const { awardCommissionIfEligible } = require('../services/commission.service');

const createMocks = (user, settings) => {
  const updatedUser = {
    ...user,
    commissionBalanceKobo: 200000,
    commissionBalance: 2000,
  };
  const findById = jest.fn().mockResolvedValue(user);
  const findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);
  const transactionCreate = jest.fn().mockResolvedValue([{ _id: 'tx-1' }]);
  const settingsFindOne = jest.fn().mockResolvedValue(settings);
  const getServiceCatalog = jest.fn().mockResolvedValue([]);
  return {
    updatedUser,
    findById,
    findByIdAndUpdate,
    transactionCreate,
    settingsFindOne,
    getServiceCatalog,
    UserModel: { findById },
    TransactionModel: { create: transactionCreate },
    SystemSettingsModel: { findOne: settingsFindOne },
    PricingModel: { getServiceCatalog },
    userUpdate: { findByIdAndUpdate },
  };
};

describe('commission payouts', () => {
  it('credits an agent a configured flat commission and records the rule once', async () => {
    const user = {
      _id: 'user-1',
      role: 'user',
      commissionBalanceKobo: 0,
      commissionBalance: 0,
    };
    const mocks = createMocks(user, { commissionType: 'FLAT', commissionValue: 2000 });
    const request = {
      _id: 'request-1',
      userId: 'user-1',
      status: 'completed',
      paymentSource: 'main',
      commissionAwarded: false,
      commissionAmountKobo: 0,
      save: jest.fn(),
    };

    const result = await awardCommissionIfEligible({
      request,
      ...mocks,
    });

    expect(result.awarded).toBe(true);
    expect(result.amountKobo).toBe(200000);
    expect(mocks.findById).toHaveBeenCalledWith('user-1');
    expect(mocks.findByIdAndUpdate).toHaveBeenCalledWith(
      { _id: 'user-1' },
      { $inc: { commissionBalanceKobo: 200000, commissionBalance: 2000 } },
      { new: true }
    );
    expect(mocks.transactionCreate).toHaveBeenCalledWith([expect.objectContaining({
      userId: 'user-1',
      type: 'COMMISSION',
      amount: 2000,
      amountKobo: 200000,
      commissionTypeUsed: 'FLAT',
      rateOrAmountApplied: 2000,
      calculatedAmountKobo: 200000,
      requestId: 'request-1',
    })]);
    expect(request.commissionAwarded).toBe(true);
    expect(request.commissionAmountKobo).toBe(200000);
    expect(request.save).toHaveBeenCalledTimes(1);
  });

  it('calculates percentage commissions from the service price recorded on the request', async () => {
    const user = { _id: 'user-2', role: 'user' };
    const mocks = createMocks(user, { commissionType: 'PERCENTAGE', commissionValue: 10 });
    const request = {
      _id: 'request-2',
      userId: 'user-2',
      status: 'completed',
      paymentSource: 'main',
      priceAtTimeOfRequest: 1250,
      commissionAwarded: false,
      save: jest.fn(),
    };

    const result = await awardCommissionIfEligible({ request, ...mocks });

    expect(result.awarded).toBe(true);
    expect(result.amountKobo).toBe(12500);
    expect(mocks.transactionCreate).toHaveBeenCalledWith([expect.objectContaining({
      amount: 125,
      amountKobo: 12500,
      commissionTypeUsed: 'PERCENTAGE',
      rateOrAmountApplied: 10,
      calculatedAmountKobo: 12500,
    })]);
  });

  it('uses the matching service commission rule instead of the global fallback', async () => {
    const user = { _id: 'user-service', role: 'user' };
    const mocks = createMocks(user, { commissionType: 'FLAT', commissionValue: 2000 });
    mocks.getServiceCatalog.mockResolvedValue([{
      serviceCode: 'validation-vnin',
      category: 'NIMC',
      type: 'vnin',
      commissionType: 'PERCENTAGE',
      commissionValue: 15,
    }]);
    const request = {
      _id: 'request-service',
      userId: 'user-service',
      service: 'validation',
      type: 'vnin',
      serviceCategory: 'NIN',
      status: 'completed',
      paymentSource: 'main',
      priceAtTimeOfRequest: 1250,
      commissionAwarded: false,
      save: jest.fn(),
    };

    const result = await awardCommissionIfEligible({ request, ...mocks });

    expect(result.awarded).toBe(true);
    expect(result.amountKobo).toBe(18750);
    expect(mocks.transactionCreate).toHaveBeenCalledWith([expect.objectContaining({
      commissionTypeUsed: 'PERCENTAGE',
      rateOrAmountApplied: 15,
      amountKobo: 18750,
    })]);
  });

  it('does not award commissions for requests paid from the commission wallet', async () => {
    const request = {
      _id: 'request-3',
      userId: 'user-3',
      status: 'completed',
      paymentSource: 'commission',
      commissionAwarded: false,
      commissionAmountKobo: 0,
      save: jest.fn(),
    };
    const mocks = createMocks({ _id: 'user-3', role: 'user' }, { commissionType: 'FLAT', commissionValue: 2000 });

    const result = await awardCommissionIfEligible({ request, ...mocks });

    expect(result.awarded).toBe(false);
    expect(mocks.findById).not.toHaveBeenCalled();
    expect(mocks.transactionCreate).not.toHaveBeenCalled();
    expect(request.commissionAwarded).toBe(false);
  });

  it('does not credit an already-awarded request again', async () => {
    const request = {
      _id: 'request-4',
      userId: 'user-4',
      status: 'completed',
      paymentSource: 'main',
      commissionAwarded: true,
    };
    const mocks = createMocks({ _id: 'user-4', role: 'user' }, { commissionType: 'FLAT', commissionValue: 2000 });

    const result = await awardCommissionIfEligible({ request, ...mocks });

    expect(result).toEqual({ awarded: false, reason: 'already_awarded' });
    expect(mocks.findById).not.toHaveBeenCalled();
    expect(mocks.transactionCreate).not.toHaveBeenCalled();
  });
});
