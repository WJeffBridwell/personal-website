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
        if (!mediaContainer || !item) return;

        try {
            const itemType = this.getItemType(item);
            mediaContainer.innerHTML = '';

            switch (itemType) {
                case 'Images':
                case 'VR':
                    const img = document.createElement('img');
                    img.className = 'preview-image';
                    img.alt = item.content_name;
                    img.src = `/proxy/image/preview?image_name=${encodeURIComponent(item.content_url)}`;
                    mediaContainer.appendChild(img);
                    break;

                case 'Video':
                    const video = document.createElement('video');
                    video.className = 'preview-video';
                    video.controls = true;
                    video.preload = 'metadata';
                    const source = document.createElement('source');
                    source.src = `/proxy/video/stream?image_name=${encodeURIComponent(item.content_url)}`;
                    source.type = 'video/mp4';
                    video.appendChild(source);
                    mediaContainer.appendChild(video);
                    break;

                case 'Folder':
                    const folderIcon = document.createElement('i');
                    folderIcon.className = 'fas fa-folder fa-3x';
                    mediaContainer.appendChild(folderIcon);
                    break;

                case 'Archive':
                    const archiveIcon = document.createElement('i');
                    archiveIcon.className = 'fas fa-file-archive fa-3x';
                    mediaContainer.appendChild(archiveIcon);
                    break;

                default:
                    const fileIcon = document.createElement('i');
                    fileIcon.className = 'fas fa-file fa-3x';
                    mediaContainer.appendChild(fileIcon);
            }

            // Add click handler
            mediaContainer.parentElement.addEventListener('click', () => this.handleItemClick(item));

        } catch (error) {
            console.error('Error loading media preview:', error);
            mediaContainer.innerHTML = '<i class="fas fa-exclamation-circle fa-3x"></i>';
        }
    }

    handleItemClick(item) {
        if (!item) return;

        const itemType = this.getItemType(item);
        
        if (itemType === 'Images' || itemType === 'VR') {
            const imageSrc = `/proxy/image/direct?image_name=${encodeURIComponent(item.content_url)}`;
            this.showModal(imageSrc, item.content_name);
        } else if (itemType === 'Video') {
            const videoSrc = `/proxy/video/stream?image_name=${encodeURIComponent(item.content_url)}`;
            this.showModal(videoSrc, item.content_name, true);
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

        this.isLoading = true;
        this.lastImageName = imageName;
        console.log('[Gallery] Loading content for:', imageName);

        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                // Load all items at once using proxy endpoint
                const response = await fetch(`/proxy/image/content?image_name=${encodeURIComponent(imageName)}&page=1&page_size=1000`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('[Gallery] Response:', data);

                if (data.items && data.items.length > 0) {
                    // Store all items from all pages
                    this.items = data.items;
                    this.totalItems = data.total || data.items.length;
                    console.log('[Gallery] Loaded', this.items.length, 'total items');
                    
                    // Apply filters and display first page
                    await this.filterAndDisplayItems();
                    return; // Success, exit the retry loop
                } else {
                    console.error('[Gallery] No items found in response');
                    this.container.innerHTML = '<div class="error-message">No items found</div>';
                    return;
                }
            } catch (error) {
                console.error(`[Gallery] Error loading content (attempt ${retryCount + 1}/${maxRetries}):`, error);
                retryCount++;
                
                if (retryCount === maxRetries) {
                    this.container.innerHTML = `<div class="error-message">
                        Failed to load gallery content after ${maxRetries} attempts.<br>
                        Error: ${error.message}<br>
                        Please try refreshing the page.
                    </div>`;
                } else {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 5000)));
                }
            }
        }
        
        this.isLoading = false;
    }

    async filterAndDisplayItems() {
        if (!this.items || !this.items.length) {
            console.log('[Gallery] No items to filter');
            return;
        }

        console.log('[Gallery] Filtering items with:', {
            searchTerm: this.searchTerm,
            selectedType: this.selectedType,
            selectedTags: Array.from(this.selectedTags),
            sortOrder: this.sortOrder,
            currentPage: this.currentPage
        });

        // Apply filters
        let filteredItems = this.items.filter(item => {
            // Search filter
            if (this.searchTerm && !item.content_name.toLowerCase().includes(this.searchTerm)) {
                return false;
            }

            // Type filter
            if (this.selectedType && this.getItemType(item) !== this.selectedType) {
                return false;
            }

            // Tag filter
            if (this.selectedTags.size > 0) {
                const itemTags = new Set(item.content_tags || []);
                for (const tag of this.selectedTags) {
                    if (!itemTags.has(tag)) {
                        return false;
                    }
                }
            }

            return true;
        });

        // Sort items
        filteredItems.sort((a, b) => {
            switch (this.sortOrder) {
                case 'name-asc':
                    return a.content_name.localeCompare(b.content_name);
                case 'name-desc':
                    return b.content_name.localeCompare(a.content_name);
                case 'size-asc':
                    return (a.content_size || 0) - (b.content_size || 0);
                case 'size-desc':
                    return (b.content_size || 0) - (a.content_size || 0);
                case 'date-asc':
                    return (a.content_date || '').localeCompare(b.content_date || '');
                case 'date-desc':
                    return (b.content_date || '').localeCompare(a.content_date || '');
                default:
                    return 0;
            }
        });

        // Update pagination
        this.totalItems = filteredItems.length;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
        
        // Ensure current page is valid
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }

        // Get items for current page
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.totalItems);
        const pageItems = filteredItems.slice(startIndex, endIndex);

        console.log('[Gallery] Displaying page', this.currentPage, 'of', this.totalPages);
        console.log('[Gallery] Showing items', startIndex + 1, 'to', endIndex, 'of', this.totalItems);

        // Display items and update controls
        await this.displayItems(pageItems);
        this.updatePaginationControls();
    }

    async displayItems(items) {
        if (!items || !items.length) {
            console.log('[Gallery] No items to display');
            this.container.innerHTML = '<div class="error-message">No items found</div>';
            return;
        }

        this.container.innerHTML = '';
        console.log('[Gallery] Displaying', items.length, 'items');

        const fragment = document.createDocumentFragment();
        const displayPromises = [];
        
        for (const item of items) {
            const clone = this.getTemplateClone();
            if (!clone) continue;

            const galleryItem = clone.querySelector('.o-gallery__item');
            
            // Set up media preview
            const mediaContainer = clone.querySelector('.m-card__media');
            mediaContainer.dataset.itemId = item.content_url;
            
            // Set up title and metadata immediately
            const title = clone.querySelector('.a-card__title');
            title.textContent = item.content_name;
            
            const metadataRow = document.createElement('div');
            metadataRow.className = 'metadata-row';
            metadataRow.style.cssText = 'display: flex; justify-content: space-between; margin-top: 5px;';
            
            const size = document.createElement('div');
            size.className = 'a-content-size';
            size.textContent = this.formatBytes(item.content_size);
            metadataRow.appendChild(size);
            
            const tags = document.createElement('div');
            tags.className = 'a-content-tags';
            tags.style.cssText = 'display: flex; gap: 4px;';
            if (item.content_tags && item.content_tags.length > 0) {
                item.content_tags.forEach(tag => {
                    const circle = document.createElement('span');
                    circle.className = `tag-circle tag-${tag.toLowerCase()}`;
                    circle.style.cssText = `
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background-color: var(--tag-${tag.toLowerCase()}-color, #ccc);
                    `;
                    tags.appendChild(circle);
                });
            }
            metadataRow.appendChild(tags);
            
            const cardContent = clone.querySelector('.m-card__content');
            if (cardContent) {
                cardContent.appendChild(metadataRow);
            } else {
                console.error('[Gallery] Card content element not found');
            }

            fragment.appendChild(clone);
            
            // Queue media preview loading
            displayPromises.push(this.loadMediaPreview(mediaContainer, item));
        }

        // Add all items to DOM at once
        this.container.appendChild(fragment);
        
        // Load media previews in background
        Promise.all(displayPromises).catch(error => {
            console.error('[Gallery] Error loading media previews:', error);
        });
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
        await this.filterAndDisplayItems();
        
        this.updatePaginationControls();
    }

    initializeFilters() {
        // Remove any existing filter containers
        const existingContainer = document.querySelector('.filter-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-container';
        filterContainer.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
        `;

        // Search input
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.style.cssText = 'flex: 1;';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'a-search-input';
        searchInput.placeholder = 'Search by name or tag...';
        searchInput.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        `;
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.currentPage = 1; // Reset to first page on search
            this.filterAndDisplayItems();
        });
        searchContainer.appendChild(searchInput);
        filterContainer.appendChild(searchContainer);

        // Common select styles
        const selectStyle = `
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            font-size: 14px;
            min-width: 120px;
        `;

        // Type filter
        const typeFilter = document.createElement('select');
        typeFilter.className = 'type-filter';
        typeFilter.style.cssText = selectStyle;
        typeFilter.innerHTML = `
            <option value="">All Types</option>
            <option value="VR">VR</option>
            <option value="Video">Video</option>
            <option value="Images">Images</option>
            <option value="Archive">Archive</option>
            <option value="Folder">Folder</option>
            <option value="Other">Other</option>
        `;
        typeFilter.addEventListener('change', (e) => {
            this.selectedType = e.target.value;
            this.currentPage = 1; // Reset to first page on type change
            this.filterAndDisplayItems();
        });
        filterContainer.appendChild(typeFilter);

        // Sort order
        const sortSelect = document.createElement('select');
        sortSelect.className = 'sort-filter';
        sortSelect.style.cssText = selectStyle;
        sortSelect.innerHTML = `
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="size-asc">Size (Small to Large)</option>
            <option value="size-desc">Size (Large to Small)</option>
            <option value="date-asc">Date (Old to New)</option>
            <option value="date-desc">Date (New to Old)</option>
        `;
        sortSelect.addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.filterAndDisplayItems();
        });
        filterContainer.appendChild(sortSelect);

        // Tag filter
        const tagFilter = document.createElement('select');
        tagFilter.className = 'tag-filter';
        tagFilter.style.cssText = selectStyle;
        tagFilter.innerHTML = `
            <option value="">All Tags</option>
            <option value="Red">Red</option>
            <option value="Blue">Blue</option>
            <option value="Green">Green</option>
            <option value="Yellow">Yellow</option>
            <option value="Orange">Orange</option>
            <option value="Grey">Grey</option>
            <option value="Purple">Purple</option>
        `;
        tagFilter.addEventListener('change', (e) => {
            this.selectedTags.clear();
            if (e.target.value) {
                this.selectedTags.add(e.target.value);
            }
            this.currentPage = 1; // Reset to first page on tag change
            this.filterAndDisplayItems();
        });
        filterContainer.appendChild(tagFilter);

        // Add filter container to DOM before the gallery container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.insertBefore(filterContainer, this.container);
        }
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

    showModal(src, caption, isVideo = false) {
        const modal = document.getElementById('contentModal');
        const modalImg = modal.querySelector('img.content-player');
        const modalVideo = modal.querySelector('video.content-player');
        const modalCaption = document.getElementById('modalCaption');
        const closeBtn = modal.querySelector('.modal__close');

        // Reset both players
        modalImg.style.display = 'none';
        modalVideo.style.display = 'none';
        modalVideo.pause();
        modalVideo.removeAttribute('src');
        modalVideo.load();

        if (isVideo) {
            modalVideo.style.display = 'block';
            modalVideo.src = src;
        } else {
            modalImg.style.display = 'block';
            modalImg.src = src;
        }

        modalCaption.textContent = caption;
        modal.style.display = 'block';

        const closeModal = () => {
            modal.style.display = 'none';
            if (isVideo) {
                modalVideo.pause();
            }
        };

        closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeyPress);
            }
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
        // VR content
        if (item.content_tags?.includes('Yellow') || 
            item.content_name.toLowerCase().includes('vr') ||
            item.content_name.toLowerCase().includes('180x180')) {
            return 'VR';
        }

        // Check file extension
        const ext = item.content_type?.toLowerCase() || '';
        
        // Video files
        if (ext === 'mp4' || ext === 'webm' || ext === 'mov') {
            return 'Video';
        }

        // Image files
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            return 'Images';
        }

        // Archive files
        if (ext === 'zip' || ext === 'rar' || ext === '7z') {
            return 'Archive';
        }

        // Folders (no content type)
        if (!ext || ext === '') {
            return 'Folder';
        }

        // Everything else
        return 'Other';
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
        await this.filterAndDisplayItems();
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
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Remove any existing controls first
    document.querySelectorAll('.filter-container, .pagination-controls').forEach(el => el.remove());
    
    const gallery = new ContentGallery('gallery-grid');
    const urlParams = new URLSearchParams(window.location.search);
    const imageName = urlParams.get('image-name') || urlParams.get('image_name');
    
    if (imageName) {
        // Keep original format
        gallery.loadContent(imageName);
    } else {
        console.error('[Gallery] No image name provided in URL parameters');
        document.getElementById('gallery-grid').innerHTML = '<div class="error-message">No image name provided</div>';
    }
});
