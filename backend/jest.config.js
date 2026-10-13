// ========================================================
// Jest Configuration - Atomic Transaction Testing
// ========================================================

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  verbose: true,
  testTimeout: 30000, // 30 seconds (for DB operations)
  forceExit: true,
  detectOpenHandles: true,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'shared/**/*.js',
    '!**/*.test.js',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
};
