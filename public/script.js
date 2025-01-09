/**
 * Personal Website Frontend JavaScript
 * 
 * This module handles all client-side functionality including:
 * - Image gallery management and display
 * - Modal interactions and image viewing
 * - Search functionality
 * - Finder integration
 * - Error handling and loading states
 * 
 * Components:
 * - ImageGallery: Manages the display and interaction of image grid
 * - Modal: Handles the image modal display and interactions
 * - Search: Manages search functionality and Finder integration
 */

console.log('=== Script Starting ===');
console.log('Document readyState:', document.readyState);
console.log('Full HTML:', document.documentElement.outerHTML);

console.log('Script file loaded and starting execution');

// Initialize gallery functionality
async function initializeGallery() {
    console.log('\n=== Initializing Gallery ===');
    
    // Check for required elements
    const gallerySection = document.querySelector('.gallery');
    const imageGrid = document.getElementById('image-grid');
    
    console.log('Gallery elements check:', {
        gallerySection: !!gallerySection,
        imageGrid: !!imageGrid
    });
    
    if (!gallerySection || !imageGrid) {
        console.error('Required gallery elements not found');
        return;
    }
    
    // Initialize gallery state
    if (typeof window._galleryState === 'undefined') {
        window._galleryState = {
            currentPage: 1,
            totalPages: 0,
            isLoading: false,
            images: [],
            initialized: false,
            batchSize: 80,
            loadedImages: new Set()
        };
        
        console.log('Gallery state initialized:', window._galleryState);
    }
    
    // Load initial images
    await loadInitialImages();
    
    console.log('\n=== Gallery Initialization Complete ===');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGallery);
} else {
    initializeGallery();
}

// Also try on window load in case DOMContentLoaded was missed
window.addEventListener('load', () => {
    console.log('\n=== Window Loaded ===');
    if (!window._galleryInitialized) {
        console.log('Gallery not initialized yet, initializing now');
        initializeGallery();
    }
});

/**
 * Initializes the modal component with all necessary elements and event listeners
 * Handles cleanup of existing modals and sets up error boundaries
 */
function initializeModal() {
    try {
        // Clean up existing modal if present
        const existingModal = document.getElementById('imageModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create and configure modal elements
        window._galleryState.modal = document.createElement('div');
        window._galleryState.modal.id = 'imageModal';
        window._galleryState.modal.className = 'modal';
        window._galleryState.modal.style.display = 'none';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Configure close button
        window._galleryState.closeBtn = document.createElement('span');
        window._galleryState.closeBtn.className = 'modal-close';
        window._galleryState.closeBtn.innerHTML = '&times;';
        
        // Configure modal image with loading and error states
        window._galleryState.modalImg = document.createElement('img');
        window._galleryState.modalImg.className = 'modal-img';
        window._galleryState.modalImg.style.cursor = 'pointer';
        
        window._galleryState.modalImg.addEventListener('load', () => {
            window._galleryState.modalImg.style.opacity = '1';
        });
        
        window._galleryState.modalImg.addEventListener('error', (e) => {
            console.error('Failed to load image:', e);
            window._galleryState.modalCaption.textContent = 'Error loading image';
            window._galleryState.modalImg.style.display = 'none';
        });
        
        // Add click-to-close functionality
        window._galleryState.modalImg.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
        
        // Configure caption
        window._galleryState.modalCaption = document.createElement('div');
        window._galleryState.modalCaption.className = 'modal-caption';
        
        // Assemble modal structure
        modalContent.appendChild(window._galleryState.closeBtn);
        modalContent.appendChild(window._galleryState.modalImg);
        modalContent.appendChild(window._galleryState.modalCaption);
        window._galleryState.modal.appendChild(modalContent);
        document.body.appendChild(window._galleryState.modal);
        
        // Set up event listeners
        setupModalEventListeners();
        
    } catch (error) {
        console.error('Error initializing modal:', error);
    }
}

/**
 * Sets up all event listeners for the modal
 * Includes click, keyboard, and history state handling
 */
function setupModalEventListeners() {
    // Close on background click
    window._galleryState.modal.addEventListener('click', (e) => {
        if (e.target === window._galleryState.modal) {
            e.preventDefault();
            closeModal();
        }
    });
    
    // Close on button click
    window._galleryState.closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
    });
    
    // Handle browser back button
    window.addEventListener('popstate', () => {
        if (window._galleryState.modal.style.display === 'block') {
            closeModal();
        }
    });
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

