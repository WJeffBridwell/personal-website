/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

// Setup the DOM structure that matches the actual app
export function setupGalleryDOM() {
  const container = document.createElement('div');
  container.innerHTML = `
        <div class="gallery-header">
            <h1>Gallery</h1>
            <div id="processing-status" class="processing-status" style="display: none;"></div>
        </div>
        <section class="gallery">
            <div class="gallery-controls">
                <div class="gallery-controls__left">
                    <input type="text" id="searchInput" placeholder="Search images..." class="search-input">
                    <select id="tagSelect" class="tag-select">
                        <option value="">All Tags</option>
                    </select>
                    <select id="sortSelect" class="sort-select">
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                        <option value="date-asc">Date (Oldest)</option>
                        <option value="date-desc">Date (Newest)</option>
                        <option value="size-asc">Size (Smallest)</option>
                        <option value="size-desc">Size (Largest)</option>
                    </select>
                </div>
                <div class="gallery-controls__filter" id="letterFilter">
                    <button class="letter-filter__btn active" data-letter="all">All</button>
                </div>
            </div>

            <div id="image-grid" class="gallery__grid"></div>

            <div class="pagination-controls">
                <button id="prevPage" class="page-button">&lt; Previous</button>
                <div id="pageNumbers" class="page-numbers"></div>
                <button id="nextPage" class="page-button">Next &gt;</button>
            </div>
        </section>

        <div id="imageModal" class="modal">
            <span class="close-modal">&times;</span>
            <img class="modal-img" src="" alt="" />
            <div class="modal-caption"></div>
        </div>
    `;

  document.body.appendChild(container);
  return container.querySelector('.gallery');
}

// Mock data that matches the app's expected format
export const mockGalleryData = {
  images: [
    {
      name: 'test1.jpg',
      type: 'image',
      url: '/images/test1.jpg',
      size: 1024,
      date: '2024-01-01',
      tags: ['nature'],
      attributes: {
        date: '2024-01-01',
        size: 1024,
      },
    },
    {
      name: 'test2.jpg',
      type: 'image',
      url: '/images/test2.jpg',
      size: 2048,
      date: '2024-01-02',
      tags: ['urban'],
      attributes: {
        date: '2024-01-02',
        size: 2048,
      },
    },
  ],
  total: 2,
  page: 1,
  totalPages: 1,
};

// Clean up function
export function cleanupDOM() {
  document.body.innerHTML = '';
}

// Setup fetch mock
export function setupFetchMock(success = true) {
  if (success) {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockGalleryData),
    }));
  } else {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));
  }
  return global.fetch;
}
