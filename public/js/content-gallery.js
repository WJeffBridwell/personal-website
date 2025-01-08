/**
 * Content Gallery
 * Handles displaying and filtering content in a grid layout
 */

class ImageLoader {
    constructor(maxConcurrent = 6) {
        this.queue = [];
        this.running = new Set();
        this.maxConcurrent = maxConcurrent;
        this.observer = null;
        this.initIntersectionObserver();
    }

    initIntersectionObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const container = entry.target;
                if (entry.isIntersecting) {
                    const priority = this.calculatePriority(entry);
                    this.loadImage(container, priority);
                } else if (!entry.isIntersecting && entry.intersectionRatio === 0) {
                    this.cleanupImage(container);
                }
            });
        }, {
            root: null,
            rootMargin: '50px',
            threshold: [0, 0.1, 0.5, 1.0]
        });
    }

    calculatePriority(entry) {
        // Higher priority for elements closer to the viewport center
        const viewportHeight = window.innerHeight;
        const rect = entry.boundingClientRect;
        const distanceToCenter = Math.abs((rect.top + rect.height / 2) - viewportHeight / 2);
        return 1 - (distanceToCenter / viewportHeight);
    }

    cleanupImage(container) {
        const img = container.querySelector('img');
        if (img && img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
    }

    async loadImage(container, priority) {
        if (container.dataset.loading === 'true') return;
        
        const imageName = container.dataset.image;
        if (!imageName) return;

        container.dataset.loading = 'true';
        container.dataset.priority = priority;

        this.queue.push({ container, priority });
        this.queue.sort((a, b) => b.priority - a.priority);
        this.processQueue();
    }

    async processQueue() {
        if (this.running.size >= this.maxConcurrent || this.queue.length === 0) return;

        const { container, priority } = this.queue.shift();
        const imageName = container.dataset.image;

        if (!imageName || this.running.has(imageName)) return;

        this.running.add(imageName);

        try {
            const response = await fetch('/gallery/batch-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageNames: [imageName] })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data.images && data.images[0]) {
                const img = new Image();
                img.onload = () => {
                    container.innerHTML = '';
                    container.appendChild(img);
                    container.classList.add('loaded');
                    this.running.delete(imageName);
                    this.processQueue();
                };
                img.onerror = () => {
                    container.classList.add('error');
                    this.running.delete(imageName);
                    this.processQueue();
                };
                img.src = data.images[0].data;
                img.alt = imageName;
            }
        } catch (error) {
            console.error('Error loading image:', imageName, error);
            container.classList.add('error');
            this.running.delete(imageName);
            this.processQueue();
        }

        container.dataset.loading = 'false';
    }

    observe(container) {
        this.observer.observe(container);
    }

    unobserve(container) {
        this.observer.unobserve(container);
        this.cleanupImage(container);
    }
}

const imageLoader = new ImageLoader(6);

