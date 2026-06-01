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

const resolveServicePrice = (pricing, service, type, slipType) => {
  if (!pricing || !pricing.ninServices) return null;

  const normalizedService = String(service || '').toLowerCase();
  const normalizedType = String(type || '').trim();

  let basePrice = pricing.ninServices[normalizedService]?.[normalizedType];

  // FALLBACK: If type lookup fails, try to find a default price in that category
  if (basePrice === undefined) {
    console.warn(`WARNING: Price not found for ${normalizedService}/${normalizedType}. Checking for default.`);
    basePrice = pricing.ninServices[normalizedService]?.default || pricing.ninServices.default;
  }

  if (typeof basePrice !== 'number') return null;

  return {
    amount: Number(basePrice),
    amountKobo: Math.round(Number(basePrice) * 100)
  };
};

const processServiceRequest = async ({ userId, service, type, nin, slipType, proof, passport, formData }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pricing = await Pricing.getPricing();
    const resolvedPrice = resolveServicePrice(pricing, service, type, slipType);

    if (!resolvedPrice) {
      throw new Error('Unable to resolve service price from current pricing configuration.');
    }

    const { amount, amountKobo } = resolvedPrice;

    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.walletBalanceKobo == null) {
      user.walletBalanceKobo = Math.round((user.walletBalance || 0) * 100);
    }

    const isSuperAdmin = user.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
    let updatedUser = user;

    if (!isSuperAdmin && amountKobo > 0) {
      updatedUser = await User.findOneAndUpdate(
        { _id: userId, walletBalanceKobo: { $gte: amountKobo } },
        { $inc: { walletBalanceKobo: -amountKobo } },
        { new: true, session }
      );

      if (!updatedUser) {
        throw new Error('Insufficient funds');
      }
    }

    const [savedRequest] = await ServiceRequest.create([
      {
        userId,
        service: String(service),
        type: String(type),
        serviceCategory: 'NIMC',
        nin: nin ? String(nin) : 'N/A',
        slipType: slipType ? String(slipType) : 'none',
        amount,
        amountKobo,
        priceAtTimeOfRequest: amount,
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
        amount,
        amountKobo,
        status: 'success',
        userId,
        requestId: savedRequest._id
      }
    ], { session });

    await session.commitTransaction();
    session.endSession();

    // Change the return at the end of the success block
    // Force it to use the Kobo value converted to Naira for the frontend
    return {
      savedRequest,
      walletBalance: Math.round(updatedUser.walletBalanceKobo) / 100 
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

exports.submitServiceRequest = async (req, res) => {
  console.log('TRANSACTION TRACE START:', { body: req.body, userId: req.user?.id });
  const { error } = validateServiceRequest.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  try {
    const userId = req.user.id;
    const { service, type, nin, slipType, proof, passport, formData } = req.body;

    const { savedRequest, walletBalance } = await processServiceRequest({
      userId,
      service,
      type,
      nin,
      slipType,
      proof,
      passport,
      formData
    });

    return res.status(200).json({
      success: true,
      message: 'Submission compiled successfully.',
      request: savedRequest,
      walletBalance
    });
  } catch (error) {
    console.error('❌ MANUAL SERVICE SUBMISSION ERROR:', error);
    if (error.message === 'Insufficient funds') {
      return res.status(400).json({ success: false, message: 'Insufficient funds' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Failed to submit service request.' });
  }
};
