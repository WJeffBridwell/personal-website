/**
 * Jest Configuration File
 * Configures Jest testing framework settings for the project
 * Includes setup for DOM testing, code coverage, and module transformations
 */

export default {
    // Use jsdom for browser-like environment in Node.js
    testEnvironment: 'jsdom',

    // Configure file transformations
    transform: {
        '^.+\\.js$': './test/transformer.js'  // Transform JavaScript files using custom transformer
    },

    // Handle non-JavaScript assets
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'  // Mock CSS imports
    },

    // Test environment setup
    setupFilesAfterEnv: ['./test/jest.setup.js'],  // Run setup after environment is created
    testMatch: ['**/test/**/*.test.js'],           // Pattern to find test files

    // Code coverage configuration
    collectCoverage: true,                         // Enable coverage collection
    coverageDirectory: 'coverage',                 // Output directory for coverage reports
    coverageReporters: ['text', 'lcov'],          // Coverage report formats

    // Testing behavior
    verbose: true,                                 // Display detailed test output

    // Module resolution
    transformIgnorePatterns: [
        'node_modules/(?!(jsdom|tough-cookie)/)'   // Transform files from specific node_modules
    ],
    moduleFileExtensions: ['js', 'mjs'],          // File extensions to process

    // Environment-specific options
    testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons']  // Node.js-specific export conditions
    }
};
