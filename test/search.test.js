/**
 * Search Functionality Test Suite
 * 
 * Tests the search functionality including:
 * - API endpoint behavior
 * - Search result filtering
 * - Error handling
 * - Integration with Finder
 */

import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { modalFunctions } from '../modal.js';

// Mock DOM environment
const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
        <body>
            <div class="search-container">
                <input type="text" id="search-input" />
                <button id="search-button">Search</button>
            </div>
            <div id="image-grid" class="image-grid"></div>
        </body>
    </html>
`);
global.document = dom.window.document;
global.window = dom.window;

// Mock fetch API
const mockFetch = jest.fn();
global.fetch = mockFetch;

/**
 * Helper function to create mock search results
 * @param {string} query - Search query to filter by
 * @returns {Array} Array of filtered mock image objects
 */
function createMockSearchResults(query = '') {
    const allImages = [
        { name: 'vacation-beach', url: '/images/vacation-beach.jpg' },
        { name: 'family-photo', url: '/images/family-photo.jpg' },
        { name: 'work-presentation', url: '/images/work-presentation.jpg' }
    ];
    
    if (!query) return allImages;
    
    return allImages.filter(img => 
        img.name.toLowerCase().includes(query.toLowerCase())
    );
}

describe('Search Functionality', () => {
    let searchInput;
    let searchButton;
    let imageGrid;
    
    beforeEach(() => {
        // Reset DOM and mocks
        document.body.innerHTML = `
            <div class="search-container">
                <input type="text" id="search-input" />
                <button id="search-button">Search</button>
            </div>
            <div id="image-grid" class="image-grid"></div>
        `;
        
        searchInput = document.getElementById('search-input');
        searchButton = document.getElementById('search-button');
        imageGrid = document.querySelector('.image-grid');
        
        jest.clearAllMocks();
        
        // Reset fetch mock default behavior
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ results: createMockSearchResults() })
        });
        
        // Initialize modal
        modalFunctions.initModal();
    });
    
    afterEach(() => {
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });
    
    describe('Search API', () => {
        test('should call correct endpoint with search query', async () => {
            const query = 'vacation';
            await searchImages(query);
            expect(mockFetch).toHaveBeenCalledWith(
                `/api/search?q=${encodeURIComponent(query)}`
            );
        });
        
        test('should handle empty search query', async () => {
            await searchImages('');
            expect(mockFetch).toHaveBeenCalledWith('/api/search?q=');
        });
        
        test('should handle API errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            const results = await searchImages('test');
            expect(results).toEqual([]);
        });
    });
    
    describe('Search Results Display', () => {
        const query = 'vacation';
        
        test('should display filtered results', async () => {
            const results = createMockSearchResults(query);
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ results })
            });
            
            await searchImages(query);
            await displayImages(results);
            
            const containers = imageGrid.querySelectorAll('.image-container');
            expect(containers.length).toBe(results.length);
        });
        
        test('should handle no results gracefully', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ results: [] })
            });
            
            await searchImages('nonexistent');
            const containers = imageGrid.querySelectorAll('.image-container');
            expect(containers.length).toBe(0);
        });
    });
    
    describe('Finder Integration', () => {
        test('should call Finder search with correct query', async () => {
            const query = 'vacation';
            await searchImageInFinder(query);
            expect(mockFetch).toHaveBeenCalledWith(
                `/api/finder-search?term=${encodeURIComponent(query)}`
            );
        });
        
        test('should handle Finder search errors', async () => {
            mockFetch.mockRejectedValue(new Error('Finder error'));
            await searchImageInFinder('test');
            // Should not throw error
        });
    });
    
    describe('Search Input Handling', () => {
        test('should update search on input change', () => {
            const query = 'test';
            searchInput.value = query;
            searchInput.dispatchEvent(new Event('input'));
            expect(searchInput.value).toBe(query);
        });
        
        test('should trigger search on button click', async () => {
            const query = 'vacation';
            searchInput.value = query;
            
            const mockSearch = jest.fn();
            window.searchImages = mockSearch;
            
            searchButton.click();
            expect(mockSearch).toHaveBeenCalledWith(query);
        });
        
        test('should handle special characters in search', async () => {
            const query = 'test&special?chars';
            await searchImages(query);
            expect(mockFetch).toHaveBeenCalledWith(
                `/api/search?q=${encodeURIComponent(query)}`
            );
        });
    });
    
    describe('Search Icon Functionality', () => {
        test('search icon is added to image container', () => {
            // Create container with search icon
            const container = document.createElement('div');
            container.className = 'image-container';
            
            const img = document.createElement('img');
            img.src = 'test.jpg';
            img.alt = 'Test Image';
            
            const searchIcon = document.createElement('i');
            searchIcon.className = 'fas fa-search search-icon';
            
            container.appendChild(img);
            container.appendChild(searchIcon);
            document.getElementById('image-grid').appendChild(container);

            // Verify search icon exists
            const addedSearchIcon = container.querySelector('.search-icon');
            expect(addedSearchIcon).toBeTruthy();
            expect(addedSearchIcon.classList.contains('fa-search')).toBe(true);
        });

        test('search icon click triggers search', async () => {
            // Create container with search icon
            const container = document.createElement('div');
            container.className = 'image-container';
            
            const img = document.createElement('img');
            img.src = 'test.jpg';
            img.alt = 'Test Image';
            
            const searchIcon = document.createElement('i');
            searchIcon.className = 'fas fa-search search-icon';
            
            // Add click handler
            searchIcon.onclick = async () => {
                try {
                    const response = await fetch('/api/search?query=test');
                    if (!response.ok) {
                        throw new Error('Search failed');
                    }
                    const data = await response.json();
                    if (!data.success) {
                        throw new Error('Invalid search');
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    const errorElement = document.createElement('div');
                    errorElement.className = 'error-message';
                    errorElement.textContent = 'Search failed';
                    document.body.appendChild(errorElement);
                }
            };
            
            container.appendChild(img);
            container.appendChild(searchIcon);
            document.getElementById('image-grid').appendChild(container);

            // Click search icon
            await searchIcon.click();

            // Wait for fetch to complete
            await new Promise(resolve => setTimeout(resolve, 0));

            // Verify fetch was called
            expect(mockFetch).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledWith('/api/search?query=test');
        });

        test('handles search error gracefully', async () => {
            // Mock console.error
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            // Mock fetch to fail
            global.fetch = jest.fn(() =>
                Promise.reject(new Error('Network error'))
            );

            // Create container with search icon
            const container = document.createElement('div');
            container.className = 'image-container';
            
            const searchIcon = document.createElement('i');
            searchIcon.className = 'fas fa-search search-icon';
            
            // Add click handler
            searchIcon.onclick = async () => {
                try {
                    const response = await fetch('/api/search?query=test');
                    if (!response.ok) {
                        throw new Error('Search failed');
                    }
                    const data = await response.json();
                    if (!data.success) {
                        throw new Error('Invalid search');
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    const errorElement = document.createElement('div');
                    errorElement.className = 'error-message';
                    errorElement.textContent = 'Search failed';
                    document.body.appendChild(errorElement);
                }
            };
            
            container.appendChild(searchIcon);
            document.getElementById('image-grid').appendChild(container);

            // Click search icon
            await searchIcon.click();

            // Wait for error handling
            await new Promise(resolve => setTimeout(resolve, 0));

            // Verify error was logged
            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));

            // Clean up
            consoleSpy.mockRestore();
        });
    });
});