class ContentGallery {
    constructor(containerId, apiEndpoint) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with ID ${containerId} not found`);
        }
        
        this.apiEndpoint = apiEndpoint;
        this.currentSort = 'name';
        this.currentFilter = '';
        this.searchTerm = '';
        this.items = [];
        this.imageCache = new Map();
        this.loadingImages = new Set();
        this.metrics = {
            totalImages: 0,
            loadedImages: 0,
            errors: 0,
            totalLoadTime: 0,
            cacheSize: 0,
            memoryEstimate: undefined
        };

        // Create modal for full-size images/videos
        this.createModal();
        
        // Bind methods
        this.handleImageClick = this.handleImageClick.bind(this);
        this.initializeControls();
    }

    initializeControls() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndDisplayItems();
            });
        }

        // Sort button
        const sortButton = document.getElementById('sort-name');
        if (sortButton) {
            sortButton.addEventListener('click', () => {
                this.currentSort = this.currentSort === 'name' ? 'name-desc' : 'name';
                const icon = sortButton.querySelector('i');
                icon.className = this.currentSort === 'name' ? 
                    'fas fa-sort-alpha-down' : 
                    'fas fa-sort-alpha-up';
                this.filterAndDisplayItems();
            });
        }

        // Tag filter
        const tagFilter = document.getElementById('tag-filter');
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.filterAndDisplayItems();
            });
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'content-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const closeButton = document.createElement('span');
        closeButton.className = 'close';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => this.closeModal();
        
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-container';
        
        const modalImage = document.createElement('img');
        modalImage.className = 'modal-image';
        modalImage.style.display = 'none';
        
        const modalVideo = document.createElement('video');
        modalVideo.className = 'modal-video';
        modalVideo.controls = true;
        modalVideo.style.display = 'none';
        
        contentContainer.appendChild(modalImage);
        contentContainer.appendChild(modalVideo);
        modalContent.appendChild(closeButton);
        modalContent.appendChild(contentContainer);
        this.modal.appendChild(modalContent);
        
        document.body.appendChild(this.modal);
        
        // Click outside to close
        this.modal.onclick = (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        };
    }

    closeModal() {
        this.modal.style.display = 'none';
        const modalVideo = this.modal.querySelector('.modal-video');
        if (modalVideo) {
            modalVideo.pause();
            modalVideo.currentTime = 0;
        }
    }

    async handleImageClick(e) {
        const tile = e.currentTarget;
        const imageName = tile.dataset.imageName;
        const contentType = tile.dataset.contentType;
        
        // Show modal
        this.modal.style.display = 'block';
        
        const modalImage = this.modal.querySelector('.modal-image');
        const modalVideo = this.modal.querySelector('.modal-video');
        
        // Reset display
        modalImage.style.display = 'none';
        modalVideo.style.display = 'none';
        
        try {
            // Fetch full-size content
            const response = await fetch(`${this.apiEndpoint}/images/${encodeURIComponent(imageName)}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            if (contentType.startsWith('video/')) {
                modalVideo.src = url;
                modalVideo.style.display = 'block';
            } else {
                modalImage.src = url;
                modalImage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading full content:', error);
            alert('Failed to load full-size content');
            this.closeModal();
        }
    }

    async loadImage(img) {
        const imageName = img.dataset.imageName;
        this.loadingImages.add(imageName);
        
        const startTime = performance.now();
        
        try {
            if (this.imageCache.has(imageName)) {
                img.src = this.imageCache.get(imageName);
                img.classList.add('loaded');
                return;
            }

            // Always load thumbnail version
            const response = await fetch(`${this.apiEndpoint}/images/${encodeURIComponent(imageName)}?thumbnail=true`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            this.imageCache.set(imageName, url);
            img.src = url;
            img.classList.add('loaded');

            // Update metrics
            this.metrics.loadedImages++;
            this.metrics.totalLoadTime += performance.now() - startTime;
        } catch (error) {
            console.error(`Error loading image ${imageName}:`, error);
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" fill="%23666">Error</text></svg>';
            img.classList.add('error');
            this.metrics.errors++;
        } finally {
            this.loadingImages.delete(imageName);
        }
    }

    async displayImages(items) {
        if (!Array.isArray(items)) {
            console.error('Invalid items array:', items);
            return;
        }

        // Clear existing content
        this.container.innerHTML = '';

        // Create grid container
        const grid = document.createElement('div');
        grid.className = 'o-gallery__grid';

        items.forEach(item => {
            const tile = document.createElement('div');
            tile.className = 'o-gallery__item';
            tile.dataset.imageName = item.content_name;
            tile.dataset.contentType = item.content_type;

            const mediaContainer = document.createElement('div');
            mediaContainer.className = 'm-card__media';

            // Determine content type
            const type = this.getContentType(item.content_type, item.content_name);

            if (type === 'folder') {
                // Folder preview
                mediaContainer.className = 'm-folder-preview';
                mediaContainer.innerHTML = '<i class="fas fa-folder fa-3x"></i>';
            } else if (type === 'video') {
                // Video preview with thumbnail
                mediaContainer.className = 'm-video-preview';
                
                // Create video element with thumbnail
                const video = document.createElement('video');
                video.className = 'tile-video';
                video.src = `/api/content/images/${encodeURIComponent(item.content_name)}`;
                video.controls = true;
                video.preload = 'none'; // Don't preload video
                video.poster = `/api/content/images/${encodeURIComponent(item.content_name)}?thumbnail=true`;
                
                // Prevent tile click when interacting with video controls
                video.addEventListener('click', (e) => e.stopPropagation());
                
                mediaContainer.appendChild(video);
            } else {
                // Image preview
                mediaContainer.className = 'm-image-preview';
                mediaContainer.innerHTML = `<img src="/api/content/images/${encodeURIComponent(item.content_name)}?thumbnail=true" alt="${item.content_name}">`;
            }

            // Add tags if present
            if (item.content_tags && item.content_tags.length > 0) {
                const tagsContainer = document.createElement('div');
                tagsContainer.className = 'tags-container';
                
                item.content_tags.forEach(tag => {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'tag';
                    tagElement.innerHTML = `<span class="tag-dot" style="background-color: ${tag.toLowerCase()}"></span>`;
                    tagElement.title = tag;
                    tagsContainer.appendChild(tagElement);
                });
                
                mediaContainer.appendChild(tagsContainer);
            }

            // Add overlay with metadata
            const overlay = document.createElement('div');
            overlay.className = 'm-card__overlay';
            overlay.innerHTML = `
                <h3 class="a-card__title">${item.content_name}</h3>
                <div class="a-card__metadata">
                    ${item.content_size ? `<span class="a-content-size">${this.formatSize(item.content_size)}</span>` : ''}
                    ${item.content_tags && item.content_tags.length > 0 ? `<span class="a-content-tags">${item.content_tags.join(', ')}</span>` : ''}
                </div>
            `;

            tile.appendChild(mediaContainer);
            tile.appendChild(overlay);

            // For non-video content, add click handler for modal view
            if (type !== 'video') {
                tile.addEventListener('click', () => this.handleItemClick(item));
            }

            grid.appendChild(tile);
        });

        this.container.appendChild(grid);
    }

    getContentType(contentType, filename) {
        if (!contentType) {
            return filename.includes('.') ? this.getTypeFromExtension(filename) : 'folder';
        }
        
        if (contentType.startsWith('video/') || contentType === 'mp4') {
            return 'video';
        }
        if (contentType.startsWith('image/') || ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(contentType)) {
            return 'image';
        }
        return 'folder';
    }

    getTypeFromExtension(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
        return 'folder';
    }

    async handleItemClick(item) {
        const type = this.getContentType(item.content_type, item.content_name);
        
        if (type === 'folder') {
            // Handle folder navigation
            window.location.href = `${window.location.pathname}?path=${encodeURIComponent(item.content_url)}`;
            return;
        }

        // Show modal
        this.modal.style.display = 'block';
        
        const modalImage = this.modal.querySelector('.modal-image');
        const modalVideo = this.modal.querySelector('.modal-video');
        
        // Reset display
        modalImage.style.display = 'none';
        modalVideo.style.display = 'none';
        
        try {
            if (type === 'video') {
                modalVideo.style.display = 'block';
                modalVideo.src = `/api/content/images/${encodeURIComponent(item.content_name)}`;
                modalVideo.play();
            } else {
                modalImage.style.display = 'block';
                modalImage.src = `/api/content/images/${encodeURIComponent(item.content_name)}`;
            }
        } catch (error) {
            console.error('Error displaying content:', error);
        }
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    updateTagFilter(items) {
        const tagFilter = document.getElementById('tag-filter');
        if (!tagFilter) return;

        // Get unique tags
        const tags = new Set();
        items.forEach(item => {
            if (item.content_tags) {
                item.content_tags.forEach(tag => tags.add(tag));
            }
        });

        // Sort tags alphabetically
        const sortedTags = Array.from(tags).sort();

        // Update dropdown
        const currentValue = tagFilter.value;
        tagFilter.innerHTML = '<option value="">All Tags</option>';
        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
        tagFilter.value = currentValue;
    }

    filterAndDisplayItems() {
        if (!this.items.length) return;

        let filtered = [...this.items];

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(item => 
                item.content_name.toLowerCase().includes(this.searchTerm)
            );
        }

        // Apply tag filter
        if (this.currentFilter) {
            filtered = filtered.filter(item => 
                item.content_tags && item.content_tags.includes(this.currentFilter)
            );
        }

        // Apply sort
        filtered.sort((a, b) => {
            const nameA = a.content_name.toLowerCase();
            const nameB = b.content_name.toLowerCase();
            return this.currentSort === 'name' ? 
                nameA.localeCompare(nameB) : 
                nameB.localeCompare(nameA);
        });

        this.displayImages(filtered);
    }

    async loadContent() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const imageName = urlParams.get('image-name') || urlParams.get('image_name') || '';
            const apiUrl = `${this.apiEndpoint}?image_name=${encodeURIComponent(imageName)}`;
            
            console.log('[Gallery] Fetching content from:', apiUrl);
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            if (!data) {
                throw new Error('No data received');
            }
            
            console.log('[Gallery] Received data:', data);
            const items = Array.isArray(data) ? data : (data.content || []);
            
            if (items.length === 0) {
                this.container.innerHTML = '<div class="error-message">No content found</div>';
                return;
            }
            
            console.log(`[Gallery] Processing ${items.length} items`);
            this.items = items;
            this.updateTagFilter(items);
            this.filterAndDisplayItems();
            
        } catch (error) {
            console.error('Error loading content:', error);
            this.container.innerHTML = `<div class="error-message">Error loading gallery content: ${error.message}</div>`;
        }
    }
}

