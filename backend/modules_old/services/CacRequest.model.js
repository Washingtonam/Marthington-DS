const mongoose = require("mongoose");

const ProprietorSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { type: String, required: true },
  phone: { type: String, required: true },
  nin: { type: String, required: true },
  email: { type: String },
  state: { type: String },
  lga: { type: String },
  address: { type: String },
  signature: { type: String, required: false },
  passport: { type: String, required: false }
});

const CacRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  serviceType: { 
    type: String, 
    required: true, 
    enum: ["sole_proprietorship", "partnership", "limited_1m", "custom_ngo"] 
  },
  amountCharged: { type: Number, required: true },
  serviceCategory: { type: String, enum: ["CAC", "NIMC"], default: "CAC" },
  
  // Business Core Information Block
  businessName1: { type: String, required: true },
  businessName2: { type: String, required: true },
  companyEmail: { type: String, required: true },
  companyPhone: { type: String },
  category: { type: String, required: true },
  state: { type: String, required: true },
  lga: { type: String, required: true },
  shopNo: { type: String },
  streetAddress: { type: String, required: true },

  proprietors: [ProprietorSchema],
  
  witness: {
    fullName: String,
    dob: Date,
    gender: String,
    phone: String,
    nin: String,
    email: String,
    state: String,
    lga: String,
    address: String,
    signature: String,
    passport: String
  },
  
  secretary: {
    fullName: String,
    phone: String,
    email: String,
    nin: String
  },

  status: { 
    type: String, 
    default: "pending", 
    enum: ["pending", "processing", "completed", "rejected", "failed"] 
  },
  progressNotes: { type: String, default: "Awaiting administrative document review" },

  statusHistory: [
    {
      status: { type: String },
      note: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.models.CacRequest || mongoose.model("CacRequest", CacRequestSchema);