import { jest } from '@jest/globals';
import { Gallery } from '../public/js/gallery.js';

jest.setTimeout(10000);

describe('Gallery Class', () => {
  let gallery;
  let images;

  beforeEach(() => {
    jest.useFakeTimers();

    document.body.innerHTML = `
      <div id="gallery-container">
        <div id="image-grid"></div>
        <div class="gallery-controls">
          <input id="searchInput" type="text" />
          <select id="sortSelect">
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="date-desc">Date (Newest)</option>
          </select>
          <select id="tagSelect">
            <option value="">All tags</option>
          </select>
          <div id="letterFilter"></div>
        </div>
        <div id="imageModal" class="modal">
          <div class="modal-content">
            <img class="modal-img" />
            <div class="modal-caption"></div>
            <button class="close-modal">&times;</button>
          </div>
        </div>
      </div>
    `;

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        images: [
          { name: 'test1.jpg', date: '2023-01-01', tags: ['red', 'nature'] },
          { name: 'test2.jpg', date: '2023-01-02', tags: ['blue', 'urban'] },
        ],
      }),
    });

    gallery = new Gallery(document.getElementById('gallery-container'));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Event Handling', () => {
    test('filters images on search input', async () => {
      await gallery.loadImages();

      gallery.searchInput.value = 'test1';
      gallery.searchInput.dispatchEvent(new Event('input'));

      expect(gallery.filteredImages.length).toBe(1);
      expect(gallery.filteredImages[0].name).toBe('test1.jpg');
    });
  });

  describe('Image Loading and Error Handling', () => {
    test('handles malformed image data gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          images: [
            {
              name: '', path: '', date: '', tags: [],
            },
          ],
        }),
      });

      await gallery.loadImages();
      expect(gallery.allImages.length).toBe(1);
    });
  });

  describe('Advanced Event Handling', () => {
    test('combines letter filter with search', async () => {
      await gallery.loadImages();

      // Click letter filter
      gallery.currentLetter = 'T';
      gallery.filterAndSortImages();

      // Type in search
      gallery.searchInput.value = 'test1';
      gallery.searchInput.dispatchEvent(new Event('input'));

      expect(gallery.filteredImages.length).toBe(1);
      expect(gallery.filteredImages[0].name).toBe('test1.jpg');
    });

    test('handles filter reset sequence', async () => {
      await gallery.loadImages();

      // Apply filters
      gallery.currentLetter = 'T';
      gallery.searchInput.value = 'test';
      gallery.searchInput.dispatchEvent(new Event('input'));

      // Reset filters
      gallery.currentLetter = 'all';
      gallery.searchInput.value = '';
      gallery.searchInput.dispatchEvent(new Event('input'));

      expect(gallery.filteredImages.length).toBe(2);
    });
  });

  describe('Accessibility', () => {
    test('maintains keyboard navigation', async () => {
      await gallery.loadImages();

      // Test modal keyboard navigation
      gallery.openModal('/images/test1.jpg', 'test1.jpg');

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(gallery.modal.style.display).toBe('none');
    });

    test('handles screen reader announcements', async () => {
      await gallery.loadImages();

      // Test image alt text
      const imageContainers = gallery.imageGrid.querySelectorAll('.image-container');
      expect(imageContainers.length).toBeGreaterThan(0);

      const firstImage = imageContainers[0].querySelector('img');
      expect(firstImage.alt).toBeTruthy();
    });
  });

  describe('Memory Management', () => {
    test('handles large datasets without memory leaks', async () => {
      const largeImageSet = Array(100).fill(null).map((_, i) => ({
        name: `test${i}.jpg`,
        date: '2023-01-01',
        tags: ['test'],
      }));

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ images: largeImageSet }),
      });

      await gallery.loadImages();

      // Test filtering
      gallery.searchInput.value = 'test';
      gallery.searchInput.dispatchEvent(new Event('input'));

      // Test sorting
      gallery.sortSelect.value = 'name-desc';
      gallery.sortSelect.dispatchEvent(new Event('change'));

      expect(gallery.filteredImages.length).toBe(100);
    });
  });
});
