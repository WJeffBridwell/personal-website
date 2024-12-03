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
                .no-results-message { display: none; text-align: center; padding: 20px; }
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
                    <button id="sort-name">Sort by Name</button>
                    <button id="sort-date">Sort by Date</button>
                </div>
                <div id="image-grid" class="image-grid"></div>
                <div class="no-results-message">No images found</div>
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
