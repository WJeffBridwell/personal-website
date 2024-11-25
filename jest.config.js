export default {
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.js$': './test/transformer.js'
    },
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
    },
    setupFilesAfterEnv: ['./test/jest.setup.js'],
    testMatch: ['**/test/**/*.test.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    verbose: true,
    transformIgnorePatterns: [
        'node_modules/(?!(jsdom|tough-cookie)/)'
    ],
    moduleFileExtensions: ['js', 'mjs'],
    testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons']
    }
};
