export class ContentGallery {
  constructor() {
    // UI Elements
    this.galleryGrid = document.querySelector('.gallery-grid');
    this.modal = document.querySelector('#contentModal');
    this.imageModal = document.getElementById('imageModal');
    this.modalImage = document.getElementById('modalImage');
    this.searchInput = document.querySelector('.gallery-search');
    this.typeFilter = document.querySelector('#type-filter');
    this.sortFilter = document.querySelector('#sort-filter');
    this.loadingSpinner = document.querySelector('.gallery-loading');

    // Pagination settings
    this.itemsPerPage = 24;
    this.currentPage = 1;

    // Data storage
    this.allItems = []; // Store all items
    this.filteredItems = []; // Store filtered items
    this.displayedItems = []; // Store current page items
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
    // Search and filter events
    this.searchInput?.addEventListener('input', () => this.filterAndRenderItems());
    this.typeFilter?.addEventListener('change', () => this.filterAndRenderItems());
    this.sortFilter?.addEventListener('change', () => this.filterAndRenderItems());
    document.querySelector('#tags-filter')?.addEventListener('change', () => this.filterAndRenderItems());

    // Add click handler for all media images
    document.addEventListener('click', (e) => {
      const img = e.target.closest('.media-image');
      if (img) {
        const { fullSrc } = img.dataset;
        const { name } = img.dataset;
        if (fullSrc && name) {
          this.openImageModal(fullSrc);
        }
      }
    });

    // Modal events
    this.modal?.querySelector('.modal__close')?.addEventListener('click', () => this.closeModal());

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    // Close modal on browser back button
    window.addEventListener('popstate', () => this.closeModal());
  }

  setLoading(isLoading) {
    if (this.loadingSpinner) {
      this.loadingSpinner.classList.toggle('active', isLoading);
    }
    if (this.galleryGrid) {
      this.galleryGrid.classList.toggle('loading', isLoading);
    }
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

    this.setLoading(true);
    this.isLoading = true;
    this.lastImageName = imageName;
    console.log('[Gallery] Loading content for:', imageName);

    let retryCount = 0;
    while (retryCount < this.maxRetries) {
      try {
        // Load all items at once (no pagination in initial load)
        const response = await fetch(
          `${this.apiEndpoint}?image_name=${encodeURIComponent(imageName)}&page_size=1000`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        this.allItems = data.items;
        this.totalItems = data.total;

        // Initial filter and render
        this.filterAndRenderItems();

        break; // Success, exit retry loop
      } catch (error) {
        console.error('Error loading content:', error);
        retryCount++;

        if (retryCount === this.maxRetries) {
          this.showError('Failed to load content after multiple attempts. Please try again later.');
        } else {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * 2 ** (retryCount - 1)));
        }
      }
    }

