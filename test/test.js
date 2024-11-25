import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createElement } from '../modal.js';

describe('Modal Functionality', () => {
    let modalFunctions;

    beforeEach(() => {
        // Set up our document body
        document.body.innerHTML = `
            <div id="image-grid" class="image-grid">
                <div class="image-container">
                    <img src="test.jpg" alt="Test Image">
                </div>
            </div>
        `;

        // Import modal functions
        modalFunctions = {
            initModal() {
                let modal = document.getElementById('modal');
                let modalImg = document.getElementById('modal-img');
                let caption = document.getElementById('modal-caption');

                // Clean up any existing modal
                if (modal) {
                    modal.remove();
                    modal = null;
                }

                // Create new modal
                modal = createElement('div', { id: 'modal', className: 'modal' });
                modalImg = createElement('img', { id: 'modal-img', className: 'modal-content' });
                caption = createElement('div', { id: 'modal-caption' });

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
    });

    afterEach(() => {
        // Clean up
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    it('should close modal when ESC key is pressed', () => {
        // Open modal
        modalFunctions.openModal('test.jpg', 'Test Image');
        
        // Verify modal is open
        const modal = document.getElementById('modal');
        expect(modal.style.display).toBe('block');
        expect(document.body.classList.contains('modal-open')).toBe(true);

        // Simulate ESC key press
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);

        // Verify modal is closed
        expect(modal.style.display).toBe('none');
        expect(document.body.classList.contains('modal-open')).toBe(false);
    });

    it('should close modal when clicking outside image', () => {
        // Open modal
        modalFunctions.openModal('test.jpg', 'Test Image');
        
        // Verify modal is open
        const modal = document.getElementById('modal');
        expect(modal.style.display).toBe('block');

        // Simulate click outside image
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        modal.dispatchEvent(event);

        // Verify modal is closed
        expect(modal.style.display).toBe('none');
        expect(document.body.classList.contains('modal-open')).toBe(false);
    });

    it('should close modal when browser back button is pressed', () => {
        // Open modal
        modalFunctions.openModal('test.jpg', 'Test Image');
        
        // Verify modal is open
        const modal = document.getElementById('modal');
        expect(modal.style.display).toBe('block');

        // Simulate browser back button
        const event = new PopStateEvent('popstate');
        window.dispatchEvent(event);

        // Verify modal is closed
        expect(modal.style.display).toBe('none');
        expect(document.body.classList.contains('modal-open')).toBe(false);
    });

    it('should properly clean up event listeners when modal is closed', () => {
        // Open modal
        modalFunctions.openModal('test.jpg', 'Test Image');
        
        const modal = document.getElementById('modal');
        expect(modal._handlers).toBeDefined();

        // Close modal
        modalFunctions.closeModal();

        // Simulate events that should no longer work
        const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escEvent);

        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        modal.dispatchEvent(clickEvent);

        const popStateEvent = new PopStateEvent('popstate');
        window.dispatchEvent(popStateEvent);

        // Modal should remain closed
        expect(modal.style.display).toBe('none');
        expect(document.body.classList.contains('modal-open')).toBe(false);
    });
});

describe('Gallery Image Click Functionality', () => {
    let modalFunctions;

    beforeEach(() => {
        // Set up test environment
        process.env.NODE_ENV = 'test';
        
        document.body.innerHTML = `
            <div id="image-grid">
                <div class="image-container">
                    <img src="/images/test.jpg" alt="Test Image">
                    <i class="fas fa-search search-icon"></i>
                </div>
            </div>
        `;
        
        // Initialize modal and store references
        modalFunctions = {
            initModal() {
                let modal = document.getElementById('modal');
                let modalImg = document.getElementById('modal-img');
                let caption = document.getElementById('modal-caption');

                // Clean up any existing modal
                if (modal) {
                    modal.remove();
                    modal = null;
                }

                // Create new modal
                modal = createElement('div', { id: 'modal', className: 'modal' });
                modalImg = createElement('img', { id: 'modal-img', className: 'modal-content' });
                caption = createElement('div', { id: 'modal-caption' });

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
    });

    it('should open modal when clicking gallery image', () => {
        const imageContainer = document.querySelector('.image-container');
        const img = imageContainer.querySelector('img');
        
        // Simulate image load
        img.dispatchEvent(new Event('load'));
        
        // Trigger click on the container
        imageContainer.click();

        // Check if modal exists and is initialized
        const modal = document.getElementById('modal');
        expect(modal).toBeTruthy();

        // Check if modal is displayed
        expect(modal.style.display).toBe('block');
        
        // Check if modal image source matches clicked image
        expect(modal.querySelector('img').src).toBe(img.src);
        
        // Check if modal caption matches image alt text
        expect(modal.querySelector('div').textContent).toBe(img.alt);
    });

    it('should open modal when clicking search icon', () => {
        const searchIcon = document.querySelector('.search-icon');
        const img = document.querySelector('.image-container img');
        
        // Simulate image load
        img.dispatchEvent(new Event('load'));
        
        // Trigger click on search icon
        searchIcon.click();

        // Check if modal exists and is initialized
        const modal = document.getElementById('modal');
        expect(modal).toBeTruthy();

        // Check if modal is displayed
        expect(modal.style.display).toBe('block');
        
        // Check if modal image source matches clicked image
        expect(modal.querySelector('img').src).toBe(img.src);
        
        // Check if modal caption matches image alt text
        expect(modal.querySelector('div').textContent).toBe(img.alt);
    });

    afterEach(() => {
        process.env.NODE_ENV = 'development';
        document.body.innerHTML = '';
    });
});
