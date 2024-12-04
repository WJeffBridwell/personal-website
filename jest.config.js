/**
 * Jest Configuration
 */

import { TextEncoder, TextDecoder } from 'util';

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
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  }
}
