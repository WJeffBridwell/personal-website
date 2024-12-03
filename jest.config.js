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
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/test/__mocks__/fileMock.js'
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill)'
  ],
  
  // Test environment settings
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
    url: 'http://localhost/',
    resources: 'usable',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  },
  globals: {
    TextEncoder,
    TextDecoder
  },
  
  // Prevent environment teardown issues
  injectGlobals: true,
  testTimeout: 10000,
  maxWorkers: '50%'
}
