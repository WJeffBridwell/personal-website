/**
 * Jest Configuration for ES Modules
 */

export default {
  // Test environment
  testEnvironment: 'jsdom',

  // Transform settings
  transform: {},

  // Test setup
  setupFiles: ['<rootDir>/test/env.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/test/**/*.test.js'],

  // Module handling
  moduleFileExtensions: ['js', 'json'],
  moduleDirectories: ['node_modules', 'public/js'],

  // ES Module settings for Jest
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },

  // Module name mapper for ES modules
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'public/js/**/*.js',
    '!public/js/vendor/**',
    '!**/node_modules/**',
  ],
};
