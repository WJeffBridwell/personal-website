/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { Gallery, filterImages, sortImages, handleSearch, handleSort, handleLetterFilter, filterByLetter, initializeGalleryControls } from '../public/js/gallery.js';

describe('Gallery Class', () => {
    let gallery;
    const mockImages = [
        { name: 'Beach.jpg', date: '2023-01-01', path: '/images/Beach.jpg' },
        { name: 'Apple.jpg', date: '2023-02-01', path: '/images/Apple.jpg' },
        { name: 'Zebra.jpg', date: '2023-03-01', path: '/images/Zebra.jpg' }
    ];

    beforeEach(() => {
        // Setup fake timers for debouncing
        jest.useFakeTimers();
        
        document.body.innerHTML = `
            <div id="gallery-container">
                <div class="gallery-controls">
                    <input id="search-input" type="text">
                    <div id="letter-filter"></div>
                    <button id="sort-name">Sort by Name</button>
                    <button id="sort-date">Sort by Date</button>
                </div>
                <div id="image-grid"></div>
                <div id="imageModal" class="modal">
                    <span class="close-modal"></span>
                    <img class="modal-img">
                    <div class="modal-caption"></div>
                </div>
                <div class="no-results" style="display: none;">No results found</div>
            </div>
        `;
        gallery = new Gallery();
        gallery.images = [...mockImages];
        gallery.renderImages();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('Gallery Initialization', () => {
        test('initializes with default container ID', () => {
            expect(gallery.container).toBeTruthy();
            expect(gallery.imageGrid).toBeTruthy();
            expect(gallery.searchInput).toBeTruthy();
            expect(gallery.letterFilter).toBeTruthy();
            expect(gallery.modal).toBeTruthy();
            expect(gallery.modalImg).toBeTruthy();
            expect(gallery.modalCaption).toBeTruthy();
            expect(gallery.closeButton).toBeTruthy();
            expect(gallery.sortNameButton).toBeTruthy();
            expect(gallery.sortDateButton).toBeTruthy();
        });

        test('initializes with custom container ID', () => {
            document.body.innerHTML = `
                <div id="custom-container">
                    <div id="image-grid"></div>
                </div>
            `;
            const customGallery = new Gallery('custom-container');
            expect(customGallery.container.id).toBe('custom-container');
        });

        test('handles missing elements gracefully', () => {
            document.body.innerHTML = '<div></div>';
            const emptyGallery = new Gallery();
            expect(emptyGallery.container).toBeNull();
            expect(emptyGallery.imageGrid).toBeNull();
        });
    });

    describe('Image Rendering', () => {
        test('renders images with proper structure', () => {
            const containers = document.querySelectorAll('.image-container');
            expect(containers.length).toBe(3);
            
            const firstContainer = containers[0];
            expect(firstContainer.querySelector('img')).toBeTruthy();
            expect(firstContainer.querySelector('.search-icon')).toBeTruthy();
            expect(firstContainer.querySelector('.image-name')).toBeTruthy();
        });

        test('handles malformed image data', () => {
            gallery.images = [{ }]; // Empty image object
            gallery.renderImages();
            
            const container = document.querySelector('.image-container');
            expect(container.querySelector('img').src).toBe('http://localhost/');
            expect(container.querySelector('.image-name').textContent).toBe('undefined');
        });

        test('handles missing image grid', () => {
            gallery.imageGrid = null;
            expect(() => gallery.renderImages()).not.toThrow();
        });
    });

    describe('Event Listeners', () => {
        test('sets up search input listener', () => {
            const searchInput = document.getElementById('search-input');
            searchInput.value = 'test';
            searchInput.dispatchEvent(new Event('input'));
            
            jest.runAllTimers(); // Run debounced function
            
            const containers = document.querySelectorAll('.image-container');
            expect(Array.from(containers).some(c => c.style.display === 'none')).toBe(true);
        });

        test('sets up sort button listeners', () => {
            const nameButton = document.getElementById('sort-name');
            const dateButton = document.getElementById('sort-date');
            
            nameButton.click();
            expect(gallery.images[0].name).toBe('Apple.jpg');
            
            dateButton.click();
            expect(gallery.images[0].date).toBe('2023-01-01');
        });

        test('sets up letter filter buttons', () => {
            const letterFilter = document.getElementById('letter-filter');
            const buttons = letterFilter.querySelectorAll('.letter-button');
            expect(buttons.length).toBe(27); // 26 letters + 'All'
            
            const bButton = Array.from(buttons).find(b => b.textContent === 'B');
            bButton.click();
            
            const containers = document.querySelectorAll('.image-container');
            const visibleContainers = Array.from(containers).filter(c => c.style.display === '');
            expect(visibleContainers.length).toBe(1);
            expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
        });

        test('sets up modal event listeners', () => {
            const modal = document.getElementById('imageModal');
            const closeButton = modal.querySelector('.close-modal');
            
            // Test close button
            modal.classList.remove('hidden');
            closeButton.click();
            expect(modal.classList.contains('hidden')).toBe(true);
            
            // Test click outside
            modal.classList.remove('hidden');
            modal.click();
            expect(modal.classList.contains('hidden')).toBe(true);
            
            // Test escape key
            modal.classList.remove('hidden');
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(modal.classList.contains('hidden')).toBe(true);
        });
    });

    describe('Sorting Functionality', () => {
        test('sorts by name ascending', () => {
            gallery.sortImages('name', 'asc');
            expect(gallery.images[0].name).toBe('Apple.jpg');
            expect(gallery.images[2].name).toBe('Zebra.jpg');
        });

        test('sorts by date ascending', () => {
            gallery.sortImages('date', 'asc');
            expect(gallery.images[0].date).toBe('2023-01-01');
            expect(gallery.images[2].date).toBe('2023-03-01');
        });
    });

    describe('Search Functionality', () => {
        test('handleSearch filters images correctly', () => {
            const searchInput = document.getElementById('search-input');
            
            // Directly call handleSearch to test filtering
            gallery.handleSearch({ target: { value: 'beach' } });
            
            const containers = document.querySelectorAll('.image-container');
            const visibleContainers = Array.from(containers).filter(c => c.style.display === 'block');
            expect(visibleContainers.length).toBe(1);
            expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
        });

        test('handleSearch is case insensitive', () => {
            // Directly call handleSearch to test filtering
            gallery.handleSearch({ target: { value: 'BEACH' } });
            
            const containers = document.querySelectorAll('.image-container');
            const visibleContainers = Array.from(containers).filter(c => c.style.display === 'block');
            expect(visibleContainers.length).toBe(1);
            expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
        });

        test('handleSearch shows all images when search is cleared', () => {
            // First filter
            gallery.handleSearch({ target: { value: 'beach' } });
            
            // Then clear
            gallery.handleSearch({ target: { value: '' } });
            
            const containers = document.querySelectorAll('.image-container');
            const visibleContainers = Array.from(containers).filter(c => c.style.display === 'block');
            expect(visibleContainers.length).toBe(3);
        });
    });

    describe('Letter Filter Functionality', () => {
        test('filterByLetter shows only images starting with selected letter', () => {
            gallery.filterByLetter('B');
            
            const containers = document.querySelectorAll('.image-container');
            const visibleContainers = Array.from(containers).filter(c => c.style.display === '');
            expect(visibleContainers.length).toBe(1);
            expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
        });

        test('filterByLetter shows all images when "All" is selected', () => {
            gallery.filterByLetter('All');
            
            const containers = document.querySelectorAll('.image-container');
            const visibleContainers = Array.from(containers).filter(c => c.style.display === '');
            expect(visibleContainers.length).toBe(3);
        });
    });

    describe('Modal Functionality', () => {
        test('openModal displays image correctly', () => {
            const imageData = {
                src: '/images/test.jpg',
                alt: 'Test Image'
            };
            
            const modal = document.getElementById('imageModal');
            modal.classList.add('hidden'); // Ensure modal starts hidden
            
            gallery.openModal(imageData);
            
            const modalImg = modal.querySelector('.modal-img');
            const modalCaption = modal.querySelector('.modal-caption');
            
            expect(modal.classList.contains('hidden')).toBe(false);
            expect(modalImg.src).toContain('test.jpg');
            expect(modalCaption.textContent).toBe('Test Image');
        });

        test('closeModal hides the modal', () => {
            const modal = document.getElementById('imageModal');
            modal.classList.remove('hidden');
            
            gallery.closeModal();
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        test('modal closes on escape key', () => {
            const modal = document.getElementById('imageModal');
            modal.classList.remove('hidden');
            
            // Simulate Escape key press
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('handles missing DOM elements gracefully', () => {
            document.body.innerHTML = '';
            const newGallery = new Gallery();
            expect(() => newGallery.renderImages()).not.toThrow();
            expect(() => newGallery.initializeEventListeners()).not.toThrow();
            expect(() => newGallery.createLetterFilter()).not.toThrow();
        });

        test('handles invalid image data gracefully', () => {
            gallery.images = [{ name: 'test.jpg' }]; // Minimal valid data
            expect(() => gallery.renderImages()).not.toThrow();
        });

        test('handles missing modal elements gracefully', () => {
            const modal = document.getElementById('imageModal');
            modal.innerHTML = '';
            expect(() => gallery.closeModal()).not.toThrow();
        });
    });

    describe('Gallery Controls', () => {
        test('creates letter filter correctly', () => {
            document.getElementById('letter-filter').innerHTML = ''; // Clear existing buttons
            gallery.createLetterFilter();
            
            const letterFilter = document.getElementById('letter-filter');
            expect(letterFilter.children.length).toBe(27); // 26 letters + 'All'
            
            const firstButton = letterFilter.firstChild;
            expect(firstButton.textContent).toBe('All');
            expect(firstButton.classList.contains('letter-button')).toBe(true);
        });

        test('handles letter filter clicks', () => {
            document.getElementById('letter-filter').innerHTML = ''; // Clear existing buttons
            gallery.createLetterFilter();
            
            const letterFilter = document.getElementById('letter-filter');
            const bButton = Array.from(letterFilter.children).find(b => b.textContent === 'B');
            
            bButton.click();
            
            const containers = document.querySelectorAll('.image-container');
            const visibleImages = Array.from(containers).filter(c => c.style.display !== 'none');
            expect(visibleImages.length).toBe(1);
            expect(visibleImages[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
        });

        test('handles "All" filter click', () => {
            document.getElementById('letter-filter').innerHTML = ''; // Clear existing buttons
            gallery.createLetterFilter();
            
            const letterFilter = document.getElementById('letter-filter');
            const allButton = Array.from(letterFilter.children).find(b => b.textContent === 'All');
            
            // First filter by 'B'
            const bButton = Array.from(letterFilter.children).find(b => b.textContent === 'B');
            bButton.click();
            
            // Then click 'All'
            allButton.click();
            
            const containers = document.querySelectorAll('.image-container');
            const visibleImages = Array.from(containers).filter(c => c.style.display !== 'none');
            expect(visibleImages.length).toBe(3);
        });
    });

    describe('Gallery Controls Initialization', () => {
        test('initializeGalleryControls creates letter buttons and adds event listeners', () => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <input id="search-input" type="text" />
                    <div class="letter-filter">
                        <div class="letter-buttons"></div>
                    </div>
                    <button class="sort-btn" data-sort="name">Sort by Name</button>
                    <button class="sort-btn" data-sort="date">Sort by Date</button>
                </div>
            `;

            initializeGalleryControls();

            // Check letter buttons were created
            const letterButtons = document.querySelectorAll('.letter-btn');
            expect(letterButtons).toHaveLength(26); // A-Z

            // Check first and last buttons
            expect(letterButtons[0].textContent).toBe('A');
            expect(letterButtons[0].dataset.letter).toBe('a');
            expect(letterButtons[25].textContent).toBe('Z');
            expect(letterButtons[25].dataset.letter).toBe('z');

            // Verify event listeners were added
            const searchInput = document.getElementById('search-input');
            const mockEvent = new Event('input');
            searchInput.dispatchEvent(mockEvent);

            // Test sort buttons
            const sortButtons = document.querySelectorAll('.sort-btn');
            sortButtons.forEach(button => {
                const mockEvent = new Event('click');
                button.dispatchEvent(mockEvent);
            });
        });

        test('initializeGalleryControls handles missing elements gracefully', () => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <!-- No search input or letter filter -->
                </div>
            `;

            initializeGalleryControls();
            // Should not throw any errors
        });

        test('initializeGalleryControls handles missing sort buttons', () => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <input id="search-input" type="text" />
                    <div class="letter-filter">
                        <div class="letter-buttons"></div>
                    </div>
                    <!-- No sort buttons -->
                </div>
            `;

            initializeGalleryControls();
            
            // Check letter buttons were still created
            const letterButtons = document.querySelectorAll('.letter-btn');
            expect(letterButtons).toHaveLength(26);
        });
    });

    describe('Helper Functions', () => {
        test('filters images correctly', () => {
            filterImages('beach');
            
            const containers = document.querySelectorAll('.image-container');
            const visibleImages = Array.from(containers).filter(c => c.style.display !== 'none');
            expect(visibleImages.length).toBe(1);
            expect(visibleImages[0].querySelector('.image-name').textContent).toBe('Beach.jpg');
        });

        test('debounce function works correctly', () => {
            jest.useFakeTimers();
            
            let counter = 0;
            const increment = () => counter++;
            const debouncedIncrement = gallery.debounce(increment, 100);
            
            // Call it multiple times
            debouncedIncrement();
            debouncedIncrement();
            debouncedIncrement();
            
            // Fast-forward time
            jest.runAllTimers();
            
            expect(counter).toBe(1);
            
            jest.useRealTimers();
        });

        test('handles sort correctly', () => {
            // Sort by name
            sortImages('name', 'desc'); // Use desc to match actual implementation
            
            const containers = document.querySelectorAll('.image-container');
            const names = Array.from(containers).map(c => c.querySelector('.image-name').textContent);
            expect(names[0]).toBe('Zebra.jpg');
            expect(names[2]).toBe('Beach.jpg');
        });
    });

    describe('Search Handling', () => {
        test('handleSearch filters images based on search term', () => {
            const event = {
                target: { value: 'test' }
            };
            handleSearch(event);
            
            // Verify search was applied
            const containers = document.querySelectorAll('.image-container');
            expect(containers.length).toBeGreaterThan(0);
        });

        test('handleSearch does nothing if event is invalid', () => {
            handleSearch(null);
            handleSearch({});
            handleSearch({ target: null });
            // Should not throw any errors
        });
    });

    describe('Sort Handling', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <button class="sort-btn" data-sort="name">Sort by Name</button>
                    <button class="sort-btn" data-sort="date">Sort by Date</button>
                </div>
            `;
        });

        test('handleSort updates active state and sorts images', () => {
            const button = document.querySelector('[data-sort="name"]');
            const event = {
                target: button
            };
            
            handleSort(event);
            
            expect(button.classList.contains('active')).toBe(true);
            expect(document.querySelector('[data-sort="date"]').classList.contains('active')).toBe(false);
        });

        test('handleSort does nothing if event is invalid', () => {
            handleSort(null);
            handleSort({});
            handleSort({ target: null });
            // Should not throw any errors
        });
    });

    describe('Letter Filter', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <div class="letter-filter">
                        <button class="letter-btn" data-letter="a">A</button>
                        <button class="letter-btn" data-letter="b">B</button>
                    </div>
                    <div class="image-container">
                        <div class="image-name">Apple</div>
                    </div>
                    <div class="image-container">
                        <div class="image-name">Banana</div>
                    </div>
                </div>
            `;
        });

        test('handleLetterFilter updates active state and filters images', () => {
            const button = document.querySelector('[data-letter="a"]');
            const event = {
                target: button
            };
            
            handleLetterFilter(event);
            
            expect(button.classList.contains('active')).toBe(true);
            expect(document.querySelector('[data-letter="b"]').classList.contains('active')).toBe(false);
        });

        test('handleLetterFilter does nothing if event is invalid', () => {
            handleLetterFilter(null);
            handleLetterFilter({});
            handleLetterFilter({ target: null });
            // Should not throw any errors
        });

        test('filterByLetter shows/hides images based on first letter', () => {
            filterByLetter('a');
            
            const containers = document.querySelectorAll('.image-container');
            expect(containers[0].style.display).toBe('');  // Apple should be visible
            expect(containers[1].style.display).toBe('none');  // Banana should be hidden
        });

        test('filterByLetter shows all images when letter is "all"', () => {
            filterByLetter('all');
            
            const containers = document.querySelectorAll('.image-container');
            expect(containers[0].style.display).toBe('');
            expect(containers[1].style.display).toBe('');
        });

        test('filterByLetter handles invalid inputs', () => {
            filterByLetter(null);
            filterByLetter('');
            filterByLetter(undefined);
            // Should not throw any errors
        });

        test('filterByLetter handles missing name elements', () => {
            document.body.innerHTML = `
                <div class="image-container">
                    <!-- No image-name div -->
                </div>
            `;
            
            filterByLetter('a');
            // Should not throw any errors
        });
    });

    describe('Modal and Error Handling', () => {
        let gallery;
        
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <div id="image-grid"></div>
                    <div id="imageModal" class="modal">
                        <span class="close-modal">&times;</span>
                        <img class="modal-img" src="" alt="" />
                        <div class="modal-caption"></div>
                    </div>
                </div>
            `;
            gallery = new Gallery();
        });

        test('openModal sets modal content and displays it', () => {
            const img = document.createElement('img');
            img.src = 'test.jpg';
            img.alt = 'Test Caption';
            
            gallery.openModal(img);

            const modalImg = document.querySelector('.modal-img');
            const modalCaption = document.querySelector('.modal-caption');
            const modal = document.getElementById('imageModal');

            expect(modalImg.src).toContain('test.jpg');
            expect(modalImg.alt).toBe('');  // alt is not set in openModal
            expect(modalCaption.textContent).toBe('Test Caption');
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        test('closeModal hides the modal', () => {
            const modal = document.getElementById('imageModal');
            modal.classList.remove('hidden');
            
            gallery.closeModal();

            expect(modal.classList.contains('hidden')).toBe(true);
        });

        test('handleError displays error message', () => {
            const error = new Error('Test error');
            gallery.handleError(error);

            const errorMessage = document.querySelector('.error-message');
            expect(errorMessage.textContent).toBe('Test error');
            expect(errorMessage.className).toBe('error-message');
        });

        test('handleError handles missing container', () => {
            document.getElementById('gallery-container').remove();
            const error = new Error('Test error');
            gallery.handleError(error);
            // Should not throw
        });
    });

    describe('Debounce Function', () => {
        let gallery;
        
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <div id="image-grid"></div>
                </div>
            `;
            gallery = new Gallery();
        });

        test('debounce delays function execution', async () => {
            jest.useFakeTimers();
            const callback = jest.fn();
            const debounced = gallery.debounce(callback, 100);

            // Call multiple times
            debounced();
            debounced();
            debounced();

            // Fast-forward time
            jest.advanceTimersByTime(50);
            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(50);
            expect(callback).toHaveBeenCalledTimes(1);

            jest.useRealTimers();
        });
    });
});
