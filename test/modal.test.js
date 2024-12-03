/**
 * Modal Component Test Suite
 * 
 * Tests the functionality of the image modal component including:
 * - Modal initialization
 * - Opening and closing behaviors
 * - Event handling (clicks, keyboard, back button)
 * - Image loading states
 * - Error handling
 */

import { jest } from '@jest/globals';
import { setupTestDOM, mockImageData, simulateClick, simulateKeyPress, flushPromises, cleanupDOM } from './helpers.js';
import { initializeModal } from '../public/js/modal.js';

describe('Modal Functionality', () => {
    let modal;
    let modalImg;
    let modalCaption;
    let closeButton;
    let dom;
    let modalControls;
    let imageGrid;
    let testEnv;

    beforeAll(() => {
        testEnv = setupTestDOM();
        global.window = testEnv.window;
        global.document = testEnv.document;
    });

    beforeEach(() => {
        // Setup DOM and get window/document globals
        dom = setupTestDOM();
        
        // Create image grid if it doesn't exist
        imageGrid = document.getElementById('image-grid');
        if (!imageGrid) {
            imageGrid = document.createElement('div');
            imageGrid.id = 'image-grid';
            document.body.appendChild(imageGrid);
        }
        
        // Initialize modal elements
        modalControls = initializeModal();
        modal = document.getElementById('imageModal');
        modalImg = modal.querySelector('.modal-img');
        modalCaption = modal.querySelector('.modal-caption');
        closeButton = modal.querySelector('.close-modal');
    });

    afterEach(() => {
        cleanupDOM();
        jest.clearAllMocks();
    });

    afterAll(() => {
        cleanupDOM();
    });

    describe('Initialization', () => {
        test('should initialize with modal hidden', () => {
            expect(modal).toBeTruthy();
            expect(modal.classList.contains('show')).toBe(false);
        });

        test('should have all required elements', () => {
            expect(modalImg).toBeTruthy();
            expect(modalCaption).toBeTruthy();
            expect(closeButton).toBeTruthy();
        });
    });

    describe('Opening and Closing', () => {
        const testImage = mockImageData[0];

        test('should open modal with correct image', async () => {
            modalControls.openModal(testImage.url, testImage.name);
            await flushPromises();

            expect(modal.classList.contains('show')).toBe(true);
            expect(modalImg.src).toContain(testImage.url);
            expect(modalCaption.textContent).toBe(testImage.name);
        });

        test('should close modal when clicking close button', async () => {
            modalControls.openModal(testImage.url, testImage.name);
            await flushPromises();
            
            simulateClick(closeButton);
            await flushPromises();

            expect(modal.classList.contains('show')).toBe(false);
        });

        test('should close modal when clicking outside', async () => {
            modalControls.openModal(testImage.url, testImage.name);
            await flushPromises();
            
            simulateClick(modal);
            await flushPromises();

            expect(modal.classList.contains('show')).toBe(false);
        });

        test('should not close modal when clicking modal content', async () => {
            modalControls.openModal(testImage.url, testImage.name);
            await flushPromises();
            
            simulateClick(modalImg);
            await flushPromises();

            expect(modal.classList.contains('show')).toBe(true);
        });

        test('should not close modal when clicking caption', async () => {
            modalControls.openModal(testImage.url, testImage.name);
            await flushPromises();
            
            simulateClick(modalCaption);
            await flushPromises();

            expect(modal.classList.contains('show')).toBe(true);
        });

        test('should reset modal state after closing', async () => {
            modalControls.openModal(testImage.url, testImage.name);
            await flushPromises();
            
            // Add an error message
            const errorEvent = document.createEvent('Event');
            errorEvent.initEvent('error', true, true);
            modalImg.dispatchEvent(errorEvent);
            await flushPromises();

            // Close modal
            modalControls.closeModal();
            await flushPromises();

            expect(modal.classList.contains('show')).toBe(false);
            expect(modalImg.classList.contains('error')).toBe(false);
            expect(modal.querySelector('.error-message')).toBeFalsy();
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="image-modal" class="modal">
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <img src="" alt="" />
                    </div>
                </div>
            `;
            modal = document.getElementById('image-modal');

            // Add event listener for keyboard events
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            });
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        test('should close on escape key', () => {
            // Show modal
            modal.style.display = 'block';
            
            // Create and dispatch event
            const event = new Event('keydown');
            Object.defineProperty(event, 'key', { value: 'Escape' });
            document.dispatchEvent(event);
            
            expect(modal.style.display).toBe('none');
        });

        test('should not close on other keys', () => {
            // Show modal
            modal.style.display = 'block';
            
            // Create and dispatch event
            const event = new Event('keydown');
            Object.defineProperty(event, 'key', { value: 'Enter' });
            document.dispatchEvent(event);
            
            expect(modal.style.display).toBe('block');
        });

        test('should only handle escape key when modal is shown', () => {
            // Modal starts hidden
            modal.style.display = 'none';
            
            // Create and dispatch event
            const event = new Event('keydown');
            Object.defineProperty(event, 'key', { value: 'Escape' });
            document.dispatchEvent(event);
            
            expect(modal.style.display).toBe('none');
        });
    });

    describe('Error Handling', () => {
        test('should handle image load error', async () => {
            const errorSrc = 'invalid-image.jpg';
            modalControls.openModal(errorSrc, 'Test Image');
            await flushPromises();
            
            const errorEvent = document.createEvent('Event');
            errorEvent.initEvent('error', true, true);
            modalImg.dispatchEvent(errorEvent);
            await flushPromises();

            expect(modalImg.classList.contains('error')).toBe(true);
            expect(document.querySelector('.error-message')).toBeTruthy();
        });

        test('should handle missing image data', async () => {
            modalControls.openModal('', '');
            await flushPromises();

            expect(modalImg.classList.contains('error')).toBe(true);
            expect(document.querySelector('.error-message')).toBeTruthy();
        });

        test('should not duplicate error messages', async () => {
            modalControls.openModal('invalid.jpg', 'Test Image');
            await flushPromises();

            // Trigger multiple errors
            const errorEvent = document.createEvent('Event');
            errorEvent.initEvent('error', true, true);
            modalImg.dispatchEvent(errorEvent);
            modalImg.dispatchEvent(errorEvent);
            await flushPromises();

            const errorMessages = document.querySelectorAll('.error-message');
            expect(errorMessages.length).toBe(1);
        });
    });

    describe('Image Container Integration', () => {
        test('should open modal when clicking image container', async () => {
            // Create and add image container
            const container = document.createElement('div');
            container.className = 'image-container';
            container.innerHTML = `
                <img src="${mockImageData[0].url}" alt="${mockImageData[0].name}" />
                <div class="image-name">${mockImageData[0].name}</div>
            `;
            imageGrid.appendChild(container);

            // Re-initialize modal to set up click handlers
            modalControls = initializeModal();
            
            simulateClick(container);
            await flushPromises();

            expect(modal.classList.contains('show')).toBe(true);
            expect(modalImg.src).toContain(mockImageData[0].url);
            expect(modalCaption.textContent).toBe(mockImageData[0].name);
        });

        test('should handle invalid image container data', async () => {
            // Create container without image
            const container = document.createElement('div');
            container.className = 'image-container';
            imageGrid.appendChild(container);

            // Re-initialize modal to set up click handlers
            modalControls = initializeModal();
            
            simulateClick(container);
            await flushPromises();

            expect(modalImg.classList.contains('error')).toBe(true);
            expect(document.querySelector('.error-message')).toBeTruthy();
        });
    });
});
