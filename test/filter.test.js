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
    });

    test('filters by search term', async () => {
      searchInput.value = 'test1';
      searchInput.dispatchEvent(new Event('input'));

      // Wait for filtering to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      const visibleImages = imageGrid.querySelectorAll('.image-container');
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('img').alt).toBe('test1.jpg');
    });

    test('filters by tag', async () => {
      const tagSelect = document.querySelector('#tagSelect');
      tagSelect.value = 'nature';
      tagSelect.dispatchEvent(new Event('change'));

      // Wait for filtering to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      const visibleImages = imageGrid.querySelectorAll('.image-container');
      expect(visibleImages.length).toBe(1);
      expect(visibleImages[0].querySelector('img').alt).toBe('test1.jpg');
    });
  });

  describe('Sorting', () => {
    beforeEach(async () => {
      await gallery.loadImages();
    });

    test('sorts by name', async () => {
      sortSelect.value = 'name-desc';
      sortSelect.dispatchEvent(new Event('change'));

      // Wait for sorting to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      const images = Array.from(imageGrid.querySelectorAll('.image-container img'));
      expect(images.map((img) => img.alt)).toEqual(['test2.jpg', 'test1.jpg']);
    });

    test('sorts by date', async () => {
      sortSelect.value = 'date-desc';
      sortSelect.dispatchEvent(new Event('change'));

      // Wait for sorting to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      const images = Array.from(imageGrid.querySelectorAll('.image-container'));
      const dates = images.map((img) => img.getAttribute('data-date'));
      expect(dates).toEqual(['2024-01-02', '2024-01-01']);
    });

    test('sorts by size', async () => {
      sortSelect.value = 'size-desc';
      sortSelect.dispatchEvent(new Event('change'));

      // Wait for sorting to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      const images = Array.from(imageGrid.querySelectorAll('.image-container'));
      const sizes = images.map((img) => parseInt(img.getAttribute('data-size')));
      expect(sizes).toEqual([2048, 1024]);
    });
  });
});
