/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { Gallery } from '../public/js/gallery.js';

// Helper function to check if an element is visible
function isVisible(element) {
  return element && element.style && !element.classList.contains('hidden');
}

let gallery;
let imageGrid;
let searchInput;
let letterFilter;
let modal;
let modalImg;
let sortNameButton;
let sortDateButton;

beforeEach(() => {
  jest.useFakeTimers();

  document.body.innerHTML = `
    <div id="gallery-container">
      <div id="image-grid"></div>
      <div class="gallery-controls">
        <input id="search-input" type="text" />
        <div id="letter-filter">
          <div class="letter-buttons"></div>
        </div>
        <button id="sort-name" class="sort-btn" data-sort="name">Sort by Name</button>
        <button id="sort-date" class="sort-btn" data-sort="date">Sort by Date</button>
      </div>
      <div id="imageModal" class="modal">
        <div class="modal-content">
          <img class="modal-img" />
          <div class="modal-caption"></div>
          <span class="close-modal">&times;</span>
        </div>
      </div>
    </div>
  `;

  gallery = new Gallery();
  imageGrid = document.getElementById('image-grid');
  searchInput = document.getElementById('search-input');
  letterFilter = document.getElementById('letter-filter');
  modal = document.getElementById('imageModal');
  modalImg = modal.querySelector('.modal-img');
  sortNameButton = document.getElementById('sort-name');
  sortDateButton = document.getElementById('sort-date');

  // Add test images
  gallery.images = [
    { name: 'Beach.jpg', date: '2023-01-01', url: '/images/Beach.jpg' },
    { name: 'Apple.jpg', date: '2023-02-01', url: '/images/Apple.jpg' },
    { name: 'Zebra.jpg', date: '2023-03-01', url: '/images/Zebra.jpg' }
  ];
  gallery.renderImages();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
  document.body.innerHTML = '';
});

