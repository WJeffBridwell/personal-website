import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';

// Set up TextEncoder and TextDecoder
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder;
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock IntersectionObserver
class IntersectionObserver {
    constructor() {
        this.observe = jest.fn();
        this.unobserve = jest.fn();
        this.disconnect = jest.fn();
    }
}

Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserver,
});

// Mock window.scrollTo
window.scrollTo = jest.fn();
