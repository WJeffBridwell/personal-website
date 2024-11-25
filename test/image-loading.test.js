import { jest } from '@jest/globals';

/**
 * @jest-environment jsdom
 */

// Mock the image loading functions for testing
const imageFunctions = {
    displayImages: async function(images) {
        console.log('Starting to display images:', images.length);
        const grid = document.getElementById('image-grid');
        if (!grid) {
            console.error('Image grid element not found');
            return;
        }

        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('visible');
        }

        for (const image of images) {
            const container = document.createElement('div');
            container.className = 'image-container skeleton';

            const img = document.createElement('img');
            img.className = 'loading';
            img.alt = image.alt || '';
            img.loading = 'lazy';
            img.src = image.src;

            // Create search icon
            const searchIcon = document.createElement('i');
            searchIcon.className = 'fas fa-search search-icon';

            // Set up load handler
            img.onload = () => {
                img.classList.remove('loading');
                img.classList.add('loaded');
                container.classList.remove('skeleton');
            };

            // Set up error handler
            img.onerror = () => {
                img.classList.remove('loading');
                img.classList.add('error');
                container.classList.remove('skeleton');
                container.classList.add('error');
            };

            container.appendChild(img);
            container.appendChild(searchIcon);
            grid.appendChild(container);
        }

        if (loadingIndicator) {
            loadingIndicator.classList.remove('visible');
        }
    }
};

describe('Image Loading', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="image-grid" class="image-grid"></div>
            <div class="loading-indicator"></div>
        `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('images are loaded and displayed correctly', async () => {
        const imageGrid = document.getElementById('image-grid');
        const images = [
            { src: '/test1.jpg', alt: 'Test 1' },
            { src: '/test2.jpg', alt: 'Test 2' }
        ];

        // Call displayImages
        await imageFunctions.displayImages(images);

        // Check if image containers were created
        const containers = document.querySelectorAll('.image-container');
        expect(containers.length).toBe(2);

        // Check each container
        containers.forEach((container, index) => {
            // Container should have proper structure
            expect(container.classList.contains('image-container')).toBe(true);
            expect(container.classList.contains('skeleton')).toBe(true);

            // Image should exist with correct attributes
            const img = container.querySelector('img');
            expect(img).toBeTruthy();
            expect(img.src).toContain(images[index].src);
            expect(img.alt).toBe(images[index].alt);
            expect(img.classList.contains('loading')).toBe(true);

            // Search icon should exist
            const searchIcon = container.querySelector('.search-icon');
            expect(searchIcon).toBeTruthy();
            expect(searchIcon.classList.contains('fa-search')).toBe(true);
        });

        // Simulate image load events
        const imgs = document.querySelectorAll('img');
        imgs.forEach(img => {
            img.dispatchEvent(new Event('load'));
        });

        // Check if loading states were removed
        containers.forEach(container => {
            expect(container.classList.contains('skeleton')).toBe(false);
            const img = container.querySelector('img');
            expect(img.classList.contains('loading')).toBe(false);
            expect(img.classList.contains('loaded')).toBe(true);
        });

        // Check loading indicator
        const loadingIndicator = document.querySelector('.loading-indicator');
        expect(loadingIndicator.classList.contains('visible')).toBe(false);
    });

    test('handles image load errors correctly', async () => {
        // Mock image data with invalid src
        const images = [
            { src: '/invalid/image.jpg', alt: 'Invalid Image' }
        ];

        // Call displayImages
        await imageFunctions.displayImages(images);

        // Check if container was created
        const container = document.querySelector('.image-container');
        expect(container).toBeTruthy();

        // Simulate image load error
        const img = container.querySelector('img');
        img.dispatchEvent(new Event('error'));

        // Check error states
        expect(container.classList.contains('error')).toBe(true);
        expect(container.classList.contains('skeleton')).toBe(false);
        expect(img.classList.contains('error')).toBe(true);
        expect(img.classList.contains('loading')).toBe(false);
    });

    test('handles empty image array', async () => {
        await imageFunctions.displayImages([]);
        const grid = document.getElementById('image-grid');
        expect(grid.children.length).toBe(0);
    });

    test('handles missing image grid', async () => {
        document.body.innerHTML = '';
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Try to load images
        await imageFunctions.displayImages([{ src: '/test.jpg', alt: 'Test' }]);

        // Verify error handling
        expect(consoleSpy).toHaveBeenCalledWith('Image grid element not found');

        consoleSpy.mockRestore();
    });
});
