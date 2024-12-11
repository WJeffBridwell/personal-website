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
      const initialState = document.body.innerHTML;
      
      gallery.handleSearch(null);
      gallery.handleSearch({});
      gallery.handleSearch({ target: null });

      expect(document.body.innerHTML).toBe(initialState);
    });
  });

  describe('Letter Filter Functionality', () => {
    test('filterByLetter shows images starting with selected letter', () => {
      gallery.filterByLetter('A');
      jest.runAllTimers();

      const containers = document.querySelectorAll('.image-container');
      const visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(1);
      expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Apple.jpg');
    });

    test('filterByLetter is case sensitive', () => {
      // Should show no images for lowercase 'b'
      gallery.filterByLetter('b');
      jest.runAllTimers();

      let containers = document.querySelectorAll('.image-container');
      let visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(0);

      // Should show Beach.jpg for uppercase 'B'
      gallery.filterByLetter('B');
      jest.runAllTimers();

      containers = document.querySelectorAll('.image-container');
      visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(1);
      expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
    });

    test('filterByLetter shows all images when "All" is selected', () => {
      gallery.filterByLetter('All');
      jest.runAllTimers();

      const containers = document.querySelectorAll('.image-container');
      const visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(3);
    });

    test('filterByLetter handles invalid inputs gracefully', () => {
      const containers = document.querySelectorAll('.image-container');
      
      // Set initial state
      gallery.filterByLetter('All');
      jest.runAllTimers();
      
      const initialVisibleCount = Array.from(containers).filter(c => !c.classList.contains('hidden')).length;

      // These should not change visibility
      gallery.filterByLetter(null);
      gallery.filterByLetter('');
      gallery.filterByLetter(undefined);
      jest.runAllTimers();

      const visibleContainers = Array.from(containers).filter(c => !c.classList.contains('hidden'));
      expect(visibleContainers.length).toBe(initialVisibleCount);
    });
  });

  describe('Sorting Functionality', () => {
    test('sorts by name descending', () => {
      gallery.sortByName();
      jest.runAllTimers();

      const containers = document.querySelectorAll('.image-container');
      const names = Array.from(containers).map(c => c.querySelector('.image-name').textContent);
      expect(names[0]).toBe('Zebra.jpg');
      expect(names[2]).toBe('Apple.jpg');
    });

    test('sorts by date ascending', () => {
      gallery.sortByDate();
      jest.runAllTimers();

      const containers = document.querySelectorAll('.image-container');
      const names = Array.from(containers).map(c => c.querySelector('.image-name').textContent);
      expect(names[0]).toBe('Beach.jpg');
      expect(names[2]).toBe('Zebra.jpg');
    });
  });

  describe('Modal Functionality', () => {
    test('opens modal when image is clicked', () => {
      const imageContainer = document.querySelector('.image-container');
      imageContainer.click();
      
      expect(modal.style.display).toBe('block');
      expect(modalImg.src).toContain('Beach.jpg');
    });

    test('closes modal when clicking close button', () => {
      const imageContainer = document.querySelector('.image-container');
      imageContainer.click();
      
      const closeButton = modal.querySelector('.close-modal');
      closeButton.click();
      
      expect(modal.style.display).toBe('none');
    });

    test('closes modal when clicking outside modal content', () => {
      modal.style.display = 'block';
      modal.click();
      
      expect(modal.style.display).toBe('none');
    });

    test('does not close modal when clicking inside modal content', () => {
      modal.style.display = 'block';
      const modalContent = modal.querySelector('.modal-content');
      modalContent.click();
      
      expect(modal.style.display).toBe('block');
    });
  });

  describe('Performance Tests', () => {
    test('debounce function limits execution rate', async () => {
      const gallery = new Gallery();
      jest.useFakeTimers();
      let counter = 0;
      const increment = () => counter++;
      const debouncedIncrement = gallery.debounce(increment, 100);

      // Call multiple times
      debouncedIncrement();
      debouncedIncrement();
      debouncedIncrement();

      expect(counter).toBe(0); // Should not have executed yet

      jest.advanceTimersByTime(100);
      await Promise.resolve(); 
      expect(counter).toBe(1); // Should have executed once

      jest.useRealTimers();
    });
  });
});
