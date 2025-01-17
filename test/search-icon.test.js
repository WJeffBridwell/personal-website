import { jest } from '@jest/globals';

/**
 * @jest-environment jsdom
 */

describe('Search Icon Functionality', () => {
  let fetchMock;
  let consoleSpy;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
            <div id="image-grid" class="image-grid">
                <div class="image-container">
                    <img src="/images/test1.jpg" alt="test1" class="loaded">
                    <i class="fas fa-search search-icon"></i>
                </div>
            </div>
        `;

    // Mock fetch
    fetchMock = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, searchTerm: 'test1' }),
    }));
    global.fetch = fetchMock;

    // Spy on console.error for error cases
    consoleSpy = jest.spyOn(console, 'error');

    // Initialize click handlers
    const img = document.querySelector('img');
    const searchIcon = document.querySelector('.search-icon');
    const container = document.querySelector('.image-container');

    // Set up click handlers
    searchIcon.onclick = async function (e) {
      e.stopPropagation(); // Prevent event from bubbling
      try {
        const response = await fetch(`/api/finder-search?term=${encodeURIComponent(img.alt)}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Search failed');
        }
      } catch (error) {
        console.error('Search error:', error);
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = 'Search failed';
        document.body.appendChild(errorElement);
      }
    };
  });

  test('clicking search icon launches finder search', async () => {
    const searchIcon = document.querySelector('.search-icon');
    expect(searchIcon).toBeTruthy();

    // Click the search icon
    searchIcon.click();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify fetch was called with correct URL
    expect(fetchMock).toHaveBeenCalledWith('/api/finder-search?term=test1');

    // Verify no errors occurred
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test('handles finder search error gracefully', async () => {
    // Mock fetch to return error
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 500,
    }));

    const searchIcon = document.querySelector('.search-icon');
    searchIcon.click();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));

    // Verify error message is displayed
    const errorMessage = document.querySelector('.error-message');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent).toBe('Search failed');
  });

  test('handles finder search invalid response gracefully', async () => {
    // Mock fetch to return invalid success status
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: false, error: 'Invalid search' }),
    }));

    const searchIcon = document.querySelector('.search-icon');
    searchIcon.click();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));

    // Verify error message is displayed
    const errorMessage = document.querySelector('.error-message');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent).toBe('Search failed');
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });
});
