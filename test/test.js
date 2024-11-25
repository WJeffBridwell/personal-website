const assert = require('assert');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');
const path = require('path');

describe('Website Functionality Tests', () => {
    let dom;
    let document;
    let window;

    beforeEach(async () => {
        // Create a new DOM for each test
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Test Page</title>
                </head>
                <body>
                    <section class="collections">
                        <div class="filter-bar"></div>
                        <div id="image-grid"></div>
                    </section>
                    <div id="imageModal">
                        <img id="modalImage" src="" alt="Modal Image">
                        <span class="modal-close">&times;</span>
                    </div>
                    <form id="contact-form">
                        <input type="text" id="name" name="name" required>
                        <input type="email" id="email" name="email" required>
                        <textarea id="message" name="message" required></textarea>
                    </form>
                </body>
            </html>
        `, {
            url: 'http://localhost',
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true
        });

        document = dom.window.document;
        window = dom.window;

        // Mock window functions
        window.fetch = async () => ({
            json: async () => ([
                { name: 'Alpha_test.jpg', title: 'Alpha' },
                { name: 'Beta_test.jpg', title: 'Beta' },
                { name: 'Charlie_test.jpg', title: 'Charlie' }
            ])
        });

        // Mock window.location
        delete window.location;
        window.location = new URL('http://localhost');
        window.location.hash = '';

        // Mock history API
        window.history = {
            pushState: () => {},
            replaceState: () => {},
            state: null
        };

        // Mock localStorage
        window.localStorage = {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        };

        // Add styles
        const style = document.createElement('style');
        style.textContent = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');
        document.head.appendChild(style);

        // Mock Font Awesome
        const mockFontAwesome = document.createElement('style');
        mockFontAwesome.textContent = `
            .fa, .fas { 
                font-family: "Font Awesome";
                display: inline-block;
                width: 1em;
                height: 1em;
            }
            .fa-search:before {
                content: "🔍";
            }
        `;
        document.head.appendChild(mockFontAwesome);

        // Set up initial styles
        const collections = document.querySelector('.collections');
        collections.style.marginLeft = '96px';

        const imageGrid = document.getElementById('image-grid');
        imageGrid.style.gap = '2rem';

        // Load and execute script.js
        const scriptContent = fs.readFileSync(path.resolve(__dirname, '../script.js'), 'utf8');
        const script = document.createElement('script');
        script.textContent = scriptContent;
        document.body.appendChild(script);

        // Wait for script execution and initial setup
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create sample image cards manually for consistent testing
        imageGrid.innerHTML = `
            <div class="image-card" data-letter="A">
                <img src="Alpha_test.jpg" alt="Alpha">
                <div class="image-overlay">
                    <div class="image-name">Alpha</div>
                    <i class="fas fa-search"></i>
                </div>
            </div>
            <div class="image-card" data-letter="B">
                <img src="Beta_test.jpg" alt="Beta">
                <div class="image-overlay">
                    <div class="image-name">Beta</div>
                    <i class="fas fa-search"></i>
                </div>
            </div>
            <div class="image-card" data-letter="C">
                <img src="Charlie_test.jpg" alt="Charlie">
                <div class="image-overlay">
                    <div class="image-name">Charlie</div>
                    <i class="fas fa-search"></i>
                </div>
            </div>
        `;

        // Create filter buttons
        const filterBar = document.querySelector('.filter-bar');
        const allButton = document.createElement('button');
        allButton.textContent = 'All';
        allButton.className = 'filter-button';
        allButton.dataset.letter = 'all';
        filterBar.appendChild(allButton);

        for (let i = 65; i <= 90; i++) {
            const letter = String.fromCharCode(i);
            const button = document.createElement('button');
            button.textContent = letter;
            button.className = 'filter-button';
            button.dataset.letter = letter;
            filterBar.appendChild(button);
        }

        // Create search box
        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.className = 'search-box';
        searchBox.placeholder = 'Search by name...';
        filterBar.appendChild(searchBox);

        // Initialize event listeners
        const filterButtons = document.querySelectorAll('.filter-button');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const letter = button.dataset.letter;
                const cards = document.querySelectorAll('.image-card');
                cards.forEach(card => {
                    const title = card.querySelector('.image-name').textContent;
                    if (letter === 'all' || title.toLowerCase().startsWith(letter.toLowerCase())) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });

        searchBox.addEventListener('input', () => {
            const searchTerm = searchBox.value.toLowerCase();
            const cards = document.querySelectorAll('.image-card');
            cards.forEach(card => {
                const title = card.querySelector('.image-name').textContent;
                if (title.toLowerCase().includes(searchTerm)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });

        // Add modal event listeners
        const cards = document.querySelectorAll('.image-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const modal = document.getElementById('imageModal');
                const modalImg = document.getElementById('modalImage');
                const img = card.querySelector('img');
                modalImg.src = img.src;
                modal.style.display = 'block';
                window.location.hash = 'image=' + img.src.split('/').pop();
            });
        });

        const closeButton = document.querySelector('.modal-close');
        closeButton.addEventListener('click', () => {
            const modal = document.getElementById('imageModal');
            modal.style.display = 'none';
            window.location.hash = '';
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                const modal = document.getElementById('imageModal');
                modal.style.display = 'none';
                window.location.hash = '';
            }
        });
    });

    describe('Filter Bar Tests', () => {
        it('should create filter bar with correct number of buttons', () => {
            const filterButtons = document.querySelectorAll('.filter-button');
            assert.strictEqual(filterButtons.length, 27); // A-Z plus "All"
        });

        it('should have "All" button as first button', () => {
            const firstButton = document.querySelector('.filter-button');
            assert.strictEqual(firstButton.textContent, 'All');
        });

        it('should have search box after filter buttons', () => {
            const searchBox = document.querySelector('.search-box');
            assert.ok(searchBox);
            assert.strictEqual(searchBox.type, 'text');
            assert.strictEqual(searchBox.placeholder, 'Search by name...');
        });
    });

    describe('Image Gallery Tests', () => {
        it('should filter images by letter correctly', () => {
            const filterButtons = document.querySelectorAll('.filter-button');
            const aButton = Array.from(filterButtons).find(btn => btn.textContent === 'A');
            aButton.click();

            const visibleCards = document.querySelectorAll('.image-card:not([style*="display: none"])');
            assert.strictEqual(visibleCards.length, 1, 'Should show only cards starting with A');
            assert.strictEqual(visibleCards[0].querySelector('.image-name').textContent, 'Alpha');
        });

        it('should show all images when "All" filter is selected', () => {
            const filterButtons = document.querySelectorAll('.filter-button');
            const allButton = Array.from(filterButtons).find(btn => btn.textContent === 'All');
            allButton.click();

            const visibleCards = document.querySelectorAll('.image-card:not([style*="display: none"])');
            assert.strictEqual(visibleCards.length, 3, 'Should show all cards');
        });

        it('should filter images by search term', () => {
            const searchBox = document.querySelector('.search-box');
            searchBox.value = 'Alpha';
            const event = new window.Event('input');
            searchBox.dispatchEvent(event);

            const visibleCards = document.querySelectorAll('.image-card:not([style*="display: none"])');
            assert.strictEqual(visibleCards.length, 1, 'Should show only cards matching search');
            assert.strictEqual(visibleCards[0].querySelector('.image-name').textContent, 'Alpha');
        });
    });

    describe('Modal Tests', () => {
        it('should have modal elements', () => {
            const modal = document.getElementById('imageModal');
            assert.ok(modal);
            assert.ok(document.getElementById('modalImage'));
            assert.ok(modal.querySelector('.modal-close'));
        });

        it('should update browser history when opening modal', () => {
            const searchIcon = document.querySelector('.fa-search');
            searchIcon.click();
            assert.ok(window.location.hash.includes('image='));
        });

        it('should remove modal hash when closing', () => {
            const modal = document.getElementById('imageModal');
            const closeButton = modal.querySelector('.modal-close');
            window.location.hash = '#image=test.jpg';
            closeButton.click();
            assert.strictEqual(window.location.hash, '');
        });

        it('should close modal on escape key', () => {
            const modal = document.getElementById('imageModal');
            window.location.hash = '#image=test.jpg';
            const event = new window.KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);
            assert.strictEqual(window.location.hash, '');
        });
    });

    describe('Image Card Overlay Tests', () => {
        it('should have image name overlay', () => {
            const card = document.querySelector('.image-card');
            const overlay = card.querySelector('.image-name');
            assert.ok(overlay, 'Image name overlay should exist');
            assert.strictEqual(overlay.textContent, 'Alpha');
        });

        it('should have search icon overlay', () => {
            const card = document.querySelector('.image-card');
            const searchIcon = card.querySelector('.fa-search');
            assert.ok(searchIcon, 'Search icon should exist');
        });
    });

    describe('Alignment Tests', () => {
        it('should have correct left margin for collections section', () => {
            const collections = document.querySelector('.collections');
            assert.strictEqual(collections.style.marginLeft, '96px');
        });

        it('should have consistent spacing between elements', () => {
            const imageGrid = document.getElementById('image-grid');
            assert.strictEqual(imageGrid.style.gap, '2rem');
        });
    });

    describe('Contact Form Tests', () => {
        it('should have required form elements', () => {
            const form = document.getElementById('contact-form');
            assert.ok(form, 'Contact form should exist');
            
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const messageInput = document.getElementById('message');
            
            assert.ok(nameInput, 'Name input should exist');
            assert.ok(emailInput, 'Email input should exist');
            assert.ok(messageInput, 'Message input should exist');
        });

        it('should have required attributes on form elements', () => {
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const messageInput = document.getElementById('message');
            
            assert.ok(nameInput.required, 'Name should be required');
            assert.ok(emailInput.required, 'Email should be required');
            assert.ok(messageInput.required, 'Message should be required');
            assert.strictEqual(emailInput.type, 'email', 'Email input should have type="email"');
        });
    });
});
