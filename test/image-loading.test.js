/**
 * Image Loading Test Suite
 * 
 * Tests the functionality of image loading including:
 * - Image fetching from server
 * - Thumbnail generation and loading
 * - Error handling for failed loads
 * - Loading state management
 * - Image grid display
 */

import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Mock DOM environment
const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
        <body>
            <div class="image-grid"></div>
        </body>
    </html>
`);
global.document = dom.window.document;
global.window = dom.window;

// Mock fetch API
const mockFetch = jest.fn();
global.fetch = mockFetch;

/**
 * Helper function to create mock image data
 * @param {number} count - Number of mock images to create
 * @returns {Array} Array of mock image objects
 */
function createMockImages(count = 3) {
    return Array.from({ length: count }, (_, i) => ({
        name: `test-image-${i + 1}`,
        url: `/images/test-image-${i + 1}.jpg`,
        thumbnailUrl: `/images/thumbnails/test-image-${i + 1}.jpg`
    }));
}

describe('Image Loading', () => {
    let imageGrid;
    
    beforeEach(() => {
        // Reset DOM and mocks
        document.body.innerHTML = '<div class="image-grid"></div>';
        imageGrid = document.querySelector('.image-grid');
        jest.clearAllMocks();
        
        // Reset fetch mock default behavior
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ images: createMockImages() })
        });
    });
    
    describe('Image Fetching', () => {
        test('should fetch images from correct endpoint', async () => {
            await fetchImages();
            expect(mockFetch).toHaveBeenCalledWith('/api/images');
        });
        
        test('should handle fetch error gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            const images = await fetchImages();
            expect(images).toEqual([]);
        });
        
        test('should handle invalid response gracefully', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500
            });
            const images = await fetchImages();
            expect(images).toEqual([]);
        });
    });
    
    describe('Image Display', () => {
        const mockImages = createMockImages();
        
        test('should create correct number of image containers', async () => {
            await displayImages(mockImages);
            const containers = imageGrid.querySelectorAll('.image-container');
            expect(containers.length).toBe(mockImages.length);
        });
        
        test('should set correct image attributes', async () => {
            await displayImages(mockImages);
            const firstImage = imageGrid.querySelector('img');
            expect(firstImage.src).toBe(mockImages[0].thumbnailUrl);
            expect(firstImage.alt).toBe(mockImages[0].name);
            expect(firstImage.loading).toBe('lazy');
        });
        
        test('should create search icons for each image', async () => {
            await displayImages(mockImages);
            const searchIcons = imageGrid.querySelectorAll('.search-icon');
            expect(searchIcons.length).toBe(mockImages.length);
        });
        
        test('should display image names', async () => {
            await displayImages(mockImages);
            const nameLabels = imageGrid.querySelectorAll('.image-name');
            expect(nameLabels.length).toBe(mockImages.length);
            expect(nameLabels[0].textContent).toBe(mockImages[0].name);
        });
    });
    
    describe('Image Container Creation', () => {
        const mockImage = createMockImages(1)[0];
        let container;
        
        beforeEach(() => {
            container = createImageContainer(mockImage);
        });
        
        test('should create container with correct structure', () => {
            expect(container.classList.contains('image-container')).toBe(true);
            expect(container.querySelector('img')).toBeTruthy();
            expect(container.querySelector('.search-icon')).toBeTruthy();
            expect(container.querySelector('.image-name')).toBeTruthy();
        });
        
        test('should handle click events correctly', () => {
            const mockOpenModal = jest.fn();
            window.openModal = mockOpenModal;
            
            // Test image click
            container.click();
            expect(mockOpenModal).toHaveBeenCalledWith(
                mockImage.url,
                mockImage.name
            );
            
            // Test search icon click
            const searchIcon = container.querySelector('.search-icon');
            const mockSearchInFinder = jest.fn();
            window.searchImageInFinder = mockSearchInFinder;
            searchIcon.click();
            expect(mockSearchInFinder).toHaveBeenCalledWith(mockImage.name);
        });
    });
    
    describe('Error Handling', () => {
        test('should handle missing image grid gracefully', async () => {
            document.body.innerHTML = '';
            await displayImages(createMockImages());
            // Should not throw error
        });
        
        test('should handle empty image array gracefully', async () => {
            await displayImages([]);
            expect(imageGrid.children.length).toBe(0);
        });
        
        test('should handle missing image properties gracefully', async () => {
            const invalidImage = { name: 'test' }; // Missing url
            await displayImages([invalidImage]);
            const img = imageGrid.querySelector('img');
            expect(img.src).toBe('');
        });
    });
});
