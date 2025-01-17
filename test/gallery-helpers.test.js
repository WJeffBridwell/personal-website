import { jest } from '@jest/globals';

let helpers;
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = jest.fn();

beforeAll(async () => {
  helpers = await import('../public/js/helpers.js');
});

describe('Gallery Helper Functions', () => {
  let mockImages;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="gallery-container">
        <div id="image-grid"></div>
        <div class="modal">
          <div class="modal-content">
            <img class="modal-img">
            <div class="modal-caption"></div>
            <span class="close-modal">&times;</span>
          </div>
        </div>
      </div>
    `;

    mockImages = [
      { name: 'test1.jpg', path: '/images/test1.jpg', date: '2023-01-01' },
      { name: 'test2.jpg', path: '/images/test2.jpg', date: '2023-01-02' },
    ];

    // Add mock images to DOM
    const imageGrid = document.getElementById('image-grid');
    mockImages.forEach((img) => {
      const div = document.createElement('div');
      div.className = 'image-container';
      div.dataset.date = img.date;
      div.innerHTML = `
        <img src="${img.path}" alt="${img.name}">
        <div class="image-name">${img.name}</div>
      `;
      imageGrid.appendChild(div);
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('loadImages', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ files: mockImages }),
      }));
    });

    test('loads images successfully', async () => {
      const images = await helpers.loadImages();
      expect(images).toEqual(mockImages);
    });

    test('handles fetch error', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(helpers.loadImages()).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('filterImages', () => {
    test('filters by search term', () => {
      helpers.filterImages('test1');
      const containers = Array.from(document.querySelectorAll('.image-container'));

      expect(containers[0].style.display).toBe('');
      expect(containers[1].style.display).toBe('none');
    });

    test('handles empty search term', () => {
      helpers.filterImages('');
      const containers = Array.from(document.querySelectorAll('.image-container'));

      expect(containers[0].style.display).toBe('');
      expect(containers[1].style.display).toBe('');
    });

    test('handles no matches', () => {
      helpers.filterImages('nonexistent');
      const containers = Array.from(document.querySelectorAll('.image-container'));

      expect(containers[0].style.display).toBe('none');
      expect(containers[1].style.display).toBe('none');
    });
  });

  describe('sortImages', () => {
    test('sorts by name ascending', () => {
      helpers.sortImages('name', 'asc');
      const containers = Array.from(document.querySelectorAll('.image-container'));

      expect(containers[0].querySelector('.image-name').textContent).toBe('test1.jpg');
      expect(containers[1].querySelector('.image-name').textContent).toBe('test2.jpg');
    });

    test('sorts by name descending', () => {
      helpers.sortImages('name', 'desc');
      const containers = Array.from(document.querySelectorAll('.image-container'));

      expect(containers[0].querySelector('.image-name').textContent).toBe('test2.jpg');
      expect(containers[1].querySelector('.image-name').textContent).toBe('test1.jpg');
    });

    test('sorts by date ascending', () => {
      helpers.sortImages('date', 'asc');
      const containers = Array.from(document.querySelectorAll('.image-container'));

      expect(containers[0].dataset.date).toBe('2023-01-01');
      expect(containers[1].dataset.date).toBe('2023-01-02');
    });

    test('sorts by date descending', () => {
      helpers.sortImages('date', 'desc');
      const containers = Array.from(document.querySelectorAll('.image-container'));

      expect(containers[0].dataset.date).toBe('2023-01-02');
      expect(containers[1].dataset.date).toBe('2023-01-01');
    });
  });

  describe('createImageElement', () => {
    test('creates image element with correct attributes', () => {
      const imageData = {
        name: 'test.jpg',
        path: '/images/test.jpg',
        date: '2023-01-01',
      };

      const container = helpers.createImageElement(imageData);

      expect(container.className).toBe('image-container');
      expect(container.dataset.name).toBe(imageData.name);
      expect(container.dataset.date).toBe(imageData.date);

      const img = container.querySelector('img');
      expect(img.src).toContain(imageData.path);
      expect(img.alt).toBe(imageData.name);
      expect(img.loading).toBe('lazy');

      const name = container.querySelector('.image-name');
      expect(name.textContent).toBe(imageData.name);
    });

    test('throws error with invalid image data', () => {
      expect(() => helpers.createImageElement({})).toThrow('Invalid image data');
      expect(() => helpers.createImageElement({ name: 'test.jpg' })).toThrow('Invalid image data');
      expect(() => helpers.createImageElement({ path: '/test.jpg' })).toThrow('Invalid image data');
    });
  });
});
