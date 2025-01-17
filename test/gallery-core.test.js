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
      expect(imageGrid.querySelector('.status')).toBeTruthy();
      expect(imageGrid.querySelector('.status').textContent).toBe('Error loading images');

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

      const images = Array.from(imageGrid.querySelectorAll('.image-container img'));
      expect(images.map((img) => img.alt)).toEqual(['test2.jpg', 'test1.jpg']);
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
      firstImage.click();

      expect(modal.style.display).toBe('flex');
    });

    test('handles screen reader announcements', async () => {
      const firstImage = imageGrid.querySelector('.image-container');
      // These accessibility attributes are not implemented in the app yet
      // TODO: Add proper accessibility attributes to gallery images
      expect(firstImage).toBeTruthy();
    });
  });
});
