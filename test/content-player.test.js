import { jest } from '@jest/globals';
import { ContentPlayer } from '../public/js/content-player.js';

describe('ContentPlayer', () => {
    let contentPlayer;
    let mockModal;
    let mockContentElement;
    let mockCloseButton;

    beforeEach(() => {
        // Setup mock DOM
        mockModal = document.createElement('div');
        mockModal.id = 'contentModal';
        mockModal.className = 'modal';

        mockContentElement = document.createElement('div');
        mockContentElement.className = 'content-player';
        mockModal.appendChild(mockContentElement);

        mockCloseButton = document.createElement('button');
        mockCloseButton.className = 'modal__close';
        mockModal.appendChild(mockCloseButton);

        document.body.appendChild(mockModal);

        contentPlayer = new ContentPlayer('contentModal');
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize with correct modal element', () => {
            expect(contentPlayer.modal).toBe(mockModal);
            expect(contentPlayer.contentElement).toBe(mockContentElement);
            expect(contentPlayer.closeButton).toBe(mockCloseButton);
        });

        test('should throw error if modal not found', () => {
            document.body.innerHTML = '';
            expect(() => new ContentPlayer('nonexistentModal')).toThrow();
        });
    });

    describe('event listeners', () => {
        test('should close on close button click', () => {
            contentPlayer.modal.classList.add('modal--active');
            contentPlayer.closeButton.click();
            expect(contentPlayer.modal.classList.contains('modal--active')).toBe(false);
        });

        test('should close on clicking outside content', () => {
            contentPlayer.modal.classList.add('modal--active');
            mockModal.click();
            expect(contentPlayer.modal.classList.contains('modal--active')).toBe(false);
        });

        test('should not close when clicking content', () => {
            contentPlayer.modal.classList.add('modal--active');
            mockContentElement.click();
            expect(contentPlayer.modal.classList.contains('modal--active')).toBe(true);
        });
    });

    describe('open method', () => {
        test('should open video content correctly', () => {
            const videoUrl = 'test.mp4';
            contentPlayer.open(videoUrl);
            
            const video = mockContentElement.querySelector('video');
            expect(video).toBeTruthy();
            expect(video.src).toContain(videoUrl);
            expect(video.controls).toBe(true);
            expect(video.autoplay).toBe(true);
            expect(contentPlayer.modal.classList.contains('modal--active')).toBe(true);
        });

        test('should open image content correctly', () => {
            const imageUrl = 'test.jpg';
            contentPlayer.open(imageUrl);
            
            const img = mockContentElement.querySelector('img');
            expect(img).toBeTruthy();
            expect(img.src).toContain(imageUrl);
            expect(contentPlayer.modal.classList.contains('modal--active')).toBe(true);
        });

        test('should handle empty content url', () => {
            const consoleSpy = jest.spyOn(console, 'error');
            contentPlayer.open('');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('close method', () => {
        test('should clear content immediately', () => {
            contentPlayer.open('test.jpg');
            contentPlayer.close();
            
            expect(contentPlayer.modal.classList.contains('modal--active')).toBe(false);
            expect(document.body.style.overflow).toBe('');
            expect(mockContentElement.innerHTML).toBe('');
        });
    });

    describe('content type detection', () => {
        test('should detect video content', () => {
            expect(contentPlayer.isVideo('test.mp4')).toBeTruthy();
            expect(contentPlayer.isVideo('test.webm')).toBeTruthy();
            expect(contentPlayer.isVideo('test.ogg')).toBeTruthy();
            expect(contentPlayer.isVideo('test.jpg')).toBeFalsy();
        });
    });
});
