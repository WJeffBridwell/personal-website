/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { Gallery } from '../public/js/gallery.js';

describe('Gallery Class', () => {
  let gallery;
  let galleryContainer;
  let mockImages;

  beforeEach(() => {
    // Setup test data
    mockImages = [
      {
        name: 'image1.jpg',
        path: '/images/image1.jpg',
        date: '2023-01-01',
        tags: ['red', 'nature'],
      },
      {
        name: 'image2.jpg',
        path: '/images/image2.jpg',
        date: '2023-02-01',
        tags: ['blue', 'urban'],
      },
      {
        name: 'image3.jpg',
        path: '/images/image3.jpg',
        date: '2023-03-01',
        tags: ['green', 'nature'],
      },
    ];

    // Setup DOM
    document.body.innerHTML = `
      <div id="gallery-container">
        <div id="image-grid"></div>
        <button id="prevPage" disabled></button>
        <button id="nextPage"></button>
        <div id="pageNumbers"></div>
        <input type="text" id="searchInput" />
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
        <div id="imageModal" class="modal">
          <div class="modal-content">
            <img class="modal-img">
            <div class="modal-caption"></div>
            <span class="close-modal">&times;</span>
          </div>
        </div>
      </div>
    `;

    // Initialize gallery
    galleryContainer = document.getElementById('gallery-container');
    gallery = new Gallery(galleryContainer);

    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('initializes with correct DOM elements', () => {
      expect(gallery.imageGrid).toBeTruthy();
      expect(gallery.searchInput).toBeTruthy();
      expect(gallery.sortSelect).toBeTruthy();
      expect(gallery.tagSelect).toBeTruthy();
      expect(gallery.letterFilter).toBeTruthy();
      expect(gallery.modal).toBeTruthy();
    });

    test('initializes with correct default state', () => {
      expect(gallery.allImages).toEqual([]);
      expect(gallery.filteredImages).toEqual([]);
      expect(gallery.currentPage).toBe(1);
      expect(gallery.itemsPerPage).toBe(30);
      expect(gallery.searchTerm).toBe('');
      expect(gallery.sortOrder).toBe('name-asc');
      expect(gallery.currentLetter).toBe('all');
      expect(gallery.selectedTags.size).toBe(0);
    });
  });

  describe('Image Loading', () => {
    test('loads images successfully from API', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ images: mockImages }),
      });

      await gallery.loadImages();
      expect(fetch).toHaveBeenCalledWith('/api/gallery/images');
      expect(gallery.allImages).toEqual(mockImages);
    });

    test('handles API error gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await gallery.loadImages();
      expect(gallery.imageGrid.innerHTML).toContain('Error loading images');
    });

    test('updates tag select with available tags', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ images: mockImages }),
      });

      await gallery.loadImages();
      const options = Array.from(gallery.tagSelect.options).map((opt) => opt.value);
      expect(options).toContain('red');
      expect(options).toContain('blue');
      expect(options).toContain('green');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ images: mockImages }),
      });
      await gallery.loadImages();
    });

    test('filters images based on search term', () => {
      gallery.searchInput.value = 'image1';
      gallery.searchInput.dispatchEvent(new Event('input'));

      expect(gallery.filteredImages.length).toBe(1);
      expect(gallery.filteredImages[0].name).toBe('image1.jpg');
    });

    test('is case insensitive', () => {
      gallery.searchInput.value = 'IMAGE2';
      gallery.searchInput.dispatchEvent(new Event('input'));

      expect(gallery.filteredImages.length).toBe(1);
      expect(gallery.filteredImages[0].name).toBe('image2.jpg');
    });

    test('shows all images when search is cleared', () => {
      gallery.searchInput.value = '';
      gallery.searchInput.dispatchEvent(new Event('input'));

      expect(gallery.filteredImages.length).toBe(mockImages.length);
    });
  });

  describe('Tag Filtering', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ images: mockImages }),
      });
      await gallery.loadImages();
    });

    test('filters images by tag', () => {
      gallery.tagSelect.value = 'nature';
      gallery.tagSelect.dispatchEvent(new Event('change'));

      expect(gallery.filteredImages.length).toBe(2);
      expect(gallery.filteredImages.every((img) => img.tags.includes('nature'))).toBe(true);
    });

    test('shows all images when no tag is selected', () => {
      gallery.tagSelect.value = '';
      gallery.tagSelect.dispatchEvent(new Event('change'));

      expect(gallery.filteredImages.length).toBe(mockImages.length);
    });
  });

  describe('Sorting', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ images: mockImages }),
      });
      await gallery.loadImages();
    });

    test('sorts by name ascending', () => {
      gallery.sortSelect.value = 'name-asc';
      gallery.sortSelect.dispatchEvent(new Event('change'));

      const names = gallery.filteredImages.map((img) => img.name);
      expect(names).toEqual(['image1.jpg', 'image2.jpg', 'image3.jpg']);
    });

    test('sorts by name descending', () => {
      gallery.sortSelect.value = 'name-desc';
      gallery.sortSelect.dispatchEvent(new Event('change'));

      const names = gallery.filteredImages.map((img) => img.name);
      expect(names).toEqual(['image3.jpg', 'image2.jpg', 'image1.jpg']);
    });

    test('sorts by date ascending', () => {
      gallery.sortSelect.value = 'date-asc';
      gallery.sortSelect.dispatchEvent(new Event('change'));

      const dates = gallery.filteredImages.map((img) => img.date);
      expect(dates).toEqual(['2023-01-01', '2023-02-01', '2023-03-01']);
    });

    test('sorts by date descending', () => {
      gallery.sortSelect.value = 'date-desc';
      gallery.sortSelect.dispatchEvent(new Event('change'));

      const dates = gallery.filteredImages.map((img) => img.date);
      expect(dates).toEqual(['2023-03-01', '2023-02-01', '2023-01-01']);
    });
  });

  describe('Modal Functionality', () => {
    test('opens modal with correct image', () => {
      const imagePath = '/images/test.jpg';
      const imageName = 'test.jpg';

      gallery.openModal(imagePath, imageName);

      expect(gallery.modal.style.display).toBe('flex');
      expect(gallery.modalImg.src).toContain(imagePath);
      expect(gallery.modalCaption.textContent).toBe(imageName);
    });

    test('closes modal when close button is clicked', () => {
      gallery.openModal('/images/test.jpg', 'test.jpg');
      gallery.closeBtn.click();

      expect(gallery.modal.style.display).toBe('none');
    });

    test('closes modal when clicking outside the image', () => {
      gallery.openModal('/images/test.jpg', 'test.jpg');
      gallery.modal.click();

      expect(gallery.modal.style.display).toBe('none');
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ images: Array(50).fill(mockImages[0]) }), // Create 50 images
      });
      await gallery.loadImages();
    });

    test('shows correct number of images per page', () => {
      const displayedImages = gallery.imageGrid.querySelectorAll('.image-container');
      expect(displayedImages.length).toBeLessThanOrEqual(gallery.itemsPerPage);
    });

    test('updates page when clicking next', () => {
      const initialPage = gallery.currentPage;
      gallery.nextPageBtn.click();
      expect(gallery.currentPage).toBe(initialPage + 1);
    });

    test('updates page when clicking previous', () => {
      // First go to next page
      gallery.nextPageBtn.click();
      const { currentPage } = gallery;

      // Then go back
      gallery.prevPageBtn.click();
      expect(gallery.currentPage).toBe(currentPage - 1);
    });

    test('disables previous button on first page', () => {
      expect(gallery.prevPageBtn.disabled).toBe(true);
    });
  });
});
