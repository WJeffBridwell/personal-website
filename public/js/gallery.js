/**
 * @fileoverview Gallery module for managing image display and pagination
 * in a responsive grid layout.
 * @module gallery
 */

/**
 * Gallery class that handles image loading, display and pagination.
 * 
 * @class
 */
export class Gallery {
    constructor(galleryElement) {
        // DOM Elements
        this.gallery = galleryElement;
        this.imageGrid = document.querySelector('#image-grid');
        this.prevPageBtn = document.querySelector('#prevPage');
        this.nextPageBtn = document.querySelector('#nextPage');
        this.pageNumbers = document.querySelector('#pageNumbers');
        this.searchInput = document.querySelector('#searchInput');
        this.sortSelect = document.querySelector('#sortSelect');

        // State
        this.currentPage = 1;
        this.itemsPerPage = 48;  // 6 rows × 8 columns
        this.totalImages = 0;
        this.totalPages = 0;

        // Initialize
        this.loadImages();
        this.initControls();
    }

    initControls() {
        // Initialize pagination controls
        this.initPaginationControls();

        // Initialize search
        this.searchInput?.addEventListener('input', (e) => {
            this.currentPage = 1; // Reset to first page
            this.loadImages();
        });

        // Initialize sort
        this.sortSelect?.addEventListener('change', (e) => {
            this.currentPage = 1; // Reset to first page
            this.loadImages();
        });
    }

    async loadImages() {
        try {
            // Show loading state
            if (this.imageGrid) {
                this.imageGrid.innerHTML = '<div class="loading-progress">Loading images...</div>';
            }

            const response = await fetch(`/api/gallery/images?page=${this.currentPage}&limit=${this.itemsPerPage}&search=${this.searchInput?.value}&sort=${this.sortSelect?.value}`);
            if (!response.ok) throw new Error('Failed to fetch images');
            
            const data = await response.json();
            this.totalImages = data.total;
            this.totalPages = data.pages;
            
            this.renderImages(data.images);
            this.updatePaginationUI();
        } catch (error) {
            console.error('Error loading images:', error);
            if (this.imageGrid) {
                this.imageGrid.innerHTML = '<div class="error-message">Failed to load images</div>';
            }
        }
    }

    initPaginationControls() {
        // Previous page button
        this.prevPageBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadImages();
            }
        });

        // Next page button
        this.nextPageBtn?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadImages();
            }
        });
    }

    updatePaginationUI() {
        // Update prev/next buttons
        if (this.prevPageBtn) {
            this.prevPageBtn.disabled = this.currentPage === 1;
        }
        if (this.nextPageBtn) {
            this.nextPageBtn.disabled = this.currentPage === this.totalPages;
        }

        // Update page numbers
        if (this.pageNumbers) {
            this.pageNumbers.innerHTML = '';
            
            // Always show first page, last page, current page, and one page before/after current
            const pagesToShow = new Set([
                1,
                this.totalPages,
                this.currentPage,
                this.currentPage - 1,
                this.currentPage + 1
            ].filter(p => p >= 1 && p <= this.totalPages));

            const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);

            sortedPages.forEach((pageNum, index) => {
                // Add ellipsis if there's a gap
                if (index > 0 && pageNum - sortedPages[index - 1] > 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.className = 'page-ellipsis';
                    ellipsis.textContent = '...';
                    this.pageNumbers.appendChild(ellipsis);
                }

                const button = document.createElement('button');
                button.className = `page-number ${pageNum === this.currentPage ? 'active' : ''}`;
                button.textContent = pageNum;
                button.onclick = () => {
                    this.currentPage = pageNum;
                    this.loadImages();
                };
                this.pageNumbers.appendChild(button);
            });
        }
    }

    renderImages(images) {
        if (!this.imageGrid) return;

        // Clear grid
        this.imageGrid.innerHTML = '';

        // Show no results message if needed
        if (images.length === 0) {
            this.imageGrid.innerHTML = '<div class="no-results">No images found</div>';
            return;
        }

        // Render images
        const fragment = document.createDocumentFragment();
        images.forEach(imageData => {
            const card = this.createImageCard(imageData);
            if (card) fragment.appendChild(card);
        });
        this.imageGrid.appendChild(fragment);
    }

    createImageCard(imageData) {
        const template = document.getElementById('gallery-card-template');
        if (!template) return null;

        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.gallery__item');
        
        // Set up image
        const img = clone.querySelector('.item__image');
        if (img) {
            img.src = imageData.url;
            img.alt = imageData.name;
            
            // Handle image loading
            img.onload = () => {
                img.classList.add('loaded');
            };
            img.onerror = () => {
                img.classList.add('error');
                console.error('Failed to load image:', imageData.url);
            };
        }

        // Set up name
        const name = clone.querySelector('.item__name');
        if (name) {
            name.textContent = imageData.name;
        }

        // Set up icons
        const galleryIcon = clone.querySelector('.gallery-icon');
        if (galleryIcon) {
            galleryIcon.onclick = () => {
                window.location.href = `/content-gallery.html?image-name=${encodeURIComponent(imageData.name)}`;
            };
        }

        const folderIcon = clone.querySelector('.folder-icon');
        if (folderIcon) {
            folderIcon.onclick = () => {
                window.location.href = `/api/open-folder?path=${encodeURIComponent(imageData.path)}`;
            };
        }

        return card;
    }
}

export default Gallery;
