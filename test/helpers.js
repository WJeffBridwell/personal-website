import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';

export const mockImageData = [
    {
        id: 'test1',
        name: 'Test Image 1',
        url: '/images/test1.jpg',
        date: '2023-01-01'
    },
    {
        id: 'test2',
        name: 'Test Image 2',
        url: '/images/test2.jpg',
        date: '2023-02-01'
    }
];

export function setupTestDOM() {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Gallery Test</title>
            <style>
                .hidden { display: none !important; }
                .visible { display: block !important; }
                .error { border: 2px solid red; }
                .error-message { color: red; }
                .image-container { display: inline-block; margin: 10px; }
                .image-name { text-align: center; margin-top: 5px; }
                .no-results { display: none; text-align: center; padding: 20px; }
            </style>
        </head>
        <body>
            <div id="gallery-container">
                <div id="search-container">
                    <input type="text" id="search-input" placeholder="Search images...">
                </div>
                <div id="letter-filter">
                    <button class="letter-button" data-letter="all">All</button>
                    <button class="letter-button" data-letter="t">T</button>
                    <button class="letter-button" data-letter="o">O</button>
                </div>
                <div id="sort-container">
                    <button id="sort-name" data-sort="name" data-order="asc">Sort by Name</button>
                    <button id="sort-date" data-sort="date" data-order="asc">Sort by Date</button>
                </div>
                <div id="image-grid" class="image-grid"></div>
                <div class="no-results">No images found</div>
                <div class="error-message"></div>
            </div>
        </body>
        </html>
    `, {
        url: "http://localhost",
        referrer: "http://localhost",
        contentType: "text/html",
        includeNodeLocations: true,
        runScripts: "dangerously",
        resources: "usable",
        pretendToBeVisual: true
    });

    // Initialize window and document
    const window = dom.window;
    const document = window.document;

    // Set up globals
    global.window = window;
    global.document = document;
    global.navigator = window.navigator;
    global.HTMLElement = window.HTMLElement;
    global.Element = window.Element;
    global.Node = window.Node;
    global.Event = window.Event;
    global.CustomEvent = window.CustomEvent;

    // Mock browser APIs
    global.window.matchMedia = () => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {}
    });

    global.window.requestAnimationFrame = callback => setTimeout(callback, 0);
    global.window.cancelAnimationFrame = id => clearTimeout(id);

    return { window, document };
}

export function simulateInput(element, value) {
    if (!element) throw new Error('Element not found for input simulation');
    
    // Set the value
    element.value = value;
    
    // Create and dispatch input event
    const inputEvent = document.createEvent('Event');
    inputEvent.initEvent('input', true, true);
    element.dispatchEvent(inputEvent);
    
    // Create and dispatch change event
    const changeEvent = document.createEvent('Event');
    changeEvent.initEvent('change', true, true);
    element.dispatchEvent(changeEvent);
}

export function simulateClick(element) {
    if (!element) throw new Error('Element not found for click simulation');
    
    // Create and dispatch mousedown event
    const mousedownEvent = document.createEvent('MouseEvents');
    mousedownEvent.initEvent('mousedown', true, true);
    element.dispatchEvent(mousedownEvent);
    
    // Create and dispatch mouseup event
    const mouseupEvent = document.createEvent('MouseEvents');
    mouseupEvent.initEvent('mouseup', true, true);
    element.dispatchEvent(mouseupEvent);
    
    // Create and dispatch click event
    const clickEvent = document.createEvent('MouseEvents');
    clickEvent.initEvent('click', true, true);
    element.dispatchEvent(clickEvent);
}

export async function flushPromises() {
    // Use setTimeout with 0ms delay to flush promises
    return new Promise(resolve => setTimeout(resolve, 0));
}

export function cleanupDOM() {
    // Reset DOM state
    if (global.document) {
        const imageGrid = global.document.querySelector('#image-grid');
        if (imageGrid) {
            imageGrid.innerHTML = '';
        }
    }

    // Clean up globals
    const globals = [
        'window', 'document', 'navigator', 'HTMLElement',
        'Element', 'Node', 'Event', 'CustomEvent'
    ];
    
    globals.forEach(prop => {
        if (prop in global) {
            delete global[prop];
        }
    });
}

export function cleanupGlobalState() {
    cleanupDOM();
}

export function simulateKeyPress(key) {
    const event = new Event('keydown');
    Object.defineProperty(event, 'key', { value: key });
    document.dispatchEvent(event);
}

// Gallery-specific helper functions
export async function loadImages() {
    try {
        const response = await fetch('/api/images');
        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }
        const images = await response.json();
        
        const imageGrid = document.querySelector('#image-grid');
        if (!imageGrid) {
            throw new Error('Image grid element not found');
        }

        // Clear existing images
        imageGrid.innerHTML = '';

        // Create and append image containers
        images.forEach(image => {
            const container = document.createElement('div');
            container.className = 'image-container';
            
            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.name || 'Unnamed image';
            img.setAttribute('loading', 'lazy');
            
            if (image.date) {
                container.dataset.date = image.date;
            }
            
            const name = document.createElement('div');
            name.className = 'image-name';
            name.textContent = image.name || 'Unnamed image';
            
            container.appendChild(img);
            container.appendChild(name);
            imageGrid.appendChild(container);
        });

        return images;
    } catch (error) {
        const errorMessage = document.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
        throw error;
    }
}

export function initializeGalleryControls() {
    const searchInput = document.getElementById('search-input');
    const letterContainer = document.getElementById('letter-filter');
    const sortButtons = document.querySelectorAll('.sort-btn');

    if (!searchInput || !letterContainer) {
        console.warn('Gallery controls elements not found');
        return;
    }

    // Create letter filter buttons
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
        const button = document.createElement('button');
        button.textContent = letter;
        button.className = 'letter-btn';
        button.addEventListener('click', () => handleLetterFilter(letter));
        letterContainer.appendChild(button);
    });

    // Add search input listener
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

    // Add sort button listeners
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sortType = button.dataset.sort;
            const direction = button.dataset.direction || 'asc';
            handleSort(sortType, direction);
        });
    });
}

export function sortImages(sortBy = 'name', order = 'asc') {
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) {
        throw new Error('Image grid element not found');
    }

    const containers = Array.from(imageGrid.querySelectorAll('.image-container'));
    
    containers.sort((a, b) => {
        let valueA, valueB;
        
        if (sortBy === 'date') {
            valueA = new Date(a.dataset.date || 0);
            valueB = new Date(b.dataset.date || 0);
        } else {
            valueA = a.querySelector('.image-name').textContent.toLowerCase();
            valueB = b.querySelector('.image-name').textContent.toLowerCase();
        }
        
        if (order === 'asc') {
            return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
            return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
    });
    
    // Reattach sorted elements
    containers.forEach(container => {
        imageGrid.appendChild(container);
    });
}

export function handleSearch(event) {
    filterImages(event.target.value);
}

export function handleSort(event) {
    const button = event.target;
    const sortBy = button.dataset.sort;
    const currentOrder = button.dataset.order || 'asc';
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    
    // Update button state
    button.dataset.order = newOrder;
    
    // Sort images
    sortImages(sortBy, newOrder);
}

export function handleLetterFilter(event) {
    const letter = event.target.dataset.letter;
    filterByLetter(letter);
}

// Image filtering functions
export function filterImages(searchTerm) {
    const containers = document.querySelectorAll('.image-container');
    if (!containers) return;

    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    containers.forEach(container => {
        const name = container.querySelector('.image-name').textContent;
        const visible = normalizedSearch === '' || 
                       name.toLowerCase().includes(normalizedSearch);
        container.style.display = visible ? '' : 'none';
    });
    
    updateNoResultsMessage();
}

export function filterByLetter(letter) {
    const containers = document.querySelectorAll('.image-container');
    if (!containers) return;

    const normalizedLetter = letter.toLowerCase();
    
    containers.forEach(container => {
        const name = container.querySelector('.image-name').textContent;
        const visible = normalizedLetter === 'all' || 
                       name.toLowerCase().startsWith(normalizedLetter);
        container.style.display = visible ? '' : 'none';
    });
    
    updateNoResultsMessage();
}

// Helper function to update no results message visibility
export function updateNoResultsMessage() {
    const noResults = document.querySelector('.no-results');
    if (!noResults) return;
    
    const hasVisibleImages = Array.from(document.querySelectorAll('.image-container'))
        .some(container => container.style.display !== 'none');
    
    noResults.style.display = hasVisibleImages ? 'none' : 'block';
}

// Handle sticky behavior of gallery controls
export function initializeStickyControls() {
    const controls = document.querySelector('.gallery-controls');
    const nav = document.querySelector('nav');
    
    if (controls && nav) {
        // Get nav height
        const navHeight = nav.offsetHeight;
        
        // Set initial top position
        controls.style.top = `${navHeight}px`;
        
        // Update sticky position on scroll
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const galleryTop = document.querySelector('.gallery').offsetTop;
            
            if (scrollTop > galleryTop - navHeight) {
                controls.classList.add('sticky');
            } else {
                controls.classList.remove('sticky');
            }
        };
        
        window.addEventListener('scroll', handleScroll);
        
        // Initial check
        handleScroll();
    }
}

// Debounce function for search
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
