/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

describe('Gallery Index', () => {
  let imageGrid;
  let modal;
  let mockFetch;
  let indexModule;

  beforeEach(async () => {
    // Set up DOM elements
    document.body.innerHTML = `
            <div id="image-grid"></div>
            <div id="letter-filter"></div>
            <div id="search-filter"></div>
            <div id="pagination"></div>
            <div id="modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <img class="modal-img" src="" alt="">
                    <div class="modal-caption"></div>
                </div>
            </div>
        `;
    imageGrid = document.getElementById('image-grid');
    modal = document.getElementById('modal');

    // Initialize window.galleryState
    window.galleryState = {
      currentPage: 1,
      totalPages: 1,
      isLoading: false,
      images: [],
      initialized: false,
      batchSize: 80,
      loadedImages: new Set(),
      modal,
      modalImg: modal.querySelector('.modal-img'),
      modalCaption: modal.querySelector('.modal-caption'),
      closeBtn: modal.querySelector('.close-modal'),
    };

    // Mock fetch
    mockFetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        items: [
          { name: 'test1.jpg', path: '/images/test1.jpg', tags: ['test'] },
          { name: 'test2.jpg', path: '/images/test2.jpg', tags: ['test'] },
        ],
        totalPages: 3,
      }),
    }));
    global.fetch = mockFetch;

    // Mock window.location
    delete window.location;
    window.location = new URL('http://localhost/index.html');

    // Mock history API
    window.history = {
      pushState: jest.fn(),
      replaceState: jest.fn(),
    };

    // Import index.js
    indexModule = await import('../public/js/index.js');

    // Set up window.filterFunctions with the actual functions
    window.filterFunctions = {
      initializeModal: indexModule.initializeModal,
      openModal: indexModule.openModal,
      closeModal: indexModule.closeModal,
      createImageContainer: indexModule.createImageContainer,
      displayImages: indexModule.displayImages,
      fetchImages: indexModule.fetchImages,
      initializeLetterFilter: indexModule.initializeLetterFilter,
      filterImagesByLetter: indexModule.filterImagesByLetter,
      initializeSearchFilter: indexModule.initializeSearchFilter,
      updatePagination: indexModule.updatePagination,
      filterImagesBySearch: indexModule.filterImagesBySearch,
    };

    // Initialize the modal
    indexModule.initializeModal();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    window.filterFunctions = undefined;
    window.galleryState = undefined;
  });

  describe('Modal Functions', () => {
    test('initializeModal creates modal structure', () => {
      expect(window.galleryState.modal).toBeTruthy();
      expect(window.galleryState.modalImg).toBeTruthy();
      expect(window.galleryState.modalCaption).toBeTruthy();
      expect(window.galleryState.closeBtn).toBeTruthy();
    });

    test('openModal displays image and caption', () => {
      indexModule.openModal('/test.jpg', 'Test Image');

      expect(window.galleryState.modal.style.display).toBe('block');
      expect(window.galleryState.modalImg.src).toContain('/test.jpg');
      expect(window.galleryState.modalCaption.textContent).toBe('Test Image');
    });

    test('closeModal hides modal', () => {
      indexModule.openModal('/test.jpg', 'Test Image');
      indexModule.closeModal();

      expect(window.galleryState.modal.style.display).toBe('none');
    });

    test('modal closes on escape key', () => {
      indexModule.openModal('/test.jpg', 'Test Image');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(window.galleryState.modal.style.display).toBe('none');
    });

    test('modal closes on background click', () => {
      indexModule.openModal('/test.jpg', 'Test Image');

      window.galleryState.modal.click();
      expect(window.galleryState.modal.style.display).toBe('none');
    });

    test('modal closes on close button click', () => {
      indexModule.openModal('/test.jpg', 'Test Image');

      window.galleryState.closeBtn.click();
      expect(window.galleryState.modal.style.display).toBe('none');
    });
  });

  describe('Image Display Functions', () => {
    test('createImageContainer creates proper structure', () => {
      const container = indexModule.createImageContainer('test.jpg');

      expect(container.className).toBe('image-container');
      expect(container.querySelector('img')).toBeTruthy();
      expect(container.querySelector('.image-icons')).toBeTruthy();
      expect(container.querySelectorAll('.fas').length).toBe(2);
    });

    test('displayImages renders images to grid', async () => {
      const images = ['test1.jpg', 'test2.jpg'];
      await indexModule.displayImages(images);

      expect(imageGrid.children.length).toBe(2);
      expect(imageGrid.querySelectorAll('img').length).toBe(2);
    });

    test('fetchImages calls API with correct parameters', async () => {
      await indexModule.fetchImages(1, 10, 'A');

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/gallery/initial'));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('page=1'));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=10'));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('letter=A'));
    });
  });

  describe('Filter Functions', () => {
    beforeEach(async () => {
      // Set up initial images
      await indexModule.displayImages(['test1.jpg', 'apple.jpg']);
    });

    test('initializeLetterFilter creates letter buttons', () => {
      indexModule.initializeLetterFilter();

      const letterFilter = document.getElementById('letter-filter');
      expect(letterFilter.children.length).toBeGreaterThan(0);
      expect(letterFilter.querySelectorAll('button').length).toBe(27); // A-Z + All
    });

    test('filterImagesByLetter shows/hides correct images', () => {
      indexModule.filterImagesByLetter('A');

      const visibleImages = Array.from(imageGrid.querySelectorAll('.image-container'))
        .filter((container) => container.style.display !== 'none');
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('img').alt).toBe('apple.jpg');
    });

    test('initializeSearchFilter sets up search input', () => {
      indexModule.initializeSearchFilter();

      const searchFilter = document.getElementById('search-filter');
      expect(searchFilter.querySelector('input')).toBeTruthy();
    });

    test('filterImagesBySearch filters images correctly', () => {
      indexModule.filterImagesBySearch('test1');

      const visibleImages = Array.from(imageGrid.querySelectorAll('.image-container'))
        .filter((container) => container.style.display !== 'none');
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('img').alt).toBe('test1.jpg');
    });
  });

  describe('Pagination Functions', () => {
    test('updatePagination creates pagination controls', () => {
      indexModule.updatePagination(1, 3);

      const pagination = document.querySelector('.pagination-controls');
      expect(pagination).toBeTruthy();
      expect(pagination.querySelectorAll('button').length).toBeGreaterThan(0);
    });
  });
});
