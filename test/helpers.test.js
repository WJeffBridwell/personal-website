import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { 
    validateImageType, 
    updateGalleryState,
    initializeModal,
    openModal,
    closeModal,
    filterImages,
    sortImages,
    updateNoResultsMessage
} from '../public/js/helpers.js';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    runScripts: 'dangerously'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn()
};

// Test helper functions
function setupTestDOM() {
    document.body.innerHTML = `
        <div id="gallery-container">
            <input type="text" id="search-input" placeholder="Search images...">
            <div id="image-grid"></div>
            <div class="no-results" style="display: none;">No images found</div>
            <div class="error-message" style="display: none;"></div>
            <div class="modal hidden">
                <span class="modal-close">&times;</span>
                <img class="modal-img" src="" alt="">
                <div class="modal-caption"></div>
            </div>
            <div id="letter-filter">
                <button class="letter-btn active" data-letter="all">All</button>
                ${Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(letter => 
                    `<button class="letter-btn" data-letter="${letter}">${letter}</button>`
                ).join('')}
            </div>
        </div>
    `;
}

function setupTestImages() {
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) return;

    const testImages = [
        { name: 'test1.jpg', path: '/test1.jpg', date: '2023-01-01' },
        { name: 'test2.jpg', path: '/test2.jpg', date: '2023-02-01' },
        { name: 'test3.jpg', path: '/test3.jpg', date: '2023-03-01' }
    ];

    testImages.forEach(imageData => {
        const container = document.createElement('div');
        container.className = 'image-container';
        container.dataset.name = imageData.name;
        container.dataset.date = imageData.date;

        const img = document.createElement('img');
        img.src = imageData.path;
        img.alt = imageData.name;

        const name = document.createElement('div');
        name.className = 'image-name';
        name.textContent = imageData.name;

        container.appendChild(img);
        container.appendChild(name);
        imageGrid.appendChild(container);
    });
}

describe('Helper Functions', () => {
    beforeEach(() => {
        setupTestDOM();
        setupTestImages();
        jest.clearAllMocks();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
    });

    describe('Image Validation', () => {
        test('validates correct image types', () => {
            expect(validateImageType('test.jpg')).toBe(true);
            expect(validateImageType('test.jpeg')).toBe(true);
            expect(validateImageType('test.png')).toBe(true);
            expect(validateImageType('test.gif')).toBe(true);
        });

        test('rejects invalid image types', () => {
            expect(validateImageType('test.txt')).toBe(false);
            expect(validateImageType('test.pdf')).toBe(false);
            expect(validateImageType('test')).toBe(false);
        });

        test('handles case-insensitive extensions', () => {
            expect(validateImageType('test.JPG')).toBe(true);
            expect(validateImageType('test.PNG')).toBe(true);
        });
    });

    describe('Gallery State Management', () => {
        test('updates gallery state correctly', () => {
            const newState = {
                filter: 'recent',
                sort: 'date',
                order: 'desc'
            };
            const state = updateGalleryState(newState);
            expect(state.filter).toBe('recent');
            expect(state.sort).toBe('date');
            expect(state.order).toBe('desc');
        });

        test('provides default values for missing properties', () => {
            const state = updateGalleryState({});
            expect(state.filter).toBe('all');
            expect(state.sort).toBe('name');
            expect(state.order).toBe('asc');
            expect(state.search).toBe('');
            expect(state.letter).toBe('all');
        });
    });

    describe('Image Filtering', () => {
        test('filterImages filters by search term', () => {
            filterImages('test1');
            
            const visibleImages = Array.from(document.querySelectorAll('.image-container'))
                .filter(container => container.style.display !== 'none');
            expect(visibleImages.length).toBe(1);
            expect(visibleImages[0].querySelector('.image-name').textContent).toBe('test1.jpg');
        });

        test('filterImages handles empty search', () => {
            filterImages('');
            
            const visibleImages = Array.from(document.querySelectorAll('.image-container'))
                .filter(container => container.style.display !== 'none');
            expect(visibleImages.length).toBe(3);
        });
    });

    describe('Sorting', () => {
        test('sortImages sorts by name ascending', () => {
            sortImages('name', 'asc');
            
            const names = Array.from(document.querySelectorAll('.image-container'))
                .map(container => container.querySelector('.image-name').textContent);
            expect(names).toEqual(['test1.jpg', 'test2.jpg', 'test3.jpg']);
        });

        test('sortImages sorts by date descending', () => {
            sortImages('date', 'desc');
            
            const dates = Array.from(document.querySelectorAll('.image-container'))
                .map(container => container.dataset.date);
            expect(dates).toEqual(['2023-03-01', '2023-02-01', '2023-01-01']);
        });
    });

    describe('Modal Functionality', () => {
        beforeEach(() => {
            setupTestDOM();
            initializeModal();
        });

        test('opens modal with correct image', () => {
            const imageData = {
                src: '/test1.jpg',
                alt: 'test1.jpg',
                name: 'test1.jpg'
            };
            
            openModal(imageData);
            
            const modal = document.querySelector('.modal');
            expect(modal.classList.contains('hidden')).toBe(false);
            expect(modal.querySelector('.modal-img').src).toContain('test1.jpg');
            expect(modal.querySelector('.modal-caption').textContent).toBe('test1.jpg');
        });

        test('closes modal', () => {
            const modal = document.querySelector('.modal');
            modal.classList.remove('hidden');
            
            closeModal();
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        test('closes modal on outside click', () => {
            const modal = document.querySelector('.modal');
            modal.classList.remove('hidden');
            
            // Simulate click directly on the modal background
            modal.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        test('does not close modal when clicking modal content', () => {
            const modal = document.querySelector('.modal');
            modal.classList.remove('hidden');
            
            // Click on modal image
            const modalImg = modal.querySelector('.modal-img');
            modalImg.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
            
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        test('closes modal on close button click', () => {
            const modal = document.querySelector('.modal');
            modal.classList.remove('hidden');
            
            // Click close button
            const closeButton = modal.querySelector('.modal-close');
            closeButton.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });
    });
});