    this.isLoading = false;
    this.setLoading(false);
  }

  filterAndRenderItems() {
    // Start with all items
    let filtered = [...this.allItems];

    // Apply search filter
    const searchTerm = this.searchInput?.value.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter((item) => item.content_name.toLowerCase().includes(searchTerm)
                || (item.content_tags && item.content_tags.some((tag) => tag.toLowerCase().includes(searchTerm))));
    }

    // Apply type filter
    const filterValue = this.typeFilter?.value;
    if (filterValue && filterValue !== '') {
      filtered = filtered.filter((item) => {
        const type = item.content_type.toLowerCase();
        const name = item.content_name.toLowerCase();

        switch (filterValue) {
        case 'VR':
          return (type === 'mp4' || type === 'video')
                               && (name.includes('vr')
                                || name.includes('180x180')
                                || name.includes('360'));
        case 'Video':
          return (type === 'mp4' || type === 'video')
                               && !name.includes('vr')
                               && !name.includes('180x180')
                               && !name.includes('360');
        case 'Images':
          return ['jpg', 'jpeg', 'png', 'webp', 'image'].includes(type);
        case 'Archive':
          return ['zip', 'rar', '7z'].includes(type);
        case 'Folder':
          return type === 'directory' || type === 'folder';
        default:
          return true;
        }
      });
    }

    // Apply tags filter
    const tagFilter = document.querySelector('#tags-filter')?.value;
    if (tagFilter && tagFilter !== '') {
      filtered = filtered.filter((item) => {
        const tags = item.content_tags || [];
        return tags.map((tag) => tag.toLowerCase()).includes(tagFilter.toLowerCase());
      });
    }

    // Apply sort
    const sortValue = this.sortFilter?.value;
    if (sortValue) {
      filtered.sort((a, b) => {
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

    // Store filtered results
    this.filteredItems = filtered;
    this.totalItems = filtered.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

    // Reset to first page when filter changes
    this.currentPage = 1;

    // Get current page items
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedItems = this.filteredItems.slice(startIndex, endIndex);

    // Render current page
    this.renderItems(this.displayedItems);
    this.renderPagination();
  }

  renderItems(items) {
    if (!this.galleryGrid) return;

    this.galleryGrid.innerHTML = items.map((item) => this.createItemHTML(item)).join('');

    // Add click listeners to new items
    this.galleryGrid.querySelectorAll('.gallery-item').forEach((item) => {
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
    const tags = item.content_tags || [];
    const tagCircles = tags.slice(0, 8).map((tag) => `
            <div class="tag-circle" 
                 style="background-color: ${tag.toLowerCase()}" 
                 title="${tag}">
            </div>
        `).join('');

    return `
            <div class="gallery-item" data-item='${JSON.stringify(item)}'>
                <div class="media-container">
                    ${mediaContent}
                </div>
                <div class="item-metadata">
                    <h3 class="item-title">${item.content_name}</h3>
                    <div class="item-details">
                        <span class="item-size">${this.formatBytes(item.content_size)}</span>
                        <div class="item-tags">${tagCircles}</div>
                    </div>
                </div>
            </div>
        `;
  }

  getMediaContent(item) {
    const buildVideoUrl = (path) => {
      // Properly encode the path components while preserving slashes
      const encodedPath = path.split('/')
        .map((component) => encodeURIComponent(component))
        .join('/');

      return `http://192.168.86.242:8082/videos/direct?path=${encodedPath}`;
    };

    const buildThumbnailUrl = (imageName, fullPath) => {
      const path = fullPath || `/Volumes/VideosNew/Photo Sets - Red/A/${imageName}`;
      const url = `/proxy/image/direct?path=${encodeURIComponent(path)}&width=300`;
      console.log('[Gallery] Building thumbnail URL:', url);
      return url;
    };

    const buildFullSizeImageUrl = (path) => {
      const url = `/proxy/image/direct?path=${encodeURIComponent(path)}`;
      console.log('[Gallery] Building full-size URL:', url);
      return url;
    };

    switch (item.content_type.toLowerCase()) {
    case 'mp4':
    case 'video':
      const isVR = item.content_name.toLowerCase().includes('vr')
                           || item.content_name.toLowerCase().includes('180x180')
                           || item.content_name.toLowerCase().includes('360');

      if (isVR) {
        return '<div class="media-container-vr"><i class="media-icon fas fa-vr-cardboard"></i></div>';
      }

      const videoUrl = buildVideoUrl(item.content_url);
      return `
                    <video class="media-video" 
                        controls 
                        preload="metadata"
                        type="video/mp4"
                        onclick="event.stopPropagation()"
                        onerror="console.error('[Gallery] Video failed to load:', this.src); this.outerHTML = '<div class=\'media-error\'><i class=\'fas fa-exclamation-circle\'></i><div>Failed to load video</div></div>'">
                        <source src="${videoUrl}" type="video/mp4">
                        Your browser does not support HTML5 video.
                    </video>`;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'image':
      const thumbnailUrl = buildThumbnailUrl(item.content_name, item.content_url);
      const fullSizeUrl = buildFullSizeImageUrl(item.content_url);
      return `<img class="media-image" 
                    src="${thumbnailUrl}" 
                    data-full-src="${fullSizeUrl}"
                    data-name="${item.content_name}"
                    alt="${item.content_name}"
                    loading="lazy"
                    decoding="async"
                    onload="console.log('[Gallery] Thumbnail loaded:', this.src)"
                    onerror="console.error('[Gallery] Thumbnail failed:', this.src); this.outerHTML = '<div class=\'media-container-image\'><i class=\'media-icon fas fa-image\'></i><div class=\'error-message\'>Failed to load preview</div></div>'">`;
    case 'directory':
    case 'folder':
      return '<div class="media-container-folder"><i class="media-icon fas fa-folder"></i></div>';
    case 'zip':
    case 'rar':
    case '7z':
      return '<div class="media-container-archive"><i class="media-icon fas fa-file-archive"></i></div>';
    default:
      return '<div class="media-container-file"><i class="media-icon fas fa-file"></i></div>';
    }
  }

  renderPagination() {
    const paginationContainer = document.querySelector('.gallery-pagination');
    if (!paginationContainer) return;

    let paginationHTML = '';

    // Always show results summary
    if (this.filteredItems.length === 0) {
      paginationHTML = `
                <div class="pagination-summary">
                    No items found matching your search
                </div>
            `;
    } else if (this.totalPages <= 1) {
      paginationHTML = `
                <div class="pagination-summary">
                    Showing all ${this.filteredItems.length} items
                </div>
            `;
    } else {
      // Multiple pages - show full pagination
      paginationHTML = `
                <div class="pagination-summary">
                    Showing ${(this.currentPage - 1) * this.itemsPerPage + 1} - 
                    ${Math.min(this.currentPage * this.itemsPerPage, this.filteredItems.length)} 
                    of ${this.filteredItems.length} items
                </div>
            `;

      // Previous button
      paginationHTML += `
                <button class="page-button ${this.currentPage === 1 ? 'disabled' : ''}"
                        onclick="contentGallery.changePage(${this.currentPage - 1})"
                        ${this.currentPage === 1 ? 'disabled' : ''}>
                    Previous
                </button>
            `;

      // Calculate page range to show
      let startPage = Math.max(1, this.currentPage - 2);
      const endPage = Math.min(this.totalPages, startPage + 4);

      // Adjust start if we're near the end
      if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
      }

      // First page and ellipsis if needed
      if (startPage > 1) {
        paginationHTML += `
                    <button class="page-button" onclick="contentGallery.changePage(1)">1</button>
                    ${startPage > 2 ? '<span class="page-ellipsis">...</span>' : ''}
                `;
      }

      // Page numbers
      for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
                    <button class="page-button ${i === this.currentPage ? 'active' : ''}"
                            onclick="contentGallery.changePage(${i})">
                        ${i}
                    </button>
                `;
      }

      // Last page and ellipsis if needed
      if (endPage < this.totalPages) {
        paginationHTML += `
                    ${endPage < this.totalPages - 1 ? '<span class="page-ellipsis">...</span>' : ''}
                    <button class="page-button" onclick="contentGallery.changePage(${this.totalPages})">
                        ${this.totalPages}
                    </button>
                `;
      }

      // Next button
      paginationHTML += `
                <button class="page-button ${this.currentPage === this.totalPages ? 'disabled' : ''}"
                        onclick="contentGallery.changePage(${this.currentPage + 1})"
                        ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                    Next
                </button>
            `;
    }

    paginationContainer.innerHTML = paginationHTML;
  }

  changePage(newPage) {
    if (newPage < 1 || newPage > this.totalPages) return;

    this.currentPage = newPage;

    // Get items for the new page
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedItems = this.filteredItems.slice(startIndex, endIndex);

    // Render new page
    this.renderItems(this.displayedItems);
    this.renderPagination();
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
      content = '<div class="content-player">Preview not available</div>';
    }

    return `
            ${content}
            <button class="modal__close">&times;</button>
            <div class="modal__caption">${item.content_name}</div>
        `;
  }

  openImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = modal.querySelector('.modal__close');

    // Set image source and show modal
    modalImg.src = imageSrc;
    modal.classList.add('show');

    // Prevent scrolling on the background
    document.body.style.overflow = 'hidden';

    // Add to browser history so back button works
    window.history.pushState({ modal: true }, '');

    // Event handlers
    const closeModal = () => {
      modal.classList.remove('show');
      document.body.style.overflow = '';
      modalImg.src = '';

      // Clean up event listeners
      modal.removeEventListener('click', modalClickHandler, true);
      document.removeEventListener('keydown', escHandler);
      window.removeEventListener('popstate', popStateHandler);
      if (closeBtn) {
        closeBtn.removeEventListener('click', closeModal);
      }
    };

    // Click handler with proper event delegation
    const modalClickHandler = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };
    modal.addEventListener('click', modalClickHandler, true);

    // Close button handler
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', escHandler);

    // Handle back button
    const popStateHandler = () => {
      closeModal();
    };
    window.addEventListener('popstate', popStateHandler);
  }

  closeModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
      document.getElementById('modalImage').src = '';
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
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  }
}

// Initialize the gallery when the DOM is loaded
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new ContentGallery();
  });
}
