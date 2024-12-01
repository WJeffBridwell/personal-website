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

// Initialize modal functionality
document.addEventListener('DOMContentLoaded', () => {
    // Create modal elements
    createModal();
    
    // Add click handlers to all gallery images
    const galleryImages = document.querySelectorAll('.image-container img');
    galleryImages.forEach(img => {
        img.addEventListener('click', () => {
            const fullSrc = img.getAttribute('data-full-src') || img.src;
            const caption = img.alt;
            openModal(fullSrc, caption);
        });
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalFunction();
        }
    });

    // Close modal with escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModalFunction();
        }
    });

    // Close button handler
    closeBtn.addEventListener('click', closeModalFunction);

    // Handle back button
    window.addEventListener('popstate', () => {
        if (modal.style.display === 'block') {
            closeModalFunction();
        }
    });
});

// Create modal elements
function createModal() {
    modal = document.createElement('div');
    modal.className = 'modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    closeBtn = document.createElement('span');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '&times;';
    
    modalImg = document.createElement('img');
    modalImg.className = 'modal-img';
    
    modalCaption = document.createElement('div');
    modalCaption.id = 'modalCaption';
    
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(modalImg);
    modalContent.appendChild(modalCaption);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

// Open modal with image
function openModal(imageSrc, caption) {
    modalImg.src = imageSrc;
    modalCaption.textContent = caption || '';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModalFunction() {
    modal.style.display = 'none';
    modalImg.src = '';
    modalCaption.textContent = '';
    document.body.style.overflow = '';
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

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('\n=== DOM Content Loaded ===');
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
