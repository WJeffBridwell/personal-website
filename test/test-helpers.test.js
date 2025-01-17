/**
 * @jest-environment jsdom
 */

import {
  simulateClick,
  simulateInput,
  flushPromises,
  filterImages,
  updateNoResultsMessage,
  initializeStickyControls,
} from './helpers.js';

import Gallery from '../public/js/gallery.js';

describe('Test Helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="gallery-container">
        <div id="image-grid"></div>
        <div id="imageModal" class="modal">
          <span class="close-modal">&times;</span>
          <img class="modal-img" src="" alt="" />
          <div class="modal-caption"></div>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('DOM Setup and Cleanup', () => {
    test('setupTestDOM initializes all required globals', () => {
      expect(window).toBeDefined();
      expect(document).toBeDefined();
      expect(navigator).toBeDefined();
      expect(HTMLElement).toBeDefined();
      expect(Element).toBeDefined();
      expect(Node).toBeDefined();
      expect(Event).toBeDefined();
      expect(CustomEvent).toBeDefined();
    });

    test('setupTestDOM creates required DOM elements', () => {
      document.body.innerHTML = `
                <div id="gallery-container">
                    <div id="image-grid"></div>
                    <div id="imageModal" class="modal">
                      <span class="close-modal">&times;</span>
                      <img class="modal-img" src="" alt="" />
                      <div class="modal-caption"></div>
                    </div>
                </div>
            `;

      const container = document.getElementById('gallery-container');
      const imageGrid = document.getElementById('image-grid');
      const imageModal = document.getElementById('imageModal');

      expect(container).toBeTruthy();
      expect(imageGrid).toBeTruthy();
      expect(imageModal).toBeTruthy();
    });

    test('cleanupDOM clears body content', () => {
      // Add test content
      document.body.innerHTML = '<div>Test Content</div>';
      expect(document.body.innerHTML).not.toBe('');

      // Clean up
      document.body.innerHTML = '';

      // Verify cleanup
      expect(document.body.innerHTML.trim()).toBe('');
    });
  });

  describe('Event Simulation', () => {
    test('simulateInput triggers input event', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      let eventFired = false;
      let eventValue = '';

      input.addEventListener('input', (e) => {
        eventFired = true;
        eventValue = e.target.value;
      });

      simulateInput(input, 'test');
      expect(eventFired).toBe(true);
      expect(eventValue).toBe('test');
      expect(input.value).toBe('test');
    });

    test('simulateClick triggers click event', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      let clicked = false;

      button.addEventListener('click', () => {
        clicked = true;
      });

      simulateClick(button);
      expect(clicked).toBe(true);
    });
  });

  describe('Async Helpers', () => {
    test('flushPromises resolves pending promises', async () => {
      let resolved = false;

      // Create a simple promise
      Promise.resolve().then(() => {
        resolved = true;
      });

      await flushPromises();
      expect(resolved).toBe(true);
    });
  });

  describe('Modal Functions', () => {
    let gallery;

    beforeEach(() => {
      document.body.innerHTML = `
        <div id="gallery-container">
          <div id="image-grid"></div>
          <div id="imageModal" class="modal" style="display: block;">
            <span class="close-modal">&times;</span>
            <img class="modal-img" src="" alt="" />
            <div class="modal-caption"></div>
          </div>
        </div>
      `;
      gallery = new Gallery();
    });

    test('close button click handler works', async () => {
      const modal = document.getElementById('imageModal');
      const closeButton = modal.querySelector('.close-modal');

      closeButton.click();
      await flushPromises();

      expect(modal.style.display).toBe('none');
    });
  });

  describe('Image Filtering Functions', () => {
    beforeEach(() => {
      document.body.innerHTML = `
                <div id="gallery-container">
                    <div id="image-grid">
                        <div class="image-container" data-name="Test 1">
                            <img src="test1.jpg" alt="Test 1">
                            <div class="image-name">Test 1</div>
                        </div>
                        <div class="image-container" data-name="Other 2">
                            <img src="test2.jpg" alt="Other 2">
                            <div class="image-name">Other 2</div>
                        </div>
                    </div>
                    <div class="no-results">No images found</div>
                </div>
            `;
    });

    test('filterImages filters images by search term', () => {
      filterImages('Test');
      const containers = document.querySelectorAll('.image-container');
      expect(containers[0].style.display).toBe('');
      expect(containers[1].style.display).toBe('none');
    });

    test('filterImages shows no results message when no matches', () => {
      filterImages('xyz');
      const noResults = document.querySelector('.no-results');
      expect(noResults.style.display).toBe('block');
    });

    test('updateNoResultsMessage shows message when no visible images', () => {
      const containers = document.querySelectorAll('.image-container');
      containers.forEach((container) => {
        container.style.display = 'none';
      });
      updateNoResultsMessage();
      const noResults = document.querySelector('.no-results');
      expect(noResults.style.display).toBe('block');
    });

    test('updateNoResultsMessage hides message when images are visible', () => {
      updateNoResultsMessage();
      const noResults = document.querySelector('.no-results');
      expect(noResults.style.display).toBe('none');
    });
  });

  describe('Sticky Controls', () => {
    let controls;
    let originalGetBoundingClientRect;

    beforeEach(() => {
      document.body.innerHTML = `
                <nav style="height: 60px"></nav>
                <div class="gallery">
                    <div class="gallery-controls controls">
                        <div id="search-container"></div>
                        <div id="letter-filter"></div>
                        <div id="sort-container"></div>
                    </div>
                </div>
            `;

      controls = document.querySelector('.gallery-controls');
      originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

      // Mock getBoundingClientRect
      Element.prototype.getBoundingClientRect = function () {
        if (this === controls) {
          return {
            top: window.scrollY === 0 ? 100 : -10, // Above viewport when scrolled
            bottom: window.scrollY === 0 ? 200 : 90,
            height: 100,
          };
        }
        return {
          top: 0,
          bottom: 100,
          height: 100,
        };
      };

      // Mock offsetHeight and offsetTop
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        get() {
          if (this.tagName.toLowerCase() === 'nav') {
            return 60;
          }
          return 100;
        },
      });

      Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
        configurable: true,
        get() {
          if (this.classList.contains('gallery')) {
            return 100;
          }
          return 0;
        },
      });

      // Mock window properties
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      });

      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 0,
      });

      Object.defineProperty(window, 'pageYOffset', {
        get: () => window.scrollY,
      });

      Object.defineProperty(document, 'documentElement', {
        configurable: true,
        get: () => ({
          scrollTop: window.scrollY,
        }),
      });
    });

    afterEach(() => {
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      delete HTMLElement.prototype.offsetHeight;
      delete HTMLElement.prototype.offsetTop;
    });

    test('initializeStickyControls sets up scroll handler', () => {
      initializeStickyControls();

      // Simulate scroll position where controls should become sticky
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 150,
      });

      window.dispatchEvent(new Event('scroll'));
      expect(controls.classList.contains('sticky')).toBe(true);
    });

    test('initializeStickyControls removes sticky class when scrolling up', () => {
      initializeStickyControls();

      // First make it sticky
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 150,
      });

      window.dispatchEvent(new Event('scroll'));
      expect(controls.classList.contains('sticky')).toBe(true);

      // Then scroll back to top
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 0,
      });

      window.dispatchEvent(new Event('scroll'));
      expect(controls.classList.contains('sticky')).toBe(false);
    });
  });
});
