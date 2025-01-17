import { jest } from '@jest/globals';

/**
 * @jest-environment jsdom
 */

// Mock the functions we need
const gridFunctions = {
  setupImageGrid() {
    const grid = document.getElementById('image-grid');
    if (!grid) {
      console.error('Image grid not found');
      return null;
    }
    return grid;
  },
};

const imageFunctions = {
  async fetchImages(page = 1, limit = 10) {
    try {
      const response = await fetch(`/api/images?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error('Expected array of images, got:', typeof data);
        showError('Failed to load images');
        return [];
      }
      return data.map((image) => ({
        src: `/images/${encodeURIComponent(image.name)}`,
        alt: image.name.replace(/\.[^/.]+$/, ''),
      }));
    } catch (error) {
      console.error('Error fetching images:', error);
      showError('Failed to load images');
      return [];
    }
  },

  async displayImages(images) {
    console.log('Starting to display images:', images.length);
    const grid = document.getElementById('image-grid');
    if (!grid) {
      console.error('Image grid element not found');
      return;
    }

    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.classList.add('visible');
    }

    for (const image of images) {
      const container = document.createElement('div');
      container.className = 'image-container skeleton';

      const img = document.createElement('img');
      img.className = 'loading';
      img.alt = image.alt || '';
      img.loading = 'lazy';
      img.src = image.src;

      const searchIcon = document.createElement('i');
      searchIcon.className = 'fas fa-search search-icon';

      img.onload = () => {
        img.classList.remove('loading');
        img.classList.add('loaded');
        container.classList.remove('skeleton');
      };

      img.onerror = () => {
        img.classList.remove('loading');
        img.classList.add('error');
        container.classList.remove('skeleton');
        container.classList.add('error');
      };

      container.appendChild(img);
      container.appendChild(searchIcon);
      grid.appendChild(container);
    }

    if (loadingIndicator) {
      loadingIndicator.classList.remove('visible');
    }
  },

  async loadNextImageChunk() {
    if (global.isLoading || !global.hasMoreImages) return;

    try {
      global.isLoading = true;

      const images = await imageFunctions.fetchImages(global.currentPage);

      if (images.length === 0) {
        global.hasMoreImages = false;
        return;
      }

      await imageFunctions.displayImages(images);
      global.currentPage++;
    } catch (error) {
      console.error('Error loading next chunk:', error);
      showError('Failed to load more images');
    } finally {
      global.isLoading = false;
    }
  },
};

function showError(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  document.body.appendChild(errorElement);
}

describe('Image Loading Flow', () => {
  beforeEach(() => {
    // Reset global state
    global.currentPage = 1;
    global.isLoading = false;
    global.hasMoreImages = true;
    global.allImages = [];

    // Setup DOM
    document.body.innerHTML = `
            <div id="image-grid" class="image-grid"></div>
            <div class="loading-indicator"></div>
        `;

    // Mock fetch
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        { name: 'test1.jpg' },
        { name: 'test2.jpg' },
      ]),
    }));

    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetAllMocks();
  });

  test('complete image loading flow works correctly', async () => {
    // 1. First verify grid is set up
    const grid = gridFunctions.setupImageGrid();
    expect(grid).toBeTruthy();
    expect(grid.classList.contains('image-grid')).toBe(true);
    expect(grid).toBeVisible();

    // 2. Load initial chunk of images
    await imageFunctions.loadNextImageChunk();

    // Verify fetch was called correctly
    expect(fetch).toHaveBeenCalledWith('/api/images?page=1&limit=10');

    // 3. Check if images were processed and displayed
    const containers = document.querySelectorAll('.image-container');
    expect(containers).toHaveLength(2); // We mocked 2 images

    // 4. Verify each container and image
    containers.forEach((container, index) => {
      // Container should be visible and have proper structure
      expect(container).toBeVisible();
      expect(container.classList.contains('image-container')).toBe(true);

      // Image should exist with correct attributes
      const img = container.querySelector('img');
      expect(img).toBeTruthy();
      expect(img.src).toContain(`/images/test${index + 1}.jpg`);
      expect(img.alt).toBe(`test${index + 1}`);

      // Search icon should exist and be visible
      const searchIcon = container.querySelector('.search-icon');
      expect(searchIcon).toBeTruthy();
      expect(searchIcon).toBeVisible();
    });

    // 5. Verify loading states
    expect(document.querySelector('.loading-indicator')).not.toHaveClass('visible');
    expect(global.isLoading).toBe(false);
    expect(global.currentPage).toBe(2); // Should have incremented
  });

  test('handles empty response correctly', async () => {
    // Mock fetch to return empty array
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    }));

    await imageFunctions.loadNextImageChunk();

    // Verify grid is empty but visible
    const grid = document.getElementById('image-grid');
    expect(grid).toBeVisible();
    expect(grid.children).toHaveLength(0);
    expect(global.hasMoreImages).toBe(false);
  });

  test('handles fetch error correctly', async () => {
    // Mock fetch to throw error
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

    await imageFunctions.loadNextImageChunk();

    // Verify error handling
    expect(console.error).toHaveBeenCalled();
    expect(document.querySelector('.error-message')).toBeTruthy();
    expect(document.querySelector('.error-message')).toHaveTextContent('Failed to load images');
    expect(global.isLoading).toBe(false);
  });

  test('handles malformed response correctly', async () => {
    // Mock fetch to return invalid data
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve('not an array'),
    }));

    await imageFunctions.loadNextImageChunk();

    // Verify error handling
    expect(console.error).toHaveBeenCalledWith('Expected array of images, got:', 'string');
    expect(document.querySelector('.error-message')).toBeTruthy();
    expect(document.querySelector('.error-message')).toHaveTextContent('Failed to load images');
    expect(global.isLoading).toBe(false);
  });
});
