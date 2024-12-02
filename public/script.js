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

// Verify we're on the gallery page
const isGalleryPage = document.title.includes('Gallery') || window.location.pathname.includes('gallery');
console.log('Is gallery page:', isGalleryPage);
console.log('Page title:', document.title);
console.log('Page URL:', window.location.href);
console.log('Page pathname:', window.location.pathname);

// Global state variables
let currentImages = [];
let isLoading = false;
let modal = null;
let modalImg = null;
let modalCaption = null;
let closeBtn = null;

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
        modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'modal';
        modal.style.display = 'none';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Configure close button
        closeBtn = document.createElement('span');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        
        // Configure modal image with loading and error states
        modalImg = document.createElement('img');
        modalImg.className = 'modal-img';
        modalImg.style.cursor = 'pointer';
        
        modalImg.addEventListener('load', () => {
            modalImg.style.opacity = '1';
        });
        
        modalImg.addEventListener('error', (e) => {
            console.error('Failed to load image:', e);
            modalCaption.textContent = 'Error loading image';
            modalImg.style.display = 'none';
        });
        
        // Add click-to-close functionality
        modalImg.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
        
        // Configure caption
        modalCaption = document.createElement('div');
        modalCaption.className = 'modal-caption';
        
        // Assemble modal structure
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(modalImg);
        modalContent.appendChild(modalCaption);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
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
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            e.preventDefault();
            closeModal();
        }
    });
    
    // Close on button click
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
    });
    
    // Handle browser back button
    window.addEventListener('popstate', () => {
        if (modal.style.display === 'block') {
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
        if (!modal) {
            console.error('Modal not initialized');
            initializeModal();
        }
        
        if (!imageSrc) {
            console.error('No image source provided');
            return;
        }
        
        modalImg.style.opacity = '0';
        modalImg.style.display = 'block';
        modalImg.src = imageSrc;
        modalCaption.textContent = caption || '';
        modal.style.display = 'block';
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
        if (!modal) return;
        
        modal.style.display = 'none';
        modalImg.src = '';
        modalImg.style.opacity = '0';
        modalCaption.textContent = '';
        document.body.style.overflow = '';
        
    } catch (error) {
        console.error('Error closing modal:', error);
    }
}

/**
 * Displays images in the gallery grid
 * @param {Array} images - Array of image objects to display
 */
async function displayImages(images) {
    const grid = document.getElementById('image-grid');
    if (!grid) {
        console.error('Image grid element not found');
        return;
    }
    
    // Clear existing images
    grid.innerHTML = '';
    
    try {
        for (const image of images) {
            const container = document.createElement('div');
            container.className = 'image-container';
            
            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.name;
            img.loading = 'lazy';
            
            const searchIcon = document.createElement('i');
            searchIcon.className = 'fa-solid fa-magnifying-glass search-icon';
            searchIcon.onclick = () => searchImageInFinder(image.name);
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'image-name';
            nameLabel.textContent = image.name;
            
            container.appendChild(img);
            container.appendChild(searchIcon);
            container.appendChild(nameLabel);
            grid.appendChild(container);
            
            // Add click event for modal
            container.addEventListener('click', (e) => {
                if (e.target !== searchIcon) {
                    openModal(image.url, image.name);
                }
            });
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
    
    const searchIcon = document.createElement('i');
    searchIcon.className = 'fa-solid fa-magnifying-glass search-icon';
    
    const nameLabel = document.createElement('div');
    nameLabel.className = 'image-name';
    nameLabel.textContent = image.name;
    console.log('Created name label:', nameLabel.outerHTML);
    
    // Set up click handlers
    container.addEventListener('click', (e) => {
        if (!e.target.classList.contains('search-icon')) {
            e.preventDefault();
            e.stopPropagation();
            openModal(image.url, image.name);
        }
    });
    
    searchIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        searchImageInFinder(image.name);
    });
    
    container.appendChild(img);
    container.appendChild(searchIcon);
    container.appendChild(nameLabel);
    
    console.log('Final container HTML:', container.outerHTML);
    return container;
}

/**
 * Fetches images from the server
 * @returns {Promise<Array>} Array of image objects
 */
async function fetchImages() {
    try {
        const response = await fetch('/gallery/images');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.images;
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

// Initialize sort buttons
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
const filterFunctions = {
    filterImagesByLetter,
    initializeLetterFilter,
    filterImagesBySearch: function(searchTerm) {
        const imageContainers = document.querySelectorAll('.image-container');
        const searchLower = searchTerm.toLowerCase().trim();
        
        imageContainers.forEach(container => {
            const nameLabel = container.querySelector('.image-name');
            if (!nameLabel) return;
            
            const imageName = nameLabel.textContent;
            // Only show images where the name BEGINS with the search term
            const isVisible = searchLower === '' || imageName.toLowerCase().indexOf(searchLower) === 0;
            container.classList.toggle('hidden', !isVisible);
        });
    }
};

// Export all functions needed for testing
const exportedFunctions = {
    // Filter functions
    filterFunctions,
    // Search functions
    searchImages: null,
    searchImageInFinder,
    // Image loading functions
    fetchImages,
    displayImages,
    createImageContainer,
    // Modal functions
    initializeModal,
    openModal,
    closeModal,
    // Sort functions
    initializeSortButtons,
    // Search filter functions
    initializeSearchFilter
};

// Export for testing environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportedFunctions;
}

// Make functions available in browser environment
if (typeof window !== 'undefined') {
    Object.assign(window, exportedFunctions);
}

// Initialize search filter
function initializeSearchFilter() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

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
            
            container.classList.toggle('filtered', !isMatch);
            container.classList.toggle('hidden', !isMatch);
        });
        
        // Reset letter filter if search is active
        if (normalizedSearch) {
            document.querySelectorAll('.letter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector('.letter-btn[data-letter="all"]').classList.add('active');
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
    document.querySelector('.letter-btn[data-letter="all"]').addEventListener('click', clearSearch);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const images = await fetchImages();
        await displayImages(images);
    } catch (error) {
        console.error('Failed to initialize gallery:', error);
        const grid = document.getElementById('image-grid');
        if (grid) {
            grid.innerHTML = `<div class="error-message">Failed to load images: ${error.message}</div>`;
        }
    }
});

// Also try on window load
window.addEventListener('load', () => {
    console.log('\n=== Window Loaded ===');
});
