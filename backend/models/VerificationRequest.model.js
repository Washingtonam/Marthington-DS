const mongoose = require('mongoose');

const VerificationRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requestType: {
    type: String,
    default: 'verification',
  },
  method: {
    type: String,
    required: true,
  },
  nin: {
    type: String,
    default: 'N/A',
  },
  phone: {
    type: String,
    default: 'N/A',
  },
  trackingId: {
    type: String,
    default: 'N/A',
  },
  firstname: {
    type: String,
    default: 'N/A',
  },
  surname: {
    type: String,
    default: 'N/A',
  },
  gender: {
    type: String,
    default: 'N/A',
  },
  birthdate: {
    type: String,
    default: 'N/A',
  },
  unitsUsed: {
    type: Number,
    default: 0,
  },
  amount: {
    type: Number,
    default: 0,
  },
  amountKobo: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'processing', 'approved', 'completed', 'rejected', 'failed'],
    default: 'completed',
  },
  apiResponseData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  statusHistory: [
    {
      status: { type: String },
      note: { type: String },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  adminComments: [
    {
      comment: { type: String },
      author: { type: String },
      createdAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.models.VerificationRequest || mongoose.model('VerificationRequest', VerificationRequestSchema);
