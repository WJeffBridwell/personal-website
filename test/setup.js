import { TextDecoder } from 'util';
import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';

// Set up TextDecoder before any other imports
if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder;
}

// Create a new JSDOM instance
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    contentType: 'text/html',
    includeNodeLocations: true,
    storageQuota: 10000000,
    runScripts: 'dangerously'
});

// Set up a global document and window
global.document = dom.window.document;
global.window = dom.window;

// Copy properties from window to global
Object.keys(dom.window).forEach(property => {
    if (typeof global[property] === 'undefined') {
        global[property] = dom.window[property];
    }
});

// Mock document methods properly
document.createElement = function(tag) {
    return dom.window.document.createElement(tag);
};

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now())
};

// Mock window.performance
Object.defineProperty(window, 'performance', {
    value: {
        memory: {
            usedJSHeapSize: 50 * 1024 * 1024 // 50MB
        },
        now: jest.fn(() => Date.now())
    },
    writable: true
});

// Mock window.requestAnimationFrame
window.requestAnimationFrame = callback => {
    return setTimeout(() => callback(performance.now()), 0);
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock fetch API
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ images: [] })
    })
);

// Basic test to ensure setup is working
describe('Test Environment Setup', () => {
    test('Browser APIs are properly mocked', () => {
        expect(global.performance.now).toBeDefined();
        expect(global.document).toBeDefined();
        expect(global.window).toBeDefined();
    });
});
