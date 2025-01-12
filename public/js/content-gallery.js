class ContentGallery {
    constructor() {
        // UI Elements
        this.galleryGrid = document.querySelector('.gallery-grid');
        this.modal = document.querySelector('.modal');
        this.searchInput = document.querySelector('.gallery-search');
        this.typeFilter = document.querySelector('#type-filter');
        this.sortFilter = document.querySelector('#sort-filter');
        
        // Pagination settings
        this.itemsPerPage = 20;
        this.currentPage = 1;
        this.items = [];
        this.totalItems = 0;
        this.totalPages = 0;
        
        // API Configuration
        this.apiEndpoint = 'http://192.168.86.242:8081/image-content';
        this.maxRetries = 3;
        this.retryDelay = 1000; // Start with 1 second delay
        
        this.initializeEventListeners();
        this.loadContent();

        // Expose instance to window for event handlers
        window.contentGallery = this;
    }

    initializeEventListeners() {
        // Add click handler for all media images
        document.addEventListener('click', (e) => {
            const img = e.target.closest('.media-image');
            if (img) {
                const fullSrc = img.dataset.fullSrc;
                const name = img.dataset.name;
                if (fullSrc && name) {
                    this.openImageModal(fullSrc, name);
                }
            }
        });

        // Search and filter events
        this.searchInput?.addEventListener('input', () => this.filterAndRenderItems());
        this.typeFilter?.addEventListener('change', () => this.filterAndRenderItems());
        this.sortFilter?.addEventListener('change', () => this.filterAndRenderItems());

        // Modal events
        this.modal?.querySelector('.modal__close')?.addEventListener('click', () => this.closeModal());
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        // Close modal on browser back button
        window.addEventListener('popstate', () => this.closeModal());
    }

    async loadContent() {
        // Check for image-name parameter
        const urlParams = new URLSearchParams(window.location.search);
        const imageName = urlParams.get('image-name');

        if (!imageName) {
            console.error('[Gallery] No image name provided');
            this.showError('No image name provided');
            return;
        }

        this.isLoading = true;
        this.lastImageName = imageName;
        console.log('[Gallery] Loading content for:', imageName);

        let retryCount = 0;
        while (retryCount < this.maxRetries) {
            try {
                const response = await fetch(
                    `${this.apiEndpoint}?image_name=${encodeURIComponent(imageName)}&page=${this.currentPage}&page_size=${this.itemsPerPage}`
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                this.items = data.items;
                this.totalItems = data.total;
                this.totalPages = data.total_pages;
                this.currentPage = data.page;
                
                this.filterAndRenderItems();

                break; // Success, exit retry loop
            } catch (error) {
                console.error('Error loading content:', error);
                retryCount++;
                
                if (retryCount === this.maxRetries) {
                    this.showError('Failed to load content after multiple attempts. Please try again later.');
                } else {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, retryCount - 1)));
                }
            }
        }

        this.isLoading = false;
    }

    filterAndRenderItems() {
        let filteredItems = [...this.items];
        
        // Apply search filter
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        if (searchTerm) {
            filteredItems = filteredItems.filter(item => 
                item.content_name.toLowerCase().includes(searchTerm) ||
                (item.content_tags && item.content_tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }

        // Apply type filter
        const filterValue = this.typeFilter?.value;
        if (filterValue && filterValue !== '') {
            filteredItems = filteredItems.filter(item => 
                item.content_type && item.content_type.toLowerCase() === filterValue.toLowerCase()
            );
        }

        // Apply sort
        const sortValue = this.sortFilter?.value;
        if (sortValue) {
            filteredItems.sort((a, b) => {
                switch (sortValue) {
                    case 'name-asc':
                        return a.content_name.localeCompare(b.content_name);
                    case 'name-desc':
                        return b.content_name.localeCompare(a.content_name);
                    case 'size-asc':
                        return a.content_size - b.content_size;
                    case 'size-desc':
                        return b.content_size - a.content_size;
                    default:
                        return 0;
                }
            });
        }

        this.renderItems(filteredItems);
        this.renderPagination();
    }

    renderItems(items) {
        if (!this.galleryGrid) return;
        
        this.galleryGrid.innerHTML = items.map(item => this.createItemHTML(item)).join('');
        
        // Add click listeners to new items
        this.galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
            const itemData = JSON.parse(item.dataset.item);
            const isImage = ['jpg', 'jpeg', 'png', 'webp', 'image'].includes(itemData.content_type.toLowerCase());
            
            if (isImage) {
                // For images, add click listener to open modal with full-size image
                const img = item.querySelector('.media-image');
                if (img) {
                    // item.addEventListener('click', () => {
                    //     this.openImageModal(img.dataset.fullSrc, itemData.content_name);
                    // });
                }
            } else {
                // For non-images, use regular modal
                item.addEventListener('click', () => {
                    this.openModal(itemData);
                });
            }
        });
    }

    createItemHTML(item) {
        const mediaContent = this.getMediaContent(item);
        const tags = item.content_tags?.join(', ') || '';
        
        return `
            <div class="gallery-item" data-item='${JSON.stringify(item)}'>
                <div class="media-container">
                    ${mediaContent}
                </div>
                <div class="item-metadata">
                    <h3 class="item-title">${item.content_name}</h3>
                    <div class="item-details">
                        <span class="item-size">${this.formatBytes(item.content_size)}</span>
                        <div class="item-tags">${tags}</div>
                    </div>
                </div>
            </div>
        `;
    }

    getMediaContent(item) {
        const buildVideoUrl = (path) => {
            // Replace /Volumes/VideosNew with the correct base path but preserve all other path components
            const adjusted = path.replace('/Volumes/VideosNew/', '/Users/jeffbridwell/VideosAa-Abella/');
            
            // Properly encode the entire path while preserving slashes and special characters
            const encodedPath = adjusted.split('/')
                .map(component => encodeURIComponent(component))
                .join('/');
            
            return `http://192.168.86.242:8082/videos/direct?path=${encodedPath}`;
        };

        const buildImageUrl = (imageName) => {
            // Remove any file extension from the image name
            const baseName = imageName.replace(/\.[^/.]+$/, "");
            const cachePath = `/Users/jeffbridwell/CascadeProjects/personal-website/cache/${baseName}.webp`;
            return `http://192.168.86.242:8082/videos/direct?path=${encodeURIComponent(cachePath)}`;
        };

        switch (item.content_type.toLowerCase()) {
            case 'mp4':
            case 'video':
                const isVR = item.content_name.toLowerCase().includes('vr') || 
                           item.content_name.toLowerCase().includes('180x180') ||
                           item.content_name.toLowerCase().includes('360');
                
                if (isVR) {
                    return `<div class="media-container-vr"><i class="media-icon fas fa-vr-cardboard"></i></div>`;
                }
                
                const videoUrl = buildVideoUrl(item.content_url);
                return `<video class="media-video" controls 
                    src="${videoUrl}" 
                    preload="metadata" 
                    onclick="event.stopPropagation()"
                    onerror="this.outerHTML = '<div class=\'media-container-vr\'><i class=\'media-icon fas fa-vr-cardboard\'></i></div>'"></video>`;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'webp':
            case 'image':
                const imageUrl = buildImageUrl(item.content_name);
                return `<img class="media-image" 
                    src="${imageUrl}" 
                    data-full-src="${imageUrl}"
                    data-name="${item.content_name}"
                    alt="${item.content_name}"
                    loading="lazy"
                    onerror="this.outerHTML = '<div class=\'media-container-image\'><i class=\'media-icon fas fa-image\'></i></div>'">`; 
            case 'directory':
            case 'folder':
                return `<div class="media-container-folder"><i class="media-icon fas fa-folder"></i></div>`;
            case 'zip':
            case 'rar':
            case '7z':
                return `<div class="media-container-archive"><i class="media-icon fas fa-file-archive"></i></div>`;
            default:
                return `<div class="media-container-file"><i class="media-icon fas fa-file"></i></div>`;
        }
    }

    renderPagination() {
        const paginationContainer = document.querySelector('.gallery-pagination');
        if (!paginationContainer || this.totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button class="page-button ${this.currentPage === 1 ? 'disabled' : ''}"
                    onclick="gallery.changePage(${this.currentPage - 1})"
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                Previous
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            paginationHTML += `
                <button class="page-button ${i === this.currentPage ? 'active' : ''}"
                        onclick="gallery.changePage(${i})">
                    ${i}
                </button>
            `;
        }

        // Next button
        paginationHTML += `
            <button class="page-button ${this.currentPage === this.totalPages ? 'disabled' : ''}"
                    onclick="gallery.changePage(${this.currentPage + 1})"
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                Next
            </button>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    async changePage(newPage) {
        if (newPage < 1 || newPage > this.totalPages) return;
        this.currentPage = newPage;
        await this.loadContent();
    }

    openModal(item) {
        if (!this.modal) return;
        
        const modalContent = this.modal.querySelector('.modal__content');
        if (modalContent) {
            modalContent.innerHTML = this.getModalContent(item);
        }
        
        this.modal.style.display = 'block';
    }

    getModalContent(item) {
        let content = '';
        
        switch (item.content_type.toLowerCase()) {
            case 'mp4':
            case 'video':
                content = `<video class="content-player" controls src="http://192.168.86.242:8082/videos/direct?path=${encodeURIComponent(item.content_url)}"></video>`;
                break;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'webp':
            case 'image':
                content = `<img class="content-player" src="/proxy/image/direct?path=${encodeURIComponent(item.content_url)}" alt="${item.content_name}">`;
                break;
            default:
                content = `<div class="content-player">Preview not available</div>`;
        }

        return `
            ${content}
            <button class="modal__close">&times;</button>
            <div class="modal__caption">${item.content_name}</div>
        `;
    }

    openImageModal(imageSrc, caption) {
        if (!this.modal) {
            console.error('Modal element not found');
            return;
        }
        
        console.log('Opening modal with image:', imageSrc);
        
        const modalContent = this.modal.querySelector('.modal__content');
        if (!modalContent) {
            console.error('Modal content element not found');
            return;
        }

        // Create wrapper div for image
        const imageWrapper = document.createElement('div');
        imageWrapper.style.position = 'relative';
        imageWrapper.style.zIndex = '1002';
        
        // Create and configure the image element
        const img = document.createElement('img');
        img.className = 'modal-image';
        img.src = imageSrc;
        img.alt = caption;
        img.style.zIndex = '1002';
        
        // Log image dimensions when loaded
        img.onload = () => {
            console.log('Modal image loaded successfully');
            console.log('Image natural dimensions:', img.naturalWidth, 'x', img.naturalHeight);
            console.log('Image display dimensions:', img.offsetWidth, 'x', img.offsetHeight);
            console.log('Image computed style:', window.getComputedStyle(img).width, window.getComputedStyle(img).height);
            console.log('Image z-index:', window.getComputedStyle(img).zIndex);
        };
        
        img.onerror = (e) => {
            console.error('Failed to load modal image:', imageSrc, e);
            imageWrapper.innerHTML = '<div class="media-container-image"><i class="media-icon fas fa-image"></i></div>';
        };
        
        // Add image to wrapper
        imageWrapper.appendChild(img);
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal__close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.closeModal();
        
        // Create caption
        const captionDiv = document.createElement('div');
        captionDiv.className = 'modal__caption';
        captionDiv.textContent = caption;
        
        // Clear previous content and add new elements
        modalContent.innerHTML = '';
        modalContent.appendChild(imageWrapper);
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(captionDiv);
        
        // Show modal
        this.modal.style.display = 'block';
        
        // Add click handler to close modal when clicking outside the image
        this.modal.onclick = (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        };

        // Log modal and content dimensions
        console.log('Modal dimensions:', this.modal.offsetWidth, 'x', this.modal.offsetHeight);
        console.log('Modal content dimensions:', modalContent.offsetWidth, 'x', modalContent.offsetHeight);
    }

    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            const player = this.modal.querySelector('video');
            if (player) player.pause();
        }
    }

    showError(message) {
        if (this.galleryGrid) {
            this.galleryGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the gallery when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new ContentGallery();
});
