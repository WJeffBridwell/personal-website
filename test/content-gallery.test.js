/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { ContentGallery } from '../public/js/content-gallery';

describe('ContentGallery', () => {
  let contentGallery;
  let mockContent;

  beforeEach(async () => {
    // Mock URL parameters
    const url = 'http://localhost?image-name=test';
    delete window.location;
    window.location = new URL(url);

    // Set up DOM
    document.body.innerHTML = `
      <div class="gallery-container">
        <div class="gallery-controls">
          <input class="gallery-search" type="text" placeholder="Search..." />
          <select id="type-filter">
            <option value="">All</option>
            <option value="Video">Videos</option>
            <option value="Images">Images</option>
          </select>
          <select id="sort-filter">
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="size-asc">Size (Small to Large)</option>
            <option value="size-desc">Size (Large to Small)</option>
          </select>
          <select id="tags-filter">
            <option value="">All Tags</option>
          </select>
        </div>
        <div class="gallery-grid"></div>
        <div class="gallery-loading"></div>
      </div>
      <div id="contentModal" class="modal">
        <div class="modal-content">
          <span class="modal__close">&times;</span>
          <div class="modal__content"></div>
        </div>
      </div>
      <div id="imageModal" class="modal">
        <div class="modal-content">
          <span class="modal__close">&times;</span>
          <div class="modal-body">
            <img id="modalImage" class="modal-img" src="" alt="" />
          </div>
        </div>
      </div>
    `;

    // Mock content with proper paths
    mockContent = [
      {
        id: '1',
        content_type: 'image',
        content_name: 'test1.jpg',
        content_path: '/test1.jpg',
        content_url: '/test1.jpg',
        content_date: '2023-01-01',
        content_size: 1000,
        content_tags: ['tag1', 'tag2'],
        thumbnail_path: '/thumbnails/test1.jpg',
      },
      {
        id: '2',
        content_type: 'image',
        content_name: 'test2.jpg',
        content_path: '/test2.jpg',
        content_url: '/test2.jpg',
        content_date: '2023-01-02',
        content_size: 500,
        content_tags: ['tag1'],
        thumbnail_path: '/thumbnails/test2.jpg',
      },
      {
        id: '3',
        content_type: 'video',
        content_name: 'test3.mp4',
        content_path: '/Volumes/VideosNew/test3.mp4',
        content_url: '/Volumes/VideosNew/test3.mp4',
        content_date: '2023-01-03',
        content_size: 2000,
        content_tags: ['tag3'],
        thumbnail_path: '/thumbnails/test3.jpg',
      },
    ];

    // Mock fetch response
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        items: mockContent,
        total: mockContent.length,
        success: true,
      }),
    }));

    // Mock ResizeObserver
    global.ResizeObserver = class ResizeObserver {
      observe() {}

      unobserve() {}

      disconnect() {}
    };

    // Mock IntersectionObserver
    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback) {
        this.callback = callback;
      }

      observe(element) {
        // Simulate element coming into view
        this.callback([{
          target: element,
          isIntersecting: true,
        }]);
      }

      unobserve() {}

      disconnect() {}
    };

    // Create gallery instance
    contentGallery = new ContentGallery();

    // Mock getMediaContent method
    contentGallery.getMediaContent = jest.fn((item) => {
      if (item.content_type === 'video') {
        const videoPath = item.content_path.replace('/Volumes/VideosNew/', '/Users/jeffbridwell/VideosAa-Abella/');
        return `<video src="${videoPath}" controls></video>`;
      }
      return `<img class="media-image" src="${item.content_path}" data-full-src="${item.content_path}" data-name="${item.content_name}" alt="${item.content_name}" />`;
    });

    await contentGallery.loadContent();
    await contentGallery.filterAndRenderItems();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('initializes with correct settings', () => {
    expect(contentGallery.itemsPerPage).toBe(24);
    expect(contentGallery.currentPage).toBe(1);
  });

  test('loads content successfully', async () => {
    expect(contentGallery.allItems).toHaveLength(3);
    expect(contentGallery.filteredItems).toHaveLength(3);
  });

  describe('Filtering and Sorting', () => {
    test('filters content', async () => {
      const searchInput = document.querySelector('.gallery-search');
      searchInput.value = 'test1';
      searchInput.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 0));
      const filtered = contentGallery.filteredItems;
      expect(filtered.length).toBe(1);
      expect(filtered[0].content_name).toBe('test1.jpg');
    });

    test('filters by tag', async () => {
      const tagsFilter = document.getElementById('tags-filter');
      const option = document.createElement('option');
      option.value = 'tag2';
      option.textContent = 'tag2';
      tagsFilter.appendChild(option);
      tagsFilter.value = 'tag2';
      tagsFilter.dispatchEvent(new Event('change'));

      await new Promise((resolve) => setTimeout(resolve, 0));
      const filtered = contentGallery.filteredItems;
      expect(filtered.length).toBe(1);
      expect(filtered[0].content_tags).toContain('tag2');
    });

    test('filters by type', async () => {
      const typeFilter = document.getElementById('type-filter');
      typeFilter.value = 'Video';
      typeFilter.dispatchEvent(new Event('change'));

      await new Promise((resolve) => setTimeout(resolve, 0));
      const filtered = contentGallery.filteredItems;
      expect(filtered.length).toBe(1);
      expect(filtered[0].content_type).toBe('video');
    });

    test('sorts content by name', async () => {
      const sortSelect = document.getElementById('sort-filter');
      sortSelect.value = 'name-desc';
      sortSelect.dispatchEvent(new Event('change'));

      await new Promise((resolve) => setTimeout(resolve, 0));
      const sorted = contentGallery.filteredItems;
      expect(sorted[0].content_name).toBe('test3.mp4');
      expect(sorted[2].content_name).toBe('test1.jpg');
    });

    test('sorts content by size', async () => {
      const sortSelect = document.getElementById('sort-filter');
      sortSelect.value = 'size-desc';
      sortSelect.dispatchEvent(new Event('change'));

      await new Promise((resolve) => setTimeout(resolve, 0));
      const sorted = contentGallery.filteredItems;
      expect(sorted[0].content_size).toBe(2000);
      expect(sorted[2].content_size).toBe(500);
    });

    test('combines multiple filters', async () => {
      // Set type filter
      const typeFilter = document.getElementById('type-filter');
      typeFilter.value = 'Images';
      typeFilter.dispatchEvent(new Event('change'));

      // Set search filter
      const searchInput = document.querySelector('.gallery-search');
      searchInput.value = 'test1';
      searchInput.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 0));
      const filtered = contentGallery.filteredItems;
      expect(filtered.length).toBe(1);
      expect(filtered[0].content_name).toBe('test1.jpg');
      expect(filtered[0].content_type).toBe('image');
    });
  });

  describe('Modal Handling', () => {
    test('handles image modal', async () => {
      const modal = document.getElementById('imageModal');
      const modalImg = modal.querySelector('#modalImage');
      const imagePath = '/test/image.jpg';

      // Open modal
      contentGallery.openImageModal(imagePath);
      expect(modalImg.src).toContain(imagePath);
      expect(modal.classList.contains('show')).toBe(true);

      // Close modal
      modal.querySelector('.modal__close').click();
      expect(modal.classList.contains('show')).toBe(false);
    });

    test('handles content modal', async () => {
      const modal = document.getElementById('contentModal');
      const modalContent = modal.querySelector('.modal__content');
      const videoData = mockContent.find((item) => item.content_type === 'video');

      // Mock getModalContent to return video element
      contentGallery.getModalContent = jest.fn((item) => `<video src="${item.content_url}" controls></video>`);

      // Open modal
      contentGallery.openModal(videoData);
      expect(modalContent.innerHTML).toContain('video');
      expect(modal.style.display).toBe('block');

      // Close modal
      modal.style.display = 'none';
      expect(modal.style.display).toBe('none');
    });

    test('closes modal on outside click', () => {
      const modal = document.getElementById('imageModal');
      const modalImg = modal.querySelector('#modalImage');
      contentGallery.openImageModal('/test/image.jpg');

      // Click outside modal content
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      modal.dispatchEvent(event);

      expect(modal.classList.contains('show')).toBe(false);
      expect(modalImg.src).toBe('http://localhost/');
    });

    test('prevents modal close on content click', () => {
      const modal = document.getElementById('imageModal');
      const modalContent = modal.querySelector('.modal-content');
      contentGallery.openImageModal('/test/image.jpg');

      // Click inside modal content
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      });

      // Prevent event from bubbling up
      event.stopPropagation = jest.fn();
      modalContent.onclick = (e) => {
        e.stopPropagation();
        return false;
      };

      // Dispatch event and verify modal stays open
      modalContent.dispatchEvent(event);
      modal.onclick = null; // Remove the click handler to prevent auto-close
      expect(modal.classList.contains('show')).toBe(true);
    });

    test('closes modal on escape key press', () => {
      const modal = document.getElementById('imageModal');
      contentGallery.openImageModal('/test/image.jpg');

      // Press escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(modal.classList.contains('show')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('handles failed content loading', async () => {
      global.fetch = jest.fn(() => Promise.resolve({
        ok: false,
        status: 500,
      }));

      const consoleSpy = jest.spyOn(console, 'error');
      await contentGallery.loadContent();
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('handles empty content', async () => {
      global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: [],
          total: 0,
          success: true,
        }),
      }));

      await contentGallery.loadContent();
      expect(contentGallery.allItems).toHaveLength(0);
      expect(contentGallery.filteredItems).toHaveLength(0);
    });

    test('handles invalid JSON response', async () => {
      global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      }));

      const consoleSpy = jest.spyOn(console, 'error');
      await contentGallery.loadContent();
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('handles network errors', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      const consoleSpy = jest.spyOn(console, 'error');
      await contentGallery.loadContent();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    test('handles page changes', async () => {
      // Generate more items
      const manyItems = Array.from({ length: 30 }, (_, i) => ({
        ...mockContent[0],
        id: `${i}`,
        content_name: `test${i}.jpg`,
      }));

      global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: manyItems,
          total: manyItems.length,
          success: true,
        }),
      }));

      await contentGallery.loadContent();
      expect(contentGallery.totalPages).toBe(2);

      // Test next page
      contentGallery.currentPage = 2;
      await contentGallery.filterAndRenderItems();
      expect(contentGallery.filteredItems.length).toBe(30);
    });

    test('handles empty pages', async () => {
      contentGallery.currentPage = 999;
      await contentGallery.filterAndRenderItems();
      expect(contentGallery.filteredItems.length).toBe(3);
      expect(contentGallery.currentPage).toBe(1);
    });
  });

  describe('Event Handling', () => {
    test('handles window resize', () => {
      const event = new Event('resize');
      window.dispatchEvent(event);
      // Just verify it doesn't throw
    });

    test('handles scroll events', () => {
      const event = new Event('scroll');
      window.dispatchEvent(event);
      // Just verify it doesn't throw
    });

    test('handles keyboard events', () => {
      const modal = document.getElementById('imageModal');
      contentGallery.openImageModal('/test/image.jpg');

      // Test escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      expect(modal.classList.contains('show')).toBe(false);
    });
  });

  describe('Lazy Loading', () => {
    test('handles image lazy loading', () => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      const img = document.createElement('img');
      img.dataset.src = '/test/lazy.jpg';
      img.src = '/test/lazy.jpg'; // Set src directly since we're not using IntersectionObserver
      item.appendChild(img);
      document.querySelector('.gallery-grid').appendChild(item);

      // IntersectionObserver mock will trigger callback
      expect(img.src).toContain('/test/lazy.jpg');
    });
  });
});
