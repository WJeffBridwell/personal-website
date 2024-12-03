import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';
import { JSDOM } from 'jsdom';
import '@testing-library/jest-dom';
import { expect } from '@jest/globals';

// Create a new JSDOM instance with improved configuration
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="gallery"></div><div id="search-container"></div></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  runScripts: 'dangerously',
  resources: 'usable'
});

// Set up global document and window
global.document = dom.window.document;
global.window = dom.window;
global.navigator = {
  userAgent: 'node.js',
  platform: 'darwin'  // For macOS specific tests
};

// Add missing DOM APIs
global.window.HTMLElement.prototype.scrollIntoView = jest.fn();
global.window.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Set up TextEncoder/Decoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set up fetch mock with improved responses
global.fetch = jest.fn((url) => {
  // Mock gallery images endpoint
  if (url === '/api/images') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        images: [
          { name: 'test1.jpg', url: '/test1.jpg' },
          { name: 'test2.jpg', url: '/test2.jpg' }
        ]
      })
    });
  }
  
  // Mock finder search endpoint
  if (url.startsWith('/gallery/finder-search')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        searchTerm: url.split('term=')[1],
        images: []
      })
    });
  }

  // Mock error cases
  if (url.includes('error')) {
    return Promise.reject(new Error('Network error'));
  }

  // Default response for unknown endpoints
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ error: 'Not found' })
  });
});

// Mock console methods with better error tracking
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Set up basic DOM elements that should exist in all tests
beforeEach(() => {
  // Clear any previous document content
  document.body.innerHTML = `
    <div id="image-grid"></div>
    <div id="modal"></div>
    <input type="text" id="search-input" />
    <div id="letter-filter"></div>
  `;
  
  // Reset any mocked functions
  jest.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  document.body.innerHTML = '';
  jest.clearAllMocks();
  document.getElementById('gallery').innerHTML = '';
  document.getElementById('search-container').innerHTML = '';
});

// Mock window object
Object.defineProperty(window, 'history', {
  value: {
    pushState: jest.fn(),
    replaceState: jest.fn(),
    back: jest.fn(),
    forward: jest.fn()
  },
  writable: true
});

// Make expect available globally
global.expect = expect;