/**
 * Opens the modal with the specified image and caption
 * @param {string} imageSrc - URL of the image to display
 * @param {string} caption - Caption text for the image
 */
function openModal(imageSrc, caption) {
    try {
        if (!window._galleryState.modal) {
            console.error('Modal not initialized');
            initializeModal();
        }
        
        if (!imageSrc) {
            console.error('No image source provided');
            return;
        }
        
        window._galleryState.modalImg.style.opacity = '0';
        window._galleryState.modalImg.style.display = 'block';
        window._galleryState.modalImg.src = imageSrc;
        window._galleryState.modalCaption.textContent = caption || '';
        window._galleryState.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Add history state for back button support
        history.pushState({ modal: true }, '');
        
    } catch (error) {
        console.error('Error opening modal:', error);
    }
}

/**
 * Closes the modal and cleans up its state
 */
function closeModal() {
    try {
        if (!window._galleryState.modal) return;
        
        window._galleryState.modal.style.display = 'none';
        window._galleryState.modalImg.src = '';
        window._galleryState.modalImg.style.opacity = '0';
        window._galleryState.modalCaption.textContent = '';
        document.body.style.overflow = '';
        
    } catch (error) {
        console.error('Error closing modal:', error);
    }
}

// Create image container with overlays
function createImageContainer(image) {
    const container = document.createElement('div');
    container.className = 'image-container';
    
    // Create image element
    const img = document.createElement('img');
    img.src = `/gallery/image/${encodeURIComponent(image)}?thumbnail=true`;
    img.alt = image;
    img.loading = 'lazy';
    img.addEventListener('click', (e) => {
        e.stopPropagation();
        const fullImageUrl = `/gallery/image/${encodeURIComponent(image)}`;
        openModal(fullImageUrl, image);
    });
    container.appendChild(img);
    
    // Add icons container
    const icons = document.createElement('div');
    icons.className = 'image-icons';
    
    // Add image icon
    const imageIcon = document.createElement('i');
    imageIcon.className = 'fas fa-image';
    imageIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `/content-gallery.html?image-name=${encodeURIComponent(image)}`;
    });
    icons.appendChild(imageIcon);
    
    // Add folder icon
    const folderIcon = document.createElement('i');
    folderIcon.className = 'fas fa-folder';
    folderIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        searchImageInFinder(image);
    });
    icons.appendChild(folderIcon);
    
    container.appendChild(icons);
    
    // Add tags container
    const tags = document.createElement('div');
    tags.className = 'image-tags';
    // Add sample tag dots - replace with actual tags
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'tag-dot';
        tags.appendChild(dot);
    }
    container.appendChild(tags);
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    
    // Add image name
    const nameLabel = document.createElement('div');
    nameLabel.className = 'image-name';
    nameLabel.textContent = image;
    overlay.appendChild(nameLabel);
    
    container.appendChild(overlay);
    
    return container;
}

// Display images in the grid
async function displayImages(images, append = false) {
    console.log('Displaying images:', images.length);
    
    const grid = document.getElementById('image-grid');
    if (!grid) {
        console.error('Image grid not found');
        return;
    }
    
    // Clear grid if not appending
    if (!append) {
        grid.innerHTML = '';
    }
    
    // Create and append image containers
    for (const image of images) {
        const container = createImageContainer(image);
        grid.appendChild(container);
    }
}

/**
 * Fetches images from the server
 * @param {string} cursor - Cursor for pagination
 * @param {number} limit - Number of images to fetch
 * @returns {Promise<Object>} Object containing images and next cursor
 */
async function fetchImages(page = 1, limit = 100, letter = null) {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
    });
    
    if (letter) {
        params.append('letter', letter);
    }
    
    const response = await fetch(`/gallery/images?${params}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

/**
 * Searches for an image in the macOS Finder
 * @param {string} imageName - Name of the image to search for
 */
async function searchImageInFinder(imageName) {
    try {
        const response = await fetch(`/gallery/finder-search?term=${encodeURIComponent(imageName)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Search result:', result);
    } catch (error) {
        console.error('Error searching for image:', error);
    }
}

