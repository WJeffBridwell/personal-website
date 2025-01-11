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
        this.templateCache = null; // Cache for cloned template
        this.mediaPreviewCache = new Map(); // Cache for media previews
        this.searchTerm = '';
        this.sortOrder = 'name-asc';
        this.selectedType = '';
        this.currentPage = 1;
        this.pageSize = 16;
        this.totalItems = 0;
        this.totalPages = 0;
        this.lastImageName = '';
        this.isFiltered = false;
        this.isLoading = false;
        this.pendingOperation = null;
        this.nextPageData = null; // Cache for next page data
        
        // Create pagination container after the gallery container
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-controls';
        this.container.parentNode.insertBefore(paginationContainer, this.container.nextSibling);
        
        this.initializeFilters();
        this.initIntersectionObserver();
    }

    initIntersectionObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const mediaContainer = entry.target;
                    const itemId = mediaContainer.dataset.itemId;
                    if (itemId && this.mediaPreviewCache.has(itemId)) {
                        this.loadMediaPreview(mediaContainer, this.mediaPreviewCache.get(itemId));
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
    }

    async loadMediaPreview(mediaContainer, item) {
        if (!mediaContainer.dataset.loaded) {
            await this.setupMediaPreview(item, mediaContainer);
            mediaContainer.dataset.loaded = 'true';
        }
    }

    getTemplateClone() {
        if (!this.templateCache) {
            const template = document.getElementById('gallery-item-template');
            if (!template) {
                console.error('[Gallery] Template not found');
                return null;
            }
            this.templateCache = template;
        }
        return this.templateCache.content.cloneNode(true);
    }

    async loadContent(imageName) {
        if (!imageName) {
            console.error('[Gallery] No image name provided');
            return;
        }

        if (this.isLoading) {
            console.log('[Gallery] Already loading content');
            return;
        }

        this.isLoading = true;
        this.lastImageName = imageName;
        console.log('[Gallery] Loading content with page size:', this.pageSize);

        try {
            // Pre-fetch next page while loading current page
            const currentPagePromise = fetch(`http://192.168.86.242:8081/image-content?image_name=${imageName}&page=${this.currentPage}&page_size=${this.pageSize}`);
            const nextPagePromise = fetch(`http://192.168.86.242:8081/image-content?image_name=${imageName}&page=${this.currentPage + 1}&page_size=${this.pageSize}`);

            const [currentResponse, nextResponse] = await Promise.all([currentPagePromise, nextPagePromise]);
            const [currentData, nextData] = await Promise.all([currentResponse.json(), nextResponse.json()]);

            console.log('[Gallery] Current page response:', currentData);
            console.log('[Gallery] Next page response:', nextData);

            // Update pagination data
            this.nextPageData = nextData;
            this.totalItems = currentData.total || currentData.total_items || 0;
            this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
            
            console.log('[Gallery] Loaded items:', currentData.items?.length);
            console.log('[Gallery] Total items:', this.totalItems);
            console.log('[Gallery] Current page:', this.currentPage);
            console.log('[Gallery] Total pages:', this.totalPages);

            // Display items and update pagination
            if (currentData.items && currentData.items.length > 0) {
                await this.displayItems(currentData.items);
                this.updatePaginationControls();
            } else {
                console.error('[Gallery] No items found in response');
                this.container.innerHTML = '<div class="error-message">No items found</div>';
            }
        } catch (error) {
            console.error('Error loading content:', error);
            this.container.innerHTML = `<div class="error-message">Error loading gallery content: ${error.message}</div>`;
        } finally {
            this.isLoading = false;
        }
    }

    async displayItems(items) {
        if (!items || !items.length) {
            console.log('[Gallery] No items to display');
            return;
        }

        this.container.innerHTML = '';
        console.log('[Gallery] Displaying', items.length, 'items');

        const fragment = document.createDocumentFragment();
        
        for (const item of items) {
            const clone = this.getTemplateClone();
            if (!clone) return;

            const galleryItem = clone.querySelector('.o-gallery__item');
            
            // Set up lazy media preview
            const mediaContainer = clone.querySelector('.m-card__media');
            mediaContainer.dataset.itemId = item.content_url;
            this.mediaPreviewCache.set(item.content_url, item);
            this.observer.observe(mediaContainer);
            
            // Set up title and metadata
            const title = clone.querySelector('.a-card__title');
            title.textContent = item.content_name;
            
            const metadataRow = document.createElement('div');
            metadataRow.className = 'metadata-row';
            
            const size = document.createElement('div');
            size.className = 'a-content-size';
            size.textContent = this.formatBytes(item.content_size);
            metadataRow.appendChild(size);
            
            const tags = document.createElement('div');
            tags.className = 'a-content-tags';
            if (item.content_tags && item.content_tags.length > 0) {
                item.content_tags.forEach(tag => {
                    const circle = document.createElement('span');
                    circle.className = `tag-circle tag-${tag.toLowerCase()}`;
                    tags.appendChild(circle);
                });
            }
            metadataRow.appendChild(tags);
            
            const metadata = clone.querySelector('.a-card__metadata');
            metadata.appendChild(metadataRow);
            
            galleryItem.addEventListener('click', () => this.handleItemClick(item));
            fragment.appendChild(clone);
        }

        this.container.appendChild(fragment);
        console.log('[Gallery] Rendered', items.length, 'items');
    }

    async handlePageClick(page) {
        console.log('[Gallery] Handling page click:', page);
        if (page === this.currentPage || this.isLoading) return;
        
        this.currentPage = page;
        
        // If we have pre-fetched data for this page, use it
        if (this.nextPageData && page === this.currentPage) {
            this.displayItems(this.nextPageData.items);
            this.nextPageData = null;
        } else {
            await this.loadContent(this.lastImageName);
        }
        
        this.updatePaginationControls();
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

        // Type filter
        const typeFilter = document.querySelector('#type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.selectedType = e.target.value;
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

    async filterAndDisplayItems() {
        console.log('[Gallery] Starting filter with', this.items.length, 'items');
        
        if (this.isLoading) {
            console.log('[Gallery] Data still loading, storing filter as pending operation');
            this.pendingOperation = { type: 'filter' };
            return;
        }

        let filteredItems = [...this.items];

        // Apply search filter
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(item => {
                const nameMatch = item.content_name.toLowerCase().includes(searchLower);
                const tagMatch = item.content_tags?.some(tag => tag.toLowerCase().includes(searchLower)) || false;
                return nameMatch || tagMatch;
            });
        }

        // Apply type filter
        if (this.selectedType) {
            filteredItems = filteredItems.filter(item => this.getItemType(item) === this.selectedType);
        }

        // Apply tag filter
        if (this.selectedTags.size > 0) {
            filteredItems = filteredItems.filter(item =>
                item.content_tags?.some(tag => this.selectedTags.has(tag))
            );
        }

        // Apply sort
        this.sortItems(filteredItems);

        // Update pagination for filtered results
        const totalFilteredItems = filteredItems.length;
        const totalFilteredPages = Math.ceil(totalFilteredItems / this.pageSize);
        
        console.log('[Gallery] After filtering:', totalFilteredItems, 'items,', totalFilteredPages, 'pages');
        
        // Reset to page 1 if current page is beyond total pages
        if (this.currentPage > totalFilteredPages) {
            this.currentPage = 1;
        }

        // Display the current page of filtered items
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const itemsToDisplay = filteredItems.slice(startIndex, endIndex);

        console.log('[Gallery] Displaying page', this.currentPage, 'items', startIndex, 'to', endIndex);
        
        this.displayItems(itemsToDisplay);
        
        // Update pagination controls with filtered totals
        this.totalItems = totalFilteredItems;
        this.totalPages = totalFilteredPages;
        this.updatePaginationControls();
    }

    updateTagFilter(items) {
        const tagFilter = document.querySelector('#tag-filter');
        if (!tagFilter) return;

        // Get unique tags - preserve original case
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

    async setupMediaPreview(item, mediaContainer) {
        // Clear any existing content
        mediaContainer.innerHTML = '';
        mediaContainer.className = 'm-card__media';

        if (item.content_type === 'mp4' || item.content_type === 'webm') {
            const video = document.createElement('video');
            video.className = 'content-player';
            video.controls = true;
            video.preload = 'metadata';
            video.playsinline = true;
            
            const source = document.createElement('source');
            source.src = `/proxy/video/direct?path=${encodeURIComponent(item.content_url)}`;
            source.type = `video/${item.content_type}`;
            video.appendChild(source);
            
            // Check if it's a VR video based on filename
            const isVRVideo = item.content_name.toLowerCase().includes('vr') || 
                            item.content_name.toLowerCase().includes('360') ||
                            item.content_name.toLowerCase().includes('pov');
            
            const handleError = () => {
                console.log('Video error detected for:', item.content_name);
                video.remove();
                
                if (isVRVideo) {
                    console.log('Showing VR icon for:', item.content_name);
                    const vrContainer = document.createElement('div');
                    vrContainer.className = 'vr-container';
                    vrContainer.style.backgroundColor = '#f5f5f5';
                    
                    const vrIcon = document.createElement('i');
                    vrIcon.className = 'fas fa-vr-cardboard';
                    vrContainer.appendChild(vrIcon);
                    mediaContainer.appendChild(vrContainer);
                } else {
                    console.log('Showing error icon for:', item.content_name);
                    const errorContainer = document.createElement('div');
                    errorContainer.className = 'error-container';
                    const errorIcon = document.createElement('i');
                    errorIcon.className = 'fas fa-exclamation-triangle';
                    errorContainer.appendChild(errorIcon);
                    mediaContainer.appendChild(errorContainer);
                }
            };
            
            video.onerror = handleError;
            source.onerror = handleError;
            
            mediaContainer.appendChild(video);
            
            // Try to load video metadata
            try {
                await video.load();
            } catch (error) {
                console.error('Video load error:', error);
                handleError();
            }
        } else if (item.content_type === 'jpg' || item.content_type === 'jpeg' || item.content_type === 'png' || item.content_type === 'webp') {
            const img = document.createElement('img');
            img.className = 'content-player';
            img.alt = item.content_name;
            img.src = `/proxy/image/direct?path=${encodeURIComponent(item.content_url)}`;
            mediaContainer.appendChild(img);
            
            img.addEventListener('click', () => {
                this.showModal(img.src, item.content_name);
            });
        } else if (item.content_type === 'zip') {
            const zipContainer = document.createElement('div');
            zipContainer.className = 'zip-container';
            const zipIcon = document.createElement('i');
            zipIcon.className = 'fas fa-file-archive';
            zipContainer.appendChild(zipIcon);
            mediaContainer.appendChild(zipContainer);
        } else {
            const folderContainer = document.createElement('div');
            folderContainer.className = 'folder-container';
            const folderIcon = document.createElement('i');
            folderIcon.className = 'fas fa-folder';
            folderContainer.appendChild(folderIcon);
            mediaContainer.appendChild(folderContainer);
        }
    }

    showModal(imageSrc, caption) {
        const modal = document.getElementById('contentModal');
        const modalImg = modal.querySelector('.modal-image');
        const modalCaption = document.getElementById('modalCaption');
        const closeBtn = modal.querySelector('.close-button');
        
        // Set image source and show loading state
        modalImg.style.opacity = '0';
        modalImg.src = imageSrc;
        
        // Once image is loaded, show it with a fade
        modalImg.onload = () => {
            modalImg.style.opacity = '1';
        };
        
        // Set caption if provided
        modalCaption.textContent = caption || '';
        
        // Show modal
        modal.style.display = 'block';
        
        // Handle close events
        const closeModal = () => {
            modal.style.display = 'none';
            modalImg.src = '';
            document.removeEventListener('keydown', handleKeyPress);
        };
        
        const handleKeyPress = (e) => {
            if (e.key === 'Escape' || e.key === 'Backspace') {
                closeModal();
            }
        };
        
        // Add event listeners
        closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
        modalImg.onclick = (e) => {
            e.stopPropagation();
            closeModal();
        };
        document.addEventListener('keydown', handleKeyPress);
    }

    formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getItemType(item) {
        if (item.content_tags?.includes('Yellow') || 
            item.content_name.toLowerCase().includes('vr') ||
            item.content_name.toLowerCase().includes('180x180')) {
            return 'vr';
        }
        if (item.content_type === 'mp4' || item.content_type === 'webm') {
            return 'video';
        }
        if (item.content_type === 'zip') {
            return 'zip';
        }
        if (!item.content_type || item.content_type === '') {
            return 'folder';
        }
        return 'other';
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

    updatePaginationControls() {
        console.log('[Gallery] Updating pagination controls');
        console.log('[Gallery] Total items:', this.totalItems);
        console.log('[Gallery] Page size:', this.pageSize);
        console.log('[Gallery] Current page:', this.currentPage);
        console.log('[Gallery] Total pages:', this.totalPages);

        const paginationContainer = document.querySelector('.pagination-controls');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';
        
        if (!this.totalItems || this.totalPages <= 1) {
            console.log('[Gallery] No pagination needed');
            return;
        }

        // Create pagination buttons
        const createPageButton = (page, text, isActive = false) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.className = `pagination-button${isActive ? ' active' : ''}`;
            button.addEventListener('click', () => this.handlePageClick(page));
            return button;
        };

        // Previous button
        if (this.currentPage > 1) {
            paginationContainer.appendChild(createPageButton(this.currentPage - 1, '←'));
        }

        // First page
        if (this.currentPage > 2) {
            paginationContainer.appendChild(createPageButton(1, '1'));
            if (this.currentPage > 3) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                paginationContainer.appendChild(ellipsis);
            }
        }

        // Current page and surrounding pages
        for (let i = Math.max(1, this.currentPage - 1); i <= Math.min(this.totalPages, this.currentPage + 1); i++) {
            paginationContainer.appendChild(createPageButton(i, i.toString(), i === this.currentPage));
        }

        // Last page
        if (this.currentPage < this.totalPages - 1) {
            if (this.currentPage < this.totalPages - 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                paginationContainer.appendChild(ellipsis);
            }
            paginationContainer.appendChild(createPageButton(this.totalPages, this.totalPages.toString()));
        }

        // Next button
        if (this.currentPage < this.totalPages) {
            paginationContainer.appendChild(createPageButton(this.currentPage + 1, '→'));
        }

        console.log('[Gallery] Added', paginationContainer.children.length, 'pagination buttons');
    }

    async handlePageClick(page) {
        console.log('[Gallery] Handling page click:', page);
        if (page === this.currentPage) return;
        
        if (this.isLoading) {
            console.log('[Gallery] Data still loading, storing page change as pending operation');
            this.pendingOperation = { type: 'page', page };
            return;
        }

        this.currentPage = page;
        await this.loadContent(this.lastImageName);
    }

    sortItems(items) {
        switch (this.sortOrder) {
            case 'name-asc':
                items.sort((a, b) => a.content_name.localeCompare(b.content_name));
                break;
            case 'name-desc':
                items.sort((a, b) => b.content_name.localeCompare(a.content_name));
                break;
            case 'size-asc':
                items.sort((a, b) => a.content_size - b.content_size);
                break;
            case 'size-desc':
                items.sort((a, b) => b.content_size - a.content_size);
                break;
            case 'date-asc':
                items.sort((a, b) => new Date(a.content_created) - new Date(b.content_created));
                break;
            case 'date-desc':
                items.sort((a, b) => new Date(b.content_created) - new Date(a.content_created));
                break;
            default:
                break;
        }
    }

    handleItemClick(item) {
        // Open modal with image preview
        if (item.content_type === 'jpg' || item.content_type === 'jpeg' || item.content_type === 'png' || item.content_type === 'webp') {
            const imageSrc = `/proxy/image/direct?path=${encodeURIComponent(item.content_url)}`;
            this.showModal(imageSrc, item.content_name);
        }
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
