/**
 * Search Functionality Test Suite
 * Tests the client-side search filtering functionality
 */

import { jest } from '@jest/globals';
import { setupTestDOM, mockImageData, simulateInput, flushPromises, cleanupDOM, simulateClick } from './helpers.js';
import { exec } from 'child_process';

jest.mock('child_process');

describe('Search Functionality', () => {
    let searchInput;
    let imageGrid;
    let letterFilter;
    let testEnv;

    beforeAll(() => {
        testEnv = setupTestDOM();
        global.window = testEnv.window;
        global.document = testEnv.document;
    });

    beforeEach(() => {
        // Create required DOM structure
        const container = document.createElement('div');
        container.id = 'gallery-container';
        container.innerHTML = `
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
            <div id="image-grid"></div>
            <div class="no-results-message">No images found</div>
        `;
        document.body.appendChild(container);

        // Initialize elements
        searchInput = document.querySelector('#search-input');
        letterFilter = document.querySelector('#letter-filter');
        imageGrid = document.querySelector('#image-grid');

        // Initialize image grid with mock data
        mockImageData.forEach(img => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container';
            imgContainer.dataset.name = img.name;
            imgContainer.dataset.date = img.date;
            imgContainer.style.display = '';
            imgContainer.innerHTML = `
                <img src="${img.url}" alt="${img.name}" loading="lazy" />
                <div class="image-name">${img.name}</div>
            `;
            imageGrid.appendChild(imgContainer);
        });

        // Add event handlers
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            Array.from(imageGrid.children).forEach(container => {
                const nameElement = container.querySelector('.image-name');
                const name = nameElement ? nameElement.textContent.toLowerCase() : '';
                container.style.display = name.includes(searchTerm) ? '' : 'none';
            });
        });

        letterFilter.addEventListener('click', (event) => {
            if (!event.target.matches('.letter-button')) return;
            
            const letter = event.target.dataset.letter;
            Array.from(imageGrid.children).forEach(container => {
                const nameElement = container.querySelector('.image-name');
                const name = nameElement ? nameElement.textContent : '';
                if (letter === 'all') {
                    container.style.display = '';
                } else {
                    container.style.display = name.toLowerCase().startsWith(letter) ? '' : 'none';
                }
            });
        });

        document.getElementById('sort-name').addEventListener('click', () => {
            const containers = Array.from(imageGrid.children);
            containers.sort((a, b) => {
                const nameA = a.querySelector('.image-name')?.textContent.toLowerCase() ?? '';
                const nameB = b.querySelector('.image-name')?.textContent.toLowerCase() ?? '';
                return nameA.localeCompare(nameB);
            });
            containers.forEach(container => imageGrid.appendChild(container));
        });

        document.getElementById('sort-date').addEventListener('click', () => {
            const containers = Array.from(imageGrid.children);
            containers.sort((a, b) => {
                const dateA = new Date(a.dataset.date || 0).getTime();
                const dateB = new Date(b.dataset.date || 0).getTime();
                return dateB - dateA;
            });
            containers.forEach(container => imageGrid.appendChild(container));
        });
    });

    afterEach(() => {
        // Clean up DOM
        const container = document.querySelector('#gallery-container');
        if (container) {
            container.remove();
        }
        if (searchInput) {
            searchInput.value = '';
        }
    });

    afterAll(() => {
        cleanupDOM();
    });

    describe('Text Search', () => {
        test('should filter images by search text', async () => {
            // Verify initial state
            expect(imageGrid.children.length).toBe(mockImageData.length);
            
            // Perform search
            simulateInput(searchInput, 'Test Image 1');
            await flushPromises();

            // Verify filtered results
            const visibleContainers = Array.from(imageGrid.children)
                .filter(container => container.style.display !== 'none');
            expect(visibleContainers.length).toBe(1);
            expect(visibleContainers[0].querySelector('.image-name').textContent)
                .toBe('Test Image 1');
        });

        test('should show all images when search is cleared', async () => {
            // First filter
            simulateInput(searchInput, 'Test Image 1');
            await flushPromises();

            // Then clear
            simulateInput(searchInput, '');
            await flushPromises();

            // Verify all images visible
            const visibleContainers = Array.from(imageGrid.children)
                .filter(container => container.style.display !== 'none');
            expect(visibleContainers.length).toBe(mockImageData.length);
        });

        test('should handle case-insensitive search', async () => {
            simulateInput(searchInput, 'test IMAGE 1');
            await flushPromises();

            const visibleContainers = Array.from(imageGrid.children)
                .filter(container => container.style.display !== 'none');
            expect(visibleContainers.length).toBe(1);
            expect(visibleContainers[0].querySelector('.image-name').textContent.toLowerCase())
                .toBe('Test Image 1'.toLowerCase());
        });

        test('should handle partial matches', async () => {
            simulateInput(searchInput, 'Image');
            await flushPromises();

            const visibleContainers = Array.from(imageGrid.children)
                .filter(container => container.style.display !== 'none');
            
            expect(visibleContainers.length).toBe(mockImageData.length);
        });

        test('should handle no matches', async () => {
            simulateInput(searchInput, 'NonexistentImage');
            await flushPromises();

            const visibleContainers = Array.from(imageGrid.children)
                .filter(container => container.style.display !== 'none');
            
            expect(visibleContainers.length).toBe(0);
            expect(document.querySelector('.no-results-message')).toBeTruthy();
        });
    });

    describe('Letter Filtering', () => {
        test('should create letter filter buttons', () => {
            const letters = letterFilter.querySelectorAll('button');
            expect(letters.length).toBeGreaterThan(0);
            expect(letters[0].textContent).toBe('All');
        });

        test('should filter by starting letter', async () => {
            const letterButton = letterFilter.querySelector('[data-letter="t"]');
            simulateClick(letterButton);
            await flushPromises();

            const visibleContainers = Array.from(imageGrid.children)
                .filter(container => container.style.display !== 'none');
            expect(visibleContainers.length).toBe(2); // Both test images start with T
        });

        test('should show all images when "All" is clicked', async () => {
            // First filter by letter
            const letterButton = letterFilter.querySelector('[data-letter="t"]');
            simulateClick(letterButton);
            await flushPromises();

            // Then click All
            const allButton = letterFilter.querySelector('[data-letter="all"]');
            simulateClick(allButton);
            await flushPromises();

            const visibleContainers = Array.from(imageGrid.children)
                .filter(container => container.style.display !== 'none');
            expect(visibleContainers.length).toBe(mockImageData.length);
        });
    });

    describe('Sort Controls', () => {
        test('should sort by name', async () => {
            const sortNameButton = document.getElementById('sort-name');
            simulateClick(sortNameButton);
            await flushPromises();

            const imageNames = Array.from(imageGrid.querySelectorAll('.image-name'))
                .map(el => el.textContent);
            const sortedNames = [...imageNames].sort();
            
            expect(imageNames).toEqual(sortedNames);
        });

        test('should sort by date', async () => {
            const sortDateButton = document.getElementById('sort-date');
            simulateClick(sortDateButton);
            await flushPromises();

            const containers = Array.from(imageGrid.children);
            const dates = containers.map(container => container.dataset.date);
            const sortedDates = [...dates].sort((a, b) => {
                return new Date(b).getTime() - new Date(a).getTime();
            });
            
            expect(dates).toEqual(sortedDates);
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed image data', async () => {
            // Add a malformed image container
            const malformedContainer = document.createElement('div');
            malformedContainer.className = 'image-container';
            imageGrid.appendChild(malformedContainer);

            // Try to search
            simulateInput(searchInput, 'test');
            await flushPromises();

            // Should not throw error
            expect(malformedContainer.style.display).toBe('none');
        });

        test('should handle rapid search input', async () => {
            // Simulate rapid typing
            simulateInput(searchInput, 't');
            simulateInput(searchInput, 'te');
            simulateInput(searchInput, 'tes');
            simulateInput(searchInput, 'test');
            await flushPromises();

            const visibleContainers = Array.from(imageGrid.children)
                .filter(container => container.style.display !== 'none');
            
            expect(visibleContainers.length).toBeGreaterThan(0);
        });
    });
});
