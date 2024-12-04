import { jest } from '@jest/globals';
import { Gallery } from '../public/js/gallery';
import { 
    filterImages, 
    sortImages,
    initializeModal,
    openModal,
    closeModal 
} from '../public/js/helpers.js';

describe('Gallery Module', () => {
    let gallery;
    let mockImages;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="gallery-container">
                <div class="gallery-controls">
                    <div id="sort-container">
                        <button data-sort="name">Sort by Name</button>
                        <button data-sort="date">Sort by Date</button>
                    </div>
                    <input type="text" id="search-input" placeholder="Search images...">
                    <div id="letter-filter"></div>
                </div>
                <div id="image-grid">
                    <div class="image-container" data-name="test1.jpg" data-date="2023-01-01">
                        <img src="/test1.jpg" alt="test1.jpg">
                        <div class="image-name">test1.jpg</div>
                    </div>
                    <div class="image-container" data-name="test2.jpg" data-date="2023-02-01">
                        <img src="/test2.jpg" alt="test2.jpg">
                        <div class="image-name">test2.jpg</div>
                    </div>
                    <div class="image-container" data-name="test3.jpg" data-date="2023-03-01">
                        <img src="/test3.jpg" alt="test3.jpg">
                        <div class="image-name">test3.jpg</div>
                    </div>
                </div>
                <div class="no-results" style="display: none;">No images found</div>
                <div class="error-message" style="display: none;"></div>
                <div class="modal hidden">
                    <span class="modal-close">&times;</span>
                    <img class="modal-img" src="" alt="">
                    <div class="modal-caption"></div>
                </div>
            </div>
        `;

        mockImages = [
            { name: 'test1.jpg', path: '/images/test1.jpg', date: '2023-01-01' },
            { name: 'test2.jpg', path: '/images/test2.jpg', date: '2023-02-01' }
        ];

        gallery = new Gallery('gallery-container');
        gallery.images = mockImages;
        gallery.renderImages();
        initializeModal();
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('Gallery Initialization', () => {
        test('initializes with correct elements', () => {
            expect(gallery.container).toBeTruthy();
            expect(gallery.imageGrid).toBeTruthy();
            expect(gallery.searchInput).toBeTruthy();
            expect(gallery.letterFilter).toBeTruthy();
        });

        test('sets up event listeners', () => {
            expect(gallery.searchInput.oninput).toBeDefined();
        });
    });

    describe('Image Loading', () => {
        test('loads images successfully', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockImages)
            });

            const result = await gallery.loadImages();
            
            expect(result).toEqual(mockImages);
            expect(global.fetch).toHaveBeenCalledWith('/api/images');
        });

        test('handles network errors', async () => {
            global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

            const result = await gallery.loadImages();
            expect(result).toEqual([]);
            expect(document.querySelector('.error-message')).toBeTruthy();
        });

        test('handles API errors', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Server Error'
            });

            const result = await gallery.loadImages();
            expect(result).toEqual([]);
            expect(document.querySelector('.error-message')).toBeTruthy();
        });
    });

    describe('Image Filtering', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <div id="image-grid">
                        <div class="image-container">
                            <img src="/test1.jpg" alt="test1.jpg">
                            <div class="image-name">test1.jpg</div>
                        </div>
                        <div class="image-container">
                            <img src="/test2.jpg" alt="test2.jpg">
                            <div class="image-name">test2.jpg</div>
                        </div>
                        <div class="image-container">
                            <img src="/test3.jpg" alt="test3.jpg">
                            <div class="image-name">test3.jpg</div>
                        </div>
                    </div>
                    <div class="no-results" style="display: none;">No images found</div>
                </div>
            `;
        });

        test('filters images by search term', () => {
            filterImages('test1');
            
            const containers = Array.from(document.querySelectorAll('.image-container'));
            const visibleContainers = containers.filter(c => c.style.display !== 'none');
            expect(visibleContainers.length).toBe(1);
            expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('test1.jpg');
        });

        test('handles case-insensitive search', () => {
            filterImages('TEST1');
            
            const containers = Array.from(document.querySelectorAll('.image-container'));
            const visibleContainers = containers.filter(c => c.style.display !== 'none');
            expect(visibleContainers.length).toBe(1);
            expect(visibleContainers[0].querySelector('.image-name').textContent.toLowerCase())
                .toBe('test1.jpg');
        });

        test('shows all images when search is cleared', () => {
            // First filter some images
            filterImages('test1');
            // Then clear the filter
            filterImages('');
            
            const containers = Array.from(document.querySelectorAll('.image-container'));
            const visibleContainers = containers.filter(c => c.style.display !== 'none');
            expect(visibleContainers.length).toBe(3);
        });
    });

    describe('Image Sorting', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <div id="image-grid">
                        <div class="image-container" data-date="2023-01-01">
                            <img src="/test1.jpg" alt="test1.jpg">
                            <div class="image-name">test1.jpg</div>
                        </div>
                        <div class="image-container" data-date="2023-02-01">
                            <img src="/test2.jpg" alt="test2.jpg">
                            <div class="image-name">test2.jpg</div>
                        </div>
                        <div class="image-container" data-date="2023-03-01">
                            <img src="/test3.jpg" alt="test3.jpg">
                            <div class="image-name">test3.jpg</div>
                        </div>
                    </div>
                </div>
            `;
        });

        test('sorts by date descending', () => {
            sortImages('date', 'desc');
            
            const containers = Array.from(document.querySelectorAll('.image-container'));
            const dates = containers.map(el => el.dataset.date);
            expect(dates).toEqual(['2023-03-01', '2023-02-01', '2023-01-01']);
        });

        test('sorts by name ascending', () => {
            sortImages('name', 'asc');
            
            const containers = Array.from(document.querySelectorAll('.image-container'));
            const names = containers.map(el => el.querySelector('.image-name').textContent);
            expect(names).toEqual(['test1.jpg', 'test2.jpg', 'test3.jpg']);
        });
    });

    describe('Modal Functionality', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="gallery-container">
                    <div id="image-grid">
                        <div class="image-container">
                            <img src="/test1.jpg" alt="test1.jpg">
                            <div class="image-name">test1.jpg</div>
                        </div>
                    </div>
                    <div class="modal hidden">
                        <span class="modal-close">&times;</span>
                        <img class="modal-img" src="" alt="">
                        <div class="modal-caption"></div>
                    </div>
                </div>
            `;
            initializeModal();
        });

        test('opens modal with correct image', () => {
            const imageData = {
                src: '/test1.jpg',
                alt: 'test1.jpg',
                name: 'test1.jpg'
            };
            
            openModal(imageData);
            
            const modal = document.querySelector('.modal');
            expect(modal.classList.contains('hidden')).toBe(false);
            expect(modal.querySelector('.modal-img').src).toContain('test1.jpg');
            expect(modal.querySelector('.modal-caption').textContent).toBe('test1.jpg');
        });

        test('closes modal', () => {
            // First open the modal
            const modal = document.querySelector('.modal');
            modal.classList.remove('hidden');
            
            closeModal();
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        test('closes modal on outside click', () => {
            // First open the modal
            const modal = document.querySelector('.modal');
            modal.classList.remove('hidden');
            
            // Simulate click on modal background
            modal.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true
            }));
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        test('closes modal on close button click', () => {
            // First open the modal
            const modal = document.querySelector('.modal');
            modal.classList.remove('hidden');
            
            // Click close button
            const closeButton = modal.querySelector('.modal-close');
            closeButton.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true
            }));
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });
    });
});
