// backend/controllers/services.controller.js
const mongoose = require('mongoose');
const User = require('../models/User.model');
const ServiceRequest = require('../models/ServiceRequest.model');
const Transaction = require('../models/transaction.model');
const Pricing = require('../models/Pricing.model');
const { validateServiceRequest } = require('../shared/validators');
const { SUPER_ADMIN_EMAIL } = require('../config/constants');

exports.getAllCacRequests = async (req, res) => {
  // ...existing logic from cac.routes.js...
};

exports.getAllNinRequests = async (req, res) => {
  // ...existing logic from nin.routes.js...
};

exports.getPricing = async (req, res) => {
  try {
    const pricing = await Pricing.getPricing();
    return res.json(pricing);
  } catch (error) {
    console.error('PRICING_FETCH_ERROR:', error);
    return res.status(500).json({ error: 'Failed to load pricing' });
  }
};

exports.submitServiceRequest = async (req, res) => {
  const { error } = validateServiceRequest.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const { service, type, nin, slipType, proof, passport, formData } = req.body;

    const pricing = await Pricing.getPricing();
    if (!pricing || !pricing.ninServices) {
      throw new Error('Service pricing configuration is unavailable.');
    }

    let mappedType = type;
    if (service === 'modification') {
      if (type === 'name') mappedType = 'name';
      if (type === 'phone') mappedType = 'phone';
      if (type === 'address') mappedType = 'address';
    }

    const normalizedService = String(service || '').toLowerCase();
    const normalizedType = String(mappedType || '').trim();

    let basePrice;
    switch (normalizedService) {
      case 'validation':
        basePrice = pricing.ninServices.validation?.[normalizedType];
        break;
      case 'modification':
        basePrice = pricing.ninServices.modification?.[normalizedType];
        break;
      case 'ipe':
        basePrice = pricing.ninServices.ipe?.[normalizedType];
        break;
      case 'self-service':
      case 'selfservice':
      case 'self_service':
        basePrice = pricing.ninServices.selfService?.[normalizedType];
        break;
      default:
        basePrice = pricing.ninServices?.[normalizedType];
    }

    if (typeof basePrice !== 'number') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Unable to resolve service price from current pricing configuration.' });
    }

    const slipCost = String(service).toLowerCase() === 'validation' && slipType && slipType !== 'none'
      ? pricing.ninServices?.slipPrice ?? 0
      : 0;

    const totalCalculatedAmount = Number(basePrice) + Number(slipCost);
    const totalKobo = Math.round(totalCalculatedAmount * 100);

    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.walletBalanceKobo == null) {
      user.walletBalanceKobo = Math.round((user.walletBalance || 0) * 100);
    }

    const isSuperAdmin = user.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();

    let updatedUser = user;
    if (!isSuperAdmin && totalKobo > 0) {
      updatedUser = await User.findOneAndUpdate(
        { _id: userId, walletBalanceKobo: { $gte: totalKobo } },
        { $inc: { walletBalanceKobo: -totalKobo } },
        { new: true, session }
      );

      if (!updatedUser) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: 'Insufficient funds' });
      }
    }

    const [savedRequest] = await ServiceRequest.create([
      {
        userId,
        service: String(service),
        type: String(mappedType),
        serviceCategory: 'NIMC',
        nin: nin ? String(nin) : 'N/A',
        slipType: slipType ? String(slipType) : 'none',
        amount: Number(totalCalculatedAmount),
        amountKobo: totalKobo,
        priceAtTimeOfRequest: Number(totalCalculatedAmount),
        unitsUsed: 0,
        proof: proof ? String(proof) : 'wallet',
        passport: passport ? String(passport) : 'wallet',
        formData: typeof formData === 'object' ? formData : {},
        status: 'pending',
        statusHistory: [{ status: 'pending', note: 'Initialized manual pipeline sequence successfully.' }]
      }
    ], { session });

    await Transaction.create([
      {
        type: 'SERVICE',
        amount: Number(totalCalculatedAmount),
        amountKobo: totalKobo,
        status: 'success',
        userId,
        requestId: savedRequest._id
      }
    ], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, message: 'Submission compiled successfully.', request: savedRequest, walletBalance: updatedUser.getWalletBalanceNaira() });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ MANUAL SERVICE SUBMISSION ERROR:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
