import { JSDOM } from 'jsdom';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Modal Functionality', () => {
    let window, document;

    beforeEach(() => {
        // Set up JSDOM
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <body>
                    <div id="image-grid" class="image-grid">
                        <div class="image-container">
                            <img src="test.jpg" alt="Test Image">
                        </div>
                    </div>
                </body>
            </html>
        `, {
            url: 'http://localhost',
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true
        });

        // Set up globals
        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;

        // Mock fetch API
        global.fetch = async () => ({
            ok: true,
            json: async () => ({ images: [] })
        });

        // Create modalFunctions object
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
    });

    afterEach(() => {
        // Clean up
        window.close();
        delete global.window;
        delete global.document;
        delete global.fetch;
    });

    it('should close modal when ESC key is pressed', (done) => {
        // Open modal
        window.modalFunctions.openModal('test.jpg', 'Test Image');
        
        // Verify modal is open
        const modal = document.getElementById('modal');
        expect(modal.style.display).to.equal('block');
        expect(document.body.classList.contains('modal-open')).to.be.true;

        // Simulate ESC key press
        const event = new window.KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);

        // Use setTimeout to allow event handling to complete
        setTimeout(() => {
            expect(modal.style.display).to.equal('none');
            expect(document.body.classList.contains('modal-open')).to.be.false;
            done();
        }, 0);
    });

    it('should close modal when clicking outside image', (done) => {
        // Open modal
        window.modalFunctions.openModal('test.jpg', 'Test Image');
        
        // Verify modal is open
        const modal = document.getElementById('modal');
        expect(modal.style.display).to.equal('block');

        // Simulate click outside image
        const event = new window.MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        modal.dispatchEvent(event);

        // Use setTimeout to allow event handling to complete
        setTimeout(() => {
            expect(modal.style.display).to.equal('none');
            expect(document.body.classList.contains('modal-open')).to.be.false;
            done();
        }, 0);
    });

    it('should close modal when browser back button is pressed', (done) => {
        // Open modal
        window.modalFunctions.openModal('test.jpg', 'Test Image');
        
        // Verify modal is open
        const modal = document.getElementById('modal');
        expect(modal.style.display).to.equal('block');

        // Simulate browser back button
        const event = new window.PopStateEvent('popstate');
        window.dispatchEvent(event);

        // Use setTimeout to allow event handling to complete
        setTimeout(() => {
            expect(modal.style.display).to.equal('none');
            expect(document.body.classList.contains('modal-open')).to.be.false;
            done();
        }, 0);
    });

    it('should properly clean up event listeners when modal is closed', () => {
        // Open modal
        window.modalFunctions.openModal('test.jpg', 'Test Image');
        
        const modal = document.getElementById('modal');
        expect(modal._handlers).to.exist;

        // Close modal
        window.modalFunctions.closeModal();

        // Simulate events that should no longer work
        const escEvent = new window.KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escEvent);

        const clickEvent = new window.MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        modal.dispatchEvent(clickEvent);

        const popStateEvent = new window.PopStateEvent('popstate');
        window.dispatchEvent(popStateEvent);

        // Modal should remain closed
        expect(modal.style.display).to.equal('none');
        expect(document.body.classList.contains('modal-open')).to.be.false;
    });
});