// Update image loading
async function loadImages(page = 1, batchSize = 80) {
    try {
        const response = await fetch(`/gallery/initial?page=${page}&batchSize=${batchSize}`);
        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }
        const data = await response.json();
        return {
            files: data.files,
            total: data.total,
            page: data.page,
            totalPages: data.totalPages,
            hasMore: data.hasMore
        };
    } catch (error) {
        console.error('Error loading images:', error);
        throw error;
    }
}

// Update image rendering
function renderImage(image) {
    const img = document.createElement('img');
    img.src = `/gallery/image/${encodeURIComponent(image)}?thumbnail=true`;
    img.alt = image;
    img.loading = 'lazy';
    return img;
}

/**
 * Initializes the sort buttons component with all necessary elements and event listeners
 * Handles cleanup of existing buttons and sets up error boundaries
 */
function initializeSortButtons() {
    const sortButtons = document.querySelectorAll('.sort-btn');
    if (!sortButtons.length) return;

    // Function to sort images
    function sortImages(direction) {
        const grid = document.getElementById('image-grid');
        const containers = Array.from(grid.getElementsByClassName('image-container'));
        
        containers.sort((a, b) => {
            const nameA = a.querySelector('img').alt.toLowerCase();
            const nameB = b.querySelector('img').alt.toLowerCase();
            return direction === 'asc' 
                ? nameA.localeCompare(nameB) 
                : nameB.localeCompare(nameA);
        });
        
        // Remove existing containers
        containers.forEach(container => container.remove());
        
        // Add sorted containers back
        containers.forEach(container => grid.appendChild(container));
        
        // Update active state of sort buttons
        sortButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === direction);
        });
    }

    // Add click handlers
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            const direction = button.dataset.sort;
            sortImages(direction);
        });
    });
}

/**
 * Initializes the letter filter component with all necessary elements and event listeners
 * Handles cleanup of existing filters and sets up error boundaries
 */
async function initializeLetterFilter() {
    console.log('Initializing letter filter...');
    const letterButtons = document.querySelector('.letter-buttons');
    if (!letterButtons) return;
    
    try {
        // Fetch all available letters
        const response = await fetch('/gallery/letters');
        const data = await response.json();
        
        if (!data.letters || !Array.isArray(data.letters)) {
            console.error('Invalid letters data:', data);
            return;
        }
        
        // Clear existing buttons
        letterButtons.innerHTML = '';
        
        // Create "All" button
        const allButton = document.createElement('button');
        allButton.className = 'letter-btn active';
        allButton.textContent = 'All';
        allButton.addEventListener('click', () => filterByLetter(null));
        letterButtons.appendChild(allButton);
        
        // Create letter buttons
        data.letters.forEach(letter => {
            const button = document.createElement('button');
            button.className = 'letter-btn';
            button.textContent = letter;
            button.addEventListener('click', () => filterByLetter(letter));
            letterButtons.appendChild(button);
        });
        
        // Update total count
        const totalCountElement = document.querySelector('.total-count');
        if (totalCountElement) {
            totalCountElement.textContent = `0 / ${data.total} images`;
        }
        
    } catch (error) {
        console.error('Error initializing letter filter:', error);
    }
}

// Filter images by letter
async function filterByLetter(letter) {
    console.log('Filtering by letter:', letter);
    
    // Update active button
    const buttons = document.querySelectorAll('.letter-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', 
            letter === null ? btn.textContent === 'All' : btn.textContent === letter
        );
    });
    
    // Reset gallery state
    window._galleryState.currentPage = 1;
    window._galleryState.hasMore = true;
    window._galleryState.loadedImages.clear();
    
    try {
        // Fetch filtered images
        const response = await loadImages(1, window._galleryState.batchSize);
        
        if (response && response.files.length > 0) {
            await displayImages(response.files);
            
            // Update total count
            const totalCountElement = document.querySelector('.total-count');
            if (totalCountElement) {
                totalCountElement.textContent = `${response.files.length} / ${response.totalPages} images`;
            }
            
            // Reset pagination controls
            updatePagination(response.page, response.totalPages);
        }
    } catch (error) {
        console.error('Error filtering images:', error);
    }
}

