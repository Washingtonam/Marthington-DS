const mongoose = require("mongoose");

const defaultServiceCatalog = [
  { serviceCode: 'nin-verification', category: 'NIN', name: 'NIN Verification', status: 'active', price: 250 },
  { serviceCode: 'phone-verification', category: 'NIN', name: 'Phone Verification', status: 'active', price: 250 },
  { serviceCode: 'tracking-verification', category: 'NIN', name: 'Tracking ID Verification', status: 'active', price: 250 },
  { serviceCode: 'demographic-verification', category: 'NIN', name: 'Demographic Verification', status: 'active', price: 250 },
  { serviceCode: 'cac-sole-proprietorship', category: 'CAC', name: 'Sole Proprietorship', status: 'active', price: 28000 },
  { serviceCode: 'cac-partnership', category: 'CAC', name: 'Partnership', status: 'active', price: 32000 },
  { serviceCode: 'cac-limited-1m', category: 'CAC', name: 'Limited Company', status: 'active', price: 40000 },
];

const pricingSchema = new mongoose.Schema({
  serviceCatalog: {
    type: [{
      serviceCode: { type: String, required: true },
      category: { type: String, default: 'NIN' },
      name: { type: String, required: true },
      status: { type: String, enum: ['active', 'paused', 'disabled'], default: 'active' },
      price: { type: Number, default: 0 },
      metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    }],
    default: () => defaultServiceCatalog,
  },

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
      tracking: { type: Number, default: 1000 }, 
    },

    // =========================
    // 🔥 FIXED: SELF-SERVICE SUBSURFACE OBJECT
    // =========================
    selfService: {
      emailRetrieval: { type: Number, default: 1500 },
      deviceUnlink: { type: Number, default: 2000 },
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
    // MODIFICATION
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
    soleProprietorship: { type: Number, default: 28000, min: 0 },
    partnership: { type: Number, default: 32000, min: 0 },
    limited1M: { type: Number, default: 40000, min: 0 }
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
    pricing = await this.create({ serviceCatalog: defaultServiceCatalog });
  }
  return pricing;
};

pricingSchema.statics.getDefaultServiceCatalog = function () {
  return defaultServiceCatalog;
};

pricingSchema.statics.getServiceCatalog = async function () {
  const pricing = await this.getPricing();
  return pricing.serviceCatalog && pricing.serviceCatalog.length
    ? pricing.serviceCatalog
    : defaultServiceCatalog;
};

module.exports = mongoose.models.Pricing || mongoose.model("Pricing", pricingSchema);