let simplemde;
let currentPostId = null;

// Initialize SimpleMDE when the page loads
document.addEventListener('DOMContentLoaded', () => {
    simplemde = new SimpleMDE({
        element: document.getElementById('postContent'),
        spellChecker: false,
        autosave: {
            enabled: true,
            uniqueId: 'blogPostDraft'
        }
    });

    loadPosts();
    setupEventListeners();
    loadConfiguration();
});

function setupEventListeners() {
    // New Post button
    document.getElementById('newPostBtn').addEventListener('click', () => {
        showSection('editPost');
        resetPostForm();
    });

    // Configure button
    document.getElementById('configureBtn').addEventListener('click', () => {
        showSection('configure');
    });

    // Cancel buttons
    document.getElementById('cancelEdit').addEventListener('click', () => {
        showSection('postsList');
    });

    document.getElementById('cancelConfig').addEventListener('click', () => {
        showSection('postsList');
    });

    // Form submissions
    document.getElementById('postForm').addEventListener('submit', handlePostSubmit);
    document.getElementById('configForm').addEventListener('submit', handleConfigSubmit);
}

async function loadPosts() {
    const container = document.getElementById('postsContainer');
    try {
        const response = await fetch('/blog/api/posts');
        const data = await response.json();
        const posts = data.posts || [];

        if (posts.length === 0) {
            container.innerHTML = '<div class="no-posts">No posts found. Create your first post!</div>';
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="post-item">
                <div class="post-info">
                    <div class="post-title">${post.title}</div>
                    <div class="post-meta">
                        ${new Date(post.date).toLocaleDateString()} | 
                        ${post.categories.join(', ')}
                    </div>
                </div>
                <div class="post-actions">
                    <button class="btn" onclick="editPost('${post.path}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn danger" onclick="deletePost('${post.path}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading posts:', error);
        container.innerHTML = '<div class="error">Error loading posts. Please try again.</div>';
    }
}

async function handlePostSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const postData = {
        title: formData.get('title'),
        categories: formData.get('categories').split(',').map(cat => cat.trim()),
        tags: formData.get('tags').split(',').map(tag => tag.trim()),
        content: simplemde.value()
    };

    try {
        const url = currentPostId ? `/blog/api/posts/${currentPostId}` : '/blog/api/posts';
        const method = currentPostId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) throw new Error('Failed to save post');

        showSection('postsList');
        loadPosts();
    } catch (error) {
        console.error('Error saving post:', error);
        alert('Error saving post. Please try again.');
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

        showSection('postsList');
    } catch (error) {
        console.error('Error saving configuration:', error);
        alert('Error saving configuration. Please try again.');
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
        simplemde.value(post.content);
        
        document.getElementById('editPostTitle').textContent = 'Edit Post';
        showSection('editPost');
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

        loadPosts();
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post. Please try again.');
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

function showSection(sectionId) {
    const sections = ['postsList', 'editPost', 'configure'];
    sections.forEach(id => {
        document.getElementById(id).classList.toggle('hidden', id !== sectionId);
    });
}

function resetPostForm() {
    currentPostId = null;
    document.getElementById('postForm').reset();
    simplemde.value('');
    document.getElementById('editPostTitle').textContent = 'New Post';
}