// Background loading function
async function loadInBackground() {
    if (!window._galleryState.backgroundLoading || 
        !window._galleryState.hasMore || 
        window._galleryState.isLoading ||
        window._galleryState.activeLoads >= window._galleryState.maxConcurrentLoads) {
        return;
    }

    try {
        window._galleryState.activeLoads++;
        const nextPage = window._galleryState.currentPage + 1;
        console.log('Background loading page:', nextPage);
        
        const response = await loadImages(nextPage, window._galleryState.batchSize);
        
        if (response && response.files.length > 0) {
            window._galleryState.currentPage = response.page;
            window._galleryState.hasMore = response.hasMore;
            
            // Pre-load images in memory
            const imagePromises = response.files.map(image => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = `/gallery/thumbnail/${encodeURIComponent(image)}`;
                });
            });
            
            // Wait for images to load in memory
            await Promise.all(imagePromises);
            
            // Add to DOM if we're still in background loading mode
            if (window._galleryState.backgroundLoading) {
                await displayImages(response.files, true);
                
                // Update total count
                const totalCountElement = document.querySelector('.total-count');
                if (totalCountElement) {
                    totalCountElement.textContent = `${window._galleryState.loadedImages.size} / ${response.totalPages} images`;
                }
            }
            
            // Schedule next background load
            if (window._galleryState.hasMore) {
                setTimeout(loadInBackground, 500); // Throttle to avoid overwhelming browser
            }
        }
    } catch (error) {
        console.error('Background loading error:', error);
    } finally {
        window._galleryState.activeLoads--;
    }
}

// Start background loading
function startBackgroundLoading() {
    if (window._galleryState.backgroundTimer) {
        clearTimeout(window._galleryState.backgroundTimer);
    }
    
    window._galleryState.backgroundLoading = true;
    window._galleryState.backgroundTimer = setTimeout(loadInBackground, 1000);
}

// Stop background loading
function stopBackgroundLoading() {
    window._galleryState.backgroundLoading = false;
    if (window._galleryState.backgroundTimer) {
        clearTimeout(window._galleryState.backgroundTimer);
        window._galleryState.backgroundTimer = null;
    }
}

// Show loading skeleton
function showLoadingSkeleton(count = 8) {
    const grid = document.getElementById('image-grid');
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'image-container skeleton';
        skeleton.innerHTML = '<div class="skeleton-img"></div><div class="skeleton-text"></div>';
        grid.appendChild(skeleton);
    }
}

// Remove loading skeletons
function removeLoadingSkeletons() {
    const skeletons = document.querySelectorAll('.skeleton');
    skeletons.forEach(skeleton => skeleton.remove());
}

/**
 * Initializes the tag filter component with all necessary elements and event listeners
 * Handles cleanup of existing filters and sets up error boundaries
 */
async function initializeTagFilter() {
    try {
        console.log('Initializing tag filter...');
        // Wait for jQuery and Select2 to be loaded
        if (typeof $ === 'undefined' || typeof $.fn.select2 === 'undefined') {
            console.error('jQuery or Select2 not loaded');
            return;
        }

        // Fetch available tags
        const response = await fetch('/gallery/tags');
        const data = await response.json();
        
        if (!data.tags || !Array.isArray(data.tags)) {
            console.error('Invalid tags data:', data);
            return;
        }
        
        const tagFilter = $('#tag-filter');
        if (tagFilter.length === 0) {
            console.error('#tag-filter element not found');
            return;
        }
        
        // Clear existing options
        tagFilter.empty();
        
        // Add options
        data.tags.forEach(tag => {
            const option = new Option(tag, tag);
            const color = getTagColor(tag);
            $(option).attr('data-color', color);
            tagFilter.append(option);
        });
        
        console.log('Initializing Select2...');
        // Initialize Select2
        tagFilter.select2({
            placeholder: 'Filter by tags...',
            allowClear: true,
            templateSelection: formatTagSelection,
            templateResult: formatTagOption,
            width: '200px'
        });
        
        // Handle tag selection
        tagFilter.on('change', function() {
            const selectedTags = $(this).val() || [];
            console.log('Selected tags:', selectedTags);
            filterImagesByTags(selectedTags);
        });
        
        console.log('Tag filter initialized successfully');
    } catch (error) {
        console.error('Error initializing tag filter:', error);
    }
}

// Format tag options in dropdown
function formatTagOption(tag) {
    if (!tag.id) return tag.text;
    
    const color = $(tag.element).data('color');
    return $(`<span style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; border: 1px solid rgba(0,0,0,0.1);"></span>
        <span>${tag.text}</span>
    </span>`);
}

