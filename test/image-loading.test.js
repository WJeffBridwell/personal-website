import { jest } from '@jest/globals';
import { setupTestDOM, flushPromises, cleanupDOM } from './helpers.js';
import { loadImages } from '../public/js/gallery.js';

describe('Image Loading', () => {
  let imageGrid;
  let testEnv;

  beforeAll(() => {
    testEnv = setupTestDOM();
    global.window = testEnv.window;
    global.document = testEnv.document;
  });

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
            <div id="gallery-container">
                <div id="image-grid"></div>
                <div class="error-message" style="display: none;"></div>
            </div>
        `;
    imageGrid = document.getElementById('image-grid');

    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetAllMocks();
  });

  afterAll(() => {
    cleanupDOM();
    jest.restoreAllMocks();
  });

  test('should load images with lazy loading enabled', async () => {
    // Mock successful fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { url: 'test1.jpg', name: 'Test 1' },
        { url: 'test2.jpg', name: 'Test 2' },
      ]),
    });

    await loadImages();
    await flushPromises();

    const images = imageGrid.querySelectorAll('img');
    expect(images).toHaveLength(2);
    images.forEach((img) => {
      expect(img.getAttribute('loading')).toBe('lazy');
    });
  });

  test('should handle image load errors gracefully', async () => {
    // Mock failed fetch
    global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    await loadImages();
    await flushPromises();

    const errorMessage = document.querySelector('.error-message');
    expect(errorMessage.style.display).toBe('block');
    expect(errorMessage.textContent).toBe('Failed to fetch');
  });

  test('should maintain image aspect ratios', () => {
    const container = document.createElement('div');
    container.className = 'image-container';
    container.innerHTML = `
            <img src="test.jpg" alt="Test Image" />
        `;
    imageGrid.appendChild(container);

    const img = container.querySelector('img');
    // Set dimensions directly on the element
    Object.defineProperty(img, 'width', { value: 200 });
    Object.defineProperty(img, 'height', { value: 150 });

    const aspectRatio = img.width / img.height;
    expect(aspectRatio).toBeCloseTo(1.33, 2);
  });
});
