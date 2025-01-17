// Blog Display Functions
async function loadBlogPosts() {
    const container = document.getElementById('hexo-blog-container');
    if (!container) return;

    // Set initial loading state
    container.innerHTML = '<div class="loading">Loading posts...</div>';
    
    try {
        const response = await fetch('/blog/api/posts');
        const data = await response.json();
        const posts = data.posts || [];
        
        container.innerHTML = '';
        
        if (posts.length === 0) {
            container.innerHTML = '<div class="blog-message">No blogs exist</div>';
            return;
        }
        
        posts.forEach(post => {
            const postElement = createBlogPostElement(post);
            container.appendChild(postElement);
        });
    } catch (error) {
        console.error('Error loading blog posts:', error);
        container.innerHTML = '<div class="blog-error">Error loading blog posts. Please try again later.</div>';
    }
}

// Function to create blog post HTML element for display
function createBlogPostElement(post) {
    console.log('Creating element for post:', post);
    const article = document.createElement('article');
    article.className = 'blog-post';
    
    const date = post.date ? new Date(post.date).toLocaleDateString() : 'No date';
    const categories = Array.isArray(post.categories) ? post.categories : [];
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const excerpt = post.excerpt || (post.content ? post.content.slice(0, 200) + '...' : 'No content available');
    
    // Store the full path for debugging
    const postPath = post.path;
    console.log('Post path for link:', postPath);
    
    article.innerHTML = `
        <div class="blog-post-header">
            <h3 class="blog-post-title">
                <a href="#" class="view-post" data-path="${postPath}">${post.title || 'Untitled Post'}</a>
            </h3>
            <div class="post-actions">
                <button class="edit-btn small" title="Edit Post">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                </button>
                <button class="delete-btn small" title="Delete Post">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="blog-post-meta">
            <span class="date">${date}</span>
            ${categories.map(cat => `<span class="category">${cat}</span>`).join('')}
        </div>
        <div class="blog-post-excerpt">
            ${excerpt}
        </div>
        <div class="blog-post-tags">
            ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
    `;

    // Add click handler for viewing post
    const viewLink = article.querySelector('.view-post');
    viewLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const path = e.target.dataset.path;
        console.log('Attempting to load post with path:', path);
        try {
            const response = await fetch(`/blog/api/posts/${path}`);
            console.log('Response status:', response.status);
            
            if (!response.ok) throw new Error('Failed to load post');
            const post = await response.json();
            console.log('Loaded post:', post);
            
            if (!post) {
                throw new Error('Post data is missing');
            }
            
            // Convert markdown to HTML if needed
            if (post.content && typeof marked !== 'undefined') {
                post.content = marked(post.content);
            }
            
            showPostViewer(post);
        } catch (error) {
            console.error('Error loading post:', error);
            alert('Error loading post. Please try again.');
        }
    });

    // Add edit button handler
    const editBtn = article.querySelector('.edit-btn');
    editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            const response = await fetch(`/blog/api/posts/${postPath}`);
            if (!response.ok) throw new Error('Failed to load post');
            const postData = await response.json();
            showPostEditor(postData);
        } catch (error) {
            console.error('Error loading post for edit:', error);
            alert('Error loading post for editing. Please try again.');
        }
    });

    // Add delete button handler
    const deleteBtn = article.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePost(postPath);
    });
    
    return article;
}

function showPostViewer(post) {
    const container = document.getElementById('hexo-blog-container');
    const viewer = document.createElement('div');
    viewer.className = 'blog-post-viewer';
    
    // Format the date
    const postDate = post.date ? new Date(post.date).toLocaleDateString() : 'Invalid Date';
    
    viewer.innerHTML = `
        <div class="blog-post-header">
            <button class="back-btn">← Back to Posts</button>
            <div class="post-actions">
                <button class="edit-btn">Edit Post</button>
                <button class="delete-btn">Delete Post</button>
            </div>
        </div>
        <article class="blog-post">
            <h2 class="blog-post-title">${post.title || 'Untitled Post'}</h2>
            <div class="blog-post-meta">
                <span class="date">${postDate}</span>
                ${(post.categories || []).map(cat => `<span class="category">${cat}</span>`).join('')}
            </div>
            <div class="blog-post-content">
                ${post.content || 'No content available'}
            </div>
            <div class="blog-post-tags">
                ${(post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </article>
    `;
    
    // Add event listeners
    const backBtn = viewer.querySelector('.back-btn');
    backBtn.addEventListener('click', () => {
        loadBlogPosts();
    });
    
    const editBtn = viewer.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => {
        showPostEditor(post);
    });
    
    const deleteBtn = viewer.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deletePost(post.path));
    
    container.innerHTML = '';
    container.appendChild(viewer);
}

let simplemde = null;

