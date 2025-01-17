import { jest } from '@jest/globals';

import { JSDOM } from 'jsdom';

// Set up global TextEncoder and TextDecoder before importing JSDOM
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable',
});

// Set up global DOM environment
global.window = dom.window;
global.document = dom.window.document;
global.navigator = {
  userAgent: 'node.js',
};

// Set up DOM APIs
global.HTMLElement = dom.window.HTMLElement;
global.HTMLDivElement = dom.window.HTMLDivElement;
global.CustomEvent = dom.window.CustomEvent;
global.Event = dom.window.Event;
global.Image = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
    this.width = 0;
    this.height = 0;
  }
};

beforeEach(() => {
  // Mock video methods
  jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => Promise.resolve());
  jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  jest.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});

  // Mock video properties
  Object.defineProperties(window.HTMLMediaElement.prototype, {
    paused: { value: true, writable: true },
    currentTime: { value: 0, writable: true },
    duration: { value: 0, writable: true },
    volume: { value: 1, writable: true },
    muted: { value: false, writable: true },
    playbackRate: { value: 1, writable: true },
    readyState: { value: 0, writable: true },
    preload: { value: 'auto', writable: true },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Add localStorage mock
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Add fetch mock
global.fetch = jest.fn();

// Add URL mock
global.URL = dom.window.URL;

// Add requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Add IntersectionObserver mock
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}

  observe() {}

  unobserve() {}

  disconnect() {}
};

// Add ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
  constructor() {}

  observe() {}

  unobserve() {}

  disconnect() {}
};

// Add KeyboardEvent and MouseEvent
global.KeyboardEvent = dom.window.KeyboardEvent;
global.MouseEvent = dom.window.MouseEvent;

// Add missing DOM testing library matchers
expect.extend({
  toBeVisible(received) {
    const pass = received && !received.classList.contains('hidden');
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be visible`,
      pass,
    };
  },
  toHaveClass(received, className) {
    const pass = received && received.classList.contains(className);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to have class "${className}"`,
      pass,
    };
  },
  toHaveTextContent(received, expected) {
    const pass = received && received.textContent === expected;
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to have text content "${expected}"`,
      pass,
    };
  },
});
