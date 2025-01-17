/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { Gallery } from '../public/js/gallery.js';
import {
  setupGalleryDOM, setupFetchMock, cleanupDOM, mockGalleryData,
} from './utils/setupTests';

describe('Image Loading', () => {
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

  test('loads images successfully', async () => {
    // Wait for initial load from constructor
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check if fetch was called
    expect(fetch).toHaveBeenCalledTimes(1);

    // Wait for rendering to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify grid has correct number of items
    const items = imageGrid.querySelectorAll('.image-container');
    expect(items.length).toBe(mockGalleryData.images.length);

    // Verify first item content
    const firstItem = items[0];
    const img = firstItem.querySelector('img');
    expect(img.src).toContain(mockGalleryData.images[0].url);
    expect(img.alt).toBe(mockGalleryData.images[0].name);
  });

  test('handles API error gracefully', async () => {
    setupFetchMock(false);
    await gallery.loadImages();

    // Should show error message
    const errorMessage = imageGrid.querySelector('.error-message');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent).toBe('Failed to load images');
  });

  test('shows loading state', async () => {
    const loadPromise = gallery.loadImages();

    // Should show loading state
    const loadingElement = imageGrid.querySelector('.loading-progress');
    expect(loadingElement).toBeTruthy();
    expect(loadingElement.textContent).toBe('Loading images...');

    await loadPromise;

    // Loading state should be removed after load
    expect(imageGrid.querySelector('.loading-progress')).toBeFalsy();
  });

  test('updates pagination info', async () => {
    await gallery.loadImages();

    // Wait for rendering to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    const pageNumbers = document.querySelector('#pageNumbers');
    const pageCount = Math.ceil(mockGalleryData.images.length / 30); // 30 items per page
    expect(pageNumbers.textContent).toContain(`${mockGalleryData.images.length} images`);
    expect(pageNumbers.textContent).toContain(`${pageCount} pages`);
  });

  test('opens modal with correct display style', async () => {
    await gallery.loadImages();

    // Wait for rendering to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    const firstImage = imageGrid.querySelector('.image-container');
    firstImage.click();

    expect(modal.style.display).toBe('flex');
    expect(modal.querySelector('.modal-img').src).toContain(mockGalleryData.images[0].url);
    expect(modal.querySelector('.modal-caption').textContent).toBe(mockGalleryData.images[0].name);
  });
});