function showPostEditor(post = null) {
    const container = document.getElementById('hexo-blog-container');
    if (!container) {
        console.error('Blog container not found');
        return;
    }

    console.log('Showing editor...');
    
    const editorDiv = document.createElement('div');
    editorDiv.className = 'post-editor';
    editorDiv.id = 'postEditor';
    
    editorDiv.innerHTML = `
        <form id="editPostForm" class="editor-form">
            <div class="form-group">
                <label for="title">Title</label>
                <input type="text" id="title" name="title" value="${post?.title || ''}" required>
            </div>
            <div class="form-group">
                <label for="content">Content</label>
                <textarea id="content" name="content">${post?.content || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="categories">Categories (comma-separated)</label>
                <input type="text" id="categories" name="categories" value="${post?.categories?.join(', ') || ''}">
            </div>
            <div class="form-group">
                <label for="tags">Tags (comma-separated)</label>
                <input type="text" id="tags" name="tags" value="${post?.tags?.join(', ') || ''}">
            </div>
            <div class="editor-actions">
                <button type="button" class="back-btn">← Back</button>
                <button type="submit" class="save-btn">Save Post</button>
            </div>
        </form>
    `;
    
    container.innerHTML = '';
    container.appendChild(editorDiv);
    
    // Initialize SimpleMDE
    if (simplemde) {
        simplemde.toTextArea();
        simplemde = null;
    }
    
    // Wait for the textarea to be in the DOM
    setTimeout(() => {
        const textarea = document.getElementById('content');
        if (textarea) {
            console.log('Initializing SimpleMDE...');
            simplemde = new SimpleMDE({
                element: textarea,
                autofocus: true,
                spellChecker: true,
                toolbar: [
                    'bold', 'italic', 'heading', '|',
                    'quote', 'unordered-list', 'ordered-list', '|',
                    'link', 'image', '|',
                    'preview', 'side-by-side', 'fullscreen', '|',
                    'guide'
                ],
                placeholder: 'Write your post content here...',
                status: ['lines', 'words', 'cursor']
            });
            console.log('SimpleMDE initialized:', simplemde);
        } else {
            console.error('Content textarea not found');
        }
    }, 0);
    
    // Add event listeners
    const form = document.getElementById('editPostForm');
    const backBtn = form.querySelector('.back-btn');
    
    backBtn.addEventListener('click', () => {
        if (simplemde) {
            simplemde.toTextArea();
            simplemde = null;
        }
        loadBlogPosts();
    });
    
    form.addEventListener('submit', handlePostSubmit);
    
    // Focus on title input
    document.getElementById('title').focus();
}

function hideEditor() {
    if (simplemde) {
        simplemde.toTextArea();
        simplemde = null;
    }
    
    const editor = document.querySelector('.post-editor');
    if (editor) {
        editor.remove();
    }
    
    loadBlogPosts();
}

async function handlePostSubmit(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const title = form.querySelector('#title').value;
        const categories = form.querySelector('#categories').value;
        const tags = form.querySelector('#tags').value;
        const content = simplemde ? simplemde.value() : form.querySelector('#content').value;
        
        // Basic validation
        if (!title.trim()) {
            alert('Title is required');
            return;
        }
        if (!content.trim()) {
            alert('Content is required');
            return;
        }
        
        // Convert categories and tags strings to arrays
        const categoriesArray = categories.split(',')
            .map(cat => cat.trim())
            .filter(cat => cat.length > 0);
        const tagsArray = tags.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        const postData = {
            title: title.trim(),
            content: content.trim(),
            categories: categoriesArray,
            tags: tagsArray
        };
        
        console.log('Submitting post data:', postData);
        
        const response = await fetch('/blog/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create post');
        }
        
        const result = await response.json();
        console.log('Post created successfully:', result);
        
        // Show success message
        alert('Post saved successfully! The blog is being regenerated...');
        
        // Clean up and return to post list
        hideEditor();
        
        // Wait a bit for the blog to regenerate before refreshing the list
        setTimeout(async () => {
            try {
                await loadBlogPosts();
                console.log('Blog list refreshed after regeneration');
            } catch (error) {
                console.error('Error refreshing blog list:', error);
            }
        }, 3000); // Wait 3 seconds for regeneration
        
    } catch (error) {
        console.error('Error saving post:', error);
        alert('Error saving post: ' + error.message);
    }
}

// Function to handle post deletion
async function deletePost(postPath) {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        try {
            const response = await fetch(`/blog/api/posts/${postPath}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete post');
            }
            
            alert('Post deleted successfully');
            loadBlogPosts(); // Return to post list
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Error deleting post. Please try again.');
        }
    }
}

// Admin Panel Functions
let currentPostId = null;

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing blog...');
    initializeBlog();
});

function initializeBlog() {
    console.log('Initializing blog components...');
    setupEventListeners();
    loadBlogPosts();
    loadConfiguration();
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const newPostBtn = document.getElementById('newPostBtn');
    const configureBtn = document.getElementById('configureBtn');

    if (newPostBtn) {
        console.log('Found New Post button - attaching click handler');
        newPostBtn.addEventListener('click', () => {
            console.log('New Post clicked - showing editor');
            showPostEditor();
        });
    } else {
        console.error('New Post button not found in the DOM');
    }

    if (configureBtn) {
        configureBtn.addEventListener('click', () => showModal('configModal'));
    }

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

async function handleConfigSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const config = {
        title: formData.get('title'),
        description: formData.get('description'),
        postsPerPage: parseInt(formData.get('postsPerPage'), 10)
    };

    try {
        const response = await fetch('/blog/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        if (!response.ok) throw new Error('Failed to save configuration');

        closeAllModals();
        loadBlogPosts();
    } catch (error) {
        console.error('Error saving configuration:', error);
        alert('Error saving configuration. Please try again.');
    }
}

async function loadConfiguration() {
    try {
        const response = await fetch('/blog/api/config');
        const config = await response.json();
        
        document.getElementById('blogTitle').value = config.title || '';
        document.getElementById('blogDescription').value = config.description || '';
        document.getElementById('postsPerPage').value = config.postsPerPage || 10;
    } catch (error) {
        console.error('Error loading configuration:', error);
    }
}

function showModal(modalId) {
    closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

// Add CSS for post viewer
const style = document.createElement('style');
style.textContent = `
.blog-post-viewer {
    background: #fff;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.blog-post-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2rem;
}

.back-btn, .edit-btn, .delete-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
}

.back-btn {
    background: #f0f0f0;
    color: #333;
}

.edit-btn {
    background: #009688;
    color: white;
}

.delete-btn {
    background: #ff0000;
    color: white;
}

.blog-post-content {
    line-height: 1.6;
    color: #333;
    margin: 1.5rem 0;
}
`;
document.head.appendChild(style);
