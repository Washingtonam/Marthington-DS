const mongoose = require('mongoose');

const bulkJobSchema = new mongoose.Schema({
  action: { type: String, required: true },
  ids: [{ type: mongoose.Schema.Types.ObjectId }],
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  total: { type: Number, default: 0 },
  processed: { type: Number, default: 0 },
  errors: [{ type: String }],
  result: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startedAt: Date,
  finishedAt: Date
}, { timestamps: true });

module.exports = mongoose.models.BulkJob || mongoose.model('BulkJob', bulkJobSchema);
