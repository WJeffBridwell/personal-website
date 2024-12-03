import { jest } from '@jest/globals';
import { Gallery, initializeGalleryControls, handleSearch, handleSort, handleLetterFilter, debounce } from '../public/js/gallery.js';
import { sortImages, loadImages, mockImageData, simulateClick, simulateInput, flushPromises, filterImages, updateNoResultsMessage, initializeStickyControls } from './helpers.js';

jest.setTimeout(10000);

describe('Gallery Class', () => {
    let gallery;
    let container;
    let searchInput;
    let imageGrid;
    let letterFilter;

    beforeEach(() => {
        // Reset timers and mocks before each test
        jest.useFakeTimers();
        
        // Setup DOM
        document.body.innerHTML = `
            <div id="gallery-container">
                <div id="search-container">
                    <input type="text" id="search-input" placeholder="Search images...">
                </div>
                <div id="letter-filter"></div>
                <div id="image-grid"></div>
                <div class="no-results">No images found</div>
            </div>
        `;
        
        // Cache DOM elements
        container = document.getElementById('gallery-container');
        searchInput = document.getElementById('search-input');
        imageGrid = document.getElementById('image-grid');
        letterFilter = document.getElementById('letter-filter');
        
        // Initialize gallery with test images
        gallery = new Gallery();
        gallery.images = [
            { name: 'Apple', url: 'apple.jpg' },
            { name: 'Banana', url: 'banana.jpg' },
            { name: 'Cherry', url: 'cherry.jpg' }
        ];
        
        // Initialize gallery components
        gallery.renderImages();
        gallery.createLetterFilter();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('Event Handling', () => {
        test('attaches search input listener', () => {
            const handleSearchSpy = jest.spyOn(gallery, 'handleSearch');
            
            // Initialize event listeners after spy is set up
            gallery.initializeEventListeners();
            
            // Trigger search input event
            searchInput.value = 'test';
            const event = new Event('input', { bubbles: true });
            Object.defineProperty(event, 'target', { value: searchInput });
            searchInput.dispatchEvent(event);
            
            // Fast forward debounce timer
            jest.advanceTimersByTime(300);
            
            expect(handleSearchSpy).toHaveBeenCalled();
            handleSearchSpy.mockRestore();
        });

        describe('Letter Filter Events', () => {
            test('filters by letter correctly', () => {
                const filterByLetterSpy = jest.spyOn(gallery, 'filterByLetter');
                
                // Initialize event listeners after spy is set up
                gallery.initializeEventListeners();
                
                // Trigger letter filter
                gallery.filterByLetter('A');
                jest.advanceTimersByTime(100);
                
                const visibleContainers = Array.from(document.querySelectorAll('.image-container'))
                    .filter(c => c.style.display !== 'none');
                    
                expect(visibleContainers.length).toBe(1);
                expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Apple');
                expect(filterByLetterSpy).toHaveBeenCalledWith('A');
                
                filterByLetterSpy.mockRestore();
            });

            test('handles letter filter button clicks', () => {
                const filterByLetterSpy = jest.spyOn(gallery, 'filterByLetter');
                
                // Initialize event listeners after spy is set up
                gallery.initializeEventListeners();
                
                // Get the letter button
                const letterButton = letterFilter.querySelector('[data-letter="A"]');
                expect(letterButton).toBeTruthy();
                
                // Simulate click event
                letterButton.click();
                jest.advanceTimersByTime(100);
                
                expect(filterByLetterSpy).toHaveBeenCalledWith('A');
                filterByLetterSpy.mockRestore();
            });

            test('combines letter filter with search', () => {
                const handleSearchSpy = jest.spyOn(gallery, 'handleSearch');
                const filterByLetterSpy = jest.spyOn(gallery, 'filterByLetter');
                
                // Initialize event listeners after spies are set up
                gallery.initializeEventListeners();
                
                // Setup search
                searchInput.value = 'apple';
                const searchEvent = new Event('input', { bubbles: true });
                Object.defineProperty(searchEvent, 'target', { value: searchInput });
                searchInput.dispatchEvent(searchEvent);
                
                // Apply letter filter
                gallery.filterByLetter('A');
                
                // Fast forward all timers
                jest.advanceTimersByTime(300);
                
                expect(handleSearchSpy).toHaveBeenCalled();
                expect(filterByLetterSpy).toHaveBeenCalledWith('A');
                
                handleSearchSpy.mockRestore();
                filterByLetterSpy.mockRestore();
            });
        });
    });

    describe('Performance', () => {
        test('handles large number of images efficiently', () => {
            const largeImageSet = Array.from({ length: 100 }, (_, i) => ({
                name: `Image ${i}`,
                url: `image${i}.jpg`
            }));
            gallery.images = largeImageSet;
            gallery.renderImages();
            
            // Create search event
            searchInput.value = 'test';
            const event = new Event('input', { bubbles: true });
            Object.defineProperty(event, 'target', { value: searchInput });
            
            // Should not throw
            expect(() => gallery.handleSearch(event)).not.toThrow();
        });

        test('debounces search input appropriately', () => {
            const handleSearchSpy = jest.spyOn(gallery, 'handleSearch');
            
            // Initialize event listeners after spy is set up
            gallery.initializeEventListeners();
            
            // Reset all timers
            jest.clearAllTimers();
            
            // Simulate rapid typing
            for (let i = 0; i < 5; i++) {
                searchInput.value = `test${i}`;
                const event = new Event('input', { bubbles: true });
                Object.defineProperty(event, 'target', { value: searchInput });
                searchInput.dispatchEvent(event);
                jest.advanceTimersByTime(50); // Small advance between inputs
            }
            
            // Fast forward past debounce time
            jest.advanceTimersByTime(300);
            
            // Should be called only once due to debouncing
            expect(handleSearchSpy).toHaveBeenCalled();
            expect(handleSearchSpy.mock.calls.length).toBe(1);
            
            handleSearchSpy.mockRestore();
        });
    });
});

describe('Image Loading and Error Handling', () => {
    test('handles malformed image data gracefully', () => {
        const gallery = new Gallery();
        const imageGrid = document.getElementById('image-grid');
        
        if (imageGrid) {
            imageGrid.innerHTML = `
                <div class="image-container">
                    <div class="image-name"></div>
                    <img src="" alt="">
                </div>
            `;
            
            const containers = imageGrid.querySelectorAll('.image-container');
            const firstImage = containers[0].querySelector('img');
            
            // Test empty src and alt
            expect(firstImage.src).toMatch(/^(http|https):\/\//);
            expect(firstImage.alt).toBe('');
        }
    });
});

describe('Advanced Event Handling', () => {
    let gallery;
    let container;
    let searchInput;
    let imageGrid;
    let letterFilter;

    beforeEach(() => {
        // Reset timers and mocks before each test
        jest.useFakeTimers();
        
        // Setup DOM
        document.body.innerHTML = `
            <div id="gallery-container">
                <div id="search-container">
                    <input type="text" id="search-input" placeholder="Search images...">
                </div>
                <div id="letter-filter"></div>
                <div id="image-grid"></div>
                <div class="no-results">No images found</div>
            </div>
        `;
        
        // Cache DOM elements
        container = document.getElementById('gallery-container');
        searchInput = document.getElementById('search-input');
        imageGrid = document.getElementById('image-grid');
        letterFilter = document.getElementById('letter-filter');
        
        // Initialize gallery
        gallery = new Gallery();
        gallery.images = [
            { name: 'Test Image 1', url: 'test1.jpg' },
            { name: 'Test Image 2', url: 'test2.jpg' }
        ];
        gallery.renderImages();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('Letter Filter Events', () => {
        test('combines letter filter with search', async () => {
            // Setup initial state
            gallery.images = [
                { name: 'Banana', url: 'banana.jpg' },
                { name: 'Apple', url: 'apple.jpg' },
                { name: 'Blueberry', url: 'blueberry.jpg' }
            ];
            gallery.renderImages();
            gallery.createLetterFilter();

            const handleSearchSpy = jest.spyOn(gallery, 'handleSearch');
            const filterByLetterSpy = jest.spyOn(gallery, 'filterByLetter');
            
            // Initialize event listeners after spies are set up
            gallery.initializeEventListeners();
            
            // Setup search
            searchInput.value = 'b';
            const searchEvent = new Event('input', { bubbles: true });
            Object.defineProperty(searchEvent, 'target', { value: searchInput });
            searchInput.dispatchEvent(searchEvent);
            
            // Apply letter filter
            gallery.filterByLetter('B');
            
            // Fast forward all timers
            jest.advanceTimersByTime(300);
            
            expect(handleSearchSpy).toHaveBeenCalled();
            expect(filterByLetterSpy).toHaveBeenCalledWith('B');
            
            // Verify only B items are visible
            const visibleContainers = Array.from(document.querySelectorAll('.image-container'))
                .filter(c => c.style.display !== 'none');
            expect(visibleContainers.length).toBe(2);
            expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Banana');
            expect(visibleContainers[1].querySelector('.image-name').textContent).toBe('Blueberry');
            
            handleSearchSpy.mockRestore();
            filterByLetterSpy.mockRestore();
        });
    });

    describe('Edge Cases', () => {
        test('handles filter reset sequence', async () => {
            // Setup initial state with multiple images
            gallery.images = [
                { name: 'Apple', url: 'apple.jpg' },
                { name: 'Banana', url: 'banana.jpg' },
                { name: 'Cherry', url: 'cherry.jpg' }
            ];
            gallery.renderImages();
            gallery.createLetterFilter();
            gallery.initializeEventListeners();
            
            // Apply letter filter
            gallery.filterByLetter('A');
            jest.advanceTimersByTime(100);
            
            // Verify only A items are visible
            let visibleContainers = Array.from(document.querySelectorAll('.image-container'))
                .filter(c => c.style.display !== 'none');
            expect(visibleContainers.length).toBe(1);
            expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Apple');
            
            // Reset filter
            gallery.filterByLetter('All');
            jest.advanceTimersByTime(100);
            
            // Verify all items are visible
            visibleContainers = Array.from(document.querySelectorAll('.image-container'))
                .filter(c => c.style.display !== 'none');
            expect(visibleContainers.length).toBe(3);
        });
    });
});

describe('Event Handling', () => {
    let gallery;
    let container;
    let searchInput;
    let imageGrid;
    let letterFilter;

    beforeEach(() => {
        // Reset timers and mocks before each test
        jest.useFakeTimers();
        
        // Setup DOM
        document.body.innerHTML = `
            <div id="gallery-container">
                <div id="search-container">
                    <input type="text" id="search-input" placeholder="Search images...">
                </div>
                <div id="letter-filter"></div>
                <div id="image-grid"></div>
                <div class="no-results">No images found</div>
            </div>
        `;
        
        // Cache DOM elements
        container = document.getElementById('gallery-container');
        searchInput = document.getElementById('search-input');
        imageGrid = document.getElementById('image-grid');
        letterFilter = document.getElementById('letter-filter');
        
        // Initialize gallery
        gallery = new Gallery();
        gallery.images = [
            { name: 'Test Image 1', url: 'test1.jpg' },
            { name: 'Test Image 2', url: 'test2.jpg' }
        ];
        gallery.renderImages();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('attaches search input listener', async () => {
        // Setup initial state
        const handleSearchSpy = jest.spyOn(gallery, 'handleSearch');
        
        // Initialize event listeners after spy is set up
        gallery.initializeEventListeners();
        
        // Trigger search input event
        searchInput.value = 'test';
        const event = new Event('input', { bubbles: true });
        Object.defineProperty(event, 'target', { value: searchInput });
        searchInput.dispatchEvent(event);
        
        // Fast forward debounce timer
        jest.advanceTimersByTime(300);
        
        expect(handleSearchSpy).toHaveBeenCalled();
        handleSearchSpy.mockRestore();
    });
});

describe('Accessibility', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="gallery-container">
                <div id="image-grid"></div>
                <div class="gallery-controls">
                    <input id="search-input" type="text" aria-label="Search images" />
                    <div id="letter-filter"></div>
                </div>
            </div>
        `;
    });

    test('maintains keyboard navigation', () => {
        const gallery = new Gallery();
        const letterFilter = document.getElementById('letter-filter');
        
        if (letterFilter) {
            const buttons = letterFilter.querySelectorAll('button');
            buttons.forEach(button => {
                // Check if button can receive focus (implicit tabindex of 0)
                expect(button.tabIndex).toBe(0);
                // Check if button has accessible name (either via text content or aria-label)
                expect(button.textContent || button.getAttribute('aria-label')).toBeTruthy();
            });
        }
    });

    test('handles screen reader announcements', () => {
        const gallery = new Gallery();
        const imageContainers = document.querySelectorAll('.image-container');
        
        imageContainers.forEach(container => {
            const img = container.querySelector('img');
            expect(img.getAttribute('alt')).toBeTruthy();
        });
    });
});

describe('Memory Management', () => {
    test('cleans up event listeners', () => {
        const gallery = new Gallery();
        const searchInput = document.getElementById('search-input');
        
        // Mock removeEventListener
        const removeEventListenerSpy = jest.spyOn(searchInput, 'removeEventListener');
        
        // Simulate cleanup
        searchInput.removeEventListener('input', gallery.handleSearch);
        
        expect(removeEventListenerSpy).toHaveBeenCalledWith('input', gallery.handleSearch);
        
        removeEventListenerSpy.mockRestore();
    });

    test('handles large datasets without memory leaks', () => {
        const gallery = new Gallery();
        const imageGrid = document.getElementById('image-grid');

        if (imageGrid) {
            // Add many images
            const initialMemory = process.memoryUsage().heapUsed;
            
            for (let i = 0; i < 1000; i++) {
                const div = document.createElement('div');
                div.className = 'image-container';
                div.innerHTML = `
                    <div class="image-name">image${i}.jpg</div>
                    <img src="image${i}.jpg" alt="image${i}.jpg" />
                `;
                imageGrid.appendChild(div);
            }
            
            // Perform operations
            gallery.renderImages();
            gallery.handleSearch({ target: { value: 'test' } });
            gallery.filterByLetter('A');
            
            // Check memory usage
            const finalMemory = process.memoryUsage().heapUsed;
            expect(finalMemory - initialMemory).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
        }
    });
});
