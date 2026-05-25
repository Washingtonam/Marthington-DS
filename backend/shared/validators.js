const Joi = require("joi");

// Nigerian phone number pattern (11 digits starting with 0 or +234)
const nigerianPhoneRegex = /^(\+234|0)[789]\d{9}$/;

/**
 * 1. NIN & Identity Validation
 */
const validateNin = Joi.object({
  nin: Joi.string()
    .length(11)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'NIN must be exactly 11 digits',
      'string.pattern.base': 'NIN must contain only numbers'
    }),
  firstName: Joi.string().min(2).trim().required(),
  lastName: Joi.string().min(2).trim().required(),
  dob: Joi.string().required()
});

const validateVerification = Joi.object({
  method: Joi.string().valid('nin', 'phone', 'tracking', 'demographic').required(),
  nin: Joi.string().when('method', { is: 'nin', then: Joi.required() }),
  phone: Joi.string()
    .pattern(nigerianPhoneRegex)
    .when('method', { is: 'phone', then: Joi.required() })
    .messages({
      'string.pattern.base': 'Invalid Nigerian phone number format'
    }),
  tracking_id: Joi.string().when('method', { is: 'tracking', then: Joi.required() }),
  firstname: Joi.string().trim().when('method', { is: 'demographic', then: Joi.required() }),
  surname: Joi.string().trim().when('method', { is: 'demographic', then: Joi.required() }),
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .when('method', { is: 'demographic', then: Joi.required() })
    .messages({
      'any.only': 'Gender must be male, female, or other'
    }),
  birthdate: Joi.string().when('method', { is: 'demographic', then: Joi.required() })
});

/**
 * 2. General Service & CAC Validation
 */
const validateServiceRequest = Joi.object({
  service: Joi.string().required(),
  type: Joi.string().required(),
  nin: Joi.string().optional().allow('N/A', ''),
  slipType: Joi.string().optional(),
  proof: Joi.string().optional(),
  passport: Joi.string().optional(),
  formData: Joi.object().optional()
});

const validateCacRegistration = Joi.object({
  serviceType: Joi.string().valid('sole_proprietorship', 'partnership', 'limited_1m', 'custom_ngo').required(),
  businessName1: Joi.string().min(3).trim().required(),
  businessName2: Joi.string().min(3).trim().required(),
  companyEmail: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format'
    }),
  companyPhone: Joi.string()
    .pattern(nigerianPhoneRegex)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Nigerian phone number format'
    }),
  category: Joi.string().required(),
  state: Joi.string().required(),
  lga: Joi.string().required(),
  shopNo: Joi.string().optional().allow(''),
  streetAddress: Joi.string().required(),
  proprietors: Joi.array().items(Joi.object()).required(),
  witness: Joi.object().optional(),
  secretary: Joi.object().optional()
});

module.exports = { 
  validateNin, 
  validateVerification, 
  validateServiceRequest, 
  validateCacRegistration 
};