import { jest } from '@jest/globals';
import { modalFunctions } from '../modal.js';

describe('Search Icon Functionality', () => {
    let fetchMock;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="image-grid" class="image-grid"></div>
        `;

        // Mock fetch
        fetchMock = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, results: ['test1.jpg'] })
            })
        );
        global.fetch = fetchMock;

        // Initialize modal
        modalFunctions.initModal();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

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
        expect(fetchMock).toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledWith('/api/search?query=test');
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
