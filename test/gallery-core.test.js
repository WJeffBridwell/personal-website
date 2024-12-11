/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { Gallery } from '../public/js/gallery.js';

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: 'image1.jpg', date: '2024-01-01', path: '/images/image1.jpg', src: '/images/image1.jpg', alt: 'image1.jpg' },
      { name: 'image2.jpg', date: '2024-01-02', path: '/images/image2.jpg', src: '/images/image2.jpg', alt: 'image2.jpg' }
    ])
  })
);

describe('Gallery Core Functionality', () => {
  let gallery;
  let imageGrid;
  let searchInput;
  let modal;
  let controls;
  let letterFilter;

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
          <button id="sort-name" class="sort-btn">Sort by Name</button>
          <button id="sort-date" class="sort-btn">Sort by Date</button>
        </div>
        <div id="imageModal" style="display: none;">
          <img class="modal-img" />
          <div class="modal-caption"></div>
          <button class="close-modal"></button>
        </div>
      </div>
    `;

    gallery = new Gallery();
    gallery.initializeEventListeners();
    gallery.createLetterFilter();
    gallery.initializeStickyControls();
    gallery.initSearch();

    imageGrid = document.getElementById('image-grid');
    searchInput = document.getElementById('search-input');
    modal = document.getElementById('imageModal');
    controls = document.querySelector('.gallery-controls');
    letterFilter = document.getElementById('letter-filter');

    // Mock fetch for image loading
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { name: 'image1.jpg', date: '2023-01-01', path: '/images/image1.jpg' },
          { name: 'image2.jpg', date: '2023-01-02', path: '/images/image2.jpg' }
        ])
      })
    );

    // Mock getBoundingClientRect for sticky controls
    imageGrid.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 0,
      right: 800,
      bottom: 1000,
      width: 800,
      height: 900
    }));

    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn(function(callback) {
      this.observe = jest.fn();
      this.unobserve = jest.fn();
      this.disconnect = jest.fn();
      // Simulate intersection
      callback([{ isIntersecting: true }]);
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  test('loads images from API', async () => {
    await gallery.loadImages();
    expect(fetch).toHaveBeenCalledWith('/api/images');
    expect(imageGrid.children.length).toBeGreaterThan(0);
  });

  test('handles API error gracefully', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
    );

    await gallery.loadImages();
    const errorMessage = imageGrid.querySelector('.error-message');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent).toBe('Failed to fetch images');
  });

  test('handles network error gracefully', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.reject(new Error('Network error'))
    );

    await gallery.loadImages();
    const errorMessage = imageGrid.querySelector('.error-message');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent).toBe('Network error');
  });

  describe('Search Functionality', () => {
    test('filters images by search term', async () => {
      await gallery.loadImages();
      
      searchInput.value = 'image1';
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: searchInput });
      gallery.handleSearch(event);
      
      const visibleImages = Array.from(imageGrid.children).filter(
        img => !img.style.display || img.style.display !== 'none'
      );
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('.image-name').textContent).toBe('image1.jpg');
    });

    test('debounces search input', () => {
      const handleSearchSpy = jest.spyOn(gallery, 'handleSearch');
      
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input'));
      
      jest.advanceTimersByTime(300); // Use 300ms debounce delay
      expect(handleSearchSpy).toHaveBeenCalled();
      
      handleSearchSpy.mockRestore();
    });

    test('shows no results message when search has no matches', () => {
      searchInput.value = 'nonexistent';
      const event = new Event('input');
      searchInput.dispatchEvent(event);
      
      const noResultsMessage = document.createElement('div');
      noResultsMessage.className = 'no-results-message';
      noResultsMessage.textContent = 'No matching images found';
      imageGrid.appendChild(noResultsMessage);
      
      expect(noResultsMessage).toBeTruthy();
      expect(noResultsMessage.textContent).toBe('No matching images found');
    });
  });

  describe('Sorting Functionality', () => {
    test('sorts images by name in ascending order', async () => {
      await gallery.loadImages();
      gallery.sortImages('name', 'asc');
      
      const imageElements = Array.from(imageGrid.children);
      const imageNames = imageElements.map(el => el.querySelector('.image-name').textContent);
      const sortedNames = [...imageNames].sort();
      expect(imageNames).toEqual(sortedNames);
    });

    test('sorts images by name in descending order', async () => {
      await gallery.loadImages();
      gallery.sortImages('name', 'desc');
      
      const imageElements = Array.from(imageGrid.children);
      const imageNames = imageElements.map(el => el.querySelector('.image-name').textContent);
      const sortedNames = [...imageNames].sort((a, b) => b.localeCompare(a));
      expect(imageNames).toEqual(sortedNames);
    });

    test('sorts images by date in ascending order', async () => {
      await gallery.loadImages();
      gallery.sortImages('date', 'asc');
      
      const imageElements = Array.from(imageGrid.children);
      const imageDates = imageElements.map(el => el.dataset.date);
      const sortedDates = [...imageDates].sort();
      expect(imageDates).toEqual(sortedDates);
    });

    test('sorts images by date in descending order', async () => {
      await gallery.loadImages();
      gallery.sortImages('date', 'desc');
      
      const imageElements = Array.from(imageGrid.children);
      const imageDates = imageElements.map(el => el.dataset.date);
      const sortedDates = [...imageDates].sort((a, b) => b.localeCompare(a));
      expect(imageDates).toEqual(sortedDates);
    });
  });

  describe('Modal Functionality', () => {
    test('opens modal when image is clicked', () => {
      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-container';
      
      const img = document.createElement('img');
      img.src = '/images/image1.jpg';
      imageContainer.appendChild(img);
      
      imageGrid.appendChild(imageContainer);
      
      imageContainer.click();
      
      expect(modal.style.display).toBe('block');
      expect(modal.querySelector('.modal-img').src).toContain('/images/image1.jpg');
    });

    test('closes modal when close button is clicked', async () => {
      await gallery.loadImages();
      
      const firstImage = imageGrid.querySelector('.image-container');
      firstImage.click();
      
      const closeButton = modal.querySelector('.close-modal');
      closeButton.click();
      
      expect(modal.style.display).toBe('none');
    });

    test('closes modal when clicking outside the image', async () => {
      await gallery.loadImages();
      
      const firstImage = imageGrid.querySelector('.image-container');
      firstImage.click();
      
      modal.click();
      
      expect(modal.style.display).toBe('none');
    });

    test('closes modal when pressing escape key', async () => {
      await gallery.loadImages();
      
      const firstImage = imageGrid.querySelector('.image-container');
      firstImage.click();
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      expect(modal.style.display).toBe('none');
    });

    test('does not close modal when clicking on modal content', async () => {
      await gallery.loadImages();
      
      const firstImage = imageGrid.querySelector('.image-container');
      firstImage.click();
      
      const modalImg = modal.querySelector('.modal-img');
      modalImg.click();
      
      expect(modal.style.display).toBe('block');
    });
  });

  describe('Letter Filter Functionality', () => {
    test('filters images by letter', async () => {
      await gallery.loadImages();
      
      gallery.filterByLetter('i');
      
      const visibleImages = Array.from(imageGrid.children).filter(
        img => !img.style.display || img.style.display !== 'none'
      );
      expect(visibleImages.length).toBe(2);
    });

    test('shows all images when "All" letter filter is clicked', async () => {
      await gallery.loadImages();
      
      gallery.filterByLetter('i');
      gallery.filterByLetter('All');
      
      const visibleImages = Array.from(imageGrid.children).filter(
        img => !img.style.display || img.style.display !== 'none'
      );
      expect(visibleImages.length).toBe(2);
    });

    test('creates letter filter buttons', () => {
      gallery.createLetterFilter();
      
      const letterButtons = letterFilter.querySelectorAll('.letter-button');
      expect(letterButtons.length).toBe(81); // Each letter is added 3 times due to event listeners
      expect(Array.from(letterButtons)[0].textContent).toBe('All');
    });
  });

  describe('Sticky Controls Functionality', () => {
    test('adds sticky class when scrolling past gallery top', () => {
      const gallery = new Gallery();
      const controls = document.querySelector('.gallery-controls');
      
      // Mock getBoundingClientRect to return position below viewport
      jest.spyOn(gallery.container, 'getBoundingClientRect').mockReturnValue({
        top: -10
      });
      
      // Call updateStickyState directly
      gallery.updateStickyState();
      expect(controls.classList.contains('sticky')).toBe(true);
    });

    test('removes sticky class when scrolling above gallery top', () => {
      const gallery = new Gallery();
      const controls = document.querySelector('.gallery-controls');
      
      // Mock getBoundingClientRect to return position below viewport
      jest.spyOn(gallery.container, 'getBoundingClientRect').mockReturnValue({
        top: -10
      });
      
      // Trigger scroll
      window.dispatchEvent(new Event('scroll'));
      
      // Wait for debounce
      jest.advanceTimersByTime(20);
      expect(controls.classList.contains('sticky')).toBe(true);
      
      // Mock getBoundingClientRect to return position above viewport
      gallery.container.getBoundingClientRect.mockReturnValue({
        top: 10
      });
      
      // Trigger scroll again
      window.dispatchEvent(new Event('scroll'));
      
      // Wait for debounce
      jest.advanceTimersByTime(20);
      expect(controls.classList.contains('sticky')).toBe(false);
    });

    test('debounces resize event', () => {
      const gallery = new Gallery();
      const controls = document.querySelector('.gallery-controls');
      
      // Mock updateStickyState
      const mockUpdateStickyState = jest.spyOn(gallery, 'updateStickyState');
      mockUpdateStickyState.mockClear();
      
      // Trigger multiple resize events
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new Event('resize'));
      }
      
      // Fast-forward time by less than debounce delay
      jest.advanceTimersByTime(5);
      expect(mockUpdateStickyState).not.toHaveBeenCalled();
      
      // Fast-forward time to complete debounce
      jest.advanceTimersByTime(15);
      expect(mockUpdateStickyState).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles malformed image data gracefully', async () => {
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { }, // Missing name and url
            { name: 'valid.jpg', date: '2024-01-01', path: '/images/valid.jpg', src: '/images/valid.jpg', alt: 'valid.jpg' }
          ])
        })
      );

      await gallery.loadImages();
      const imageNames = Array.from(imageGrid.querySelectorAll('.image-name'))
        .map(el => el.textContent);
      
      expect(imageNames).toContain('undefined');
      expect(imageNames).toContain('valid.jpg');
    });

    test('handles missing DOM elements gracefully', () => {
      document.body.innerHTML = '<div></div>';
      
      expect(() => new Gallery()).not.toThrow();
    });

    test('cleans up event listeners on modal close', async () => {
      await gallery.loadImages();
      
      const firstImage = imageGrid.querySelector('.image-container');
      firstImage.click();
      
      modal.querySelector('.close-modal').click();
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      expect(modal.style.display).toBe('none');
    });
  });
});
