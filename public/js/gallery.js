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

        // Initialize
        this.loadImages();
        this.initControls();
        this.initLetterFilter();
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
            
            // Store the images as-is - paths are now relative
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
        if (!this.imageGrid) return;

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentPageImages = this.filteredImages.slice(startIndex, endIndex);
        const totalPages = Math.ceil(this.filteredImages.length / this.itemsPerPage);

        // Update pagination UI
        this.updatePaginationUI(totalPages);

        // Clear grid
        this.imageGrid.innerHTML = '';

        // Show no results message if needed
        if (this.filteredImages.length === 0) {
            this.imageGrid.innerHTML = '<div class="no-results">No images found</div>';
            return;
        }

        // Render images
        const fragment = document.createDocumentFragment();
        currentPageImages.forEach(imageData => {
            const card = this.createImageCard(imageData);
            if (card) fragment.appendChild(card);
        });
        this.imageGrid.appendChild(fragment);
    }

    updatePaginationUI(totalPages) {
        // Update prev/next buttons
        if (this.prevPageBtn) {
            this.prevPageBtn.disabled = this.currentPage === 1;
        }
        if (this.nextPageBtn) {
            this.nextPageBtn.disabled = this.currentPage === totalPages;
        }

        // Update page numbers
        if (this.pageNumbers) {
            this.pageNumbers.innerHTML = '';
            
            // Always show first page, last page, current page, and one page before/after current
            const pagesToShow = new Set([
                1,
                totalPages,
                this.currentPage,
                this.currentPage - 1,
                this.currentPage + 1
            ].filter(p => p >= 1 && p <= totalPages));

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

    renderTags(tags, container) {
        if (!tags || !Array.isArray(tags)) {
            console.log('No tags to render:', tags);
            return;
        }
        
        // Create a div for tags if it doesn't exist
        let tagsContainer = container.querySelector('.item__tags');
        if (!tagsContainer) {
            tagsContainer = document.createElement('div');
            tagsContainer.className = 'item__tags';
            container.appendChild(tagsContainer);
        } else {
            tagsContainer.innerHTML = '';
        }
        
        // Sort tags to ensure consistent order
        const sortedTags = [...tags].sort();
        
        sortedTags.forEach(tag => {
            const tagEl = document.createElement('div');
            // Convert tag to lowercase and remove any special characters for class name
            const normalizedTag = tag.toLowerCase().replace(/[^a-z]/g, '');
            tagEl.className = `item__tag item__tag--${normalizedTag}`;
            tagEl.title = tag;  // Show original tag name on hover
            tagsContainer.appendChild(tagEl);
        });
    }

    createImageCard(imageData) {
        console.log('Creating card for:', imageData.name, 'with path:', imageData.path);
        const template = document.getElementById('gallery-card-template');
        if (!template) {
            console.error('Gallery card template not found');
            return null;
        }

        const card = template.content.cloneNode(true);
        const container = card.querySelector('.gallery__item');
        const img = card.querySelector('.item__image');
        const name = card.querySelector('.item__name');

        // Use the video server endpoint
        img.src = `http://localhost:8082/api/images/${encodeURIComponent(imageData.name)}`;
        img.alt = imageData.name;
        name.textContent = imageData.name;

        // Add loading state
        img.classList.add('loading');
        
        // Create a loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.textContent = 'Loading...';
        container.appendChild(loadingIndicator);

        img.onload = () => {
            console.log(`Image loaded successfully: ${imageData.name}`);
            img.classList.remove('loading');
            loadingIndicator.remove();
        };
        
        img.onerror = () => {
            console.error(`Failed to load image: ${imageData.path}`);
            img.classList.remove('loading');
            img.classList.add('error');
            loadingIndicator.remove();
            
            // Add a retry button
            const retryBtn = document.createElement('button');
            retryBtn.className = 'retry-btn';
            retryBtn.textContent = 'Retry';
            retryBtn.onclick = () => {
                console.log(`Retrying image load: ${imageData.path}`);
                img.classList.remove('error');
                img.classList.add('loading');
                container.appendChild(loadingIndicator);
                // Use the video server endpoint for retry as well
                img.src = `http://localhost:8082/api/images/${encodeURIComponent(imageData.name)}?retry=${Date.now()}`;
            };
            container.appendChild(retryBtn);
            
            // Add error message
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'Failed to load image';
            container.appendChild(errorMsg);
        };

        // Render tags if they exist
        if (imageData.tags && imageData.tags.length > 0) {
            console.log(`Rendering tags for ${imageData.name}:`, imageData.tags);
            this.renderTags(imageData.tags, container);
        }

        // Add click handlers for icons
        const galleryIcon = card.querySelector('.gallery-icon');
        const folderIcon = card.querySelector('.folder-icon');

        galleryIcon?.addEventListener('click', () => {
            window.location.href = `content-gallery.html?image-name=${encodeURIComponent(imageData.name)}`;
        });

        folderIcon?.addEventListener('click', async () => {
            try {
                const response = await fetch(`/gallery/finder-search/${encodeURIComponent(imageData.name)}`);
                if (!response.ok) {
                    throw new Error('Failed to launch Finder search');
                }
            } catch (error) {
                console.error('Error launching Finder search:', error);
            }
        });

        return container;
    }
}

export default Gallery;
