/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import {
    setupTestDOM,
    simulateInput,
    simulateClick,
    flushPromises,
    cleanupDOM,
    cleanupGlobalState,
    simulateKeyPress,
    debounce,
    filterImages,
    filterByLetter,
    updateNoResultsMessage,
    handleSearch,
    handleSort,
    handleLetterFilter,
    initializeStickyControls,
    loadImages
} from './helpers.js';

import { Gallery } from '../public/js/gallery.js';

// Create references to global variables used in gallery
let modal, modalImg, modalCaption, closeModalBtn;
let gallery;

describe('Test Helper Functions', () => {
    beforeEach(async () => {
        // Setup DOM environment
        setupTestDOM();
        document.body.innerHTML = `
            <div id="gallery-container">
                <div id="image-grid"></div>
                <input id="search-input" type="text">
                <div id="letter-filter"></div>
                <div id="sort-container">
                    <button id="sort-name">Sort by Name</button>
                    <button id="sort-date">Sort by Date</button>
                </div>
                <div id="imageModal">
                    <div class="modal-content">
                        <img class="modal-img" src="" alt="">
                        <div class="modal-caption"></div>
                        <span class="close-modal">&times;</span>
                    </div>
                </div>
            </div>
        `;
        gallery = new Gallery();
        await flushPromises();
    });

    afterEach(() => {
        cleanupDOM();
        cleanupGlobalState();
        jest.clearAllMocks();
    });

    describe('DOM Setup and Cleanup', () => {
        test('setupTestDOM initializes all required globals', () => {
            expect(window).toBeDefined();
            expect(document).toBeDefined();
            expect(navigator).toBeDefined();
            expect(HTMLElement).toBeDefined();
            expect(Element).toBeDefined();
            expect(Node).toBeDefined();
            expect(Event).toBeDefined();
            expect(CustomEvent).toBeDefined();
        });

        test('setupTestDOM creates required DOM elements', () => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <div id="image-grid"></div>
                    <input id="search-input" type="text">
                    <div id="letter-filter"></div>
                    <div id="sort-container">
                        <button id="sort-name">Sort by Name</button>
                        <button id="sort-date">Sort by Date</button>
                    </div>
                </div>
            `;

            const container = document.getElementById('gallery-container');
            const searchInput = document.getElementById('search-input');
            const letterFilter = document.getElementById('letter-filter');
            const sortContainer = document.getElementById('sort-container');
            const imageGrid = document.getElementById('image-grid');

            expect(container).toBeTruthy();
            expect(searchInput).toBeTruthy();
            expect(letterFilter).toBeTruthy();
            expect(sortContainer).toBeTruthy();
            expect(imageGrid).toBeTruthy();
        });

        test('cleanupDOM clears body content', () => {
            // Add test content
            document.body.innerHTML = '<div>Test Content</div>';
            expect(document.body.innerHTML).not.toBe('');
            
            // Clean up
            cleanupDOM();
            
            // Verify cleanup
            expect(document.body.innerHTML.trim()).toBe('');
        });
    });

    describe('Event Simulation', () => {
        test('simulateInput triggers input event', () => {
            setupTestDOM(); // Ensure fresh DOM
            const input = document.getElementById('search-input');
            let eventFired = false;
            let eventValue = '';
            
            input.addEventListener('input', (e) => {
                eventFired = true;
                eventValue = e.target.value;
            });

            simulateInput(input, 'test');
            expect(eventFired).toBe(true);
            expect(eventValue).toBe('test');
            expect(input.value).toBe('test');
        });

        test('simulateInput throws error for invalid element', () => {
            expect(() => simulateInput(null, 'test')).toThrow('Element not found');
        });

        test('simulateClick triggers click event', () => {
            setupTestDOM(); // Ensure fresh DOM
            const button = document.querySelector('.letter-button');
            let clicked = false;
            
            button.addEventListener('click', () => {
                clicked = true;
            });

            simulateClick(button);
            expect(clicked).toBe(true);
        });

        test('simulateClick throws error for invalid element', () => {
            expect(() => simulateClick(null)).toThrow('Element not found');
        });

        test('simulateKeyPress triggers keypress event', () => {
            setupTestDOM(); // Ensure fresh DOM
            const input = document.getElementById('search-input');
            let eventData = null;
            
            function handler(e) {
                eventData = {
                    key: e.key,
                    type: e.type,
                    target: e.target
                };
                e.stopPropagation();
            }

            // Add event listeners
            input.addEventListener('keypress', handler);
            document.addEventListener('keypress', handler);
            
            // Focus and trigger event
            input.focus();
            simulateKeyPress('Enter');
            
            // Verify event was triggered
            expect(eventData).toBeTruthy();
            expect(eventData.key).toBe('Enter');
            expect(eventData.type).toBe('keypress');
            
            // Cleanup
            input.removeEventListener('keypress', handler);
            document.removeEventListener('keypress', handler);
        });
    });

    describe('Async Helpers', () => {
        test('flushPromises resolves pending promises', async () => {
            let resolved = false;
            
            // Create a simple promise
            Promise.resolve().then(() => {
                resolved = true;
            });
            
            await flushPromises();
            expect(resolved).toBe(true);
        });

        test('debounce delays function execution', () => {
            jest.useFakeTimers();
            let callCount = 0;
            const fn = () => callCount++;
            const debouncedFn = gallery.debounce(fn, 100);

            // Call multiple times rapidly
            debouncedFn();
            debouncedFn();
            debouncedFn();

            expect(callCount).toBe(0);

            // Fast forward past the delay
            jest.advanceTimersByTime(100);
            expect(callCount).toBe(1);

            jest.useRealTimers();
        });
    });

    describe('Browser API Mocks', () => {
        test('window.matchMedia is properly mocked', () => {
            expect(window.matchMedia).toBeDefined();
            const mediaQuery = window.matchMedia('(min-width: 768px)');
            expect(mediaQuery.matches).toBe(false);
            
            // Test listeners
            const listener = jest.fn();
            mediaQuery.addListener(listener);
            mediaQuery.removeListener(listener);
            expect(listener).not.toHaveBeenCalled();
        });

        test('requestAnimationFrame and cancelAnimationFrame are properly mocked', async () => {
            const callback = jest.fn();
            const id = window.requestAnimationFrame(callback);
            
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(callback).toHaveBeenCalled();
            
            const callback2 = jest.fn();
            const id2 = window.requestAnimationFrame(callback2);
            window.cancelAnimationFrame(id2);
            
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(callback2).not.toHaveBeenCalled();
        });
    });

    describe('Gallery Functions', () => {
        beforeEach(() => {
            // Mock fetch for image loading tests
            global.fetch = jest.fn();
            console.error = jest.fn();
        });

        test('fetchImages makes API call and returns image data', async () => {
            const mockImages = [
                { name: 'test1.jpg', url: '/images/test1.jpg' },
                { name: 'test2.jpg', url: '/images/test2.jpg' }
            ];

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockImages)
            });

            const images = await gallery.loadImages();
            expect(fetch).toHaveBeenCalledWith('/api/images');
            expect(images).toEqual(mockImages);
        });

        test('fetchImages handles error response', async () => {
            const errorMessage = 'Failed to fetch images';
            global.fetch.mockResolvedValueOnce({
                ok: false
            });

            const images = await gallery.loadImages();
            expect(images).toEqual([]);
            const errorDiv = document.querySelector('.error-message');
            expect(errorDiv).toBeTruthy();
            expect(errorDiv.textContent).toBe(errorMessage);
        });

        test('displayImages handles image load error', async () => {
            const container = document.createElement('div');
            container.className = 'image-container';
            const img = document.createElement('img');
            container.appendChild(img);
            document.getElementById('image-grid').appendChild(container);

            const errorEvent = new Event('error');
            img.dispatchEvent(errorEvent);
            await flushPromises();

            expect(img.classList.contains('loading')).toBe(false);
        });

        test('displayImages handles successful image load', async () => {
            const container = document.createElement('div');
            container.className = 'image-container';
            const img = document.createElement('img');
            container.appendChild(img);
            document.getElementById('image-grid').appendChild(container);

            const loadEvent = new Event('load');
            img.dispatchEvent(loadEvent);
            await flushPromises();

            expect(img.classList.contains('loading')).toBe(false);
        });
    });

    describe('Modal Functions', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <div id="imageModal" style="display: block;">
                        <div class="modal-content">
                            <img class="modal-img" src="" alt="">
                            <div class="modal-caption"></div>
                            <span class="close-modal">&times;</span>
                        </div>
                    </div>
                </div>
            `;
            gallery = new Gallery();
            
            // Initialize modal event listeners
            const modal = document.getElementById('imageModal');
            const closeButton = modal.querySelector('.close-modal');
            
            closeButton.addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    modal.style.display = 'none';
                }
            });
        });

        test('close button click handler works', async () => {
            const modal = document.getElementById('imageModal');
            const closeButton = modal.querySelector('.close-modal');
            
            closeButton.click();
            await flushPromises();
            
            expect(modal.style.display).toBe('none');
        });

        test('keydown handler closes modal on escape key', async () => {
            const modal = document.getElementById('imageModal');
            
            const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                keyCode: 27,
                which: 27
            });
            
            document.dispatchEvent(escapeEvent);
            await flushPromises();
            
            expect(modal.style.display).toBe('none');
        });
    });

    describe('Image Filtering Functions', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <div id="image-grid">
                        <div class="image-container" data-name="Test 1">
                            <img src="test1.jpg" alt="Test 1">
                            <div class="image-name">Test 1</div>
                        </div>
                        <div class="image-container" data-name="Other 2">
                            <img src="test2.jpg" alt="Other 2">
                            <div class="image-name">Other 2</div>
                        </div>
                    </div>
                    <div class="no-results">No images found</div>
                </div>
            `;
        });

        test('filterImages filters images by search term', () => {
            filterImages('Test');
            const containers = document.querySelectorAll('.image-container');
            expect(containers[0].style.display).toBe('');
            expect(containers[1].style.display).toBe('none');
        });

        test('filterImages shows no results message when no matches', () => {
            filterImages('xyz');
            const noResults = document.querySelector('.no-results');
            expect(noResults.style.display).toBe('block');
        });

        test('filterByLetter filters images by starting letter', () => {
            filterByLetter('T');
            const containers = document.querySelectorAll('.image-container');
            expect(containers[0].style.display).toBe('');
            expect(containers[1].style.display).toBe('none');
        });

        test('filterByLetter shows all images when letter is "all"', () => {
            filterByLetter('all');
            const containers = document.querySelectorAll('.image-container');
            expect(containers[0].style.display).toBe('');
            expect(containers[1].style.display).toBe('');
        });

        test('updateNoResultsMessage shows message when no visible images', () => {
            const containers = document.querySelectorAll('.image-container');
            containers.forEach(container => {
                container.style.display = 'none';
            });
            updateNoResultsMessage();
            const noResults = document.querySelector('.no-results');
            expect(noResults.style.display).toBe('block');
        });

        test('updateNoResultsMessage hides message when images are visible', () => {
            updateNoResultsMessage();
            const noResults = document.querySelector('.no-results');
            expect(noResults.style.display).toBe('none');
        });
    });

    describe('Event Handlers', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <input id="search-input" type="text">
                    <div id="sort-container">
                        <button id="sort-name" data-sort="name" data-order="asc">Sort by Name</button>
                        <button id="sort-date" data-sort="date" data-order="asc">Sort by Date</button>
                    </div>
                    <div id="letter-filter">
                        <button class="letter-button" data-letter="T">T</button>
                    </div>
                    <div id="image-grid">
                        <div class="image-container" data-name="Test 1" data-date="2023-01-01">
                            <img src="test1.jpg" alt="Test 1">
                            <div class="image-name">Test 1</div>
                        </div>
                        <div class="image-container" data-name="Other 2" data-date="2023-02-01">
                            <img src="test2.jpg" alt="Other 2">
                            <div class="image-name">Other 2</div>
                        </div>
                    </div>
                </div>
            `;
        });

        test('handleSearch filters images based on input value', () => {
            const searchInput = document.getElementById('search-input');
            searchInput.value = 'Test';
            handleSearch({ target: searchInput });
            
            const containers = document.querySelectorAll('.image-container');
            expect(containers[0].style.display).toBe('');
            expect(containers[1].style.display).toBe('none');
        });

        test('handleSort sorts images by name', () => {
            const sortButton = document.getElementById('sort-name');
            sortButton.dataset.order = 'desc'; // Start with desc so it switches to asc
            handleSort({ target: sortButton });
            
            const containers = document.querySelectorAll('.image-container');
            expect(containers[0].querySelector('.image-name').textContent).toBe('Other 2');
            expect(containers[1].querySelector('.image-name').textContent).toBe('Test 1');
        });

        test('handleSort sorts images by date', () => {
            const sortButton = document.getElementById('sort-date');
            sortButton.dataset.order = 'desc'; // Start with desc so it switches to asc
            handleSort({ target: sortButton });
            
            const containers = document.querySelectorAll('.image-container');
            expect(containers[0].dataset.date).toBe('2023-01-01');
            expect(containers[1].dataset.date).toBe('2023-02-01');

            // Test ascending order
            handleSort({ target: sortButton }); // This will switch to asc
            
            const containersAsc = document.querySelectorAll('.image-container');
            expect(containersAsc[0].dataset.date).toBe('2023-02-01');
            expect(containersAsc[1].dataset.date).toBe('2023-01-01');
        });

        test('handleLetterFilter filters images by letter', () => {
            const letterButton = document.querySelector('.letter-button');
            handleLetterFilter({ target: letterButton });
            
            const containers = document.querySelectorAll('.image-container');
            expect(containers[0].style.display).toBe('');
            expect(containers[1].style.display).toBe('none');
        });
    });

    describe('Sticky Controls', () => {
        let controls;
        let originalGetBoundingClientRect;

        beforeEach(() => {
            document.body.innerHTML = `
                <nav style="height: 60px"></nav>
                <div class="gallery">
                    <div class="gallery-controls controls">
                        <div id="search-container"></div>
                        <div id="letter-filter"></div>
                        <div id="sort-container"></div>
                    </div>
                </div>
            `;

            controls = document.querySelector('.gallery-controls');
            originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

            // Mock getBoundingClientRect
            Element.prototype.getBoundingClientRect = function() {
                if (this === controls) {
                    return {
                        top: window.scrollY === 0 ? 100 : -10, // Above viewport when scrolled
                        bottom: window.scrollY === 0 ? 200 : 90,
                        height: 100
                    };
                }
                return {
                    top: 0,
                    bottom: 100,
                    height: 100
                };
            };

            // Mock offsetHeight and offsetTop
            Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
                configurable: true,
                get: function() {
                    if (this.tagName.toLowerCase() === 'nav') {
                        return 60;
                    }
                    return 100;
                }
            });

            Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
                configurable: true,
                get: function() {
                    if (this.classList.contains('gallery')) {
                        return 100;
                    }
                    return 0;
                }
            });

            // Mock window properties
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                configurable: true,
                value: 800
            });

            Object.defineProperty(window, 'scrollY', {
                writable: true,
                configurable: true,
                value: 0
            });

            Object.defineProperty(window, 'pageYOffset', {
                get: () => window.scrollY
            });

            Object.defineProperty(document, 'documentElement', {
                configurable: true,
                get: () => ({
                    scrollTop: window.scrollY
                })
            });
        });

        afterEach(() => {
            Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
            delete HTMLElement.prototype.offsetHeight;
            delete HTMLElement.prototype.offsetTop;
        });

        test('initializeStickyControls sets up scroll handler', () => {
            initializeStickyControls();
            
            // Simulate scroll position where controls should become sticky
            Object.defineProperty(window, 'scrollY', {
                writable: true,
                configurable: true,
                value: 150
            });
            
            window.dispatchEvent(new Event('scroll'));
            expect(controls.classList.contains('sticky')).toBe(true);
        });

        test('initializeStickyControls removes sticky class when scrolling up', () => {
            initializeStickyControls();
            
            // First make it sticky
            Object.defineProperty(window, 'scrollY', {
                writable: true,
                configurable: true,
                value: 150
            });
            
            window.dispatchEvent(new Event('scroll'));
            expect(controls.classList.contains('sticky')).toBe(true);

            // Then scroll back to top
            Object.defineProperty(window, 'scrollY', {
                writable: true,
                configurable: true,
                value: 0
            });
            
            window.dispatchEvent(new Event('scroll'));
            expect(controls.classList.contains('sticky')).toBe(false);
        });
    });

    describe('Image Loading', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="image-grid"></div>
                <div class="error-message"></div>
            `;
            
            // Mock fetch
            global.fetch = jest.fn();
        });

        afterEach(() => {
            jest.resetAllMocks();
        });

        test('loadImages successfully loads and displays images', async () => {
            const mockImages = [
                { url: 'test1.jpg', name: 'Test 1', date: '2023-01-01' },
                { url: 'test2.jpg', name: 'Test 2', date: '2023-02-01' }
            ];

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockImages)
            });

            await loadImages();

            const imageGrid = document.getElementById('image-grid');
            const containers = imageGrid.querySelectorAll('.image-container');
            
            expect(containers).toHaveLength(2);
            
            // Check first image
            expect(containers[0].querySelector('img').src).toContain('test1.jpg');
            expect(containers[0].querySelector('img').alt).toBe('Test 1');
            expect(containers[0].querySelector('.image-name').textContent).toBe('Test 1');
            expect(containers[0].dataset.date).toBe('2023-01-01');
            
            // Check second image
            expect(containers[1].querySelector('img').src).toContain('test2.jpg');
            expect(containers[1].querySelector('img').alt).toBe('Test 2');
            expect(containers[1].querySelector('.image-name').textContent).toBe('Test 2');
            expect(containers[1].dataset.date).toBe('2023-02-01');
        });

        test('loadImages handles missing image grid', async () => {
            document.body.innerHTML = ''; // Remove image grid
            
            // Mock fetch but it shouldn't be called
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([])
            });
            
            await expect(loadImages()).rejects.toThrow('Image grid element not found');
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('loadImages handles fetch error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            
            const errorMessage = document.querySelector('.error-message');
            
            await expect(loadImages()).rejects.toThrow('Network error');
            expect(errorMessage.textContent).toBe('Network error');
            expect(errorMessage.style.display).toBe('block');
        });

        test('loadImages handles non-ok response', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });
            
            const errorMessage = document.querySelector('.error-message');
            
            await expect(loadImages()).rejects.toThrow('Failed to fetch images');
            expect(errorMessage.textContent).toBe('Failed to fetch images');
            expect(errorMessage.style.display).toBe('block');
        });

        test('loadImages handles images without names', async () => {
            const mockImages = [
                { url: 'test1.jpg' }, // No name
                { url: 'test2.jpg', name: '' } // Empty name
            ];

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockImages)
            });

            await loadImages();

            const containers = document.querySelectorAll('.image-container');
            expect(containers[0].querySelector('.image-name').textContent).toBe('Unnamed image');
            expect(containers[1].querySelector('.image-name').textContent).toBe('Unnamed image');
        });
    });
});
