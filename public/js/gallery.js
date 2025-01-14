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
        this.tagSelect = document.querySelector('#tagSelect');
        this.letterFilter = document.querySelector('#letterFilter');

        // Modal elements
        this.modal = document.getElementById('imageModal');
        this.modalImg = this.modal.querySelector('.modal-img');
        this.modalCaption = this.modal.querySelector('.modal-caption');
        this.closeBtn = this.modal.querySelector('.close-modal');

        // State
        this.allImages = [];        // All images from server
        this.filteredImages = [];   // Images after search/filter
        this.currentPage = 1;
        this.itemsPerPage = 48;     // 6 rows × 8 columns
        this.searchTerm = '';
        this.sortOrder = 'name-asc';
        this.currentLetter = 'all';
        this.selectedTags = new Set();
        this.availableTags = new Set();
        this.processingStatus = {
            isProcessing: false,
            progress: 0,
            processedCount: 0
        };

        // Initialize
        this.loadImages();
        this.initControls();
        this.initLetterFilter();
        this.initModalEvents();
    }

    initControls() {
        // Search input
        this.searchInput?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.currentPage = 1; // Reset to first page
            this.filterAndSortImages();
        });

        // Sort select
        this.sortSelect?.addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.filterAndSortImages();
        });

        // Tag select
        this.tagSelect?.addEventListener('change', (e) => {
            const selectedTag = e.target.value;
            this.selectedTags = selectedTag ? new Set([selectedTag]) : new Set();
            this.currentPage = 1; // Reset to first page
            this.filterAndSortImages();
        });

        // Previous page button
        this.prevPageBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderCurrentPage();
            }
        });

        // Next page button
        this.nextPageBtn?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredImages.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderCurrentPage();
            }
        });
    }

    async loadImages() {
        try {
            if (this.imageGrid) {
                this.imageGrid.innerHTML = '<div class="loading-progress">Loading images...</div>';
            }

            console.log('Fetching images from /api/gallery/images...');
            const response = await fetch('/api/gallery/images');
            if (!response.ok) throw new Error('Failed to fetch images');
            
            const data = await response.json();
            console.log('Gallery data received:', data);
            console.log('First image example:', data.images[0]);
            
            // Store the images as-is
            this.allImages = data.images;
            
            // Collect all unique tags and update tag select
            this.availableTags = new Set(
                this.allImages.reduce((tags, img) => {
                    if (img.tags) tags.push(...img.tags);
                    return tags;
                }, [])
            );

            console.log('Available tags:', [...this.availableTags]);
            this.updateTagSelect();
            
            // Initial filter and sort
            this.filterAndSortImages();

            // Update processing status
            if (data.processing) {
                this.updateProcessingStatus(data.processing);
            }
        } catch (error) {
            console.error('Error loading images:', error);
            if (this.imageGrid) {
                this.imageGrid.innerHTML = '<div class="error-message">Failed to load images</div>';
            }
        }
    }

    updateTagSelect() {
        if (!this.tagSelect) return;

        // Clear existing options except the placeholder
        while (this.tagSelect.options.length > 1) {
            this.tagSelect.remove(1);
        }

        // Sort tags alphabetically
        const sortedTags = Array.from(this.availableTags).sort();
        
        // Add tag options with color indicators
        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            const normalizedTag = tag.toLowerCase().replace(/[^a-z]/g, '');
            option.innerHTML = `<span class="tag-color-${normalizedTag}"></span>${tag}`;
            this.tagSelect.appendChild(option);
        });

        // Update select2 if it's being used
        if (window.jQuery && window.jQuery.fn.select2) {
            $(this.tagSelect).select2({
                placeholder: 'Filter by tags...',
                allowClear: true,
                templateResult: (tag) => {
                    if (!tag.id) return tag.text;
                    const normalizedTag = tag.id.toLowerCase().replace(/[^a-z]/g, '');
                    return $(`<span><span class="tag-color-indicator tag-color-${normalizedTag}"></span>${tag.text}</span>`);
                }
            });
        }
    }

    initLetterFilter() {
        if (!this.letterFilter) return;

        // Create A-Z buttons
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const fragment = document.createDocumentFragment();

        letters.forEach(letter => {
            const button = document.createElement('button');
            button.className = 'letter-filter__btn';
            button.textContent = letter;
            button.dataset.letter = letter;
            fragment.appendChild(button);
        });

        this.letterFilter.appendChild(fragment);

        // Add click event listener
        this.letterFilter.addEventListener('click', (e) => {
            if (e.target.classList.contains('letter-filter__btn')) {
                // Remove active class from all buttons
                this.letterFilter.querySelectorAll('.letter-filter__btn').forEach(btn => {
                    btn.classList.remove('active');
                });

                // Add active class to clicked button
                e.target.classList.add('active');

                // Update filter and refresh display
                this.currentLetter = e.target.dataset.letter;
                this.currentPage = 1; // Reset to first page
                this.filterAndSortImages();
            }
        });
    }

    initModalEvents() {
        // Click on gallery item to open modal
        this.imageGrid.addEventListener('click', (e) => {
            const galleryItem = e.target.closest('.gallery__item');
            if (galleryItem) {
                const imageUrl = galleryItem.dataset.imageUrl;
                const imageName = galleryItem.dataset.imageName;
                if (imageUrl && imageName) {
                    this.openModal(imageUrl, imageName);
                }
            }
        });

        // Close modal on X button click
        this.closeBtn.addEventListener('click', () => this.closeModal());

        // Close modal on clicking outside the image
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Close modal on ESC key or browser back
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Handle browser back button
        window.addEventListener('popstate', () => {
            if (this.modal.style.display === 'flex') {
                this.closeModal();
            }
        });
    }

    openModal(imageUrl, imageName) {
        // Push state for back button support
        history.pushState({ modal: true }, '', window.location.pathname);
        
        // Show loading state
        this.modalImg.style.opacity = '0';
        this.modal.style.display = 'flex';
        
        // Load full size image
        this.modalImg.onload = () => {
            this.modalImg.style.opacity = '1';
        };
        this.modalImg.src = imageUrl;
        this.modalCaption.textContent = imageName;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.modalImg.src = '';
        document.body.style.overflow = 'auto';
        
        // Handle browser history
        if (window.location.hash !== '') {
            history.back();
        }
    }

    filterAndSortImages() {
        // Filter images by search term, letter, and tags
        this.filteredImages = this.allImages.filter(image => {
            const matchesSearch = image.name.toLowerCase().includes(this.searchTerm);
            const matchesLetter = this.currentLetter === 'all' || 
                                image.name.charAt(0).toUpperCase() === this.currentLetter;
            
            // Tag filtering - now just check if the image has the single selected tag
            const matchesTags = this.selectedTags.size === 0 || 
                              (image.tags && 
                               image.tags.some(tag => this.selectedTags.has(tag)));

            return matchesSearch && matchesLetter && matchesTags;
        });

        // Sort images
        this.filteredImages.sort((a, b) => {
            switch (this.sortOrder) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'date-asc':
                    return (new Date(a.date || 0)) - (new Date(b.date || 0));
                case 'date-desc':
                    return (new Date(b.date || 0)) - (new Date(a.date || 0));
                default:
                    return 0;
            }
        });

        // Render the first page
        this.renderCurrentPage();
    }

    renderCurrentPage() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const currentImages = this.filteredImages.slice(start, end);

        // Clear current grid
        this.imageGrid.innerHTML = '';

        // Create and append new items
        currentImages.forEach(image => {
            const card = this.createImageCard(image);
            this.imageGrid.appendChild(card);
        });

        this.updatePagination();
    }

    updatePagination() {
        // Update prev/next buttons
        if (this.prevPageBtn) {
            this.prevPageBtn.disabled = this.currentPage === 1;
        }
        if (this.nextPageBtn) {
            this.nextPageBtn.disabled = this.currentPage === Math.ceil(this.filteredImages.length / this.itemsPerPage);
        }

        // Update page numbers
        if (this.pageNumbers) {
            this.pageNumbers.innerHTML = '';
            
            // Always show first page, last page, current page, and one page before/after current
            const pagesToShow = new Set([
                1,
                Math.ceil(this.filteredImages.length / this.itemsPerPage),
                this.currentPage,
                this.currentPage - 1,
                this.currentPage + 1
            ].filter(p => p >= 1 && p <= Math.ceil(this.filteredImages.length / this.itemsPerPage)));

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
                    this.renderCurrentPage();
                };
                this.pageNumbers.appendChild(button);
            });
        }
    }

    updateProcessingStatus(status) {
        this.processingStatus = status;
        // Update UI to show processing status
        const statusElement = document.getElementById('processing-status');
        if (!statusElement) {
            const header = document.querySelector('.gallery-header');
            if (header) {
                const statusDiv = document.createElement('div');
                statusDiv.id = 'processing-status';
                statusDiv.className = 'processing-status';
                header.appendChild(statusDiv);
            }
        }

        if (status.isProcessing) {
            const statusElement = document.getElementById('processing-status');
            if (statusElement) {
                statusElement.innerHTML = `Processing images: ${Math.round(status.progress)}% (${status.processedCount} files processed)`;
                statusElement.style.display = 'block';
            }
        } else {
            const statusElement = document.getElementById('processing-status');
            if (statusElement) {
                statusElement.style.display = 'none';
            }
        }
    }

    createImageCard(imageData) {
        const card = document.createElement('div');
        card.className = 'gallery__item';
        card.dataset.imageUrl = imageData.url;
        card.dataset.imageName = imageData.name;

        // Add icon wrappers
        const galleryIconWrapper = document.createElement('div');
        galleryIconWrapper.className = 'icon-wrapper gallery-icon-wrapper';
        const galleryIcon = document.createElement('i');
        galleryIcon.className = 'fa-solid fa-image gallery-icon';
        galleryIcon.title = 'View in Gallery';
        galleryIconWrapper.appendChild(galleryIcon);
        galleryIconWrapper.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the modal
            window.open(`/content-gallery?image-name=${encodeURIComponent(imageData.name)}`, '_blank');
        });
        card.appendChild(galleryIconWrapper);

        const folderIconWrapper = document.createElement('div');
        folderIconWrapper.className = 'icon-wrapper folder-icon-wrapper';
        const folderIcon = document.createElement('i');
        folderIcon.className = 'fa-solid fa-folder folder-icon';
        folderIcon.title = 'Open in Finder';
        folderIconWrapper.appendChild(folderIcon);
        folderIconWrapper.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the modal
            fetch(`/gallery/finder-search/${encodeURIComponent(imageData.name)}`);
        });
        card.appendChild(folderIconWrapper);

        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'item__image';

        // Create image element
        const img = document.createElement('img');
        img.src = imageData.url;
        img.alt = imageData.name;
        img.loading = 'lazy';
        img.onload = () => {
            img.style.opacity = '1';
        };
        img.onerror = () => {
            console.error('Failed to load image:', imageData.name);
            img.src = '/images/error-placeholder.jpg';
            img.alt = 'Error loading image';
        };

        // Create name element
        const nameEl = document.createElement('div');
        nameEl.className = 'item__name';
        nameEl.textContent = imageData.name;

        // Add tags if they exist
        if (imageData.tags && imageData.tags.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'item__tags';
            this.renderTags(imageData.tags, tagsContainer);
            card.appendChild(tagsContainer);
        }

        // Append elements
        imageContainer.appendChild(img);
        card.appendChild(imageContainer);
        card.appendChild(nameEl);

        return card;
    }

    renderTags(tags, container) {
        if (!tags || !Array.isArray(tags)) {
            console.log('No tags to render:', tags);
            return;
        }
        
        // Clear existing tags
        container.innerHTML = '';
        
        // Sort tags to ensure consistent order
        const sortedTags = [...tags].sort();
        
        sortedTags.forEach(tag => {
            const tagEl = document.createElement('div');
            // Convert tag to lowercase and remove any special characters for class name
            const normalizedTag = tag.toLowerCase().replace(/[^a-z]/g, '');
            tagEl.className = `item__tag item__tag--${normalizedTag}`;
            tagEl.title = tag;  // Show original tag name on hover
            container.appendChild(tagEl);
        });
    }
}

const style = document.createElement('style');
style.textContent = `
    .processing-status {
        background-color: #f0f0f0;
        padding: 8px 16px;
        border-radius: 4px;
        margin: 8px 0;
        font-size: 14px;
        color: #666;
        display: none;
    }
`;
document.head.appendChild(style);

export default Gallery;
