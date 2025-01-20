/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import {
    loadBlogPosts,
    createBlogPostElement,
    showPostEditor,
    showPostViewer,
    hideEditor,
    handlePostSubmit,
    deletePost,
    loadConfiguration,
    handleConfigSubmit,
    initializeBlog,
    setupEventListeners,
    showModal,
    closeAllModals
} from '../public/js/blog.js';

// Mock fetch globally
global.fetch = jest.fn();
global.SimpleMDE = jest.fn().mockImplementation(() => ({
    value: jest.fn().mockReturnValue('test content'),
    toTextArea: jest.fn()
}));

// Mock marked function
global.marked = jest.fn(text => text);

// Mock Date to ensure consistent timezone behavior
const RealDate = Date;
Date = class extends RealDate {
    constructor(...args) {
        if (args.length === 0) {
            super('2025-01-16T12:00:00Z'); // Use UTC time
        } else {
            super(...args);
        }
    }
};
Date.now = () => new Date('2025-01-16T12:00:00Z').getTime();

// Setup document body with all necessary elements
document.body.innerHTML = `
    <div id="hexo-blog-container"></div>
    <button id="newPostBtn">New Post</button>
    <button id="configureBtn">Configure</button>
    <div id="configModal" class="modal">
        <div class="modal-content">
            <button class="close-modal">×</button>
            <form id="configForm">
                <input type="text" id="configTitle" name="title" value="Test Blog">
                <textarea id="configDescription" name="description">Test Description</textarea>
                <input type="number" id="configPostsPerPage" name="postsPerPage" value="10">
            </form>
        </div>
    </div>
`;

