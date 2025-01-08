/**
 * Content Gallery
 * Handles displaying and filtering content in a grid layout
 */
import Gallery from './gallery.js';
import { initializeModal } from './modal.js';

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

export class ContentGallery {
    constructor(galleryId, apiEndpoint, imageName = '') {
        this.galleryGrid = document.getElementById(galleryId);
        if (!this.galleryGrid) {
            throw new Error(`Gallery grid with ID ${galleryId} not found`);
        }

        this.apiEndpoint = apiEndpoint;
        this.imageName = imageName;
        this.content = [];
        this.searchInput = document.getElementById('search-input');
        this.contentPlayer = null;
        this.searchQuery = '';
        this.sortBy = 'name-asc';
        this.selectedTag = '';
        this.modal = initializeModal();
        this.batchSize = 40;  // Reduced batch size
        this.imageCache = new Map();
        this.loadingImages = new Set();
        this.observer = this.setupIntersectionObserver();
        this.metrics = {
            loadStart: Date.now(),
            imagesLoaded: 0,
            totalLoadTime: 0,
            errors: 0
        };
        
        // Always use the same host as the main site, but with port 8082
        const videoServerHost = window.location.hostname;
        this.videoServerUrl = `http://${videoServerHost}:8082`;

        this.galleryInstance = new Gallery(this.galleryGrid);
        this.initializeControls();
        this.setupPerformanceMonitoring();
    }

    setupPerformanceMonitoring() {
        // Log performance metrics
        const logMetrics = () => {
            const metrics = {
                totalImages: this.content.length,
                loadedImages: this.metrics.imagesLoaded,
                averageLoadTime: this.metrics.imagesLoaded > 0 ? 
                    this.metrics.totalLoadTime / this.metrics.imagesLoaded : 0,
                errorRate: this.metrics.errors / this.content.length,
                totalTime: Date.now() - this.metrics.loadStart,
                cacheSize: this.imageCache.size,
                memoryEstimate: performance.memory?.usedJSHeapSize
            };
            console.log('[Gallery Metrics]', metrics);
        };

        // Log metrics every 5 seconds during loading
        const metricsInterval = setInterval(() => {
            if (this.metrics.imagesLoaded === this.content.length) {
                clearInterval(metricsInterval);
            }
            logMetrics();
        }, 5000);

        // Final metrics when page unloads
        window.addEventListener('beforeunload', logMetrics);
    }

    setupIntersectionObserver() {
        return new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (!this.loadingImages.has(img.dataset.imageName)) {
                        this.loadImage(img);
                    }
                }
            });
        }, {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        });
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

            const response = await fetch(`${this.apiEndpoint}/images/${encodeURIComponent(imageName)}?thumbnail=true`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            this.imageCache.set(imageName, url);
            img.src = url;
            img.classList.add('loaded');

            // Update metrics
            this.metrics.imagesLoaded++;
            this.metrics.totalLoadTime += performance.now() - startTime;
        } catch (error) {
            console.error(`Error loading image ${imageName}:`, error);
            img.classList.add('error');
            this.metrics.errors++;
        } finally {
            this.loadingImages.delete(imageName);
        }
    }

    createGalleryItem(item) {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        
        const img = document.createElement('img');
        img.className = 'gallery-image';
        img.alt = item.name;
        img.dataset.imageName = item.name;
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent placeholder
        
        this.observer.observe(img);
        div.appendChild(img);
        
        return div;
    }

    async loadContent() {
        if (this.content.length > 0) {
            this.renderContent();
            return;
        }

        try {
            const startTime = performance.now();
            
            // First, get the list of all images
            const response = await fetch(`${this.apiEndpoint}?image_name=${encodeURIComponent(this.imageName)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            this.content = Array.isArray(data) ? data : (data.content || []);
            
            console.log(`[Gallery] Fetched ${this.content.length} items in ${performance.now() - startTime}ms`);
            
            // Update tag filter and render content
            this.updateTagFilter();
            this.renderContent();
            
        } catch (error) {
            console.error('Error loading content:', error);
            this.galleryGrid.innerHTML = '<div class="error-message">Error loading gallery content</div>';
        }
    }

    renderContent() {
        // Clear existing content
        this.galleryGrid.innerHTML = '';
        
        // Create and append items
        this.content.forEach(item => {
            const element = this.createGalleryItem(item);
            this.galleryGrid.appendChild(element);
        });
    }

    initializeControls() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderContent();
            });
        }

        // Tag filter
        const tagFilter = document.getElementById('tag-filter');
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.selectedTag = e.target.value;
                this.renderContent();
            });
        }

        // Sort button
        const sortNameBtn = document.getElementById('sort-name');
        if (sortNameBtn) {
            sortNameBtn.addEventListener('click', () => {
                this.sortBy = this.sortBy === 'name-asc' ? 'name-desc' : 'name-asc';
                this.updateSortButtons();
                this.renderContent();
            });
        }
    }

    updateTagFilter() {
        const tagFilter = document.getElementById('tag-filter');
        if (!tagFilter) return;

        // Get unique tags from all content
        const allTags = new Set();
        this.content.forEach(item => {
            if (item.content_tags && Array.isArray(item.content_tags)) {
                item.content_tags.forEach(tag => allTags.add(tag));
            }
        });

        // Sort tags alphabetically
        const sortedTags = Array.from(allTags).sort();

        // Clear existing options except "All Tags"
        while (tagFilter.options.length > 1) {
            tagFilter.remove(1);
        }

        // Add tag options
        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
    }

    updateSortButtons() {
        const sortNameBtn = document.getElementById('sort-name');
        if (sortNameBtn) {
            sortNameBtn.classList.add('active');
            sortNameBtn.innerHTML = `Sort by Name ${this.sortBy === 'name-asc' ? '↑' : '↓'}`;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFilteredContent() {
        let filtered = [...this.content];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(item => 
                item.content_name.toLowerCase().includes(this.searchQuery) ||
                (item.content_tags && item.content_tags.some(tag => 
                    tag.toLowerCase().includes(this.searchQuery)
                ))
            );
        }

        // Apply tag filter
        if (this.selectedTag) {
            filtered = filtered.filter(item => 
                item.content_tags && item.content_tags.includes(this.selectedTag)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (this.sortBy === 'name-asc') {
                return a.content_name.localeCompare(b.content_name);
            } else if (this.sortBy === 'name-desc') {
                return b.content_name.localeCompare(a.content_name);
            }
            return 0;
        });

        return filtered;
    }

    isVideoFile(filename) {
        const videoExtensions = ['.mp4', '.MP4', '.m4v', '.webm', '.mov'];
        return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    }

    isImageFile(filename) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const lowerFilename = filename.toLowerCase();
        // Check both the full extension and parts of compound extensions (e.g., .jpeg.webp)
        const isImage = imageExtensions.some(ext => 
            lowerFilename.endsWith(ext.toLowerCase()) || 
            lowerFilename.includes(ext.toLowerCase() + '.')
        );
        console.log('Checking if file is image:', filename, isImage);
        return isImage;
    }

    initializeWithContentPlayer(contentPlayer) {
        this.contentPlayer = contentPlayer;
    }
}

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
document.addEventListener('DOMContentLoaded', initGallery);

// Cleanup on page unload
window.addEventListener('unload', () => {
    document.querySelectorAll('.image-container').forEach(container => {
        imageLoader.unobserve(container);
    });
});
