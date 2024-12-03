import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Add custom matchers
expect.extend({
    toBeVisible(received) {
        if (!received || typeof received.style === 'undefined') {
            return {
                message: () => `expected ${received} to be visible but it does not exist or is not an element`,
                pass: false
            };
        }
        
        const computedStyle = window.getComputedStyle(received);
        const isVisible = computedStyle.display !== 'none' && 
                         computedStyle.visibility !== 'hidden' &&
                         computedStyle.opacity !== '0';

        return {
            message: () => `expected ${received} ${isVisible ? 'not ' : ''}to be visible`,
            pass: isVisible
        };
    },
    toHaveTextContent(received, text) {
        if (!received || typeof received.textContent === 'undefined') {
            return {
                message: () => `expected ${received} to have text content but it does not exist or is not an element`,
                pass: false
            };
        }

        const hasText = received.textContent.includes(text);
        return {
            message: () => `expected ${received} ${hasText ? 'not ' : ''}to have text content "${text}"`,
            pass: hasText
        };
    }
});

// Mock fetch globally
global.fetch = jest.fn(() => 
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
    })
);

// Mock IntersectionObserver
class IntersectionObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
}
global.IntersectionObserver = IntersectionObserver;

// Mock ResizeObserver
class ResizeObserver {
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
}
global.ResizeObserver = ResizeObserver;

// Mock window.matchMedia
global.matchMedia = jest.fn(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
}));

// Mock performance API
global.performance = {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    now: jest.fn(() => Date.now())
};

// Mock requestAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = id => clearTimeout(id);

// Mock window.crypto
global.crypto = {
    subtle: {
        digest: jest.fn()
    },
    getRandomValues: jest.fn()
};

// Mock Element.prototype methods
if (typeof Element !== 'undefined') {
    Element.prototype.scrollIntoView = jest.fn();
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100
    }));
}

// Configure JSDOM
if (global.document) {
    document.createRange = () => ({
        setStart: () => {},
        setEnd: () => {},
        commonAncestorContainer: {
            nodeName: 'BODY',
            ownerDocument: document
        },
        createContextualFragment: str => {
            const div = document.createElement('div');
            div.innerHTML = str;
            return div.children[0];
        }
    });
}

// Add missing DOM APIs
if (global.window) {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    window.HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100
    }));
}

// Mock console methods to avoid noise in tests
global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn()
};
