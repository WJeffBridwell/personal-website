import { jest } from '@jest/globals';
import { setupTestDOM, simulateInput, flushPromises, cleanupDOM } from './helpers.js';
import { filterImages } from '../public/js/gallery.js';

describe('Gallery Filter', () => {
    let imageGrid;
    let searchInput;
    let testEnv;

    beforeAll(() => {
        testEnv = setupTestDOM();
        global.window = testEnv.window;
        global.document = testEnv.document;
    });

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="gallery-container">
                <input type="text" id="search-input" />
                <div id="image-grid"></div>
                <div class="no-results">No results found</div>
            </div>
        `;
        imageGrid = document.getElementById('image-grid');
        searchInput = document.getElementById('search-input');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    afterAll(() => {
        cleanupDOM();
    });

    const createTestImages = (count) => {
        return Array.from({ length: count }, (_, i) => ({
            name: `Test Image ${i}`,
            url: `test-${i}.jpg`,
            date: new Date(2023, 0, i + 1).toISOString()
        }));
    };

    test('should filter images based on search input', async () => {
        const testImages = createTestImages(5);
        
        // Add test images to grid
        testImages.forEach(img => {
            const container = document.createElement('div');
            container.className = 'image-container';
            container.innerHTML = `
                <img src="${img.url}" alt="${img.name}" />
                <div class="image-name">${img.name}</div>
            `;
            imageGrid.appendChild(container);
        });

        // Simulate search
        searchInput.value = 'Test Image 1';
        filterImages(searchInput.value);
        await flushPromises();

        // Verify filtering
        const containers = imageGrid.querySelectorAll('.image-container');
        containers.forEach(container => {
            const name = container.querySelector('.image-name').textContent;
            const shouldBeVisible = name.includes(searchInput.value);
            const isHidden = container.style.display === 'none';
            expect(isHidden).toBe(!shouldBeVisible);
        });
    });

    test('should show no results message when no matches found', async () => {
        const testImages = createTestImages(3);
        
        // Add test images to grid
        testImages.forEach(img => {
            const container = document.createElement('div');
            container.className = 'image-container';
            container.innerHTML = `
                <img src="${img.url}" alt="${img.name}" />
                <div class="image-name">${img.name}</div>
            `;
            imageGrid.appendChild(container);
        });

        // Simulate search with no matches
        searchInput.value = 'nonexistent';
        filterImages(searchInput.value);
        await flushPromises();

        // Verify no results message
        const noResults = document.querySelector('.no-results');
        expect(noResults.style.display).toBe('block');
    });

    test('should reset filter when search input is cleared', async () => {
        const testImages = createTestImages(4);
        
        // Add test images to grid
        testImages.forEach(img => {
            const container = document.createElement('div');
            container.className = 'image-container';
            container.innerHTML = `
                <img src="${img.url}" alt="${img.name}" />
                <div class="image-name">${img.name}</div>
            `;
            imageGrid.appendChild(container);
        });

        // First filter images
        searchInput.value = 'Test Image 1';
        filterImages(searchInput.value);
        await flushPromises();

        // Then clear filter
        searchInput.value = '';
        filterImages(searchInput.value);
        await flushPromises();

        // Verify all images are visible
        const containers = imageGrid.querySelectorAll('.image-container');
        containers.forEach(container => {
            expect(container.style.display).not.toBe('none');
        });
    });
});
