const { awardCommissionIfEligible } = require('../services/commission.service');

describe('commission payouts', () => {
  it('credits a commission wallet for completed admin submissions once', async () => {
    const user = {
      _id: 'user-1',
      role: 'admin',
      commissionBalanceKobo: 0,
      commissionBalance: 0,
      getCommissionBalanceNaira: () => 0,
    };

    const updatedUser = {
      ...user,
      commissionBalanceKobo: 200000,
      commissionBalance: 2000,
    };

    const findById = jest.fn().mockResolvedValue(user);
    const findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);
    const transactionCreate = jest.fn().mockResolvedValue([{ _id: 'tx-1' }]);

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
      UserModel: { findById },
      TransactionModel: { create: transactionCreate },
      userUpdate: { findByIdAndUpdate },
      commissionAmountKobo: 200000,
    });

    expect(result.awarded).toBe(true);
    expect(result.amountKobo).toBe(200000);
    expect(findById).toHaveBeenCalledWith('user-1');
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      { _id: 'user-1' },
      { $inc: { commissionBalanceKobo: 200000, commissionBalance: 2000 } },
      { new: true }
    );
    expect(transactionCreate).toHaveBeenCalledTimes(1);
    expect(request.commissionAwarded).toBe(true);
    expect(request.commissionAmountKobo).toBe(200000);
  });

  it('does not award commissions for requests paid from the commission wallet', async () => {
    const request = {
      _id: 'request-2',
      userId: 'user-2',
      status: 'completed',
      paymentSource: 'commission',
      commissionAwarded: false,
      commissionAmountKobo: 0,
      save: jest.fn(),
    };

    const result = await awardCommissionIfEligible({
      request,
      UserModel: { findById: jest.fn() },
      TransactionModel: { create: jest.fn() },
      userUpdate: { findByIdAndUpdate: jest.fn() },
      commissionAmountKobo: 200000,
    });

    expect(result.awarded).toBe(false);
    expect(request.commissionAwarded).toBe(false);
  });
});
