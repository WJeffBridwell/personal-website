// Performance metrics tracking
const perfMetrics = {
    fetchTime: 0,
    renderTime: 0,
    imageLoadTime: 0,
    memoryUsage: 0,
    logMetrics() {
        console.log('Performance Metrics:', {
            fetchTime: `${this.fetchTime}ms`,
            renderTime: `${this.renderTime}ms`,
            imageLoadTime: `${this.imageLoadTime}ms`,
            memoryUsage: `${this.memoryUsage}MB`
        });
    }
};

// Constants
const CHUNK_SIZE = 20;
let currentChunk = 0;
let isLoading = false;
let allImages = [];

// Fetch images from server with error handling
async function fetchImages() {
    try {
        const startTime = performance.now();
        const response = await fetch('/api/images');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const images = await response.json();
        perfMetrics.fetchTime = performance.now() - startTime;
        return images;
    } catch (error) {
        console.error('Error fetching images:', error);
        showError('Failed to load images. Please try again later.');
        throw error;
    }
}

// Load next chunk of images
async function loadNextImageChunk() {
    if (isLoading || currentChunk * CHUNK_SIZE >= allImages.length) return;
    
    isLoading = true;
    const startIdx = currentChunk * CHUNK_SIZE;
    const endIdx = Math.min(startIdx + CHUNK_SIZE, allImages.length);
    const chunk = allImages.slice(startIdx, endIdx);
    
    await displayImages(chunk, true);
    currentChunk++;
    isLoading = false;
}

// Display images using DocumentFragment
async function displayImages(images, append = false) {
    const startTime = performance.now();
    const fragment = document.createDocumentFragment();
    const imageGrid = document.getElementById('imageGrid');

    if (!append) {
        imageGrid.innerHTML = '';
    }

    for (const image of images) {
        const div = document.createElement('div');
        div.className = 'image-container';
        
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.src = image.url;
        img.alt = image.name;
        
        // Add click handler for modal
        img.addEventListener('click', () => openModal(image.url, image.name));
        
        // Add search icon
        const searchIcon = document.createElement('span');
        searchIcon.className = 'search-icon';
        searchIcon.innerHTML = '';
        searchIcon.addEventListener('click', (e) => handleSearchIconClick(e, image.name));
        
        div.appendChild(img);
        div.appendChild(searchIcon);
        
        // Add tags if present
        const tags = extractTags(image.name);
        if (tags.length > 0) {
            const tagContainer = createTagElements(tags);
            div.appendChild(tagContainer);
        }
        
        fragment.appendChild(div);
    }

    imageGrid.appendChild(fragment);
    perfMetrics.renderTime = performance.now() - startTime;
    updateMemoryMetrics();
    perfMetrics.logMetrics();
}

// Show error message to user
function showError(message) {
    const errorDiv = document.getElementById('error-message') || createErrorElement();
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Create error element if it doesn't exist
function createErrorElement() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.className = 'error-message';
    document.body.appendChild(errorDiv);
    return errorDiv;
}

// Update memory usage metrics
function updateMemoryMetrics() {
    if (window.performance && window.performance.memory) {
        perfMetrics.memoryUsage = Math.round(
            window.performance.memory.usedJSHeapSize / (1024 * 1024)
        );
    }
}

// Scroll handler with throttling
let scrollTimeout;
function handleScroll() {
    if (scrollTimeout) return;
    
    scrollTimeout = setTimeout(() => {
        const scrollPos = window.innerHeight + window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        
        if (scrollPos >= docHeight - 1000) {
            loadNextImageChunk();
        }
        scrollTimeout = null;
    }, 100);
}

// Modal functions
function openModal(imageUrl, caption) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const captionText = document.getElementById('caption');
    
    modal.style.display = 'block';
    modalImg.src = imageUrl;
    captionText.innerHTML = caption;
    
    history.pushState({ modal: true }, '', `#${caption}`);
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
    if (history.state && history.state.modal) {
        history.back();
    }
}

// Search and filter functions
function handleSearchIconClick(event, imageName) {
    event.stopPropagation();
    showSearchResults(imageName);
}

function extractTags(filename) {
    const tags = filename.match(/_([^_\.]+)/g) || [];
    return tags.map(tag => tag.replace('_', ''));
}

function createTagElements(tags) {
    const container = document.createElement('div');
    container.className = 'tag-container';
    
    tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagElement.addEventListener('click', (e) => {
            e.stopPropagation();
            filterGalleryByTag(tag);
        });
        container.appendChild(tagElement);
    });
    
    return container;
}

// Initialize the application
async function init() {
    try {
        allImages = await fetchImages();
        await loadNextImageChunk();
        window.addEventListener('scroll', handleScroll);
        
        // Event delegation for image grid
        document.getElementById('imageGrid').addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                const img = e.target;
                openModal(img.src, img.alt);
            }
        });

        // Modal close button
        document.querySelector('.close').addEventListener('click', closeModal);
        
        // Close modal on outside click
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('imageModal');
            if (e.target === modal) {
                closeModal();
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            const modal = document.getElementById('imageModal');
            if (modal.style.display === 'block') {
                closeModal();
            }
        });

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page.');
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