// Format selected tags
function formatTagSelection(tag) {
    if (!tag.id) return tag.text;
    
    const color = $(tag.element).data('color');
    return $(`<span style="display: flex; align-items: center; gap: 4px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; border: 1px solid rgba(0,0,0,0.1);"></span>
        <span>${tag.text}</span>
    </span>`);
}

// Filter images by selected tags
function filterImagesByTags(selectedTags) {
    const containers = document.querySelectorAll('.image-container');
    
    containers.forEach(container => {
        const dots = container.querySelector('.tag-dots');
        const tags = dots ? Array.from(dots.children).map(dot => dot.title) : [];
        
        if (selectedTags.length === 0 || selectedTags.every(tag => tags.includes(tag))) {
            container.style.display = '';
        } else {
            container.style.display = 'none';
        }
    });
}

/**
 * Initializes the search filter component with all necessary elements and event listeners
 * Handles cleanup of existing filters and sets up error boundaries
 */
function initializeSearchFilter() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    const allButton = document.querySelector('.letter-btn[data-letter="all"]');
    
    // Debounce function to limit how often the filter runs
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Function to filter images based on search input
    const filterImages = debounce((searchTerm) => {
        const imageContainers = document.querySelectorAll('.image-container');
        const normalizedSearch = searchTerm.toLowerCase().trim();
        
        imageContainers.forEach(container => {
            const nameLabel = container.querySelector('.image-name');
            if (!nameLabel) return;
            
            const imageName = nameLabel.textContent.toLowerCase();
            // Only match if the image name starts with the search term
            const isMatch = normalizedSearch === '' || imageName.indexOf(normalizedSearch) === 0;
            
            // Only toggle hidden class if container doesn't have collection-based visibility
            if (!container.hasAttribute('data-in-collection')) {
                container.classList.toggle('hidden', !isMatch);
            }
        });
        
        // Reset letter filter if search is active
        if (normalizedSearch) {
            document.querySelectorAll('.letter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            if (allButton) {
                allButton.classList.add('active');
            }
        }
    }, 200); // 200ms debounce delay

    // Add input event listener
    searchInput.addEventListener('input', (e) => {
        filterImages(e.target.value);
    });

    // Add clear search functionality
    const clearSearch = () => {
        searchInput.value = '';
        filterImages('');
    };

    // Clear search when clicking 'All' in letter filter
    if (allButton) {
        allButton.addEventListener('click', clearSearch);
    }
}

// Create pagination controls
function createPaginationControls(currentPage, totalPages) {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-controls';
    paginationContainer.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin: 20px 0;
        padding: 10px;
    `;

    // Helper function to create page button
    function createPageButton(page, text, isActive = false, isDisabled = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `page-button ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
        button.style.cssText = `
            padding: 8px 12px;
            border: 1px solid #ddd;
            background: ${isActive ? '#007bff' : 'white'};
            color: ${isActive ? 'white' : isDisabled ? '#999' : '#333'};
            cursor: ${isDisabled ? 'default' : 'pointer'};
            border-radius: 4px;
        `;
        
        if (!isDisabled) {
            button.addEventListener('click', async () => {
                const data = await loadImages(page, window._galleryState.batchSize);
                if (data && data.files.length > 0) {
                    window._galleryState.currentPage = page;
                    window._galleryState.images = data.files;
                    await displayImages(data.files);
                    updatePagination(page, data.totalPages);
                }
            });
        }
        
        return button;
    }

    // Previous button
    paginationContainer.appendChild(
        createPageButton(currentPage - 1, '←', false, currentPage === 1)
    );

    // First page
    paginationContainer.appendChild(createPageButton(1, '1', currentPage === 1));

    // Ellipsis and pages
    if (totalPages > 1) {
        if (currentPage > 3) {
            paginationContainer.appendChild(document.createTextNode('...'));
        }

        // Current page and surrounding pages
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            if (i === currentPage) {
                paginationContainer.appendChild(createPageButton(i, i.toString(), true));
            } else {
                paginationContainer.appendChild(createPageButton(i, i.toString()));
            }
        }

        if (currentPage < totalPages - 2) {
            paginationContainer.appendChild(document.createTextNode('...'));
        }

        // Last page
        if (totalPages > 1) {
            paginationContainer.appendChild(
                createPageButton(totalPages, totalPages.toString(), currentPage === totalPages)
            );
        }
    }

    // Next button
    paginationContainer.appendChild(
        createPageButton(currentPage + 1, '→', false, currentPage === totalPages)
    );

    return paginationContainer;
}

