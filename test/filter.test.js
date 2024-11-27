import { jest } from '@jest/globals';
import { imageFunctions, filterFunctions, state } from '../script.js';

// Mock DOM functions
global.fetch = jest.fn();
global.Image = class {
    constructor() {
        setTimeout(() => {
            if (this.onload) this.onload();
        }, 0);
    }
};

// Mock createElement
global.createElement = (tag, props) => {
    const element = document.createElement(tag);
    if (props) {
        Object.assign(element, props);
        if (props.className) {
            element.className = props.className;
        }
    }
    return element;
};

describe('Image Filtering', () => {
    let imageGrid;

    beforeEach(() => {
        // Set up DOM
        document.body.innerHTML = `
            <div id="image-grid"></div>
            <div class="letter-filter">
                <button data-letter="all">All</button>
                <button data-letter="a">A</button>
            </div>
            <input type="text" id="searchInput" />
        `;
        
        imageGrid = document.getElementById('image-grid');

        // Reset global state
        state.reset();

        // Mock fetch response
        global.fetch.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    { alt: 'Apple', url: '/images/apple.jpg' },
                    { alt: 'Banana', url: '/images/banana.jpg' },
                    { alt: 'Avocado', url: '/images/avocado.jpg' }
                ])
            })
        );
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.resetAllMocks();
    });

    test('should filter images by letter', async () => {
        // Load images
        await imageFunctions.loadImages();

        // Click on letter 'A'
        const letterBtn = document.querySelector('[data-letter="a"]');
        letterBtn.click();

        // Wait for filtering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify only 'A' images are shown
        const images = imageGrid.querySelectorAll('img');
        expect(images.length).toBe(2);
        expect(images[0].alt).toBe('Apple');
        expect(images[1].alt).toBe('Avocado');
    });

    test('should filter images by search', async () => {
        // Load images
        await imageFunctions.loadImages();

        // Search for 'ap'
        const searchInput = document.getElementById('searchInput');
        searchInput.value = 'ap';
        searchInput.dispatchEvent(new Event('input'));

        // Wait for filtering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify only 'Apple' is shown
        const images = imageGrid.querySelectorAll('img');
        expect(images.length).toBe(1);
        expect(images[0].alt).toBe('Apple');
    });

    test('should show all images when clicking "All"', async () => {
        // Load images
        await imageFunctions.loadImages();

        // Click on letter 'A'
        const letterBtnA = document.querySelector('[data-letter="a"]');
        letterBtnA.click();

        // Wait for filtering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Click on 'All'
        const letterBtnAll = document.querySelector('[data-letter="all"]');
        letterBtnAll.click();

        // Wait for filtering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify all images are shown
        const images = imageGrid.querySelectorAll('img');
        expect(images.length).toBe(3);
    });

    test('should handle no results', async () => {
        // Load images
        await imageFunctions.loadImages();

        // Search for non-existent term
        const searchInput = document.getElementById('searchInput');
        searchInput.value = 'xyz';
        searchInput.dispatchEvent(new Event('input'));

        // Wait for filtering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify no results message
        expect(imageGrid.innerHTML).toBe('<div class="no-results">No images found</div>');
    });

    test('should handle search icon click', async () => {
        // Load images
        await imageFunctions.loadImages();

        // Add search icon to first image
        const firstImage = imageGrid.querySelector('img');
        const searchIcon = document.createElement('i');
        searchIcon.className = 'fas fa-search search-icon';
        firstImage.parentNode.appendChild(searchIcon);

        // Click search icon
        searchIcon.click();

        // Wait for filtering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify filtering occurred
        const images = imageGrid.querySelectorAll('img');
        expect(images.length).toBe(1);
    });
});

describe('A-Z Filter', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="collections-controls">
                <div class="controls-container">
                    <div class="search-section">
                        <div class="search-container">
                            <input type="text" id="searchInput">
                            <button id="searchButton">Search</button>
                        </div>
                        <div class="filter-container">
                            <div class="az-filter">
                                <span>Filter:</span>
                                <div class="letter-buttons">
                                    <button class="letter-btn all active" data-letter="all">All</button>
                                    <button class="letter-btn" data-letter="a">A</button>
                                    <button class="letter-btn" data-letter="b">B</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="image-grid"></div>
        `;

        // Reset state with image paths
        state.currentImages = [
            { src: '/path/to/apple_image.jpg' },
            { src: '/path/to/banana_photo.jpg' },
            { src: '/path/to/cherry_pic.jpg' }
        ];
        state.filteredImages = [...state.currentImages];
        state.currentLetter = 'all';
        state.isFiltering = false;

        // Initialize filters
        initLetterFilter();
    });

    test('getFilename extracts correct filename without extension', () => {
        expect(getFilename('/path/to/apple_image.jpg')).toBe('apple_image');
        expect(getFilename('banana_photo.jpg')).toBe('banana_photo');
        expect(getFilename('/complex/path/cherry_pic.PNG')).toBe('cherry_pic');
    });

    test('letter filter correctly filters images by filename', () => {
        const aButton = document.querySelector('[data-letter="a"]');
        
        // Click "A" button
        aButton.click();

        // Check filtered images
        expect(state.filteredImages.length).toBe(1);
        expect(getFilename(state.filteredImages[0].src)).toBe('apple_image');
    });

    test('search input filters by filename', () => {
        const searchInput = document.getElementById('searchInput');

        // Search for 'banana'
        searchInput.value = 'banana';
        searchInput.dispatchEvent(new Event('input'));

        // Check filtered images
        expect(state.filteredImages.length).toBe(1);
        expect(getFilename(state.filteredImages[0].src)).toBe('banana_photo');
    });

    test('letter filter and search work together on filenames', () => {
        const searchInput = document.getElementById('searchInput');
        const bButton = document.querySelector('[data-letter="b"]');

        // Set search term and click "B" button
        searchInput.value = 'photo';
        searchInput.dispatchEvent(new Event('input'));
        bButton.click();

        // Should only show banana_photo.jpg
        expect(state.filteredImages.length).toBe(1);
        expect(getFilename(state.filteredImages[0].src)).toBe('banana_photo');
    });

    test('clicking "All" button shows all images regardless of filename', () => {
        const allButton = document.querySelector('[data-letter="all"]');
        const aButton = document.querySelector('[data-letter="a"]');

        // First filter by "A"
        aButton.click();
        expect(state.filteredImages.length).toBe(1);

        // Then click "All"
        allButton.click();
        expect(state.filteredImages.length).toBe(3);
    });

    test('filter maintains state after multiple filename-based selections', () => {
        const aButton = document.querySelector('[data-letter="a"]');
        const bButton = document.querySelector('[data-letter="b"]');
        const allButton = document.querySelector('[data-letter="all"]');

        // Test sequence of filter selections
        aButton.click();
        expect(state.filteredImages.length).toBe(1);
        expect(getFilename(state.filteredImages[0].src)).toBe('apple_image');

        bButton.click();
        expect(state.filteredImages.length).toBe(1);
        expect(getFilename(state.filteredImages[0].src)).toBe('banana_photo');

        allButton.click();
        expect(state.filteredImages.length).toBe(3);
    });
});
