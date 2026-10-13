const { createVerificationRequestRecord } = require('../services/verification.service');

describe('verification request creation', () => {
  it('creates a dedicated verification request and linked transaction', async () => {
    const verificationCreate = jest.fn().mockResolvedValue([{ _id: 'verification-1' }]);
    const transactionCreate = jest.fn().mockResolvedValue([{ _id: 'tx-1' }]);

    const result = await createVerificationRequestRecord({
      userId: 'user-1',
      method: 'nin',
      nin: '12345678901',
      unitsRequired: 1,
      costKobo: 25000,
      apiResponseData: { firstname: 'Jane' },
      VerificationRequestModel: { create: verificationCreate },
      TransactionModel: { create: transactionCreate },
    });

    expect(verificationCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'user-1',
        requestType: 'verification',
        method: 'nin',
        nin: '12345678901',
        unitsUsed: 1,
        amountKobo: 25000,
        status: 'completed',
        apiResponseData: { firstname: 'Jane' }
      })
    ]);
    expect(transactionCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'NIN_AUTO',
        userId: 'user-1',
        requestId: 'verification-1',
        amountKobo: 25000,
        status: 'success'
      })
    ]);
    expect(result.requestId).toBe('verification-1');
  });
});
