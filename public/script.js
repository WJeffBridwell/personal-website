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
function initializeGallery() {
    console.log('\n=== Initializing Gallery ===');
    // Only run once
    if (window._galleryInitialized) {
        console.log('Gallery already initialized, skipping');
        return;
    }

    // Check if gallery section exists on the page
    const gallerySection = document.getElementById('gallery');
    const imageGrid = document.getElementById('image-grid');
    
    console.log('Gallery elements check:', {
        gallerySection: !!gallerySection,
        imageGrid: !!imageGrid
    });

    if (!gallerySection || !imageGrid) {
        console.log('Gallery elements not found, skipping initialization');
        return;
    }

    window._galleryInitialized = true;

    // Initialize gallery state
    window._galleryState = {
        currentPage: 1,
        totalPages: 0,
        isLoading: false,
        images: [],
        hasMore: true,
        initialized: false,
        observer: null,
        batchSize: 40,
        loadedImages: new Set(),
        backgroundLoading: true,
        backgroundTimer: null,
        maxConcurrentLoads: 2,
        activeLoads: 0,
        lastVisiblePage: 1
    };

    console.log('Gallery state initialized:', window._galleryState);
    
    // Load initial images
    loadInitialImages();
    console.log('=== Gallery Initialization Complete ===\n');
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

/**
 * Creates an image container with thumbnail and caption
 * @param {Object} image - Image object containing url, name, and thumbnail
 * @returns {HTMLElement} The configured image container
 */
function createImageContainer(image) {
    console.log('Creating container for image:', image);
    
    const container = document.createElement('div');
    container.className = 'image-container';
    
    // Create image element
    const img = document.createElement('img');
    img.src = `/gallery/images/${encodeURIComponent(image.name)}?thumbnail=true`;
    img.alt = image.name;
    img.loading = 'lazy';
    container.appendChild(img);
    
    // Add load event listener
    img.addEventListener('load', () => {
        container.classList.add('loaded');
    });
    
    // Add error event listener
    img.addEventListener('error', () => {
        console.error('Failed to load image:', image.name);
        container.classList.add('error');
        img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24"><path fill="%23ccc" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
    });

    // Create folder icon
    const folderIcon = document.createElement('div');
    folderIcon.className = 'folder-icon';
    folderIcon.innerHTML = '<i class="fas fa-folder"></i>';
    folderIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        searchImageInFinder(image.name);
    });
    container.appendChild(folderIcon);

    // Create image icon
    const imageIcon = document.createElement('div');
    imageIcon.className = 'image-icon';
    imageIcon.innerHTML = '<i class="fas fa-image"></i>';
    imageIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `/content-gallery.html?image-name=${encodeURIComponent(image.name)}`;
    });
    container.appendChild(imageIcon);

    // Create info bar
    const info = document.createElement('div');
    info.className = 'image-info';
    
    // Add image name
    const name = document.createElement('div');
    name.className = 'image-name';
    name.textContent = image.name;
    info.appendChild(name);
    
    // Add tag dots if present
    if (image.tags && image.tags.length > 0) {
        const dots = document.createElement('div');
        dots.className = 'tag-dots';
        
        image.tags.forEach(tag => {
            const dot = document.createElement('div');
            dot.className = 'tag-dot';
            dot.title = tag;
            dot.style.backgroundColor = getTagColor(tag);
            dots.appendChild(dot);
        });
        
        container.appendChild(dots);
    }
    
    container.appendChild(info);
    return container;
}

