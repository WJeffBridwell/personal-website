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

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper function to create a mock image object
 * @param {string} name - Image name
 * @returns {Object} Mock image object
 */
function createMockImage(name = 'test-image') {
    return {
        name,
        url: `/images/${name}.jpg`,
        thumbnailUrl: `/images/thumbnails/${name}.jpg`
    };
}

/**
 * Helper function to simulate DOM events
 * @param {HTMLElement} element - Target element
 * @param {string} eventType - Type of event to simulate
 * @param {Object} options - Event options
 */
function simulateEvent(element, eventType, options = {}) {
    const event = new window.Event(eventType, { bubbles: true });
    Object.assign(event, options);
    element.dispatchEvent(event);
}

describe('Modal Functionality', () => {
    beforeEach(() => {
        // Set up JSDOM
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        global.document = dom.window.document;
        global.window = dom.window;
        global.Event = window.Event;
        jest.resetModules();
    });

    describe('Initialization', () => {
        test('should create modal with all required elements', () => {
            window.modalFunctions.initModal();
            const modal = document.getElementById('modal');
            expect(modal).toBeDefined();
            expect(modal.querySelector('#modal-img')).toBeDefined();
            expect(modal.querySelector('#modal-caption')).toBeDefined();
        });

        test('should initialize with modal hidden', () => {
            window.modalFunctions.initModal();
            const modal = document.getElementById('modal');
            expect(modal.style.display).toBe('none');
        });
    });

    describe('Opening and Closing', () => {
        const testImage = { url: 'test.jpg', name: 'Test Image' };

        test('should open modal with correct image', () => {
            window.modalFunctions.openModal(testImage.url, testImage.name);
            const modal = document.getElementById('modal');
            expect(modal.style.display).toBe('block');
            expect(modal.querySelector('#modal-img').src).toContain(testImage.name);
        });

        test('should close modal and reset state', () => {
            window.modalFunctions.closeModal();
            const modal = document.getElementById('modal');
            expect(modal.style.display).toBe('none');
            expect(modal.querySelector('#modal-img').src).toBe('');
        });

        test('should handle missing image gracefully', () => {
            window.modalFunctions.openModal();
            const modal = document.getElementById('modal');
            expect(modal.style.display).toBe('none');
        });
    });

    describe('Event Handling', () => {
        beforeEach(() => {
            window.modalFunctions.initModal();
            window.modalFunctions.openModal('test.jpg', 'Test Image');
        });

        test('should close on background click', () => {
            const modal = document.getElementById('modal');
            simulateEvent(modal, 'click');
            expect(modal.style.display).toBe('none');
        });

        test('should close on escape key', () => {
            simulateEvent(document, 'keydown', { key: 'Escape' });
            const modal = document.getElementById('modal');
            expect(modal.style.display).toBe('none');
        });

        test('should close on image click', () => {
            const modalImg = document.querySelector('#modal-img');
            simulateEvent(modalImg, 'click');
            const modal = document.getElementById('modal');
            expect(modal.style.display).toBe('none');
        });
    });

    describe('History State', () => {
        beforeEach(() => {
            window.history.pushState = jest.fn();
            window.modalFunctions.initModal();
        });

        test('should update history when opening modal', () => {
            window.modalFunctions.openModal('test.jpg', 'Test Image');
            expect(window.history.pushState).toHaveBeenCalled();
        });

        test('should close modal on popstate', () => {
            window.modalFunctions.openModal('test.jpg', 'Test Image');
            simulateEvent(window, 'popstate');
            const modal = document.getElementById('modal');
            expect(modal.style.display).toBe('none');
        });
    });
});

afterEach(() => {
    // Clean up
    window.close();
    delete global.window;
    delete global.document;
});

/**
 * Create modalFunctions object
 */
window.modalFunctions = {
    initModal() {
        let modal = document.getElementById('modal');
        let modalImg = document.getElementById('modal-img');
        let caption = document.getElementById('modal-caption');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal';
            modal.className = 'modal';

            modalImg = document.createElement('img');
            modalImg.id = 'modal-img';
            modalImg.className = 'modal-content';

            caption = document.createElement('div');
            caption.id = 'modal-caption';

            modal.appendChild(modalImg);
            modal.appendChild(caption);
            document.body.appendChild(modal);

            // Event Listeners for closing modal
            const handleClick = (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            };

            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    this.closeModal();
                }
            };

            const handlePopState = () => {
                if (modal.style.display === 'block') {
                    this.closeModal();
                }
            };

            // Add event listeners
            modal.addEventListener('click', handleClick);
            document.addEventListener('keydown', handleKeyDown);
            modalImg.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeModal();
            });
            window.addEventListener('popstate', handlePopState);

            // Store event handlers for cleanup
            modal._handlers = {
                click: handleClick,
                keydown: handleKeyDown,
                popstate: handlePopState
            };
        }

        return { modal, modalImg, caption };
    },

    openModal(imgSrc, captionText) {
        const { modal, modalImg, caption } = this.initModal();
        modalImg.src = imgSrc;
        caption.textContent = captionText || '';
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
        window.history.pushState({ modal: true }, '');
    },

    closeModal() {
        const modal = document.getElementById('modal');
        if (!modal) return;

        modal.style.display = 'none';
        document.body.classList.remove('modal-open');

        if (window.history.state && window.history.state.modal) {
            window.history.back();
        }

        // Clean up event listeners
        if (modal._handlers) {
            modal.removeEventListener('click', modal._handlers.click);
            document.removeEventListener('keydown', modal._handlers.keydown);
            window.removeEventListener('popstate', modal._handlers.popstate);
        }
    }
};
