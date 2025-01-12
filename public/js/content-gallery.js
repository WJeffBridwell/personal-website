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
    }

    initializeEventListeners() {
        // Search and filter events
        this.searchInput?.addEventListener('input', () => this.filterAndRenderItems());
        this.typeFilter?.addEventListener('change', () => this.filterAndRenderItems());
        this.sortFilter?.addEventListener('change', () => this.filterAndRenderItems());

        // Modal events
        this.modal?.querySelector('.modal__close')?.addEventListener('click', () => this.closeModal());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
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
            item.addEventListener('click', () => {
                const itemData = JSON.parse(item.dataset.item);
                this.openModal(itemData);
            });
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
        switch (item.content_type.toLowerCase()) {
            case 'mp4':
            case 'video':
                // Check if it's a VR video by looking for common VR indicators in the filename
                const isVR = item.content_name.toLowerCase().includes('vr') || 
                           item.content_name.toLowerCase().includes('180x180') ||
                           item.content_name.toLowerCase().includes('360');
                
                if (isVR) {
                    return `<div class="media-container-vr"><i class="media-icon fas fa-vr-cardboard"></i></div>`;
                }
                
                return `<video class="media-video" controls 
                    src="http://192.168.86.242:8082/videos/direct?path=${encodeURIComponent(item.content_url)}" 
                    preload="metadata" 
                    onclick="event.stopPropagation()"
                    onerror="this.outerHTML = '<div class=\'media-container-vr\'><i class=\'media-icon fas fa-vr-cardboard\'></i></div>'"></video>`;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'webp':
            case 'image':
                return `<img class="media-image" src="/proxy/image/direct?path=${encodeURIComponent(item.content_url)}" alt="${item.content_name}">`;
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
