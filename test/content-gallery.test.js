/**
 * @jest-environment jsdom
 */

import { ContentGallery } from '../public/js/content-gallery';
import { jest } from '@jest/globals';

describe('ContentGallery', () => {
  let contentGallery;
  let mockContent;

  beforeEach(async () => {
    // Mock URL parameters
    const url = 'http://localhost?image-name=test';
    delete window.location;
    window.location = new URL(url);

    document.body.innerHTML = `
      <div class="gallery-container">
        <div class="gallery-controls">
          <input class="gallery-search" type="text" placeholder="Search..." />
          <select id="type-filter">
            <option value="">All</option>
            <option value="Video">Videos</option>
            <option value="Images">Images</option>
          </select>
          <select id="sort-filter">
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="size-asc">Size (Small to Large)</option>
            <option value="size-desc">Size (Large to Small)</option>
          </select>
          <select id="tags-filter">
            <option value="">All Tags</option>
          </select>
        </div>
        <div class="gallery-grid"></div>
        <div class="gallery-loading"></div>
        <div id="contentModal" class="modal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <div class="modal-body"></div>
          </div>
        </div>
        <div id="imageModal" class="modal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <img class="modal-img" src="" alt="" />
          </div>
        </div>
      </div>
    `;

    // Mock fetch before creating gallery
    mockContent = [
      {
        id: '1',
        content_type: 'video',
        content_name: 'test1.mp4',
        content_path: '/Volumes/VideosNew/test1.mp4',
        content_date: '2023-01-01',
        content_size: 1000,
        content_tags: ['tag1', 'tag2'],
      },
      {
        id: '2',
        content_type: 'image',
        content_name: 'test1.jpg',
        content_path: '/test1.jpg',
        content_date: '2023-01-02',
        content_size: 500,
        content_tags: ['tag1'],
      },
    ];

    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ items: mockContent, total: mockContent.length }),
    }));

    // Trigger DOMContentLoaded to initialize gallery
    document.dispatchEvent(new Event('DOMContentLoaded'));
    contentGallery = window.gallery;

    // Wait for content to load and render
    await contentGallery.loadContent();
    // Force filterAndRenderItems to run
    await contentGallery.filterAndRenderItems();
    // Wait for DOM updates
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('retries failed requests', async () => {
    const failedResponse = { ok: false, status: 500 };
    const successResponse = {
      ok: true,
      json: () => Promise.resolve({ items: mockContent, total: mockContent.length }),
    };

    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve(failedResponse))
      .mockImplementationOnce(() => Promise.resolve(successResponse));

    await contentGallery.loadContent();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  describe('Filtering and Sorting', () => {
    test('filters by type', async () => {
      const typeFilter = document.getElementById('type-filter');
      typeFilter.value = 'Video';
      typeFilter.dispatchEvent(new Event('change'));

      // Wait for filtering
      await contentGallery.filterAndRenderItems();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const visibleItems = Array.from(document.querySelectorAll('.gallery-item'))
        .filter((item) => !item.style.display || item.style.display !== 'none');
      expect(visibleItems.length).toBe(1);
      expect(JSON.parse(visibleItems[0].dataset.item).content_name).toBe('test1.mp4');
    });

    test('filters by search term', async () => {
      const searchInput = document.querySelector('.gallery-search');
      searchInput.value = 'test1.mp4';
      searchInput.dispatchEvent(new Event('input'));

      // Wait for filtering
      await contentGallery.filterAndRenderItems();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const visibleItems = Array.from(document.querySelectorAll('.gallery-item'))
        .filter((item) => !item.style.display || item.style.display !== 'none');
      expect(visibleItems.length).toBe(1);
      expect(JSON.parse(visibleItems[0].dataset.item).content_name).toBe('test1.mp4');
    });

    test('sorts by name ascending', async () => {
      const sortSelect = document.getElementById('sort-filter');
      sortSelect.value = 'name-asc';
      sortSelect.dispatchEvent(new Event('change'));

      // Wait for sorting
      await contentGallery.filterAndRenderItems();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const names = Array.from(document.querySelectorAll('.gallery-item'))
        .map((el) => JSON.parse(el.dataset.item).content_name);
      expect(names).toEqual(['test1.jpg', 'test1.mp4']);
    });

    test('sorts by size ascending', async () => {
      const sortSelect = document.getElementById('sort-filter');
      sortSelect.value = 'size-asc';
      sortSelect.dispatchEvent(new Event('change'));

      // Wait for sorting
      await contentGallery.filterAndRenderItems();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const sizes = Array.from(document.querySelectorAll('.gallery-item'))
        .map((el) => JSON.parse(el.dataset.item).content_size);
      expect(sizes).toEqual([500, 1000]);
    });
  });

  describe('Modal Handling', () => {
    test('opens modal for video', async () => {
      // Wait for initial render
      await contentGallery.filterAndRenderItems();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Find the video item
      const videoItem = Array.from(document.querySelectorAll('.gallery-item'))
        .find((item) => JSON.parse(item.dataset.item).content_type === 'video');

      videoItem.click();
      expect(document.getElementById('contentModal').style.display).toBe('block');
    });

    test('opens modal for image', async () => {
      // Wait for initial render
      await contentGallery.filterAndRenderItems();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Find the image item
      const imageItem = Array.from(document.querySelectorAll('.gallery-item'))
        .find((item) => JSON.parse(item.dataset.item).content_type === 'image');

      imageItem.click();
      expect(document.getElementById('imageModal').style.display).toBe('block');
    });

    test('closes modal', async () => {
      // Wait for initial render
      await contentGallery.filterAndRenderItems();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Open modal first
      const firstItem = document.querySelector('.gallery-item');
      firstItem.click();

      // Close modal
      document.querySelector('#imageModal .close').click();
      expect(document.getElementById('imageModal').style.display).toBe('none');
    });
  });
});
