/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { Gallery } from '../public/js/gallery.js';
import {
  setupGalleryDOM, setupFetchMock, cleanupDOM, mockGalleryData,
} from './utils/setupTests';

describe('Gallery Filter', () => {
  let gallery;
  let container;
  let imageGrid;
  let searchInput;
  let sortSelect;

  beforeEach(() => {
    container = setupGalleryDOM();
    imageGrid = document.querySelector('#image-grid');
    searchInput = document.querySelector('#searchInput');
    sortSelect = document.querySelector('#sortSelect');
    setupFetchMock(true);
    gallery = new Gallery(container);
  });

  afterEach(() => {
    cleanupDOM();
    jest.clearAllMocks();
  });

  describe('Search Filtering', () => {
    beforeEach(async () => {
      await gallery.loadImages();
      // Wait for initial render
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    test('filters by search term case-insensitively', async () => {
      // Test with uppercase search term
      searchInput.value = 'TEST1';
      searchInput.dispatchEvent(new Event('input'));

      // Wait for filtering to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      let visibleImages = imageGrid.querySelectorAll('.image-container');
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('img').alt).toBe('test1.jpg');

      // Test with lowercase search term
      searchInput.value = 'test2';
      searchInput.dispatchEvent(new Event('input'));

      // Wait for filtering to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      visibleImages = imageGrid.querySelectorAll('.image-container');
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('img').alt).toBe('test2.jpg');
    });

    test('filters by tag case-insensitively', async () => {
      const tagSelect = document.querySelector('#tagSelect');

      // Wait for tag select to be populated
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Test with uppercase tag
      gallery.selectedTags = new Set(['NATURE']);
      gallery.filterAndSortImages();

      // Wait for filtering to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      let visibleImages = imageGrid.querySelectorAll('.image-container');
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('img').alt).toBe('test1.jpg');

      // Test with lowercase tag
      gallery.selectedTags = new Set(['urban']);
      gallery.filterAndSortImages();

      // Wait for filtering to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      visibleImages = imageGrid.querySelectorAll('.image-container');
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('img').alt).toBe('test2.jpg');
    });
  });

  describe('Sorting', () => {
    beforeEach(async () => {
      await gallery.loadImages();
      // Wait for initial render
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    test('sorts by name ascending and descending', async () => {
      // Test ascending sort
      sortSelect.value = 'name-asc';
      sortSelect.dispatchEvent(new Event('change'));

      // Wait for sorting to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      let images = Array.from(imageGrid.querySelectorAll('.image-container img'));
      expect(images.map((img) => img.alt)).toEqual(['test1.jpg', 'test2.jpg']);

      // Test descending sort
      sortSelect.value = 'name-desc';
      sortSelect.dispatchEvent(new Event('change'));

      // Wait for sorting to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      images = Array.from(imageGrid.querySelectorAll('.image-container img'));
      expect(images.map((img) => img.alt)).toEqual(['test2.jpg', 'test1.jpg']);
    });

    test('sorts by date ascending and descending', async () => {
      // Test ascending sort
      sortSelect.value = 'date-asc';
      sortSelect.dispatchEvent(new Event('change'));

      // Wait for sorting to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      let images = Array.from(imageGrid.querySelectorAll('.image-container img'));
      expect(images.map(img => img.alt)).toEqual(['test1.jpg', 'test2.jpg']);

      // Test descending sort
      sortSelect.value = 'date-desc';
      sortSelect.dispatchEvent(new Event('change'));

      // Wait for sorting to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      images = Array.from(imageGrid.querySelectorAll('.image-container img'));
      expect(images.map(img => img.alt)).toEqual(['test2.jpg', 'test1.jpg']);
    });
  });
});
