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