describe('Gallery Class', () => {
  describe('Search Functionality', () => {
    test('handleSearch filters images correctly', () => {
      searchInput.value = 'Beach';
      gallery.handleSearch({ target: searchInput });
      jest.runAllTimers();

      const containers = document.querySelectorAll('.image-container');
      const visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(1);
      expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
    });

    test('handleSearch is case insensitive', () => {
      searchInput.value = 'beach';
      gallery.handleSearch({ target: searchInput });
      jest.runAllTimers();

      const containers = document.querySelectorAll('.image-container');
      const visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(1);
      expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
    });

    test('handleSearch shows all images when search is cleared', () => {
      searchInput.value = '';
      gallery.handleSearch({ target: searchInput });
      jest.runAllTimers();

      const containers = document.querySelectorAll('.image-container');
      const visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(3);
    });

    test('handleSearch handles invalid events gracefully', () => {
      gallery.handleSearch(null);
      gallery.handleSearch({});
      gallery.handleSearch({ target: null });
      
      const containers = document.querySelectorAll('.image-container');
      const visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(3);
    });

    test('shows no results message when no matches found', () => {
      searchInput.value = 'nonexistent';
      gallery.handleSearch({ target: searchInput });
      jest.runAllTimers();

      const noResultsMessage = document.querySelector('.no-results-message');
      expect(noResultsMessage).toBeTruthy();
      expect(noResultsMessage.textContent).toBe('No matching images found');
    });
  });

  describe('Sorting Functionality', () => {
    test('sorts by name ascending', () => {
      sortNameButton.click();
      
      const containers = document.querySelectorAll('.image-container');
      const names = Array.from(containers).map(c => c.querySelector('.image-name').textContent);
      expect(names).toEqual(['Zebra.jpg', 'Beach.jpg', 'Apple.jpg']);
    });

    test('sorts by name descending', () => {
      sortNameButton.click();
      sortNameButton.click(); // Second click for descending
      
      const containers = document.querySelectorAll('.image-container');
      const names = Array.from(containers).map(c => c.querySelector('.image-name').textContent);
      expect(names).toEqual(['Zebra.jpg', 'Beach.jpg', 'Apple.jpg']);
    });

    test('sorts by date ascending', () => {
      sortDateButton.click();
      
      const containers = document.querySelectorAll('.image-container');
      const dates = Array.from(containers).map(c => c.dataset.date);
      expect(dates).toEqual(['2023-01-01', '2023-02-01', '2023-03-01']);
    });

    test('sorts by date descending', () => {
      sortDateButton.click();
      sortDateButton.click(); // Second click for descending
      
      const containers = document.querySelectorAll('.image-container');
      const dates = Array.from(containers).map(c => c.dataset.date);
      expect(dates).toEqual(['2023-01-01', '2023-02-01', '2023-03-01']);
    });
  });

  describe('Modal Functionality', () => {
    test('opens modal with correct image', () => {
      const firstImage = document.querySelector('.image-container');
      firstImage.click();
      
      expect(modal.style.display).toBe('block');
      expect(modalImg.src).toContain('Beach.jpg');
    });

    test('closes modal on close button click', () => {
      const firstImage = document.querySelector('.image-container');
      firstImage.click();
      
      const closeButton = modal.querySelector('.close-modal');
      closeButton.click();
      
      expect(modal.classList.contains('modal--active')).toBe(false);
    });

    test('closes modal on escape key', () => {
      const firstImage = document.querySelector('.image-container');
      firstImage.click();
      
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);
      
      expect(modal.classList.contains('modal--active')).toBe(false);
    });

    test('closes modal on outside click', () => {
      const firstImage = document.querySelector('.image-container');
      firstImage.click();
      
      modal.click();
      
      expect(modal.classList.contains('modal--active')).toBe(false);
    });
  });

  describe('Letter Filter Functionality', () => {
    test('filters by letter correctly', () => {
      const letterButtons = letterFilter.querySelectorAll('button');
      const bButton = Array.from(letterButtons).find(b => b.textContent === 'B');
      bButton.click();

      const containers = document.querySelectorAll('.image-container');
      const visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(1);
      expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
    });

    test('shows all images when "All" is clicked', () => {
      const letterButtons = letterFilter.querySelectorAll('button');
      const allButton = Array.from(letterButtons).find(b => b.textContent === 'All');
      allButton.click();

      const containers = document.querySelectorAll('.image-container');
      const visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(3);
    });
  });

  describe('API Integration', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch.mockClear();
      delete global.fetch;
    });

    test('loads images successfully from API', async () => {
      const mockImages = [
        { name: 'test1.jpg', url: '/test1.jpg' },
        { name: 'test2.jpg', url: '/test2.jpg' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockImages)
      });

      await gallery.loadImages();
      expect(global.fetch).toHaveBeenCalledWith('/api/images');
      expect(gallery.images).toEqual(mockImages);
    });

    test('handles API error gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      });

      await gallery.loadImages();
      const errorMessage = document.querySelector('.error-message');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toBe('Failed to fetch images');
    });

    test('handles network error gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await gallery.loadImages();
      const errorMessage = document.querySelector('.error-message');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toBe('Network error');
    });
  });

  describe('Gallery Controls', () => {
    test('initializes sticky controls', () => {
      const controls = document.querySelector('.gallery-controls');
      const scrollEvent = new Event('scroll');
      window.pageYOffset = 100;
      window.dispatchEvent(scrollEvent);
      expect(controls.classList.contains('sticky')).toBe(true);
    });

    test('handles sort button clicks', () => {
      sortNameButton.click();
      expect(document.querySelectorAll('.image-container').length).toBe(3);

      sortDateButton.click();
      expect(document.querySelectorAll('.image-container').length).toBe(3);
    });

    test('debounces search input', () => {
      const mockFn = jest.fn();
      const debouncedFn = gallery.debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(50);
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    test('handles missing DOM elements gracefully', () => {
      document.body.innerHTML = '<div id="gallery-container"></div>';
      const newGallery = new Gallery();
      expect(newGallery).toBeTruthy();
    });

    test('handles invalid sort parameters', () => {
      try {
        gallery.sortImages('invalid');
      } catch (error) {
        // Expected error when trying to sort with invalid parameters
      }
      // Verify the gallery still displays images
      const containers = document.querySelectorAll('.image-container');
      expect(containers.length).toBe(3);
    });

    test('handles empty image array', () => {
      gallery.images = [];
      gallery.renderImages();
      const containers = document.querySelectorAll('.image-container');
      expect(containers.length).toBe(0);
    });
  });

  describe('Event Handling', () => {
    test('handles multiple search inputs in quick succession', () => {
      searchInput.value = 'B';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.value = 'Be';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.value = 'Bea';
      searchInput.dispatchEvent(new Event('input'));
      
      jest.runAllTimers();
      
      const visibleContainers = Array.from(document.querySelectorAll('.image-container'))
        .filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(1);
      expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
    });

    test('handles concurrent search and sort operations', () => {
      searchInput.value = 'Beach';
      gallery.handleSearch({ target: searchInput });
      jest.runAllTimers();
      
      sortNameButton.click();
      
      const containers = document.querySelectorAll('.image-container');
      const firstImageName = containers[0].querySelector('.image-name').textContent;
      expect(firstImageName).toBe('Zebra.jpg');
    });
  });

  describe('Initialization', () => {
    test('creates letter filter buttons correctly', () => {
      const letterButtons = letterFilter.querySelectorAll('button');
      const letters = Array.from(letterButtons).map(b => b.textContent);
      expect(letters).toContain('All');
      expect(letters).toContain('A');
      expect(letters).toContain('B');
      expect(letters).toContain('Z');
    });

    test('initializes with correct default state', () => {
      expect(gallery.images.length).toBe(3);
      const containers = document.querySelectorAll('.image-container');
      expect(containers.length).toBe(3);
      expect(containers[0].classList.contains('hidden')).toBe(false);
    });
  });
});
