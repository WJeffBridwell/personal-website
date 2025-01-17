/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { Gallery } from '../public/js/gallery.js';
import {
  setupGalleryDOM, setupFetchMock, cleanupDOM, mockGalleryData,
} from './utils/setupTests';

describe('Gallery Core Functionality', () => {
  let gallery;
  let container;
  let imageGrid;
  let modal;

  beforeEach(() => {
    container = setupGalleryDOM();
    imageGrid = document.querySelector('#image-grid');
    modal = document.querySelector('#imageModal');
    setupFetchMock(true);
    gallery = new Gallery(container);
  });

  afterEach(() => {
    cleanupDOM();
    jest.clearAllMocks();
  });

  describe('Image Loading', () => {
    test('handles fetch errors', async () => {
      setupFetchMock(false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await gallery.loadImages();
      expect(consoleSpy).toHaveBeenCalled();
      expect(imageGrid.querySelector('.error-message')).toBeTruthy();

      consoleSpy.mockRestore();
    });
  });

  describe('Filtering and Sorting', () => {
    beforeEach(async () => {
      await gallery.loadImages();
    });

    test('sorts by date descending', () => {
      const sortSelect = document.querySelector('#sortSelect');
      sortSelect.value = 'date-desc';
      sortSelect.dispatchEvent(new Event('change'));

      const imageDates = Array.from(imageGrid.querySelectorAll('.image-container'))
        .map((el) => el.getAttribute('data-date'));
      expect(imageDates).toEqual(['2024-01-02', '2024-01-01']);
    });
  });

  describe('Modal Functionality', () => {
    beforeEach(async () => {
      await gallery.loadImages();
    });

    test('opens modal when image is clicked', () => {
      const firstImage = imageGrid.querySelector('.image-container');
      firstImage.click();
      expect(modal.style.display).toBe('flex');
    });

    test('closes modal when close button is clicked', () => {
      const firstImage = imageGrid.querySelector('.image-container');
      firstImage.click();

      const closeBtn = modal.querySelector('.close-modal');
      closeBtn.click();
      expect(modal.style.display).toBe('none');
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      await gallery.loadImages();
    });

    test('maintains keyboard navigation', () => {
      const firstImage = imageGrid.querySelector('.image-container');
      firstImage.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(modal.style.display).toBe('flex');
    });

    test('handles screen reader announcements', async () => {
      const firstImage = imageGrid.querySelector('.image-container');
      expect(firstImage.getAttribute('role')).toBe('button');
      expect(firstImage.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
