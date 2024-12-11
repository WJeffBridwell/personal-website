import { jest } from '@jest/globals';
import { ContentGallery } from '../public/js/content-gallery.js';

describe('ContentGallery', () => {
    let contentGallery;
    let mockGalleryContainer;
    let mockImageGrid;

    beforeEach(() => {
        // Setup mock DOM
        mockGalleryContainer = document.createElement('div');
        mockGalleryContainer.id = 'gallery-container';
        mockImageGrid = document.createElement('div');
        mockImageGrid.id = 'image-grid';
        mockGalleryContainer.appendChild(mockImageGrid);
        document.body.appendChild(mockGalleryContainer);

        // Create search input
        const searchInput = document.createElement('input');
        searchInput.id = 'search-input';
        document.body.appendChild(searchInput);

        // Create letter filter
        const letterFilter = document.createElement('div');
        letterFilter.id = 'letter-filter';
        document.body.appendChild(letterFilter);

        // Create tag filter
        const tagFilter = document.createElement('div');
        tagFilter.id = 'tag-filter';
        document.body.appendChild(tagFilter);

        contentGallery = new ContentGallery();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize with correct DOM elements', () => {
            expect(contentGallery.container).toBe(mockGalleryContainer);
            expect(contentGallery.imageGrid).toBe(mockImageGrid);
            expect(contentGallery.content).toEqual([]);
        });
    });

    describe('content rendering', () => {
        test('should render video content correctly', () => {
            const mockVideo = {
                content_name: 'test.mp4',
                content_url: 'test.mp4',
                date_created: '2023-01-01'
            };
            contentGallery.content = [mockVideo];
            contentGallery.renderNewContent([mockVideo]);

            const videoElement = document.querySelector('video');
            expect(videoElement).toBeTruthy();
            expect(videoElement.src).toContain('test.mp4');
            expect(videoElement.controls).toBe(true);
        });

        test('should render image content correctly', () => {
            const mockImage = {
                content_name: 'test.jpg',
                content_url: 'test.jpg',
                date_created: '2023-01-01'
            };
            contentGallery.content = [mockImage];
            contentGallery.renderNewContent([mockImage]);

            const imgElement = document.querySelector('img');
            expect(imgElement).toBeTruthy();
            expect(imgElement.src).toContain('test.jpg');
        });
    });

    describe('search and filter', () => {
        const mockContent = [
            { content_name: 'test1.jpg', content_url: 'test1.jpg', date_created: '2023-01-01' },
            { content_name: 'test2.jpg', content_url: 'test2.jpg', date_created: '2023-01-02' },
            { content_name: 'other.jpg', content_url: 'other.jpg', date_created: '2023-01-03' }
        ];

        beforeEach(() => {
            contentGallery.content = mockContent;
            contentGallery.renderNewContent(mockContent);
        });

        test('should filter content based on search input', () => {
            contentGallery.searchInput.value = 'test';
            contentGallery.handleSearch();
            const containers = Array.from(contentGallery.imageGrid.children);
            const visibleContainers = containers.filter(container => 
                container.style.display !== 'none'
            );
            expect(visibleContainers.length).toBe(2);
        });

        test('should filter content by starting letter', () => {
            contentGallery.filterByLetter('t');
            const containers = Array.from(contentGallery.imageGrid.children);
            const visibleContainers = containers.filter(container => 
                container.style.display !== 'none'
            );
            expect(visibleContainers.length).toBe(2);
        });
    });

    describe('sorting', () => {
        const mockContent = [
            { content_name: 'c.jpg', content_url: 'c.jpg', date_created: '2023-01-01' },
            { content_name: 'b.jpg', content_url: 'b.jpg', date_created: '2023-01-02' },
            { content_name: 'a.jpg', content_url: 'a.jpg', date_created: '2023-01-03' }
        ];

        beforeEach(() => {
            contentGallery.content = mockContent;
            contentGallery.renderNewContent(mockContent);
        });

        test('should sort content by name', () => {
            contentGallery.sortByName();
            const containers = Array.from(contentGallery.imageGrid.children);
            expect(containers[0].querySelector('.content-name').textContent).toBe('a.jpg');
            expect(containers[2].querySelector('.content-name').textContent).toBe('c.jpg');
        });
    });

    describe('content loading', () => {
        beforeEach(() => {
            global.fetch = jest.fn();
            // Mock shouldLoadMore to return true
            contentGallery.shouldLoadMore = jest.fn().mockReturnValue(true);
        });

        afterEach(() => {
            delete global.fetch;
            jest.restoreAllMocks();
        });

        test('should load more content when scrolling near bottom', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
                    items: [
                        { content_name: 'new1.jpg', content_url: 'new1.jpg' },
                        { content_name: 'new2.jpg', content_url: 'new2.jpg' }
                    ],
                    hasMore: true
                })
            };
            global.fetch.mockResolvedValue(mockResponse);

            await contentGallery.loadMoreContent();

            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/image-content?page=1&pageSize=20'));
            expect(contentGallery.content.length).toBe(2);
            expect(contentGallery.page).toBe(2);
            expect(contentGallery.hasMore).toBe(true);
        });

        test('should handle API errors gracefully', async () => {
            const mockError = new Error('API Error');
            global.fetch.mockRejectedValue(mockError);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await contentGallery.loadMoreContent();

            expect(consoleSpy).toHaveBeenCalledWith('Error loading content:', mockError);
            expect(contentGallery.loading).toBe(false);
            consoleSpy.mockRestore();
        });

        test('should handle invalid API response format', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({ invalid: 'format' })
            };
            global.fetch.mockResolvedValue(mockResponse);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await contentGallery.loadMoreContent();

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error loading content:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });

        test('should not load more content when already loading', async () => {
            contentGallery.loading = true;
            await contentGallery.loadMoreContent();
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should not load more content when no more content available', async () => {
            contentGallery.hasMore = false;
            await contentGallery.loadMoreContent();
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    describe('tag filtering', () => {
        const mockContentWithTags = [
            { content_name: 'test1.jpg', content_url: 'test1.jpg', content_tags: ['tag1', 'tag2'] },
            { content_name: 'test2.jpg', content_url: 'test2.jpg', content_tags: ['tag2', 'tag3'] },
            { content_name: 'test3.jpg', content_url: 'test3.jpg', content_tags: ['tag1', 'tag3'] }
        ];

        beforeEach(() => {
            contentGallery.content = mockContentWithTags;
            contentGallery.renderNewContent(mockContentWithTags);
        });

        test('should toggle tag filter correctly', () => {
            const tagButton = document.createElement('button');
            tagButton.dataset.tag = 'tag1';
            contentGallery.tagFilter.appendChild(tagButton);

            // Simulate tag button click
            tagButton.click();
            
            const containers = Array.from(contentGallery.imageGrid.children);
            const visibleContainers = containers.filter(container => 
                container.style.display !== 'none'
            );
            expect(visibleContainers.length).toBe(2); // Only items with tag1
            expect(contentGallery.selectedTags.has('tag1')).toBe(true);
        });

        test('should update tag filters when new content is added', () => {
            contentGallery.updateTagFilters();
            const tagButtons = contentGallery.tagFilter.querySelectorAll('button');
            const tagSet = new Set(Array.from(tagButtons).map(btn => btn.dataset.tag));
            
            expect(tagSet.has('tag1')).toBe(true);
            expect(tagSet.has('tag2')).toBe(true);
            expect(tagSet.has('tag3')).toBe(true);
        });
    });

    describe('content player integration', () => {
        test('should initialize with content player', () => {
            const mockContentPlayer = {
                open: jest.fn(),
                close: jest.fn()
            };
            
            contentGallery.initializeWithContentPlayer(mockContentPlayer);
            expect(contentGallery.contentPlayer).toBe(mockContentPlayer);
        });
    });

    describe('error handling', () => {
        test('should show error message', () => {
            const errorMessage = 'Test error message';
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            contentGallery.showError(errorMessage);
            
            const errorElement = document.querySelector('.error-message');
            expect(errorElement).toBeTruthy();
            expect(errorElement.textContent).toContain(errorMessage);
            consoleSpy.mockRestore();
        });
    });

    describe('video content handling', () => {
        test('should handle video metadata loading', () => {
            const mockVideo = {
                content_name: 'test.mp4',
                content_url: 'test.mp4'
            };
            contentGallery.renderNewContent([mockVideo]);

            const video = document.querySelector('video');
            expect(video).toBeTruthy();

            // Simulate loadedmetadata event
            const event = new Event('loadedmetadata');
            video.dispatchEvent(event);
            expect(video.currentTime).toBe(0);
        });

        test('should handle video click events', () => {
            const mockVideo = {
                content_name: 'test.mp4',
                content_url: 'test.mp4'
            };
            contentGallery.renderNewContent([mockVideo]);

            const video = document.querySelector('video');
            expect(video).toBeTruthy();

            // Mock play function and paused property
            video.play = jest.fn().mockResolvedValue();
            Object.defineProperty(video, 'paused', {
                get: () => true,
                configurable: true
            });

            // Simulate click event
            video.click();
            expect(video.play).toHaveBeenCalled();
        });

        test('should handle video play errors', async () => {
            const mockVideo = {
                content_name: 'test.mp4',
                content_url: 'test.mp4'
            };
            contentGallery.renderNewContent([mockVideo]);

            const video = document.querySelector('video');
            const mockError = new Error('Play failed');
            video.play = jest.fn().mockRejectedValue(mockError);
            Object.defineProperty(video, 'paused', {
                get: () => true,
                configurable: true
            });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await video.click();
            
            expect(consoleSpy).toHaveBeenCalledWith('Error playing video:', mockError);
            consoleSpy.mockRestore();
        });
    });

    describe('event listeners', () => {
        test('should handle scroll events', () => {
            const scrollEvent = new Event('scroll');
            contentGallery.shouldLoadMore = jest.fn().mockReturnValue(true);
            contentGallery.loadMoreContent = jest.fn();

            window.dispatchEvent(scrollEvent);
            expect(contentGallery.loadMoreContent).toHaveBeenCalled();
        });

        test('should handle letter filter button clicks', () => {
            const button = document.createElement('button');
            button.textContent = 'A';
            contentGallery.letterFilter.appendChild(button);
            contentGallery.filterByLetter = jest.fn();

            button.click();
            expect(contentGallery.filterByLetter).toHaveBeenCalledWith('A');
        });

        test('should handle sort button clicks', () => {
            const sortButton = document.createElement('button');
            sortButton.id = 'sort-name';
            document.body.appendChild(sortButton);
            
            // Create a new instance after adding the button
            const gallery = new ContentGallery();
            
            // Mock the sortByName method
            const sortSpy = jest.spyOn(gallery, 'sortByName');
            
            // Trigger click
            sortButton.click();
            expect(sortSpy).toHaveBeenCalled();
        });
    });

    describe('tag filtering', () => {
        const mockContentWithTags = [
            { content_name: 'test1.jpg', content_url: 'test1.jpg', content_tags: ['tag1', 'tag2'] },
            { content_name: 'test2.jpg', content_url: 'test2.jpg', content_tags: ['tag2', 'tag3'] }
        ];

        beforeEach(() => {
            contentGallery.content = mockContentWithTags;
            contentGallery.renderNewContent(mockContentWithTags);
        });

        test('should handle multiple tag selection', () => {
            // Add tag buttons
            const tag2Button = document.createElement('button');
            tag2Button.dataset.tag = 'tag2';
            contentGallery.tagFilter.appendChild(tag2Button);

            // Select tag2 (both items have this tag)
            tag2Button.click();

            const containers = Array.from(contentGallery.imageGrid.children);
            const visibleContainers = containers.filter(container => 
                container.style.display !== 'none'
            );
            expect(visibleContainers.length).toBe(2); // Both items have tag2
            expect(contentGallery.selectedTags.size).toBe(1);
        });

        test('should clear tag selection when clicking selected tag', () => {
            const tagButton = document.createElement('button');
            tagButton.dataset.tag = 'tag1';
            contentGallery.tagFilter.appendChild(tagButton);

            // Select and then deselect the tag
            tagButton.click();
            expect(contentGallery.selectedTags.size).toBe(1);
            tagButton.click();
            expect(contentGallery.selectedTags.size).toBe(0);

            const containers = Array.from(contentGallery.imageGrid.children);
            const visibleContainers = containers.filter(container => 
                container.style.display !== 'none'
            );
            expect(visibleContainers.length).toBe(2); // All items visible
        });
    });
});
