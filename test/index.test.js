/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { filterFunctions, galleryState, initializeGallery } from '../public/js/index.js';

describe('Gallery Index', () => {
  let imageGrid;
  let modal;

  beforeEach(async () => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div class="gallery">
        <div id="image-grid"></div>
        <div id="letter-filter">
          <div class="letter-buttons"></div>
          <div class="total-count"></div>
        </div>
        <div id="search-filter">
          <input type="text" id="search-input" placeholder="Search images...">
        </div>
        <div id="pagination"></div>
        <div id="imageModal" class="modal">
          <div class="modal-content">
            <span class="close-modal">&times;</span>
            <img class="modal-img" src="" alt="">
            <div class="modal-caption"></div>
          </div>
        </div>
      </div>
    `;

    imageGrid = document.getElementById('image-grid');

    // Initialize modal
    filterFunctions.initializeModal();
    modal = document.getElementById('imageModal');

    // Mock fetch API
    global.fetch = jest.fn((url) => {
      if (url === '/gallery/letters') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            letters: ['a', 'b', 'c'],
            total: 10,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          files: [
            { name: 'test1.jpg', path: '/images/test1.jpg', tags: ['test'] },
            { name: 'test2.jpg', path: '/images/test2.jpg', tags: ['test'] },
          ],
          total: 2,
          page: 1,
          totalPages: 1,
        }),
      });
    });

    // Initialize gallery
    await initializeGallery();
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Modal Functions', () => {
    test('openModal displays image and caption', () => {
      const imageSrc = '/images/test1.jpg';
      const caption = 'Test Image';
      filterFunctions.openModal(imageSrc, caption);

      expect(modal.style.display).toBe('block');
      expect(modal.querySelector('.modal-img').src).toContain(imageSrc);
      expect(modal.querySelector('.modal-caption').textContent).toBe(caption);
    });

    test('closeModal hides modal', () => {
      filterFunctions.openModal('/images/test1.jpg', 'Test');
      filterFunctions.closeModal();
      expect(modal.style.display).toBe('none');
    });

    test('modal closes on escape key', () => {
      filterFunctions.openModal('/images/test1.jpg', 'Test');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(modal.style.display).toBe('none');
    });

    test('modal closes on background click', () => {
      filterFunctions.openModal('/images/test1.jpg', 'Test');
      modal.click();
      expect(modal.style.display).toBe('none');
    });
  });

  describe('Image Display Functions', () => {
    test('displayImages renders images to grid', async () => {
      const images = [
        { name: 'test1.jpg', path: '/images/test1.jpg' },
        { name: 'test2.jpg', path: '/images/test2.jpg' },
      ];

      await filterFunctions.displayImages(images);
      const containers = imageGrid.querySelectorAll('.image-container');
      expect(containers.length).toBe(2);
    });
  });

  describe('Filter Functions', () => {
    test('initializeLetterFilter creates letter buttons', async () => {
      await filterFunctions.initializeLetterFilter();
      const letterButtons = document.querySelector('.letter-buttons');
      expect(letterButtons.children.length).toBe(4); // All + 3 letters
    });

    test('filterByLetter shows/hides correct images', async () => {
      const images = [
        { name: 'apple.jpg', path: '/images/apple.jpg' },
        { name: 'banana.jpg', path: '/images/banana.jpg' },
      ];

      await filterFunctions.displayImages(images);
      await filterFunctions.filterByLetter('a');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      const visibleImages = Array.from(imageGrid.querySelectorAll('.image-container'))
        .filter((container) => !container.classList.contains('hidden'));
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('.image-name').textContent).toBe('apple.jpg');
    });

    test('search filter functionality', async () => {
      const images = [
        { name: 'test1.jpg', path: '/images/test1.jpg' },
        { name: 'test2.jpg', path: '/images/test2.jpg' },
      ];

      await filterFunctions.displayImages(images);
      filterFunctions.initializeSearchFilter();

      const searchInput = document.querySelector('#search-input');
      searchInput.value = 'test1';
      searchInput.dispatchEvent(new Event('input'));

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 300));

      const visibleImages = Array.from(imageGrid.querySelectorAll('.image-container'))
        .filter((container) => !container.classList.contains('hidden'));
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('.image-name').textContent).toBe('test1.jpg');
    });
  });

  describe('Pagination Functions', () => {
    test('createPaginationControls creates pagination controls', () => {
      filterFunctions.createPaginationControls(1, 3);
      const pagination = document.getElementById('pagination');
      const buttons = pagination.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