// Update pagination controls
function updatePagination(currentPage, totalPages) {
    const oldPagination = document.querySelector('.pagination-controls');
    if (oldPagination) {
        oldPagination.remove();
    }

    const grid = document.getElementById('image-grid');
    if (grid) {
        const newPagination = createPaginationControls(currentPage, totalPages);
        grid.parentNode.insertBefore(newPagination, grid.nextSibling);
    }
}

// Filter functions
if (typeof window._filterFunctions === 'undefined') {
    window._filterFunctions = {
        filterImagesByLetter: function(letter) {
            const imageContainers = document.querySelectorAll('.image-container');
            imageContainers.forEach(container => {
                const nameLabel = container.querySelector('.image-name');
                if (!nameLabel) return;
                
                const imageName = nameLabel.textContent;
                const isVisible = !letter || imageName.toLowerCase().startsWith(letter.toLowerCase());
                container.classList.toggle('hidden', !isVisible);
            });
        },
        initializeLetterFilter,
        filterImagesBySearch: function(searchTerm) {
            const imageContainers = document.querySelectorAll('.image-container');
            const searchLower = searchTerm.toLowerCase().trim();
            
            imageContainers.forEach(container => {
                const nameLabel = container.querySelector('.image-name');
                if (!nameLabel) return;
                
                const imageName = nameLabel.textContent;
                // Show images where the name contains the search term anywhere
                const isVisible = searchLower === '' || imageName.toLowerCase().includes(searchLower);
                container.classList.toggle('hidden', !isVisible);
            });
        },
        initializeSearchFilter,
        fetchImages,
        displayImages,
        createImageContainer,
        initializeModal,
        openModal,
        closeModal
    };
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeGallery,
        initializeModal,
        openModal,
        closeModal,
        displayImages,
        createImageContainer,
        fetchImages,
        searchImageInFinder,
        initializeSortButtons,
        initializeLetterFilter,
        filterImagesByLetter,
        initializeSearchFilter,
        setupModalEventListeners
    };
} else if (typeof window !== 'undefined') {
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            // const images = await fetchImages();
            // await displayImages(images);
        } catch (error) {
            console.error('Failed to initialize gallery:', error);
            const grid = document.getElementById('image-grid');
            if (grid) {
                grid.innerHTML = `<div class="error-message">Failed to load images: ${error.message}</div>`;
            }
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeGallery();
        initializeTagFilter();
    });
} else {
    initializeGallery();
    initializeTagFilter();
}

// Load initial images
async function loadInitialImages() {
    console.log('\n=== Loading Initial Images ===');
    
    if (window._galleryState.isLoading) {
        console.log('Already loading images, skipping');
        return;
    }
    
    try {
        window._galleryState.isLoading = true;
        showLoadingSkeleton();
        
        // Get or create gallery header
        let header = document.querySelector('.gallery__header');
        if (!header) {
            const gallery = document.querySelector('.gallery');
            header = document.createElement('div');
            header.className = 'gallery__header';
            
            const title = document.createElement('h2');
            title.className = 'gallery__title';
            title.textContent = 'My Collections';
            header.appendChild(title);
            
            if (gallery.firstChild) {
                gallery.insertBefore(header, gallery.firstChild);
            } else {
                gallery.appendChild(header);
            }
        }
        
        // Add or update total count display
        let totalCount = header.querySelector('.total-count');
        if (!totalCount) {
            totalCount = document.createElement('div');
            totalCount.className = 'total-count';
            header.appendChild(totalCount);
        }
        totalCount.textContent = 'Loading...';
        
        // Fetch first page of images
        const data = await loadImages(1, window._galleryState.batchSize);
        
        if (data && data.files.length > 0) {
            window._galleryState.images = data.files;
            window._galleryState.currentPage = data.page;
            window._galleryState.totalPages = data.totalPages;
            
            // Update total count
            totalCount.textContent = `${data.total} images`;
            
            // Display images
            await displayImages(data.files);
            
            // Initialize filters after images are loaded
            await initializeLetterFilter();
            initializeSortButtons();
            await initializeTagFilter();
            
            // Add pagination controls
            updatePagination(data.page, data.totalPages);
            
            window._galleryState.initialized = true;
        }
    } catch (error) {
        console.error('Error loading initial images:', error);
    } finally {
        window._galleryState.isLoading = false;
        removeLoadingSkeletons();
    }
}