describe('Blog Functionality', () => {
    beforeEach(() => {
        // Mock fetch
        fetch.mockReset();
        // Reset DOM
        const container = document.getElementById('hexo-blog-container') || document.createElement('div');
        container.id = 'hexo-blog-container';
        if (!container.parentNode) {
            document.body.appendChild(container);
        }
        container.innerHTML = '';
        // Reset SimpleMDE mock
        SimpleMDE.mockClear();
        // Reset alert and confirm mocks
        global.alert.mockClear();
        global.confirm.mockClear();
        // Restore original Date after each test
        Date = RealDate;
    });

    afterAll(() => {
        // Restore original Date after all tests
        Date = RealDate;
    });

    describe('loadBlogPosts', () => {
        it('should load and display blog posts', async () => {
            const mockPosts = {
                posts: [
                    {
                        title: 'Test Post',
                        date: '2025-01-16T12:00:00Z',  // Use UTC time
                        categories: ['test'],
                        tags: ['test'],
                        content: 'Test content',
                        path: 'test-post'
                    }
                ]
            };

            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockPosts)
                })
            );

            await loadBlogPosts();
            
            const container = document.getElementById('hexo-blog-container');
            expect(container.innerHTML).toContain('Test Post');
            expect(container.innerHTML).toContain('1/16/2025');  // Should match regardless of timezone
            expect(container.innerHTML).toContain('test');
        });

        it('should handle empty posts array', async () => {
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ posts: [] })
                })
            );

            await loadBlogPosts();
            
            const container = document.getElementById('hexo-blog-container');
            expect(container.innerHTML).toContain('No blogs exist');
        });

        it('should handle fetch errors', async () => {
            fetch.mockImplementationOnce(() => 
                Promise.reject(new Error('Network error'))
            );

            await loadBlogPosts();
            
            const container = document.getElementById('hexo-blog-container');
            expect(container.innerHTML).toContain('Error loading blog posts');
        });
    });

    describe('createBlogPostElement', () => {
        it('should create a blog post element with all fields', () => {
            const post = {
                title: 'Test Post',
                date: '2025-01-16T12:00:00Z',  // Use UTC time
                categories: ['test-cat'],
                tags: ['test-tag'],
                content: 'Test content',
                path: 'test-post'
            };

            const element = createBlogPostElement(post);
            
            expect(element.outerHTML).toContain('Test Post');
            expect(element.outerHTML).toContain('test-cat');
            expect(element.outerHTML).toContain('test-tag');
            expect(element.outerHTML).toContain('Test content');
        });

        it('should handle missing fields gracefully', () => {
            const post = {
                title: '',
                path: 'test-post'
            };

            const element = createBlogPostElement(post);
            
            expect(element.outerHTML).toContain('Untitled Post');
            expect(element.outerHTML).toContain('No date');
            expect(element.querySelector('.blog-post-excerpt')).toBeTruthy();
        });

        it('should handle long content with proper truncation', () => {
            const longContent = 'a'.repeat(500);
            const post = {
                title: 'Test Post',
                content: longContent,
                path: 'test-post'
            };

            const element = createBlogPostElement(post);
            const excerpt = element.querySelector('.blog-post-excerpt').textContent;
            expect(excerpt.length).toBeLessThan(longContent.length);
            expect(excerpt).toContain('...');
        });

        it('should handle HTML content safely', () => {
            const post = {
                title: '<script>alert("xss")</script>Test Post',
                content: '<p>Test content with <strong>HTML</strong></p>',
                path: 'test-post'
            };

            const element = createBlogPostElement(post);
            expect(element.outerHTML).not.toContain('<script>');
            expect(element.outerHTML).toContain('&lt;script&gt;');
        });
    });

    describe('Post Viewer', () => {
        it('should show post viewer with full content', () => {
            const post = {
                title: 'Test Post',
                date: '2025-01-16T12:00:00Z',
                categories: ['test-cat'],
                tags: ['test-tag'],
                content: '# Test Content\n\nThis is a test post.',
                path: 'test-post'
            };

            showPostViewer(post);
            
            const viewer = document.querySelector('.blog-post-viewer');
            expect(viewer).toBeTruthy();
            expect(viewer.innerHTML).toContain('Test Post');
            expect(viewer.innerHTML).toContain('test-cat');
            expect(viewer.innerHTML).toContain('test-tag');
            expect(viewer.innerHTML).toContain('This is a test post');
        });

        it('should handle missing post data gracefully', () => {
            showPostViewer({});
            
            const viewer = document.querySelector('.blog-post-viewer');
            expect(viewer).toBeTruthy();
            expect(viewer.innerHTML).toContain('Untitled Post');
        });
    });

    describe('Post Editor', () => {
        it('should show post editor with empty fields for new post', () => {
            showPostEditor();
            
            const editor = document.querySelector('.post-editor');
            expect(editor).toBeTruthy();
            expect(document.getElementById('title').value).toBe('');
            expect(document.getElementById('categories').value).toBe('');
            expect(document.getElementById('tags').value).toBe('');
        });

        it('should show post editor with populated fields for existing post', () => {
            const post = {
                title: 'Test Post',
                categories: ['cat1', 'cat2'],
                tags: ['tag1', 'tag2'],
                content: 'Test content'
            };

            showPostEditor(post);
            
            const editor = document.querySelector('.post-editor');
            expect(editor).toBeTruthy();
            expect(document.getElementById('title').value).toBe('Test Post');
            expect(document.getElementById('categories').value).toBe('cat1, cat2');
            expect(document.getElementById('tags').value).toBe('tag1, tag2');
        });

        it('should handle missing blog container gracefully', () => {
            document.getElementById('hexo-blog-container').remove();
            showPostEditor();
            expect(document.querySelector('.post-editor')).toBeFalsy();
        });

        it('should initialize SimpleMDE editor', async () => {
            showPostEditor();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(SimpleMDE).toHaveBeenCalled();
        });
    });

    describe('Post Submission', () => {
        it('should handle successful post submission', async () => {
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                })
            );

            showPostEditor();
            
            // Wait for the form to be added to the DOM
            await new Promise(resolve => setTimeout(resolve, 0));
            
            const form = document.getElementById('editPostForm');
            const titleInput = form.querySelector('#title');
            const categoriesInput = form.querySelector('#categories');
            const tagsInput = form.querySelector('#tags');
            const contentInput = form.querySelector('#content');
            
            titleInput.value = 'Test Post';
            categoriesInput.value = 'test';
            tagsInput.value = 'test';
            contentInput.value = 'Test content';
            
            const event = { 
                preventDefault: jest.fn(),
                target: form
            };
            await handlePostSubmit(event);
            
            expect(fetch).toHaveBeenCalledWith('/blog/api/posts', expect.any(Object));
            expect(global.alert).toHaveBeenCalledWith('Post saved successfully! The blog is being regenerated...');
        });

        it('should validate required fields', async () => {
            showPostEditor();
            
            // Wait for the form to be added to the DOM
            await new Promise(resolve => setTimeout(resolve, 0));
            
            const form = document.getElementById('editPostForm');
            const titleInput = form.querySelector('#title');
            titleInput.value = '';
            
            const event = { 
                preventDefault: jest.fn(),
                target: form
            };
            await handlePostSubmit(event);
            
            expect(global.alert).toHaveBeenCalledWith('Title is required');
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should handle network errors', async () => {
            fetch.mockImplementationOnce(() => 
                Promise.reject(new Error('Network error'))
            );

            showPostEditor();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            const form = document.getElementById('editPostForm');
            const titleInput = form.querySelector('#title');
            const contentInput = form.querySelector('#content');
            
            titleInput.value = 'Test Post';
            contentInput.value = 'Test content';
            
            const event = { 
                preventDefault: jest.fn(),
                target: form
            };
            await handlePostSubmit(event);
            
            expect(global.alert).toHaveBeenCalledWith('Error saving post: Network error');
        });

        it('should handle server errors', async () => {
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: 'Server error' })
                })
            );

            showPostEditor();
            await new Promise(resolve => setTimeout(resolve, 0));
            
            const form = document.getElementById('editPostForm');
            const titleInput = form.querySelector('#title');
            const contentInput = form.querySelector('#content');
            
            titleInput.value = 'Test Post';
            contentInput.value = 'Test content';
            
            const event = { 
                preventDefault: jest.fn(),
                target: form
            };
            await handlePostSubmit(event);
            
            expect(global.alert).toHaveBeenCalledWith('Error saving post: Server error');
        });
    });

    describe('Post Deletion', () => {
        it('should handle successful post deletion', async () => {
            global.confirm.mockImplementationOnce(() => true);
            
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: true
                })
            );

            await deletePost('test-post');
            
            expect(fetch).toHaveBeenCalledWith('/blog/api/posts/test-post', expect.any(Object));
            expect(global.alert).toHaveBeenCalledWith('Post deleted successfully');
        });

        it('should handle deletion cancellation', async () => {
            global.confirm.mockImplementationOnce(() => false);
            
            await deletePost('test-post');
            
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should handle server errors', async () => {
            global.confirm.mockImplementationOnce(() => true);
            
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: 'Server error' })
                })
            );

            await deletePost('test-post');
            
            expect(global.alert).toHaveBeenCalledWith('Error deleting post: Server error');
        });

        it('should handle network errors', async () => {
            global.confirm.mockImplementationOnce(() => true);
            
            fetch.mockImplementationOnce(() => 
                Promise.reject(new Error('Network error'))
            );

            await deletePost('test-post');
            
            expect(global.alert).toHaveBeenCalledWith('Error deleting post: Network error');
        });
    });

    describe('Configuration', () => {
        it('should load configuration', async () => {
            const mockConfig = {
                title: 'Test Blog',
                description: 'Test Description',
                postsPerPage: 10
            };

            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockConfig)
                })
            );

            await loadConfiguration();
            
            expect(fetch).toHaveBeenCalledWith('/blog/api/config');
        });

        it('should handle configuration submission', async () => {
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                })
            );

            const event = { 
                preventDefault: jest.fn(),
                target: document.getElementById('configForm')
            };

            await handleConfigSubmit(event);
            
            expect(fetch).toHaveBeenCalledWith('/blog/api/config', expect.any(Object));
        });

        it('should handle configuration load errors', async () => {
            fetch.mockImplementationOnce(() => 
                Promise.reject(new Error('Network error'))
            );

            await loadConfiguration();
            
            expect(global.alert).toHaveBeenCalledWith('Error loading configuration: Network error');
        });

        it('should handle configuration save errors', async () => {
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: 'Server error' })
                })
            );

            const event = { 
                preventDefault: jest.fn(),
                target: document.getElementById('configForm')
            };

            await handleConfigSubmit(event);
            
            expect(global.alert).toHaveBeenCalledWith('Error saving configuration: Server error');
        });
    });

    describe('Modal Functions', () => {
        it('should show modal', () => {
            showModal('configModal');
            const modal = document.getElementById('configModal');
            expect(modal.style.display).toBe('block');
        });

        it('should close all modals', () => {
            const modal1 = document.createElement('div');
            modal1.className = 'modal';
            const modal2 = document.createElement('div');
            modal2.className = 'modal';
            document.body.appendChild(modal1);
            document.body.appendChild(modal2);

            closeAllModals();

            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                expect(modal.style.display).toBe('none');
            });
        });
    });
});