// Export the class
window.ContentGallery = ContentGallery;

function initGallery() {
    const gallery = document.querySelector('.gallery-grid');
    if (!gallery) return;

    // Observe all existing image containers
    document.querySelectorAll('.image-container').forEach(container => {
        imageLoader.observe(container);
    });

    // Infinite scroll handling with debouncing
    let scrollTimeout;
    let lastScrollPosition = 0;
    const scrollThreshold = 1000; // pixels from bottom

    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        scrollTimeout = setTimeout(() => {
            const currentScroll = window.scrollY;
            const scrollingDown = currentScroll > lastScrollPosition;
            lastScrollPosition = currentScroll;

            if (scrollingDown) {
                const bottomReached = window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - scrollThreshold;
                if (bottomReached) {
                    loadMoreImages();
                }
            }
        }, 100);
    });
}

// Load more images when scrolling
async function loadMoreImages() {
    if (window.loadingMore) return;
    window.loadingMore = true;

    try {
        const response = await fetch('/gallery/next-batch', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (data.images && data.images.length > 0) {
            const gallery = document.querySelector('.gallery-grid');
            
            data.images.forEach(image => {
                const container = document.createElement('div');
                container.className = 'image-container';
                container.dataset.image = image.name;
                gallery.appendChild(container);
                imageLoader.observe(container);
            });
        }
    } catch (error) {
        console.error('Error loading more images:', error);
    } finally {
        window.loadingMore = false;
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const gallery = new ContentGallery('gallery-grid', '/api/content');
    gallery.loadContent();
});

// Cleanup on page unload
window.addEventListener('unload', () => {
    document.querySelectorAll('.image-container').forEach(container => {
        imageLoader.unobserve(container);
    });
});
