import { jest } from '@jest/globals';
import { ContentPlayer } from '../content-player.js';

describe('ContentPlayer', () => {
    let contentPlayer;
    let mockModal;
    let mockContentElement;
    let mockCloseButton;

    beforeEach(() => {
        // Set up our document body
        document.body.innerHTML = `
            <div id="testModal">
                <div class="content-player"></div>
                <button class="modal__close"></button>
            </div>
        `;

        mockModal = document.getElementById('testModal');
        mockContentElement = mockModal.querySelector('.content-player');
        mockCloseButton = mockModal.querySelector('.modal__close');

        contentPlayer = new ContentPlayer('testModal');
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('constructor initializes correctly', () => {
        expect(contentPlayer.modal).toBe(mockModal);
        expect(contentPlayer.contentElement).toBe(mockContentElement);
        expect(contentPlayer.closeButton).toBe(mockCloseButton);
    });

    test('constructor throws error when modal not found', () => {
        expect(() => new ContentPlayer('nonexistentModal')).toThrow();
    });

    test('open() creates video element for video content', () => {
        contentPlayer.open('test.mp4');
        const video = mockContentElement.querySelector('video');
        expect(video).toBeTruthy();
        expect(video.src).toContain('test.mp4');
        expect(video.controls).toBe(true);
        expect(video.autoplay).toBe(true);
    });

    test('open() creates image element for image content', () => {
        contentPlayer.open('test.jpg');
        const img = mockContentElement.querySelector('img');
        expect(img).toBeTruthy();
        expect(img.src).toContain('test.jpg');
    });

    test('close() removes modal--active class', () => {
        contentPlayer.modal.classList.add('modal--active');
        contentPlayer.close();
        expect(contentPlayer.modal.classList.contains('modal--active')).toBe(false);
    });

    test('close button click triggers close()', () => {
        contentPlayer.modal.classList.add('modal--active');
        mockCloseButton.click();
        expect(contentPlayer.modal.classList.contains('modal--active')).toBe(false);
    });

    test('escape key triggers close()', () => {
        contentPlayer.modal.classList.add('modal--active');
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);
        expect(contentPlayer.modal.classList.contains('modal--active')).toBe(false);
    });

    test('clicking outside content triggers close()', () => {
        contentPlayer.modal.classList.add('modal--active');
        mockModal.click();
        expect(contentPlayer.modal.classList.contains('modal--active')).toBe(false);
    });
});
