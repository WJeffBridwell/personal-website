console.log('Script file loaded and starting execution');

// Global variables
let currentPage = 1;
let isLoading = false;
let modal, modalImg, modalCaption, closeModalBtn;

// Modal functions
function openModal(imageSrc, caption) {
    console.log('Opening modal with:', { imageSrc, caption });
    if (!modal || !modalImg || !modalCaption) {
        console.error('Modal elements missing:', {
            modal: !!modal,
            modalImg: !!modalImg,
            modalCaption: !!modalCaption
        });
        return;
    }
    modal.style.display = 'block';
    modalImg.src = imageSrc;
    modalCaption.textContent = caption;
    console.log('Modal opened');
}

function closeModalFunction() {
    console.log('Closing modal');
    if (!modal || !modalImg) {
        console.error('Modal elements missing for close');
        return;
    }
    modal.style.display = 'none';
    modalImg.src = '';
    console.log('Modal closed');
}

// Initialize modal event listeners
function initializeModalListeners() {
    console.log('Setting up modal listeners');
    
    // Get modal elements
    modal = document.getElementById('imageModal');
    modalImg = document.getElementById('modalImage');
    modalCaption = document.getElementById('modalCaption');
    closeModalBtn = document.querySelector('.close-modal');

    console.log('Modal elements found:', {
        modal: !!modal,
        modalImg: !!modalImg,
        modalCaption: !!modalCaption,
        closeModalBtn: !!closeModalBtn
    });
    
    if (!modal || !closeModalBtn) {
        console.error('Cannot initialize modal listeners - elements missing:', {
            modal: !!modal,
            closeModalBtn: !!closeModalBtn
        });
        return;
    }

    // Close modal with close button
    closeModalBtn.onclick = closeModalFunction;

    // Close modal when clicking outside the image
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModalFunction();
        }
    };

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModalFunction();
        }
    });
    
    console.log('Modal listeners initialized');
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

// Display images
function displayImages(images) {
    console.log('displayImages called with', images.length, 'images');
    const grid = document.getElementById('image-grid');
    if (!grid) {
        console.error('Image grid not found');
        return;
    }
    
    grid.innerHTML = ''; // Clear existing images
    
    images.forEach((image, index) => {
        console.log(`Processing image ${index + 1}/${images.length}:`, image.name);
        const container = document.createElement('div');
        container.className = 'image-container';
        
        // Create image element
        const img = document.createElement('img');
        img.src = image.url;
        img.alt = image.name;
        img.loading = 'lazy';
        img.className = 'loading';
        
        // Add click handler for modal
        img.addEventListener('click', () => {
            console.log('Image clicked:', image.name);
            openModal(image.url, image.name);
        });
        
        // Create search icon
        const searchIcon = document.createElement('i');
        searchIcon.className = 'fas fa-search search-icon';
        searchIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            searchImageInFinder(image.name);
        });
        
        // Create name label
        const nameLabel = document.createElement('div');
        nameLabel.className = 'image-name';
        nameLabel.textContent = image.name;
        
        img.onload = () => {
            console.log('Image loaded:', image.name);
            img.classList.remove('loading');
            img.classList.add('loaded');
            container.classList.remove('skeleton');
        };
        
        img.onerror = (e) => {
            console.error('Failed to load image:', image.url, e);
            img.classList.remove('loading');
            img.classList.add('error');
            container.classList.remove('skeleton');
        };
        
        container.appendChild(img);
        container.appendChild(searchIcon);
        container.appendChild(nameLabel);
        grid.appendChild(container);
    });
}

// Export functions for testing
export {
    openModal,
    closeModalFunction,
    initializeModalListeners,
    fetchImages,
    searchImageInFinder,
    displayImages
};

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing gallery');

    // Initialize modal listeners (this will also get modal elements)
    initializeModalListeners();

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
