// ========================================================
// Test Setup - MongoDB Connection & Teardown
// ========================================================

process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nin-test';

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
