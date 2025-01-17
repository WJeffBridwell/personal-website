# Jest Testing Architecture

## Overview
The project uses Jest as its primary testing framework, configured for ES Modules (ESM) with comprehensive browser API mocking. The test suite is organized by feature components and includes unit tests, integration tests, and performance benchmarks.

## Configuration Structure

### Core Configuration Files
- `jest.config.js`: Main Jest configuration using ESM format
- `jest.setup.js`: Global test setup and mock implementations
- `babel.config.js`: Babel configuration for ES Modules

### Test Environment
- Uses `jsdom` for browser environment simulation
- Configured with experimental VM modules for ESM support
- Custom environment setup in `test/custom-environment.js`

## Directory Structure

```
test/
├── __mocks__/           # Jest automatic mocks
├── mocks/               # Custom mock implementations
│   ├── IntersectionObserver.js
│   ├── ResizeObserver.js
│   ├── LocalStorage.js
│   └── SessionStorage.js
├── perf_reports/        # Performance test results
├── utils/              # Test utilities
├── *.test.js           # Test files
├── env.js              # Environment setup
├── helpers.js          # Test helper functions
├── register.js         # Test registration
└── setup.js            # Test-specific setup
```

## Key Testing Components

### Browser API Mocks
- IntersectionObserver
- ResizeObserver
- LocalStorage/SessionStorage
- Window methods (matchMedia, history, requestAnimationFrame)
- DOM APIs (scrollIntoView, getBoundingClientRect)
- Fetch API
- Crypto API

### Test Categories
1. **Component Tests**
   - content-gallery.test.js
   - content-player.test.js
   - modal.test.js
   - gallery.test.js

2. **Core Functionality**
   - core-helpers.test.js
   - dom-helpers.test.js
   - gallery-core.test.js
   - gallery-helpers.test.js

3. **Integration Tests**
   - gallery-routes.test.js
   - image-loading-flow.test.js

4. **Performance Tests**
   - performance.test.js
   - Stored reports in perf_reports/

### Helper Utilities
- `helpers.js`: Common test utilities
- `test-helpers.test.js`: Tests for the helper functions
- `baseline_metrics.json`: Performance benchmarks

## Test Execution

### NPM Scripts
```json
"scripts": {
  "test": "NODE_OPTIONS='--experimental-vm-modules --experimental-global-webcrypto' jest",
  "test:watch": "NODE_OPTIONS='--experimental-vm-modules --experimental-global-webcrypto' jest --watch"
}
```

### Key Features
- ESM support via experimental Node.js flags
- Watch mode for development
- Global webcrypto for crypto API mocking
- Automatic mock cleanup between tests
- Custom test environment configuration

## Best Practices

### Mock Implementation
- Browser APIs are mocked globally in jest.setup.js
- Complex objects (IntersectionObserver, ResizeObserver) have dedicated mock files
- DOM manipulation is tested through jsdom simulation

### Test Organization
- Tests are co-located with related components
- Consistent naming convention: `*.test.js`
- Separate performance testing infrastructure
- Shared utilities for common testing operations

### Performance Testing
- Baseline metrics stored in JSON format
- Automated performance regression testing
- Custom performance test environment

## Future Improvements
1. Consider adding snapshot testing for UI components
2. Implement E2E testing with Playwright or Cypress
3. Add code coverage reporting
4. Enhance performance testing metrics
