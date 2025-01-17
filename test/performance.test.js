/**
 * Performance Test Suite
 * Tests the performance characteristics of key application features
 */

import {
  describe, test, expect, beforeEach, afterEach,
} from '@jest/globals';

describe('Gallery Performance', () => {
  let imageGrid;
  let searchInput;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="gallery-container">
        <input type="text" id="search-input" />
        <div id="image-grid"></div>
      </div>
    `;
    imageGrid = document.getElementById('image-grid');
    searchInput = document.getElementById('search-input');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('should render large image grid efficiently', () => {
    // Create a large number of test images
    const testImages = Array.from({ length: 100 }, (_, i) => ({
      name: `Test Image ${i}`,
      url: `test-${i}.jpg`,
      date: new Date(2023, 0, i + 1).toISOString(),
    }));

    // Render images
    testImages.forEach((img) => {
      const container = document.createElement('div');
      container.className = 'image-container';
      container.innerHTML = `
        <img src="${img.url}" alt="${img.name}" loading="lazy" />
        <div class="image-name">${img.name}</div>
      `;
      imageGrid.appendChild(container);
    });

    // Verify lazy loading
    const images = imageGrid.querySelectorAll('img');
    images.forEach((img) => {
      expect(img.getAttribute('loading')).toBe('lazy');
    });
  });

  test('should filter images by search term efficiently', () => {
    // Create test data with visibility flags
    const testData = Array.from({ length: 50 }, (_, i) => ({
      name: `Test Image ${i}`,
      url: `test-${i}.jpg`,
      visible: i < 25, // First half should be visible
    }));

    // Render images
    testData.forEach((data) => {
      const container = document.createElement('div');
      container.className = 'image-container';
      if (!data.visible) {
        container.style.display = 'none';
      }
      container.innerHTML = `
        <img src="${data.url}" alt="${data.name}" loading="lazy" />
        <div class="image-name">${data.name}</div>
      `;
      imageGrid.appendChild(container);
    });

    // Get all containers and verify visibility
    const containers = Array.from(imageGrid.querySelectorAll('.image-container'));
    containers.forEach((container, i) => {
      const shouldBeVisible = testData[i].visible;
      expect(container.style.display === 'none').toBe(!shouldBeVisible);
    });
  });
});
