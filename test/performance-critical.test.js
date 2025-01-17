import { jest } from '@jest/globals';
import { Gallery } from '../public/js/gallery.js';
import { ContentGallery } from '../public/js/content-gallery.js';
import { sortImages, filterImages } from '../public/js/helpers.js';

// Mock data generation helpers
const generateMockImages = (count) => Array.from({ length: count }, (_, i) => ({
  name: `test-image-${i}.jpg`,
  date: new Date(2024, 0, i + 1).toISOString(),
  size: Math.floor(Math.random() * 1000000),
  tags: ['nature', 'landscape', 'test'].slice(0, Math.floor(Math.random() * 3) + 1),
  content_type: 'jpg',
  content_name: `test-image-${i}.jpg`,
  content_size: Math.floor(Math.random() * 1000000),
  content_url: `/path/to/test-image-${i}.jpg`,
  content_tags: ['nature', 'landscape', 'test'].slice(0, Math.floor(Math.random() * 3) + 1),
}));

describe('Performance Critical Operations', () => {
  let gallery;
  let contentGallery;
  let mockImages;

  beforeEach(() => {
    document.body.innerHTML = `
            <div id="gallery">
                <div id="image-grid"></div>
                <div id="pageNumbers"></div>
                <button id="prevPage">Previous</button>
                <button id="nextPage">Next</button>
                <input id="searchInput" type="text">
                <select id="sortSelect"></select>
                <select id="tagSelect"></select>
                <div id="letterFilter"></div>
                <div id="imageModal">
                    <img class="modal-img">
                    <div class="modal-caption"></div>
                    <button class="close-modal"></button>
                </div>
            </div>
            <div class="gallery-grid"></div>
            <div class="gallery-pagination"></div>
            <input class="gallery-search" type="text">
        `;

    gallery = new Gallery(document.getElementById('gallery'));
    contentGallery = new ContentGallery();
    mockImages = generateMockImages(1000); // Generate 1000 mock images
  });

  describe('Large Dataset Handling', () => {
    test('should efficiently handle filtering 1000+ images', () => {
      const startTime = performance.now();

      gallery.allImages = mockImages;
      gallery.searchTerm = 'test';
      gallery.filterAndSortImages();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(gallery.filteredImages.length).toBeGreaterThan(0);
    });

    test('should efficiently sort 1000+ images', () => {
      const startTime = performance.now();

      gallery.allImages = mockImages;
      gallery.sortSelect.value = 'date';
      gallery.filterAndSortImages();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(gallery.filteredImages[0].date).toBeDefined();
    });
  });

  describe('Pagination Performance', () => {
    test('should efficiently handle page changes with large datasets', () => {
      gallery.allImages = mockImages;
      gallery.filterAndSortImages();

      const startTime = performance.now();
      gallery.currentPage = 2; // Change to page 2
      gallery.updatePagination();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Page change should be near-instant
      expect(document.querySelector('#pageNumbers').innerHTML).not.toBe('');
    });
  });

  describe('Search Performance', () => {
    test('should efficiently perform search operations', () => {
      contentGallery.allItems = mockImages;
      const searchTerm = 'test-image-500';

      const startTime = performance.now();
      contentGallery.searchInput = document.querySelector('.gallery-search');
      contentGallery.searchInput.value = searchTerm;
      contentGallery.filterAndRenderItems();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Search should complete quickly
      expect(contentGallery.filteredItems.some((item) => item.content_name.includes(searchTerm))).toBe(true);
    });
  });

  describe('Modal Operations', () => {
    test('should efficiently open and close modal', () => {
      const imageUrl = mockImages[0].content_url;
      const imageName = mockImages[0].content_name;

      const openStartTime = performance.now();
      gallery.openModal(imageUrl, imageName);
      const openEndTime = performance.now();
      const openDuration = openEndTime - openStartTime;

      expect(openDuration).toBeLessThan(50); // Modal should open quickly
      expect(document.getElementById('imageModal').style.display).toBe('flex');

      const closeStartTime = performance.now();
      gallery.closeModal();
      const closeEndTime = performance.now();
      const closeDuration = closeEndTime - closeStartTime;

      expect(closeDuration).toBeLessThan(50); // Modal should close quickly
      expect(document.getElementById('imageModal').style.display).toBe('none');
    });
  });

  describe('DOM Manipulation Performance', () => {
    test('should efficiently render large batches of items', () => {
      contentGallery.allItems = mockImages;

      const startTime = performance.now();
      contentGallery.renderItems(mockImages.slice(0, 24)); // Render one page
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Rendering should be reasonably fast
      expect(document.querySelector('.gallery-grid').children.length).toBe(24);
    });
  });

  describe('Memory Usage', () => {
    test('should maintain reasonable memory usage with large datasets', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;

      // Perform memory-intensive operations
      contentGallery.allItems = mockImages;
      contentGallery.filterAndRenderItems();
      gallery.allImages = mockImages;
      gallery.filterAndSortImages();

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be proportional to data size
      if (initialMemory > 0) { // Only test if memory API is available
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      }
    });
  });
});
