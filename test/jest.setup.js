/**
 * Jest Test Setup Configuration
 * This file configures the test environment by setting up necessary mocks and polyfills
 * for browser APIs that are not available in the Jest environment.
 */

// Import required testing libraries and utilities
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';

/**
 * Text Encoding Polyfills
 * Provides TextEncoder and TextDecoder implementations for handling text encoding
 * operations in the test environment
 */
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder;
}

/**
 * Window.matchMedia Mock
 * Provides a mock implementation of the window.matchMedia API
 * Used for testing media query functionality
 */
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),    // Deprecated but included for backwards compatibility
        removeListener: jest.fn(),  // Deprecated but included for backwards compatibility
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

/**
 * IntersectionObserver Mock
 * Provides a mock implementation of the IntersectionObserver API
 * Used for testing elements' visibility and scroll-based functionality
 */
class IntersectionObserver {
    constructor() {
        this.observe = jest.fn();     // Mock observe method
        this.unobserve = jest.fn();   // Mock unobserve method
        this.disconnect = jest.fn();   // Mock disconnect method
    }
}

// Register the IntersectionObserver mock globally
Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserver,
});

/**
 * Window.scrollTo Mock
 * Provides a mock implementation of the window.scrollTo method
 * Used for testing scroll behavior
 */
window.scrollTo = jest.fn();
