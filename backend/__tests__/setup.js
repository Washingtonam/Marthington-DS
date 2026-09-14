// ========================================================
// Test Setup - MongoDB Connection & Teardown
// ========================================================

process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nin-test';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test_resend_key';
process.env.FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY || 'test_public_key';
process.env.FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || 'test_secret_key';
process.env.FLW_SECRET_HASH = process.env.FLW_SECRET_HASH || 'test_secret_hash';
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'test-cloud';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'test_api_key';
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'test_api_secret';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

require('dotenv').config({ path: `${__dirname}/../.env` });

// Suppress mongoose deprecation warnings in tests
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

/**
 * Global test setup/teardown hooks
 */

beforeAll(async () => {
  // MongoDB connection already established by requiring models
  // This hook can be extended for pre-test setup
  jest.setTimeout(30000);
});

afterAll(async () => {
  // Clean disconnect from MongoDB
  await mongoose.disconnect();
});

// Global test timeout
jest.setTimeout(30000);
