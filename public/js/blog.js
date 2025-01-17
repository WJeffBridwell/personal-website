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
    const article = document.createElement('article');
    article.className = 'blog-post';
    
    const date = post.date ? new Date(post.date).toLocaleDateString() : 'No date';
    const categories = Array.isArray(post.categories) ? post.categories : [];
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const excerpt = post.excerpt || (post.content ? post.content.slice(0, 200) + '...' : 'No content available');
    
    article.innerHTML = `
        <h3 class="blog-post-title">
            <a href="#" class="view-post" data-path="${post.path}">${post.title || 'Untitled Post'}</a>
        </h3>
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
        try {
            const response = await fetch(`/post/${path.replace(/\/$/, '')}`);
            if (!response.ok) throw new Error('Failed to load post');
            const post = await response.json();
            showPostViewer(post);
        } catch (error) {
            console.error('Error loading post:', error);
            alert('Error loading post. Please try again.');
        }
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
            <button class="edit-btn">Edit Post</button>
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
    
    container.innerHTML = '';
    container.appendChild(viewer);
}

function showPostEditor(post) {
    const container = document.getElementById('hexo-blog-container');
    const editor = document.createElement('div');
    editor.className = 'post-editor';
    
    editor.innerHTML = `
        <div class="editor-header">
            <button class="back-btn">← Back to Post</button>
            <button class="save-btn">Save Changes</button>
        </div>
        <form id="editPostForm">
            <div class="form-group">
                <label for="title">Title</label>
                <input type="text" id="title" name="title" value="${post.title || ''}" required>
            </div>
            <div class="form-group">
                <label for="content">Content</label>
                <textarea id="content" name="content" required>${post.raw || post.content || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="categories">Categories (comma-separated)</label>
                <input type="text" id="categories" name="categories" value="${(post.categories || []).join(', ')}">
            </div>
            <div class="form-group">
                <label for="tags">Tags (comma-separated)</label>
                <input type="text" id="tags" name="tags" value="${(post.tags || []).join(', ')}">
            </div>
        </form>
    `;
    
    // Add event listeners
    const backBtn = editor.querySelector('.back-btn');
    backBtn.addEventListener('click', () => {
        showPostViewer(post);
    });
    
    const saveBtn = editor.querySelector('.save-btn');
    saveBtn.addEventListener('click', async () => {
        const formData = new FormData(editor.querySelector('#editPostForm'));
        const updatedPost = {
            title: formData.get('title'),
            content: formData.get('content'),
            categories: formData.get('categories').split(',').map(cat => cat.trim()).filter(Boolean),
            tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(Boolean),
            path: post.path
        };
        
        try {
            const response = await fetch(`/blog/api/posts/${post.path}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedPost)
            });
            
            if (!response.ok) throw new Error('Failed to update post');
            
            const updatedData = await response.json();
            showPostViewer(updatedData);
        } catch (error) {
            console.error('Error updating post:', error);
            alert('Error updating post. Please try again.');
        }
    });
    
    container.innerHTML = '';
    container.appendChild(editor);
    
    // Initialize SimpleMDE for the content textarea
    if (typeof SimpleMDE !== 'undefined') {
        new SimpleMDE({
            element: editor.querySelector('#content'),
            spellChecker: false,
            status: false
        });
    }
}

// Admin Panel Functions
let simplemde;
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
    const cancelEditBtn = document.getElementById('cancelEdit');
    const postForm = document.getElementById('postForm');
    const configForm = document.getElementById('configForm');
    
    if (newPostBtn) {
        console.log('Found New Post button - attaching click handler');
        newPostBtn.addEventListener('click', () => {
            console.log('New Post clicked - showing editor');
            showEditor();
        });
    } else {
        console.error('New Post button not found in the DOM');
    }

    if (configureBtn) {
        configureBtn.addEventListener('click', () => showModal('configModal'));
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', hideEditor);
    }

    if (postForm) {
        postForm.addEventListener('submit', handlePostSubmit);
    }

    if (configForm) {
        configForm.addEventListener('submit', handleConfigSubmit);
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

function showEditor() {
    console.log('Showing editor...');
    const editor = document.getElementById('postEditor');
    if (editor) {
        console.log('Found editor element - removing hidden class');
        editor.classList.remove('hidden');
        document.getElementById('postTitle').focus();
    } else {
        console.error('Post editor element not found in the DOM');
    }
}

function hideEditor() {
    const editor = document.getElementById('postEditor');
    if (editor) {
        editor.classList.add('hidden');
        resetPostForm();
    }
}

async function handlePostSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const postData = {
        title: formData.get('title'),
        categories: formData.get('categories').split(',').map(cat => cat.trim()).filter(Boolean),
        tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(Boolean),
        content: formData.get('content')
    };

    console.log('Submitting post data:', postData);

    try {
        const url = currentPostId ? `/blog/api/posts/${currentPostId}` : '/blog/api/posts';
        const method = currentPostId ? 'PUT' : 'POST';
        
        console.log(`Making ${method} request to ${url}`);
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save post');
        }

        const result = await response.json();
        console.log('Post saved successfully:', result);

        hideEditor();
        loadBlogPosts();
    } catch (error) {
        console.error('Error saving post:', error);
        alert(`Error saving post: ${error.message}`);
    }
}

async function editPost(postPath) {
    try {
        const response = await fetch(`/blog/api/posts/${postPath}`);
        const post = await response.json();
        
        currentPostId = postPath;
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postCategories').value = post.categories.join(', ');
        document.getElementById('postTags').value = post.tags.join(', ');
        document.getElementById('postContent').value = post.content;
        
        showEditor();
    } catch (error) {
        console.error('Error loading post:', error);
        alert('Error loading post. Please try again.');
    }
}

async function deletePost(postPath) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
        const response = await fetch(`/blog/api/posts/${postPath}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete post');

        loadBlogPosts();
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post. Please try again.');
    }
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

function resetPostForm() {
    currentPostId = null;
    document.getElementById('postForm')?.reset();
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

.back-btn, .edit-btn {
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

.blog-post-content {
    line-height: 1.6;
    color: #333;
    margin: 1.5rem 0;
}
`;
document.head.appendChild(style);
