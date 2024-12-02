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

// Global variables
let currentPage = 1;
let isLoading = false;
let modal, modalImg, modalCaption, closeBtn;

// Global modal elements
modal = null;
modalImg = null;
modalCaption = null;
closeBtn = null;

// Initialize modal
function initializeModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('imageModal');
    if (existingModal) {
        existingModal.remove();
    }

    try {
        modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'modal';
        modal.style.display = 'none';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        closeBtn = document.createElement('span');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        
        modalImg = document.createElement('img');
        modalImg.className = 'modal-img';
        modalImg.style.cursor = 'pointer';  // Add pointer cursor
        
        // Add loading indicator and click handler
        modalImg.addEventListener('load', () => {
            modalImg.style.opacity = '1';
        });
        
        modalImg.addEventListener('error', (e) => {
            console.error('Failed to load image:', e);
            modalCaption.textContent = 'Error loading image';
            modalImg.style.display = 'none';
        });
        
        // Close modal when clicking the image
        modalImg.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
        
        modalCaption = document.createElement('div');
        modalCaption.className = 'modal-caption';
        
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(modalImg);
        modalContent.appendChild(modalCaption);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Event listeners
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.preventDefault();
                closeModal();
            }
        });
        
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
        
        // Handle back button
        window.addEventListener('popstate', () => {
            if (modal.style.display === 'block') {
                closeModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
        
        console.log('Modal initialized successfully');
    } catch (error) {
        console.error('Error initializing modal:', error);
    }
}

// Open modal with improved visibility handling
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
        
        // Reset modal image state
        modalImg.style.opacity = '0';
        modalImg.style.display = 'block';
        modalImg.src = imageSrc;
        modalCaption.textContent = caption || '';
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        console.log('Opening modal with image:', imageSrc);
    } catch (error) {
        console.error('Error opening modal:', error);
    }
}

// Close modal with cleanup
function closeModal() {
    try {
        if (!modal) return;
        
        modal.style.display = 'none';
        modalImg.src = '';
        modalImg.style.opacity = '0';
        modalCaption.textContent = '';
        document.body.style.overflow = '';
        
        console.log('Modal closed successfully');
    } catch (error) {
        console.error('Error closing modal:', error);
    }
}

// Display images
function displayImages(images) {
    const imageGrid = document.querySelector('.image-grid');
    if (!imageGrid) {
        console.error('Image grid not found');
        return;
    }
    
    try {
        imageGrid.innerHTML = '';
        
        images.forEach(image => {
            const container = document.createElement('div');
            container.className = 'image-container';
            
            const img = document.createElement('img');
            img.src = image.thumbnailUrl || image.url;
            img.alt = image.name;
            img.loading = 'lazy';
            
            const searchIcon = document.createElement('i');
            searchIcon.className = 'fas fa-search search-icon';
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'image-name';
            nameLabel.textContent = image.name;
            
            // Container click handler for modal
            container.addEventListener('click', (e) => {
                if (!e.target.classList.contains('search-icon')) {
                    e.preventDefault();
                    e.stopPropagation();
                    openModal(image.url, image.name);
                    // Push state for back button support
                    history.pushState({ modal: true }, '');
                }
            });
            
            // Search icon click handler
            searchIcon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                searchImageInFinder(image.name);
            });
            
            container.appendChild(img);
            container.appendChild(searchIcon);
            container.appendChild(nameLabel);
            imageGrid.appendChild(container);
        });
        
        // Initialize modal after images are loaded
        initializeModal();
        
    } catch (error) {
        console.error('Error displaying images:', error);
    }
}

// Basic image loading
async function fetchImages() {
    console.log('fetchImages called');
    try {
        const response = await fetch('/gallery/images');
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched image data:', data);
        return data.images;
    } catch (error) {
        console.error('Error fetching images:', error);
        throw error;
    }
}

// Search for image in Finder
async function searchImageInFinder(imageName) {
    console.log('Searching for image:', imageName);
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