// Helper function to generate tag colors
function getTagColor(tag) {
    // Define specific colors for common tags
    const tagColors = {
        'jpeg': '#4CAF50',      // Green
        'png': '#2196F3',       // Blue
        'gif': '#9C27B0',       // Purple
        'dated': '#FF9800',     // Orange
        'camera': '#E91E63',    // Pink
        'digital': '#00BCD4',   // Cyan
        'screenshot': '#795548', // Brown
        'edited': '#607D8B',    // Blue Grey
        'year': '#FF9800'       // Orange
    };

    // If we have a predefined color, use it
    if (tagColors[tag]) {
        return tagColors[tag];
    }

    // Otherwise generate a consistent color based on the tag name
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate HSL color with good saturation and lightness
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 50%)`;
}

// Helper function to open image in new tab
function openImageInNewTab(url) {
    window.open(url, '_blank');
}

/**
 * Displays images in the grid
 * @param {Array} images - Array of image objects to display
 */
async function displayImages(images, skipExisting = false) {
    const grid = document.getElementById('image-grid');
    if (!grid) {
        console.error('Image grid element not found');
        return;
    }

    if (!skipExisting) {
        grid.innerHTML = '';
        window._galleryState.loadedImages.clear();
    }

    const fragment = document.createDocumentFragment();
    
    for (const image of images) {
        if (skipExisting && window._galleryState.loadedImages.has(image.name)) continue;
        window._galleryState.loadedImages.add(image.name);
        
        const container = createImageContainer(image);
        fragment.appendChild(container);
    }
    
    grid.appendChild(fragment);
    
    // Make sure the load more trigger stays at the bottom
    const loadMoreTrigger = document.querySelector('.load-more-trigger');
    if (loadMoreTrigger) {
        grid.appendChild(loadMoreTrigger);
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

// Set up infinite scroll with intersection observer
function setupInfiniteScroll() {
    console.log('Setting up infinite scroll');
    
    // Remove existing trigger if any
    const existingTrigger = document.querySelector('.load-more-trigger');
    if (existingTrigger) {
        existingTrigger.remove();
    }

    // Disconnect existing observer
    if (window._galleryState.observer) {
        window._galleryState.observer.disconnect();
    }

    // Create and style loading trigger
    const loadMoreTrigger = document.createElement('div');
    loadMoreTrigger.className = 'load-more-trigger';
    loadMoreTrigger.style.height = '20px';
    loadMoreTrigger.style.width = '100%';
    loadMoreTrigger.style.display = 'flex';
    loadMoreTrigger.style.justifyContent = 'center';
    loadMoreTrigger.style.alignItems = 'center';
    loadMoreTrigger.style.padding = '20px';
    
    // Create loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.style.display = 'none';
    loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <span>Loading more images...</span>
    `;
    loadMoreTrigger.appendChild(loadingIndicator);

    // Add trigger to the grid
    const grid = document.getElementById('image-grid');
    grid.appendChild(loadMoreTrigger);

    const loadMoreImages = async (entries) => {
        const trigger = entries[0];
        
        if (trigger.isIntersecting && !window._galleryState.isLoading && window._galleryState.hasMore) {
            console.log('Trigger intersecting, loading more images...');
            loadingIndicator.style.display = 'flex';
            
            try {
                window._galleryState.isLoading = true;
                window._galleryState.currentPage++;
                
                console.log('Fetching page:', window._galleryState.currentPage);
                const response = await fetchImages(window._galleryState.currentPage, 40); // Load more per page
                
                if (response && response.images) {
                    console.log('Received images:', response.images.length);
                    window._galleryState.hasMore = response.pagination.hasMore;
                    await displayImages(response.images, true);
                    
                    // Update total count display
                    const totalCountElement = document.querySelector('.total-count');
                    if (totalCountElement) {
                        const loadedCount = window._galleryState.loadedImages.size;
                        totalCountElement.textContent = `${loadedCount} / ${response.pagination.total} images`;
                    }
                    
                    console.log('Has more:', window._galleryState.hasMore);
                }
            } catch (error) {
                console.error('Error loading more images:', error);
            } finally {
                window._galleryState.isLoading = false;
                loadingIndicator.style.display = 'none';
            }
        }
    };

    // Create new observer with larger rootMargin
    window._galleryState.observer = new IntersectionObserver(loadMoreImages, {
        root: null,
        rootMargin: '500px', // Start loading earlier
        threshold: 0
    });

    // Start observing
    window._galleryState.observer.observe(loadMoreTrigger);
    console.log('Infinite scroll setup complete');
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
    console.log('Initializing letter filter');
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
        const response = await fetchImages(1, window._galleryState.batchSize, letter);
        
        if (response && response.images) {
            await displayImages(response.images);
            
            // Update total count
            const totalCountElement = document.querySelector('.total-count');
            if (totalCountElement) {
                totalCountElement.textContent = `${response.images.length} / ${response.pagination.total} images`;
            }
            
            // Reset infinite scroll
            setupInfiniteScroll();
            
            // Restart background loading with new filter
            startBackgroundLoading();
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
        
        const response = await fetchImages(nextPage, window._galleryState.batchSize);
        
        if (response && response.images && response.images.length > 0) {
            window._galleryState.currentPage = nextPage;
            window._galleryState.hasMore = response.pagination.hasMore;
            
            // Pre-load images in memory
            const imagePromises = response.images.map(image => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = `/gallery/images/${encodeURIComponent(image.name)}?thumbnail=true`;
                });
            });
            
            // Wait for images to load in memory
            await Promise.all(imagePromises);
            
            // Add to DOM if we're still in background loading mode
            if (window._galleryState.backgroundLoading) {
                await displayImages(response.images, true);
                
                // Update total count
                const totalCountElement = document.querySelector('.total-count');
                if (totalCountElement) {
                    totalCountElement.textContent = `${window._galleryState.loadedImages.size} / ${response.pagination.total} images`;
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
        
        // Add total count display
        const header = document.querySelector('.gallery-header');
        const totalCount = document.createElement('div');
        totalCount.className = 'total-count';
        totalCount.textContent = 'Loading...';
        header.appendChild(totalCount);
        
        // Fetch first page of images
        const response = await fetchImages(1, window._galleryState.batchSize);
        
        if (response && response.images) {
            window._galleryState.images = response.images;
            window._galleryState.totalPages = response.pagination.totalPages;
            window._galleryState.hasMore = response.pagination.hasMore;
            
            // Update total count
            totalCount.textContent = `${response.images.length} / ${response.pagination.total} images`;
            
            // Display images
            await displayImages(response.images);
            
            // Initialize filters after images are loaded
            await initializeLetterFilter();
            initializeSortButtons();
            await initializeTagFilter();
            
            // Set up infinite scroll
            setupInfiniteScroll();
            
            // Start background loading
            startBackgroundLoading();
            
            window._galleryState.initialized = true;
        }
    } catch (error) {
        console.error('Error loading initial images:', error);
    } finally {
        window._galleryState.isLoading = false;
        removeLoadingSkeletons();
    }
}

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
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || 'Failed to fetch tags');
        }
        
        const data = await response.json();
        console.log('Received tags:', data);
        
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
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

// Filter functions
if (typeof window._filterFunctions === 'undefined') {
    window._filterFunctions = {
        filterImagesByLetter,
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
