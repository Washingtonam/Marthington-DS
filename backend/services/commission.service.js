const User = require('../models/User.model');
const Transaction = require('../models/transaction.model');

const resolveCommissionAmountKobo = (commissionAmountKobo) => {
  if (typeof commissionAmountKobo === 'number' && Number.isFinite(commissionAmountKobo) && commissionAmountKobo > 0) {
    return Math.round(commissionAmountKobo);
  }

  const configuredAmount = Number(process.env.DEFAULT_COMMISSION_AMOUNT_NAIRA || process.env.COMMISSION_AMOUNT_NAIRA || 2000);
  return Math.round(configuredAmount * 100);
};

const normalizePaymentSource = (value) => String(value || 'main').toLowerCase();

const awardCommissionIfEligible = async ({
  request,
  commissionAmountKobo = resolveCommissionAmountKobo(),
  UserModel = User,
  TransactionModel = Transaction,
  userUpdate = UserModel,
}) => {
  if (!request) {
    return { awarded: false, reason: 'missing_request' };
  }

  if (String(request.status || '').toLowerCase() !== 'completed') {
    return { awarded: false, reason: 'not_completed' };
  }

  if (request.commissionAwarded) {
    return { awarded: false, reason: 'already_awarded' };
  }

  if (normalizePaymentSource(request.paymentSource) === 'commission') {
    return { awarded: false, reason: 'commission_payment_source' };
  }

  const userId = request.userId?.toString?.() || String(request.userId || '');
  if (!userId) {
    return { awarded: false, reason: 'missing_user' };
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return { awarded: false, reason: 'user_not_found' };
  }

  const role = String(user.role || '').toLowerCase();
  if (!['admin', 'super_admin'].includes(role)) {
    return { awarded: false, reason: 'ineligible_role' };
  }

  const amountKobo = Math.max(Number(commissionAmountKobo) || 0, 0);
  if (amountKobo <= 0) {
    return { awarded: false, reason: 'zero_amount' };
  }

  const updatedUser = await userUpdate.findByIdAndUpdate(
    { _id: userId },
    {
      $inc: {
        commissionBalanceKobo: amountKobo,
        commissionBalance: amountKobo / 100,
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    return { awarded: false, reason: 'wallet_update_failed' };
  }

  await TransactionModel.create([{ 
    userId,
    type: 'COMMISSION',
    amount: amountKobo / 100,
    amountKobo,
    status: 'success',
    description: `Commission payout for completed request ${request._id}`,
    reference: `commission-${request._id}`,
  }]);

  request.commissionAwarded = true;
  request.commissionAmountKobo = amountKobo;
  request.commissionAmount = Number((amountKobo / 100).toFixed(2));
  request.paymentSource = request.paymentSource || 'main';

  if (typeof request.save === 'function') {
    await request.save();
  }

  return {
    awarded: true,
    amountKobo,
    amount: Number((amountKobo / 100).toFixed(2)),
    user: updatedUser,
  };
};

module.exports = {
  awardCommissionIfEligible,
};
