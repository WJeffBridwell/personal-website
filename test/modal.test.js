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
    let modalController;

    beforeAll(() => {
        dom = setupTestDOM();
        global.window = dom.window;
        global.document = dom.document;
    });

    beforeEach(() => {
        dom = setupTestDOM();
        modalController = initializeModal();
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

    test('initializes modal with correct structure', () => {
        expect(modal).toBeTruthy();
        expect(modalImg).toBeTruthy();
        expect(modalCaption).toBeTruthy();
        expect(closeButton).toBeTruthy();
    });

    test('opens modal with image and caption', () => {
        const testImage = '/test/image.jpg';
        const testCaption = 'Test Caption';
        
        modalController.openModal(testImage, testCaption);
        
        expect(modal.classList.contains('show')).toBe(true);
        expect(modalImg.src).toContain(testImage);
        expect(modalCaption.textContent).toBe(testCaption);
    });

    test('closes modal', () => {
        // First open the modal
        modalController.openModal('/test/image.jpg', 'Test Caption');
        
        // Then close it
        modalController.closeModal();
        
        expect(modal.classList.contains('show')).toBe(false);
    });

    test('handles missing image data', () => {
        modalController.openModal(null, null);
        
        expect(modal.classList.contains('show')).toBe(false);
        expect(modalImg.classList.contains('error')).toBe(true);
        expect(modal.querySelector('.error-message')).toBeTruthy();
    });

    test('cleans up error state on close', () => {
        // First create an error state
        modalController.openModal(null, null);
        
        // Then close
        modalController.closeModal();
        
        expect(modalImg.classList.contains('error')).toBe(false);
        expect(modal.querySelector('.error-message')).toBeFalsy();
    });

    test('closes on escape key', () => {
        modalController.openModal('/test/image.jpg', 'Test Caption');
        
        simulateKeyPress('Escape');
        
        expect(modal.classList.contains('show')).toBe(false);
    });

    test('closes on clicking close button', () => {
        modalController.openModal('/test/image.jpg', 'Test Caption');
        
        simulateClick(closeButton);
        
        expect(modal.classList.contains('show')).toBe(false);
    });
});
