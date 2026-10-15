const User = require('../models/User.model');
const Transaction = require('../models/transaction.model');
const SystemSettings = require('../models/SystemSettings.model');

const resolveDefaultCommissionValue = () => Number(
  process.env.DEFAULT_COMMISSION_AMOUNT_NAIRA
  || process.env.COMMISSION_AMOUNT_NAIRA
  || 2000
);

const resolveJobPriceNaira = (request) => {
  const candidates = [request.priceAtTimeOfRequest, request.amountCharged, request.amount];
  const value = candidates.find((candidate) => (
    candidate !== undefined
    && candidate !== null
    && Number.isFinite(Number(candidate))
    && Number(candidate) > 0
  ));
  return value === undefined ? 0 : Math.max(Number(value), 0);
};

const normalizePaymentSource = (value) => String(value || 'main').toLowerCase();

const awardCommissionIfEligible = async ({
  request,
  UserModel = User,
  TransactionModel = Transaction,
  SystemSettingsModel = SystemSettings,
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
  if (!['user', 'admin', 'super_admin'].includes(role)) {
    return { awarded: false, reason: 'ineligible_role' };
  }

  const settings = await SystemSettingsModel.findOne({ key: 'global' });
  const commissionType = settings?.commissionType || 'FLAT';
  const rateOrAmountApplied = settings
    ? Number(settings.commissionValue)
    : resolveDefaultCommissionValue();
  if (
    !['FLAT', 'PERCENTAGE'].includes(commissionType)
    || !Number.isFinite(rateOrAmountApplied)
    || rateOrAmountApplied <= 0
    || (commissionType === 'PERCENTAGE' && rateOrAmountApplied > 100)
  ) {
    return { awarded: false, reason: 'invalid_commission_settings' };
  }
  const jobPriceNaira = resolveJobPriceNaira(request);
  if (commissionType === 'PERCENTAGE' && jobPriceNaira <= 0) {
    return { awarded: false, reason: 'missing_job_price' };
  }

  const amountNaira = commissionType === 'PERCENTAGE'
    ? (jobPriceNaira * rateOrAmountApplied) / 100
    : rateOrAmountApplied;
  const amountKobo = Math.round(amountNaira * 100);
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
    requestId: request._id,
    requestSource: request.serviceType ? 'cac' : 'service',
    commissionTypeUsed: commissionType,
    rateOrAmountApplied,
    calculatedAmountKobo: amountKobo,
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
    commissionTypeUsed: commissionType,
    rateOrAmountApplied,
    user: updatedUser,
  };
};

module.exports = {
  awardCommissionIfEligible,
};
