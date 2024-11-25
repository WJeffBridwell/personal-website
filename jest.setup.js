// Set up JSDOM environment properly
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    referrer: 'http://localhost',
    contentType: 'text/html',
    includeNodeLocations: true,
    storageQuota: 10000000,
    pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = {
    userAgent: 'node.js',
};

// Mock Performance API
global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn().mockReturnValue([]),
    getEntriesByType: jest.fn().mockReturnValue([]),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
};

// Mock window.scrollTo
global.window.scrollTo = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
};

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = id => clearTimeout(id);

// Cleanup helper
afterEach(() => {
    // Clean up the body after each test
    document.body.innerHTML = '';
    jest.clearAllMocks();
});
