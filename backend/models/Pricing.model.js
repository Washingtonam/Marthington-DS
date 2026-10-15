const mongoose = require("mongoose");

const defaultServiceCatalog = [
  { serviceCode: 'validation-noRecord', category: 'NIN', name: 'No Record', type: 'noRecord', status: 'active', price: 1000, metadata: { description: 'Identify when a NIN record is missing or unavailable.', trending: true, formFields: [
    { key: 'nin', label: 'NIN', type: 'text', required: true, placeholder: 'Enter your 11-digit NIN' },
    { key: 'fullName', label: 'Full name', type: 'text', required: true, placeholder: 'Enter your full name' },
    { key: 'phoneNumber', label: 'Phone number', type: 'text', required: true, placeholder: 'Enter your phone number' },
    { key: 'issueDetails', label: 'What happened?', type: 'textarea', required: false, placeholder: 'Tell us what you need help with' },
  ] } },
  { serviceCode: 'validation-updateRecord', category: 'NIN', name: 'Update Record', type: 'updateRecord', status: 'active', price: 1150, metadata: { description: 'Refresh or reconcile a NIN record before verification.', formFields: [] } },
  { serviceCode: 'validation-validateModification', category: 'NIN', name: 'Validate Modification', type: 'validateModification', status: 'active', price: 1150, metadata: { description: 'Validate a previous modification against the source record.', formFields: [] } },
  { serviceCode: 'validation-vnin', category: 'NIN', name: 'V-NIN Validation', type: 'vnin', status: 'active', price: 1000, metadata: { description: 'Verify a V-NIN linked to a valid NIN record.', trending: true, formFields: [
    { key: 'nin', label: 'NIN', type: 'text', required: true, placeholder: 'Enter your 11-digit NIN' },
    { key: 'vnin', label: 'V-NIN', type: 'text', required: true, placeholder: 'Enter your V-NIN' },
    { key: 'fullName', label: 'Full name', type: 'text', required: true, placeholder: 'Enter your full name' },
    { key: 'phoneNumber', label: 'Phone number', type: 'text', required: false, placeholder: 'Enter your phone number' },
  ] } },
  { serviceCode: 'validation-photoError', category: 'NIN', name: 'Photograph Error', type: 'photoError', status: 'active', price: 1150, metadata: { description: 'Correct a mismatched or incorrect profile photograph.', formFields: [] } },
  { serviceCode: 'validation-bypass', category: 'NIN', name: 'Bypass NIN', type: 'bypass', status: 'active', price: 1150, metadata: { description: 'Handle bypass or exceptional identity review workflows.', formFields: [] } },
  { serviceCode: 'ipe-inProcessingError', category: 'NIN', name: 'In Processing Error', type: 'inProcessingError', status: 'active', price: 1000, metadata: { description: 'Resolve records stuck in processing state.', formFields: [] } },
  { serviceCode: 'ipe-stillProcessing', category: 'NIN', name: 'Still Processing', type: 'stillProcessing', status: 'active', price: 1000, metadata: { description: 'Track and follow up on prolonged enrollment processing.', formFields: [] } },
  { serviceCode: 'ipe-newEnrollment', category: 'NIN', name: 'New Enrollment', type: 'newEnrollment', status: 'active', price: 1000, metadata: { description: 'Support a fresh enrollment or reactivation request.', formFields: [] } },
  { serviceCode: 'ipe-invalidTracking', category: 'NIN', name: 'Invalid Tracking ID', type: 'invalidTracking', status: 'active', price: 1000, metadata: { description: 'Fix invalid or corrupted tracking IDs.', formFields: [] } },
  { serviceCode: 'modification-name', category: 'NIN', name: 'Name Modification', type: 'name', status: 'active', price: 12000, metadata: { description: 'Correct name, surname, or spelling records.', trending: true, formFields: [
    { key: 'nin', label: 'NIN', type: 'text', required: true, placeholder: 'Enter your 11-digit NIN' },
    { key: 'currentName', label: 'Current registered name', type: 'text', required: true, placeholder: 'Enter the name currently on your NIN' },
    { key: 'newName', label: 'Requested full name', type: 'text', required: true, placeholder: 'Enter the requested name' },
    { key: 'reason', label: 'Reason for modification', type: 'textarea', required: true, placeholder: 'Briefly explain the requested change' },
    { key: 'phoneNumber', label: 'Phone number', type: 'text', required: false, placeholder: 'Enter your phone number' },
  ] } },
  { serviceCode: 'modification-phone', category: 'NIN', name: 'Phone Number Modification', type: 'phone', status: 'active', price: 12000, metadata: { description: 'Update the phone number attached to the NIN.', formFields: [] } },
  { serviceCode: 'modification-address', category: 'NIN', name: 'Address Modification', type: 'address', status: 'active', price: 12000, metadata: { description: 'Correct or update the residential address record.', formFields: [] } },
  { serviceCode: 'modification-dob', category: 'NIN', name: 'DOB Modification & NPC Attestation', type: 'dob', status: 'active', price: 65000, metadata: { description: 'Correct date of birth and request NPC attestation support.', trending: true, formFields: [
    { key: 'previousModification', label: 'Have you ever done modification before via NIMC Self-Service Portal?', type: 'select', options: ['Yes', 'No'], required: true },
    { key: 'nin', label: 'NIN', type: 'text', required: true, placeholder: 'Enter NIN (11 digits)' },
    { key: 'surname', label: 'Last Name / Surname', type: 'text', required: true, placeholder: 'Surname' },
    { key: 'firstname', label: 'First Name', type: 'text', required: true, placeholder: 'First name' },
    { key: 'middlename', label: 'Middle Name (Optional)', type: 'text', required: false, placeholder: 'Middle name' },
    { key: 'gsm', label: 'GSM', type: 'text', required: true, placeholder: 'Phone number' },
    { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email address' },
    { key: 'newDob', label: 'New Date of Birth', type: 'date', required: true },
    { key: 'gender', label: 'Gender', type: 'text', required: true, placeholder: 'Gender' },
    { key: 'maritalStatus', label: 'Marital Status', type: 'text', required: true, placeholder: 'Marital status' },
    { key: 'stateOfOrigin', label: 'State of Origin', type: 'text', required: true, placeholder: 'State of origin' },
    { key: 'lgaOfOrigin', label: 'LGA of Origin', type: 'text', required: true, placeholder: 'LGA of origin' },
    { key: 'townOfOrigin', label: 'Town/Village of Origin', type: 'text', required: true, placeholder: 'Town/village of origin' },
    { key: 'placeOfBirth', label: 'Place of Birth', type: 'text', required: true, placeholder: 'Place of birth' },
    { key: 'stateOfBirth', label: 'State of Birth', type: 'text', required: true, placeholder: 'State of birth' },
    { key: 'lgaOfBirth', label: 'LGA of Birth', type: 'text', required: true, placeholder: 'LGA of birth' },
    { key: 'residentState', label: 'Resident State (Birth Registration)', type: 'text', required: true, placeholder: 'Resident state' },
    { key: 'residentLga', label: 'Resident LGA (Birth Registration)', type: 'text', required: true, placeholder: 'Resident LGA' },
    { key: 'nearestCenter', label: 'Nearest Registration Center', type: 'text', required: true, placeholder: 'Nearest registration center' },
    { key: 'fullAddress', label: 'Full House Address', type: 'text', required: true, placeholder: 'Full house address' },
    { key: 'educationLevel', label: 'Education Level', type: 'text', required: true, placeholder: 'Education level' },
    { key: 'occupation', label: 'Occupation', type: 'text', required: true, placeholder: 'Occupation' },
    { key: 'workAddress', label: 'Work Address', type: 'text', required: true, placeholder: 'Work address' },
    { key: 'oldDob', label: 'Old Date of Birth', type: 'date', required: true },
    { key: 'fatherSurname', label: 'Father’s Surname', type: 'text', required: true, placeholder: 'Father’s surname' },
    { key: 'fatherFirstname', label: 'Father’s First Name', type: 'text', required: true, placeholder: 'Father’s first name' },
    { key: 'fatherMiddlename', label: 'Father’s Middle Name (Optional)', type: 'text', required: false, placeholder: 'Father’s middle name' },
    { key: 'fatherStateOfOrigin', label: 'Father’s State of Origin', type: 'text', required: true, placeholder: 'Father’s state of origin' },
    { key: 'fatherLgaOfOrigin', label: 'Father’s LGA of Origin', type: 'text', required: true, placeholder: 'Father’s LGA of origin' },
    { key: 'fatherVillage', label: 'Father’s Village/Town', type: 'text', required: true, placeholder: 'Father’s village/town' },
    { key: 'motherSurname', label: 'Mother’s Surname', type: 'text', required: true, placeholder: 'Mother’s surname' },
    { key: 'motherMaidenName', label: 'Mother’s Maiden Name (Compulsory)', type: 'text', required: true, placeholder: 'Mother’s maiden name' },
    { key: 'motherStateOfOrigin', label: 'Mother’s State of Origin', type: 'text', required: true, placeholder: 'Mother’s state of origin' },
    { key: 'motherLgaOfOrigin', label: 'Mother’s LGA of Origin', type: 'text', required: true, placeholder: 'Mother’s LGA of origin' },
    { key: 'motherVillage', label: 'Mother’s Village/Town', type: 'text', required: true, placeholder: 'Mother’s village/town' },
  ] } },
  { serviceCode: 'personalization-tracking', category: 'NIN', name: 'Tracking ID Search', type: 'tracking', status: 'active', price: 1000, metadata: { description: 'Search and validate a personalization tracking record.', formFields: [] } },
  { serviceCode: 'self-service-emailRetrieval', category: 'NIN', name: 'Email Retrieval', type: 'emailRetrieval', status: 'active', price: 1500, metadata: { description: 'Recover email details linked to a self-service account.', formFields: [] } },
  { serviceCode: 'self-service-deviceUnlink', category: 'NIN', name: 'Device Unlink', type: 'deviceUnlink', status: 'active', price: 2000, metadata: { description: 'Unlink a device from the NIMC self-service account.', formFields: [] } },
  { serviceCode: 'cac-sole-proprietorship', category: 'CAC', name: 'Sole Proprietorship', type: 'sole_proprietorship', status: 'active', price: 28000, metadata: { description: 'Register a sole proprietorship in the CAC registry.', formFields: [] } },
  { serviceCode: 'cac-partnership', category: 'CAC', name: 'Business Partnership', type: 'partnership', status: 'active', price: 32000, metadata: { description: 'Set up a registered-business partnership with CAC.', formFields: [] } },
  { serviceCode: 'cac-limited-company', category: 'CAC', name: 'Limited Company', type: 'limited_1m', status: 'active', price: 40000, metadata: { description: 'Register a limited liability company with CAC support.', formFields: [] } },
];

const catalogFallback = [...defaultServiceCatalog];

const normalizeCategorySlug = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-')
  .replace(/^nin$/, 'nimc');

const normalizeCategory = (category = {}) => {
  const label = String(category.label || category.name || category.slug || '').trim();
  const slug = normalizeCategorySlug(category.slug || label);
  return {
    slug,
    label: slug === 'nimc' ? 'NIMC' : (label || slug.toUpperCase()),
    isActive: category.isActive !== false,
  };
};

const getCategoriesFromCatalog = (catalog = [], categories = []) => {
  const merged = new Map();

  (Array.isArray(categories) ? categories : []).forEach((category) => {
    const normalized = normalizeCategory(category);
    if (normalized.slug) merged.set(normalized.slug, normalized);
  });

  (Array.isArray(catalog) ? catalog : []).forEach((service) => {
    const normalized = normalizeCategory({ label: service?.category });
    if (normalized.slug && !merged.has(normalized.slug)) merged.set(normalized.slug, normalized);
  });

  return [...merged.values()];
};

const LEGACY_GENERIC_SERVICE_CODES = new Set([
  'nin-verification',
  'phone-verification',
  'tracking-verification',
  'demographic-verification',
]);

const normalizeCatalogService = (service = {}, fallback = {}) => {
  const serviceData = typeof service?.toObject === 'function' ? service.toObject() : service;
  const fallbackData = typeof fallback?.toObject === 'function' ? fallback.toObject() : fallback;
  const serviceCode = String(serviceData.serviceCode || fallbackData.serviceCode || '').trim();
  const configuredFields = Array.isArray(serviceData.metadata?.formFields) ? serviceData.metadata.formFields : [];
  const fallbackFields = fallbackData.metadata?.formFields || [];
  const legacyDobFieldKeys = new Set(['nin', 'fullName', 'currentDob', 'newDob', 'reason']);
  const hasLegacyDobForm = serviceCode === 'modification-dob'
    && configuredFields.length > 0
    && configuredFields.every((field) => legacyDobFieldKeys.has(field.key));
  let formFields = configuredFields.length && !hasLegacyDobForm ? configuredFields : fallbackFields;
  if (serviceCode === 'modification-dob' && configuredFields.length && !hasLegacyDobForm) {
    const configuredKeys = new Set(formFields.map((field) => field.key));
    formFields = [
      ...formFields,
      ...fallbackFields.filter((field) => !configuredKeys.has(field.key)),
    ];
  }

  return {
    ...fallbackData,
    ...serviceData,
    serviceCode,
    category: normalizeCategory({ label: serviceData.category || fallbackData.category || 'NIMC' }).label,
    name: String(serviceData.name || fallbackData.name || '').trim() || 'Unnamed Service',
    type: String(serviceData.type || fallbackData.type || '').trim(),
    status: ['active', 'paused', 'disabled'].includes(serviceData.status || fallbackData.status) ? (serviceData.status || fallbackData.status) : 'active',
    price: Number(serviceData.price ?? fallbackData.price ?? 0) || 0,
    cost: serviceData.cost == null && fallbackData.cost == null
      ? null
      : Math.max(Number(serviceData.cost ?? fallbackData.cost), 0),
    metadata: {
      ...(fallbackData.metadata || {}),
      ...(serviceData.metadata || {}),
      formFields,
    },
  };
};

const normalizeServiceCatalog = (catalog = []) => {
  const merged = new Map();

  defaultServiceCatalog.forEach((service) => {
    merged.set(service.serviceCode, normalizeCatalogService(service));
  });

  (Array.isArray(catalog) ? catalog : []).forEach((service) => {
    const code = String(service?.serviceCode || '').trim();
    if (!code || LEGACY_GENERIC_SERVICE_CODES.has(code)) return;
    merged.set(code, normalizeCatalogService(service, merged.get(code) || {}));
  });

  return [...merged.values()].map((service) => normalizeCatalogService(service));
};

const pricingSchema = new mongoose.Schema({
  categories: {
    type: [{
      slug: { type: String, required: true },
      label: { type: String, required: true },
      isActive: { type: Boolean, default: true },
    }],
    default: [],
  },
  serviceCatalog: {
    type: [{
      serviceCode: { type: String, required: true },
      category: { type: String, default: 'NIN' },
      name: { type: String, required: true },
      type: { type: String, default: '' },
      status: { type: String, enum: ['active', 'paused', 'disabled'], default: 'active' },
      price: { type: Number, default: 0 },
      cost: { type: Number, default: null, min: 0 },
      commissionType: { type: String, enum: ['FLAT', 'PERCENTAGE'], default: undefined },
      commissionValue: { type: Number, min: 0, default: undefined },
      metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    }],
    default: () => defaultServiceCatalog,
  },
  platformServices: {
    verifyNin: {
      enabled: { type: Boolean, default: true },
    },
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
      dob: { type: Number, default: 65000 },
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
    pricing = await this.create({
      categories: getCategoriesFromCatalog(defaultServiceCatalog),
      serviceCatalog: defaultServiceCatalog,
    });
  } else {
    const normalizedCatalog = normalizeServiceCatalog(pricing.serviceCatalog);
    const normalizedCategories = getCategoriesFromCatalog(normalizedCatalog, pricing.categories);
    pricing.serviceCatalog = normalizedCatalog;
    pricing.categories = normalizedCategories;
  }
  return pricing;
};

pricingSchema.statics.getDefaultServiceCatalog = function () {
  return catalogFallback.map((service) => normalizeCatalogService(service));
};

pricingSchema.statics.replaceServiceCatalog = function (catalog) {
  const nextCatalog = normalizeServiceCatalog(Array.isArray(catalog) ? catalog : [...defaultServiceCatalog]);
  catalogFallback.splice(0, catalogFallback.length, ...nextCatalog.map((service) => ({
    ...service,
    category: normalizeCategory({ label: service.category || 'NIMC' }).label,
    type: String(service.type || '').trim(),
    status: ['active', 'paused', 'disabled'].includes(service.status) ? service.status : 'active',
    price: Number(service.price) || 0,
    metadata: service.metadata || {},
  })));
  return [...catalogFallback];
};

pricingSchema.statics.getServiceCatalog = async function () {
  const pricing = await this.getPricing();
  const catalog = Array.isArray(pricing?.serviceCatalog) && pricing.serviceCatalog.length
    ? pricing.serviceCatalog
    : [...catalogFallback];

  return normalizeServiceCatalog(catalog).map((service) => ({
    ...service,
    category: normalizeCategory({ label: service.category || 'NIMC' }).label,
    type: String(service.type || '').trim(),
    status: ['active', 'paused', 'disabled'].includes(service.status) ? service.status : 'active',
    price: Number(service.price) || 0,
    metadata: service.metadata || {},
  }));
};

pricingSchema.statics.getCategories = async function () {
  const pricing = await this.getPricing();
  return getCategoriesFromCatalog(pricing?.serviceCatalog, pricing?.categories);
};

pricingSchema.statics.normalizeCategorySlug = normalizeCategorySlug;
pricingSchema.statics.normalizeCategory = normalizeCategory;

module.exports = mongoose.models.Pricing || mongoose.model("Pricing", pricingSchema);