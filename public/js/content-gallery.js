/**
 * Content Gallery
 * 
 * Core Requirements:
 * 1. Content Display:
 *    - Images and videos shown in a responsive grid
 *    - Direct display without modals
 *    - Proper handling of different content types (mp4, webp, jpg, etc.)
 * 
 * 2. Required Metadata (MUST BE MAINTAINED):
 *    - Content name
 *    - Content size (formatted)
 *    - Content tags
 * 
 * 3. Content Loading:
 *    - Proxy endpoints for content delivery
 *    - Proper error handling
 *    - Efficient loading of resources
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
            const response = await fetch('/api/content/batch-images', {
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
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`[Gallery] Container element '${containerId}' not found`);
            return;
        }
        this.items = [];
        this.selectedTags = new Set();
        this.thumbnailCache = new Map(); // Cache for video thumbnails
        this.searchTerm = '';
        this.sortOrder = 'name-asc'; // Default sort order
        
        // Initialize event listeners
        this.initializeFilters();
    }

    initializeFilters() {
        // Search filter
        const searchInput = document.querySelector('.a-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndDisplayItems();
            });
        }

        // Sort order
        const sortSelect = document.querySelector('#sort-order');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortOrder = e.target.value;
                this.filterAndDisplayItems();
            });
        }

        // Tag filter
        const tagFilter = document.querySelector('#tag-filter');
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.selectedTags.clear();
                if (e.target.value) {
                    this.selectedTags.add(e.target.value);
                }
                this.filterAndDisplayItems();
            });
        }
    }

    async generateVideoThumbnail(videoUrl) {
        // Check cache first
        if (this.thumbnailCache.has(videoUrl)) {
            return this.thumbnailCache.get(videoUrl);
        }

        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            
            // Set up event handlers
            video.onloadedmetadata = () => {
                video.currentTime = 1; // Skip to 1 second to avoid black frames
            };
            
            video.onseeked = () => {
                // Create canvas and draw video frame
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Convert to data URL and cache it
                const thumbnailUrl = canvas.toDataURL('image/jpeg');
                this.thumbnailCache.set(videoUrl, thumbnailUrl);
                resolve(thumbnailUrl);
                
                // Clean up
                video.remove();
            };
            
            video.onerror = () => {
                console.error('Error loading video for thumbnail:', videoUrl);
                resolve(null); // Return null to indicate error
                video.remove();
            };
            
            // Start loading the video
            video.src = videoUrl;
            video.load();
        });
    }

    async loadContent(imageName) {
        if (!imageName) {
            console.error('[Gallery] No image name provided');
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:8081/image-content?image_name=${imageName}`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const data = await response.json();
            
            if (Array.isArray(data)) {
                this.items = data;
                this.updateTagFilter(data);
                this.filterAndDisplayItems();
            } else {
                console.error('[Gallery] Received invalid data format');
                throw new Error('Invalid data format received');
            }
        } catch (error) {
            console.error('Error loading content:', error);
            this.container.innerHTML = `<div class="error-message">Error loading gallery content: ${error.message}</div>`;
        }
    }

    updateTagFilter(items) {
        const tagFilter = document.getElementById('tag-filter');
        if (!tagFilter) return;

        // Get unique tags
        const tags = new Set();
        items.forEach(item => {
            if (item.tags) {
                item.tags.forEach(tag => tags.add(tag));
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
                item.content_name.toLowerCase().includes(this.searchTerm) ||
                (item.content_tags && item.content_tags.some(tag => 
                    tag.toLowerCase().includes(this.searchTerm)
                ))
            );
        }

        // Apply tag filter
        if (this.selectedTags.size > 0) {
            filtered = filtered.filter(item => 
                item.content_tags && item.content_tags.some(tag => 
                    this.selectedTags.has(tag)
                )
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.sortOrder) {
                case 'name-asc':
                    return a.content_name.localeCompare(b.content_name);
                case 'name-desc':
                    return b.content_name.localeCompare(a.content_name);
                case 'size-asc':
                    return a.content_size - b.content_size;
                case 'size-desc':
                    return b.content_size - a.content_size;
                case 'date-asc':
                    return new Date(a.content_date) - new Date(b.content_date);
                case 'date-desc':
                    return new Date(b.content_date) - new Date(a.content_date);
                default:
                    return 0;
            }
        });

        this.displayImages(filtered);
    }

    displayImages(items) {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        items.forEach(async (item) => {
            const itemContainer = document.createElement('div');
            itemContainer.className = 'gallery-item';
            
            const contentContainer = document.createElement('div');
            contentContainer.className = 'content-container';
            
            if (item.content_type === 'mp4' || item.content_type === 'webm') {
                contentContainer.classList.add('media-container');
                // Create video element for playback
                const video = document.createElement('video');
                video.className = 'content-player';
                video.controls = true;
                video.preload = 'metadata';
                
                // Add source with error handling
                const source = document.createElement('source');
                source.src = `/proxy/video/direct?path=${encodeURIComponent(item.content_url)}`;
                source.type = `video/${item.content_type}`;
                
                // Error handling for unsupported format
                source.onerror = () => {
                    // Show VR icon for unsupported videos
                    video.style.display = 'none';
                    contentContainer.classList.remove('media-container');
                    contentContainer.classList.add('vr-container');
                    const vrIcon = document.createElement('i');
                    vrIcon.className = 'fas fa-vr-cardboard';
                    contentContainer.appendChild(vrIcon);
                };
                
                video.appendChild(source);
                contentContainer.appendChild(video);
                
                // Generate and show thumbnail
                try {
                    const thumbnailUrl = await this.generateVideoThumbnail(source.src);
                    if (thumbnailUrl) {
                        video.poster = thumbnailUrl;
                    }
                } catch (error) {
                    console.error('Error generating thumbnail:', error);
                }
            } else if (item.content_type === 'jpg' || item.content_type === 'jpeg' || item.content_type === 'png' || item.content_type === 'webp') {
                contentContainer.classList.add('media-container');
                const img = document.createElement('img');
                img.className = 'content-player';
                img.alt = item.content_name;
                img.dataset.src = `/proxy/image/direct?path=${encodeURIComponent(item.content_url)}`;
                contentContainer.appendChild(img);
                imageLoader.observer.observe(contentContainer);
            } else {
                // Show folder icon for other types
                contentContainer.classList.add('folder-container');
                const folderIcon = document.createElement('i');
                folderIcon.className = 'fas fa-folder fa-4x';
                contentContainer.appendChild(folderIcon);
            }
            itemContainer.appendChild(contentContainer);

            const metadataContainer = document.createElement('div');
            metadataContainer.className = 'metadata-container';

            const nameElement = document.createElement('div');
            nameElement.className = 'content-name';
            nameElement.textContent = item.content_name;
            metadataContainer.appendChild(nameElement);

            const sizeElement = document.createElement('div');
            sizeElement.className = 'content-size';
            sizeElement.textContent = this.formatFileSize(item.content_size);
            metadataContainer.appendChild(sizeElement);

            if (item.content_tags && item.content_tags.length > 0) {
                const tagsContainer = document.createElement('div');
                tagsContainer.className = 'content-tags';
                item.content_tags.forEach(tag => {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'tag';
                    tagElement.textContent = tag;
                    tagsContainer.appendChild(tagElement);
                });
                metadataContainer.appendChild(tagsContainer);
            }

            itemContainer.appendChild(metadataContainer);
            this.container.appendChild(itemContainer);
        });
    }

    showModal(imageSrc) {
        // Push state to enable back button
        history.pushState({ modal: true }, '', window.location.pathname);

        const modal = document.createElement('div');
        modal.className = 'image-modal';
        
        const modalImg = document.createElement('img');
        modalImg.src = imageSrc;
        modal.appendChild(modalImg);

        const closeModal = () => {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', handleKeyPress);
            document.removeEventListener('popstate', handlePopState);
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Escape' || e.key === 'Backspace') {
                history.back();
            }
        };

        const handlePopState = () => {
            closeModal();
        };

        modal.addEventListener('click', () => {
            history.back();
        });
        
        document.addEventListener('keydown', handleKeyPress);
        document.addEventListener('popstate', handlePopState);
        document.body.appendChild(modal);
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const gallery = new ContentGallery('gallery-grid');
    const urlParams = new URLSearchParams(window.location.search);
    const imageName = urlParams.get('image-name') || urlParams.get('image_name');
    
    if (imageName) {
        gallery.loadContent(imageName);
    } else {
        console.error('[Gallery] No image name provided in URL parameters');
        document.getElementById('gallery-grid').innerHTML = '<div class="error-message">No image name provided</div>';
    }
});
