import { jest } from '@jest/globals';
import { ContentGallery } from '../public/js/content-gallery.js';

describe('ContentGallery', () => {
    let contentGallery;
    let mockGalleryContainer;
    let mockSearchInput;
    let mockLetterFilters;
    let mockSortButtons;
    let mockTagFilters;

    beforeEach(() => {
        // Setup mock DOM
        mockGalleryContainer = document.createElement('div');
        mockGalleryContainer.id = 'gallery';

        // Create search input
        mockSearchInput = document.createElement('input');
        mockSearchInput.id = 'search-input';
        document.body.appendChild(mockSearchInput);

        // Create letter filters
        mockLetterFilters = document.createElement('div');
        mockLetterFilters.id = 'letter-filters';
        document.body.appendChild(mockLetterFilters);

        // Create sort buttons
        mockSortButtons = document.createElement('div');
        const sortButton1 = document.createElement('button');
        sortButton1.className = 'sort-button';
        sortButton1.dataset.sort = 'title';
        const sortButton2 = document.createElement('button');
        sortButton2.className = 'sort-button';
        sortButton2.dataset.sort = 'date';
        mockSortButtons.appendChild(sortButton1);
        mockSortButtons.appendChild(sortButton2);
        document.body.appendChild(mockSortButtons);

        // Create tag filters
        mockTagFilters = document.createElement('div');
        mockTagFilters.id = 'tag-filters';
        document.body.appendChild(mockTagFilters);

        document.body.appendChild(mockGalleryContainer);

        // Initialize gallery with mock API endpoint
        contentGallery = new ContentGallery('gallery', 'http://mock-api/content');
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
        if (global.fetch) {
            global.fetch.mockClear();
        }
    });

    describe('initialization', () => {
        test('should initialize with correct DOM elements', () => {
            expect(contentGallery.gallery).toBe(mockGalleryContainer);
            expect(contentGallery.searchInput).toBe(mockSearchInput);
            expect(contentGallery.letterFilters).toBe(mockLetterFilters);
            expect(contentGallery.tagFilters).toBe(mockTagFilters);
            expect(contentGallery.content).toEqual([]);
        });

        test('should set up event listeners', () => {
            expect(mockSearchInput.onclick).toBeDefined();
            expect(mockLetterFilters.onclick).toBeDefined();
            expect(mockTagFilters.onclick).toBeDefined();
        });
    });

    describe('content loading', () => {
        beforeEach(() => {
            global.fetch = jest.fn();
        });

        test('should load content from API', async () => {
            const mockContent = [
                { title: 'Test 1', description: 'Desc 1', thumbnail: 'thumb1.jpg' },
                { title: 'Test 2', description: 'Desc 2', thumbnail: 'thumb2.jpg' }
            ];

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockContent)
            });

            await contentGallery.loadContent();
            expect(contentGallery.content).toEqual(mockContent);
            expect(mockGalleryContainer.children.length).toBeGreaterThan(0);
        });

        test('should handle API errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            global.fetch.mockRejectedValueOnce(new Error('API Error'));

            await contentGallery.loadContent();
            expect(consoleSpy).toHaveBeenCalled();
            expect(mockGalleryContainer.textContent).toContain('Error loading content');

            consoleSpy.mockRestore();
        });
    });

    describe('content filtering', () => {
        const mockContent = [
            { title: 'Alpha', description: 'Test 1', tags: ['tag1'] },
            { title: 'Beta', description: 'Test 2', tags: ['tag2'] }
        ];

        beforeEach(() => {
            contentGallery.content = mockContent;
        });

        test('should filter content based on search input', () => {
            mockSearchInput.value = 'alpha';
            contentGallery.filterContent();
            expect(contentGallery.getFilteredContent().length).toBe(1);
            expect(contentGallery.getFilteredContent()[0].title).toBe('Alpha');
        });

        test('should filter content by starting letter', () => {
            const letterFilter = document.createElement('button');
            letterFilter.className = 'letter-filter active';
            letterFilter.dataset.letter = 'b';
            mockLetterFilters.appendChild(letterFilter);

            contentGallery.filterContent();
            expect(contentGallery.getFilteredContent().length).toBe(1);
            expect(contentGallery.getFilteredContent()[0].title).toBe('Beta');
        });
    });

    describe('sorting', () => {
        const mockContent = [
            { title: 'Beta', date: '2023-01-01' },
            { title: 'Alpha', date: '2023-01-02' }
        ];

        beforeEach(() => {
            contentGallery.content = mockContent;
        });

        test('should sort content by title', () => {
            contentGallery.sortContent('title');
            expect(contentGallery.content[0].title).toBe('Alpha');
            expect(contentGallery.content[1].title).toBe('Beta');
        });

        test('should sort content by date', () => {
            contentGallery.sortContent('date');
            expect(contentGallery.content[0].title).toBe('Alpha');
            expect(contentGallery.content[1].title).toBe('Beta');
        });
    });

    describe('tag filtering', () => {
        const mockContent = [
            { title: 'Test 1', tags: ['tag1', 'tag2'] },
            { title: 'Test 2', tags: ['tag2', 'tag3'] }
        ];

        beforeEach(() => {
            contentGallery.content = mockContent;
            contentGallery.updateTagFilters();
        });

        test('should update tag filters based on content', () => {
            expect(mockTagFilters.children.length).toBe(3); // tag1, tag2, tag3
        });

        test('should filter content by tags', () => {
            const tagButton = document.createElement('button');
            tagButton.className = 'tag-filter active';
            tagButton.dataset.tag = 'tag1';
            mockTagFilters.appendChild(tagButton);

            contentGallery.filterContent();
            expect(contentGallery.getFilteredContent().length).toBe(1);
            expect(contentGallery.getFilteredContent()[0].title).toBe('Test 1');
        });
    });
});
