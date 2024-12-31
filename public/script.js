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
    // Only run once
    if (window._galleryInitialized) return;
    window._galleryInitialized = true;

    // Verify we're on the gallery page
    const isGalleryPage = document.title.includes('Gallery') || window.location.pathname.includes('gallery');
    console.log('Is gallery page:', isGalleryPage);
    console.log('Page title:', document.title);
    console.log('Page URL:', window.location.href);
    console.log('Page pathname:', window.location.pathname);

    // Global state variables
    window._galleryState = {
        currentImages: [],
        isLoading: false,
        modal: null,
        modalImg: null,
        modalCaption: null,
        closeBtn: null,
        nextCursor: null
    };
    
    // Load initial images
    loadInitialImages();
}

// Call initialize function
initializeGallery();

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
 * Displays images in the gallery grid
 * @param {Array} images - Array of image objects to display
 */
async function displayImages(images, append = false) {
    const grid = document.getElementById('image-grid');
    if (!grid) {
        console.error('Image grid element not found');
        return;
    }
    
    // Clear existing images if not appending
    if (!append) {
        grid.innerHTML = '';
    }
    
    try {
        for (const image of images) {
            const container = createImageContainer(image);
            grid.appendChild(container);
        }
        
        // Initialize all filters and sort buttons
        initializeLetterFilter();
        initializeSearchFilter();
        initializeSortButtons();
        
    } catch (error) {
        console.error('Error displaying images:', error);
    }
}

/**
 * Creates an image container with all necessary elements and event listeners
 * @param {Object} image - Image object containing url, name, and thumbnail
 * @returns {HTMLElement} The configured image container
 */
function createImageContainer(image) {
    console.log('Creating image container for:', image.name);
    
    const container = document.createElement('div');
    container.className = 'image-container';
    
    const img = document.createElement('img');
    img.src = image.thumbnailUrl || image.url;
    img.alt = image.name;
    img.loading = 'lazy';
    
    // Create folder icon (right corner)
    const folderIcon = document.createElement('div');
    folderIcon.className = 'folder-icon';
    const folderI = document.createElement('i');
    folderI.className = 'fas fa-folder';
    folderIcon.appendChild(folderI);
    
    // Create image icon (left corner)
    const imageIcon = document.createElement('div');
    imageIcon.className = 'image-icon';
    const imageI = document.createElement('i');
    imageI.className = 'fas fa-image';
    imageIcon.appendChild(imageI);
    
    const nameLabel = document.createElement('div');
    nameLabel.className = 'image-name';
    nameLabel.textContent = image.name;
    console.log('Created name label:', nameLabel.outerHTML);
    
    // Set up click handlers
    container.addEventListener('click', (e) => {
        if (!e.target.closest('.folder-icon') && !e.target.closest('.image-icon')) {
            e.preventDefault();
            e.stopPropagation();
            openModal(image.url, image.name);
        }
    });
    
    folderIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        searchImageInFinder(image.name);
    });

    imageIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = `./content-gallery.html?image-name=${encodeURIComponent(image.name)}`;
    });
    
    container.appendChild(img);
    container.appendChild(folderIcon);
    container.appendChild(imageIcon);
    container.appendChild(nameLabel);
    
    return container;
}

/**
 * Fetches images from the server
 * @param {string} cursor - Cursor for pagination
 * @param {number} limit - Number of images to fetch
 * @returns {Promise<Object>} Object containing images and next cursor
 */
async function fetchImages(cursor = '', limit = 1000) {
    try {
        const response = await fetch(`/gallery/images?cursor=${encodeURIComponent(cursor)}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching images:', error);
        throw error;
    }
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

// Load initial images and set up infinite scroll
async function loadInitialImages() {
    try {
        window._galleryState.isLoading = true;
        const data = await fetchImages();
        await displayImages(data.images);
        window._galleryState.nextCursor = data.nextCursor;
        window._galleryState.isLoading = false;
        
        // Set up infinite scroll
        const observer = new IntersectionObserver(async (entries) => {
            const lastEntry = entries[0];
            if (lastEntry.isIntersecting && window._galleryState.nextCursor && !window._galleryState.isLoading) {
                window._galleryState.isLoading = true;
                const data = await fetchImages(window._galleryState.nextCursor);
                await displayImages(data.images, true);
                window._galleryState.nextCursor = data.nextCursor;
                window._galleryState.isLoading = false;
            }
        }, { threshold: 0.5 });
        
        // Observe the last image container
        const containers = document.getElementsByClassName('image-container');
        if (containers.length > 0) {
            observer.observe(containers[containers.length - 1]);
        }
    } catch (error) {
        console.error('Error loading initial images:', error);
        window._galleryState.isLoading = false;
    }
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
function initializeLetterFilter() {
    const letterButtons = document.querySelector('.letter-buttons');
    const usedLetters = new Set();
    
    // Get all image containers and collect first letters
    const imageContainers = document.querySelectorAll('.image-container');
    imageContainers.forEach(container => {
        const imageName = container.querySelector('img').alt;
        if (imageName) {
            const firstLetter = imageName.charAt(0).toUpperCase();
            if (/[A-Z]/.test(firstLetter)) {
                usedLetters.add(firstLetter);
            }
        }
    });
    
    // Create and add letter buttons
    const sortedLetters = Array.from(usedLetters).sort();
    sortedLetters.forEach(letter => {
        const button = document.createElement('button');
        button.className = 'letter-btn';
        button.textContent = letter;
        button.dataset.letter = letter;
        letterButtons.appendChild(button);
    });
    
    // Add click event listeners
    letterButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('letter-btn')) {
            // Update active state
            document.querySelectorAll('.letter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Filter images
            const selectedLetter = e.target.dataset.letter;
            filterImagesByLetter(selectedLetter);
        }
    });
}

// Filter images by letter
function filterImagesByLetter(letter) {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    const imageContainers = document.querySelectorAll('.image-container');
    const activeSort = document.querySelector('.sort-btn.active')?.dataset.sort;
    
    imageContainers.forEach(container => {
        // Skip if container is managed by Collections
        if (container.hasAttribute('data-in-collection')) return;
        
        const imageName = container.querySelector('img').alt;
        const firstLetter = imageName.charAt(0).toUpperCase();
        const matchesSearch = !searchTerm || imageName.toLowerCase().includes(searchTerm);
        
        if (letter === 'all') {
            container.classList.toggle('hidden', !matchesSearch);
        } else {
            const matchesLetter = firstLetter === letter;
            container.classList.toggle('hidden', !(matchesLetter && matchesSearch));
        }
    });
    
    // Maintain sort order if active
    if (activeSort) {
        const sortButtons = document.querySelectorAll('.sort-btn');
        sortButtons.forEach(btn => {
            if (btn.dataset.sort === activeSort) {
                btn.click();
            }
        });
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

// Also try on window load
window.addEventListener('load', () => {
    console.log('\n=== Window Loaded ===');
});
