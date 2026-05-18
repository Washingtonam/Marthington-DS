const mongoose = require("mongoose");

const pricingSchema = new mongoose.Schema({
  // ==============================
  // 🆔 NIN PRICING (UNITS ONLY)
  // ==============================
  nin: {
    mode: {
      type: String,
      enum: ["bundle", "single"],
      default: "bundle",
    },

    unitPrice: {
      type: Number,
      required: true,
      default: 250,
      min: 1,
    },

    agentPrice: {
      type: Number,
      default: 150,
      min: 1,
    },
  },

  // ==============================
  // 🔥 NIN SERVICES (DIRECT PAYMENT)
  // ==============================
  ninServices: {

    // =========================
    // VALIDATION & PERSONALIZATION
    // =========================
    validation: {
      noRecord: { type: Number, default: 1000 },
      updateRecord: { type: Number, default: 1150 },
      validateModification: { type: Number, default: 1150 },
      vnin: { type: Number, default: 1000 },
      photoError: { type: Number, default: 1150 },
      bypass: { type: Number, default: 1150 },
      tracking: { type: Number, default: 1000 }, // 🔥 FIXED: Added tracking directly into validation layer properties
    },

    // =========================
    // IPE CLEARANCE
    // =========================
    ipe: {
      inProcessingError: { type: Number, default: 1000 },
      stillProcessing: { type: Number, default: 1000 },
      newEnrollment: { type: Number, default: 1000 },
      invalidTracking: { type: Number, default: 1000 },
    },

    // =========================
    // 🔥 MODIFICATION (NEW)
    // =========================
    modification: {
      name: { type: Number, default: 12000 },
      phone: { type: Number, default: 12000 },
      address: { type: Number, default: 12000 },
      dob: { type: Number, default: 50000 },
    },

    // =========================
    // SLIP PRICE
    // =========================
    slipPrice: {
      type: Number,
      default: 150,
    },
  },

  // ==============================
  // 🏦 BVN PRICING
  // ==============================
  bvn: {
    unitPrice: {
      type: Number,
      default: 200,
      min: 1,
    },
  },

  // ==============================
  // 🏢 CAC SERVICES PRICING
  // ==============================
  cacServices: {
    soleProprietorship: { 
      type: Number, 
      default: 28000,
      min: 0
    },
    partnership: { 
      type: Number, 
      default: 32000,
      min: 0
    },
    limited1M: { 
      type: Number, 
      default: 40000,
      min: 0
    }
  },

}, {
  timestamps: true,
});

// ==============================
// 🔥 ENSURE SINGLE DOCUMENT ONLY
// ==============================
pricingSchema.statics.getPricing = async function () {
  let pricing = await this.findOne();

  if (!pricing) {
    pricing = await this.create({});
  }

  return pricing;
};

module.exports = mongoose.model("Pricing", pricingSchema);