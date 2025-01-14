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
            console.log('Tag selected:', selectedTag);
            this.selectedTags = selectedTag ? new Set([selectedTag]) : new Set();
            console.log('Selected tags set to:', [...this.selectedTags]);
            
            // Count images with this tag before filtering
            if (selectedTag) {
                const taggedImages = this.allImages.filter(img => 
                    img.tags && Array.isArray(img.tags) && 
                    img.tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
                );
                console.log(`Before filtering - Images with tag '${selectedTag}':`, taggedImages.length);
            }
            
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
        console.log('JEFF CLIENT - About to fetch /api/gallery/images');
        try {
            if (this.imageGrid) {
                this.imageGrid.innerHTML = '<div class="loading-progress">Loading images...</div>';
            }

            const response = await fetch('/api/gallery/images');
            console.log('JEFF CLIENT - Got response:', response.status);
            if (!response.ok) throw new Error('Failed to fetch images');
            
            const data = await response.json();
            
            // Single, clear count of red-tagged images
            const redCount = data.images.filter(img => 
                img.tags && Array.isArray(img.tags) && 
                img.tags.some(tag => tag.toLowerCase() === 'red')
            ).length;
            console.log('>>>>> TOTAL RED TAGGED IMAGES IN DATA:', redCount);
            
            // Store the images as-is
            this.allImages = data.images;
            
            // Log tag statistics
            const tagStats = {};
            let imagesWithoutTags = 0;
            let imagesWithTags = 0;
            
            this.allImages.forEach(img => {
                if (img.tags && Array.isArray(img.tags)) {
                    imagesWithTags++;
                    img.tags.forEach(tag => {
                        tagStats[tag] = (tagStats[tag] || 0) + 1;
                    });
                } else {
                    imagesWithoutTags++;
                    console.warn('Image missing tags or invalid tags format:', img.name);
                }
            });
            
            console.log('Tag statistics:', tagStats);
            console.log(`Images with tags: ${imagesWithTags}, without tags: ${imagesWithoutTags}`);
            
            // Collect all unique tags and update tag select
            this.availableTags = new Set(
                Object.keys(tagStats).sort((a, b) => tagStats[b] - tagStats[a])
            );
            
            this.updateTagSelect();
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
        console.log('Starting filterAndSortImages');
        console.log('Total images before filter:', this.allImages.length);
        console.log('Current search term:', this.searchTerm);
        console.log('Current letter filter:', this.currentLetter);
        console.log('Selected tags:', [...this.selectedTags]);

        // Filter images by search term, letter, and tags
        this.filteredImages = this.allImages.filter(image => {
            const matchesSearch = image.name.toLowerCase().includes(this.searchTerm);
            const matchesLetter = this.currentLetter === 'all' || 
                                image.name.charAt(0).toUpperCase() === this.currentLetter;
            
            // Tag filtering - normalize tag case for comparison
            let matchesTags = false;
            if (this.selectedTags.size === 0) {
                matchesTags = true;
            } else if (image.tags && Array.isArray(image.tags)) {
                matchesTags = image.tags.some(tag => {
                    const normalizedTag = tag.toLowerCase();
                    const matches = Array.from(this.selectedTags).some(selectedTag => 
                        selectedTag.toLowerCase() === normalizedTag
                    );
                    if (matches) {
                        console.log(`Image ${image.name} matches tag filter with tag: ${tag}`);
                    }
                    return matches;
                });
            }

            const matches = matchesSearch && matchesLetter && matchesTags;
            if (!matches && this.selectedTags.size > 0) {
                console.log(`Image ${image.name} filtered out:`, {
                    matchesSearch,
                    matchesLetter,
                    matchesTags,
                    imageTags: image.tags
                });
            }
            return matches;
        });

        console.log('Total images after filter:', this.filteredImages.length);

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

        // Reset to first page when filter changes
        this.currentPage = 1;
        
        // Render the first page
        this.renderCurrentPage();
    }

    renderCurrentPage() {
        console.log('renderCurrentPage - current page:', this.currentPage);
        console.log('renderCurrentPage - items per page:', this.itemsPerPage);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const currentImages = this.filteredImages.slice(start, end);
        console.log('renderCurrentPage - showing images from index', start, 'to', end);
        console.log('renderCurrentPage - total filtered images:', this.filteredImages.length);

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
        const totalPages = Math.ceil(this.filteredImages.length / this.itemsPerPage);
        const totalImages = this.filteredImages.length;
        
        console.log('updatePagination - total pages:', totalPages);
        console.log('updatePagination - total images:', totalImages);
        console.log('updatePagination - items per page:', this.itemsPerPage);

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
            
            // Add total count display
            const countDisplay = document.createElement('span');
            countDisplay.className = 'page-count';
            countDisplay.textContent = `${totalImages.toLocaleString()} images (${totalPages.toLocaleString()} pages) `;
            this.pageNumbers.appendChild(countDisplay);
            
            // Helper function to add page button
            const addPageButton = (page, text = page) => {
                const button = document.createElement('button');
                button.className = `page-number ${page === this.currentPage ? 'active' : ''}`;
                button.textContent = text;
                button.onclick = () => {
                    this.currentPage = page;
                    this.renderCurrentPage();
                };
                this.pageNumbers.appendChild(button);
            };

            // Add ellipsis
            const addEllipsis = () => {
                const span = document.createElement('span');
                span.className = 'page-ellipsis';
                span.textContent = '...';
                this.pageNumbers.appendChild(span);
            };

            // First page
            if (totalPages > 0) {
                addPageButton(1);
            }

            // Add ellipsis if there's a gap after first page
            if (this.currentPage > 4) {
                addEllipsis();
            }

            // Pages around current page
            for (let i = Math.max(2, this.currentPage - 2); i <= Math.min(totalPages - 1, this.currentPage + 2); i++) {
                addPageButton(i);
            }

            // Add ellipsis if there's a gap before last page
            if (this.currentPage < totalPages - 3) {
                addEllipsis();
            }

            // Last page
            if (totalPages > 1) {
                addPageButton(totalPages);
            }
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
        console.log('renderTags called for:', tags);
        
        if (!tags || !Array.isArray(tags)) {
            console.warn('Invalid tags:', tags);
            return;
        }
        
        // Clear existing tags
        container.innerHTML = '';
        
        // Sort tags to ensure consistent order
        const sortedTags = [...tags].sort();
        console.log('Sorted tags:', sortedTags);
        
        sortedTags.forEach(tag => {
            const tagEl = document.createElement('div');
            // Convert tag to lowercase and remove any special characters for class name
            const normalizedTag = tag.toLowerCase().replace(/[^a-z]/g, '');
            tagEl.className = `item__tag item__tag--${normalizedTag}`;
            tagEl.title = tag;  // Show original tag name on hover
            
            // Log tag element creation
            console.log('Creating tag element:', {
                originalTag: tag,
                normalizedTag: normalizedTag,
                className: tagEl.className
            });
            
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
