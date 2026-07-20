const crypto = require('crypto');
const User = require('../models/User.model');
const Transaction = require('../models/transaction.model');
const AuditLog = require('../models/AuditLog.model');

const normalizeAmountKobo = (amount) => {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
};

const buildCentralGatewayCheckoutUrl = ({ gatewayUrl, reference, amount, userId, email, callbackUrl, appName }) => {
  const baseUrl = String(gatewayUrl || '').trim();
  if (!baseUrl) return '';

  const params = new URLSearchParams({
    reference: String(reference || ''),
    amount: String(amount || 0),
    user_id: String(userId || ''),
    email: String(email || ''),
    callback_url: String(callbackUrl || ''),
    app: String(appName || 'marthington'),
    currency: 'NGN',
  });

  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`;
};

const creditWalletForSuccessfulPayment = async ({ userId, amountKobo, reference, gateway, externalReference, paymentMethod, source }) => {
  if (!userId || !amountKobo || amountKobo <= 0) {
    throw new Error('Invalid wallet credit request');
  }

  const user = await User.findById(userId).exec();
  if (!user) {
    throw new Error('User not found');
  }

  const amountForWalletNaira = Number((amountKobo / 100).toFixed(2));
  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id },
    {
      $inc: {
        walletBalanceKobo: amountKobo,
        walletBalance: amountForWalletNaira,
      },
    },
    { new: true, runValidators: true }
  ).exec();

  if (!updatedUser) {
    throw new Error('Failed to update wallet balance');
  }

  const transaction = await Transaction.findOne({ reference }).exec();
  if (transaction) {
    transaction.status = 'success';
    transaction.gatewayResponse = gateway || 'central-gateway';
    transaction.paymentMethod = paymentMethod || source || 'central-gateway';
    transaction.externalReference = externalReference || reference;
    transaction.amountKobo = amountKobo;
    transaction.amount = amountForWalletNaira;
    await transaction.save();
  }

  await new AuditLog({
    action: 'CENTRAL_GATEWAY_WALLET_CREDIT',
    performedBy: 'system:central-gateway',
    userId: user._id,
    amount: amountKobo,
    balanceBefore: user.walletBalanceKobo || 0,
    balanceAfter: updatedUser.walletBalanceKobo,
    note: `Central gateway wallet funding | Reference: ${reference} | Gateway: ${gateway || 'central-gateway'} | Amount: ${amountForWalletNaira}`,
  }).save();

  return {
    walletBalanceKobo: updatedUser.walletBalanceKobo,
    walletBalance: updatedUser.walletBalance,
  };
};

const verifyGatewaySignature = ({ payload, signature, secret, algorithm = 'sha256' }) => {
  if (!payload || !signature || !secret) return false;
  const hash = crypto.createHmac(algorithm, secret).update(payload).digest('hex');
  return hash === signature;
};

const isSuccessfulGatewayStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  return ['success', 'successful', 'completed', 'paid', 'succeeded', 'done'].includes(normalized);
};

const selectSignatureHeader = (headers = {}) => {
  const normalized = Object.keys(headers || {}).reduce((acc, key) => {
    acc[key.toLowerCase()] = headers[key];
    return acc;
  }, {});

  return normalized['verif-hash'] || normalized['x-central-signature'] || normalized['x-gateway-signature'] || normalized['signature'] || '';
};

const resolveCentralCallbackUrl = ({ callbackUrl, env = process.env }) => {
  const serverConfigured = String(
    env.CENTRAL_PAYMENT_CALLBACK_URL || env.BACKEND_URL || env.RENDER_EXTERNAL_URL || env.RENDER_URL || ''
  ).trim();

  if (serverConfigured) {
    return serverConfigured.includes('/api/payments/gateway/callback')
      ? serverConfigured
      : `${serverConfigured.replace(/\/$/, '')}/api/payments/gateway/callback`;
  }

  const fallbackUrl = String(callbackUrl || '').trim();
  if (fallbackUrl) {
    return fallbackUrl.includes('/api/payments/gateway/callback')
      ? fallbackUrl
      : `${fallbackUrl.replace(/\/$/, '')}/api/payments/gateway/callback`;
  }

  return '';
};

module.exports = {
  normalizeAmountKobo,
  buildCentralGatewayCheckoutUrl,
  creditWalletForSuccessfulPayment,
  verifyGatewaySignature,
  isSuccessfulGatewayStatus,
  selectSignatureHeader,
  resolveCentralCallbackUrl,
};
