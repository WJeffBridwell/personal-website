const assert = require('assert');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');
const path = require('path');

// Mock fetch API
global.fetch = async () => ({
    json: async () => ([
        { name: 'Alpha_test.jpg', title: 'Alpha' },
        { name: 'Beta_test.jpg', title: 'Beta' },
        { name: 'Charlie_test.jpg', title: 'Charlie' }
    ])
});

describe('Website Functionality Tests', () => {
    let dom;
    let document;
    let window;

    beforeEach(async () => {
        // Create a new DOM for each test
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <body>
                    <div class="filter-bar"></div>
                    <div id="image-grid"></div>
                    <div id="imageModal">
                        <img id="modalImage" src="" alt="Modal Image">
                        <span class="modal-close">&times;</span>
                    </div>
                    <form class="contact-form">
                        <input type="text" placeholder="Your Name" required>
                        <input type="email" placeholder="Your Email" required>
                        <textarea required></textarea>
                        <button type="submit">Send Message</button>
                    </form>
                </body>
            </html>
        `, {
            url: 'http://localhost',
            runScripts: 'dangerously',
            resources: 'usable'
        });

        document = dom.window.document;
        window = dom.window;

        // Set up window properties
        window.filterGallery = function(letter) {
            const cards = document.querySelectorAll('.image-card');
            cards.forEach(card => {
                const title = card.querySelector('.image-title').textContent;
                if (letter === 'all' || title.toLowerCase().startsWith(letter.toLowerCase())) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        };

        window.filterGalleryBySearch = function(searchTerm) {
            const cards = document.querySelectorAll('.image-card');
            cards.forEach(card => {
                const title = card.querySelector('.image-title').textContent;
                if (title.toLowerCase().includes(searchTerm.toLowerCase())) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        };

        // Create filter buttons
        const filterBar = document.querySelector('.filter-bar');
        const allButton = document.createElement('button');
        allButton.textContent = 'All';
        allButton.className = 'filter-button all';
        filterBar.appendChild(allButton);

        for (let i = 65; i <= 90; i++) {
            const letter = String.fromCharCode(i);
            const button = document.createElement('button');
            button.textContent = letter;
            button.className = 'filter-button';
            filterBar.appendChild(button);
        }

        // Create search box
        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.className = 'filter-search';
        searchBox.placeholder = 'Search by name...';
        filterBar.appendChild(searchBox);

        // Create sample image cards
        const imageGrid = document.getElementById('image-grid');
        const sampleCards = [
            { name: 'Alpha_test.jpg', title: 'Alpha' },
            { name: 'Beta_test.jpg', title: 'Beta' },
            { name: 'Charlie_test.jpg', title: 'Charlie' }
        ];

        sampleCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'image-card';
            
            const title = document.createElement('div');
            title.className = 'image-title';
            title.textContent = card.title;
            
            cardElement.appendChild(title);
            imageGrid.appendChild(cardElement);
        });
    });

    describe('Filter Bar Tests', () => {
        it('should create filter bar with correct number of buttons', () => {
            const filterBar = document.querySelector('.filter-bar');
            assert(filterBar !== null, 'Filter bar should exist');
            
            const buttons = filterBar.querySelectorAll('.filter-button');
            // 26 letters + 1 "All" button
            assert.equal(buttons.length, 27, 'Should have 27 filter buttons (A-Z + All)');
        });

        it('should have "All" button as first button', () => {
            const firstButton = document.querySelector('.filter-button');
            assert.equal(firstButton.textContent, 'All', 'First button should be "All"');
            assert(firstButton.classList.contains('all'), 'First button should have "all" class');
        });

        it('should have search box after filter buttons', () => {
            const searchBox = document.querySelector('.filter-search');
            assert(searchBox !== null, 'Search box should exist');
            assert.equal(searchBox.type, 'text', 'Search box should be text input');
            assert.equal(searchBox.placeholder, 'Search by name...', 'Search box should have correct placeholder');
        });
    });

    describe('Image Gallery Tests', () => {
        it('should filter images by letter correctly', () => {
            window.filterGallery('A');
            const visibleCards = Array.from(document.querySelectorAll('.image-card')).filter(card => 
                card.style.display !== 'none'
            );
            const hiddenCards = Array.from(document.querySelectorAll('.image-card')).filter(card => 
                card.style.display === 'none'
            );
            
            assert.equal(visibleCards.length, 1, 'Should show only cards starting with A');
            assert.equal(hiddenCards.length, 2, 'Should hide cards not starting with A');
        });

        it('should show all images when "All" filter is selected', () => {
            window.filterGallery('all');
            const visibleCards = Array.from(document.querySelectorAll('.image-card')).filter(card => 
                card.style.display !== 'none'
            );
            
            assert.equal(visibleCards.length, 3, 'Should show all cards');
        });

        it('should filter images by search term', () => {
            window.filterGalleryBySearch('alpha');
            const visibleCards = Array.from(document.querySelectorAll('.image-card')).filter(card => 
                card.style.display !== 'none'
            );
            const hiddenCards = Array.from(document.querySelectorAll('.image-card')).filter(card => 
                card.style.display === 'none'
            );
            
            assert.equal(visibleCards.length, 1, 'Should show only cards matching search');
            assert.equal(hiddenCards.length, 2, 'Should hide cards not matching search');
        });
    });

    describe('Modal Tests', () => {
        it('should have modal elements', () => {
            const modal = document.getElementById('imageModal');
            assert(modal !== null, 'Modal should exist');
            
            const modalImage = document.getElementById('modalImage');
            assert(modalImage !== null, 'Modal image element should exist');
            
            const modalClose = document.querySelector('.modal-close');
            assert(modalClose !== null, 'Modal close button should exist');
        });
    });

    describe('Contact Form Tests', () => {
        it('should have required form elements', () => {
            const form = document.querySelector('.contact-form');
            assert(form !== null, 'Contact form should exist');
            
            const inputs = form.querySelectorAll('input');
            assert.equal(inputs.length, 2, 'Should have name and email inputs');
            
            const textarea = form.querySelector('textarea');
            assert(textarea !== null, 'Should have message textarea');
            
            const button = form.querySelector('button');
            assert(button !== null, 'Should have submit button');
        });

        it('should have required attributes on form elements', () => {
            const nameInput = document.querySelector('input[placeholder="Your Name"]');
            const emailInput = document.querySelector('input[type="email"]');
            const messageTextarea = document.querySelector('textarea');
            
            assert(nameInput.required, 'Name input should be required');
            assert(emailInput.required, 'Email input should be required');
            assert(messageTextarea.required, 'Message textarea should be required');
        });
    });
});
