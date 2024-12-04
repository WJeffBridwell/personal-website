// Helper functions for the gallery module

// Debounce function for search
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format date for display
export function formatDate(dateString) {
    if (!dateString || isNaN(new Date(dateString).getTime())) {
        throw new Error('Invalid date');
    }
    const date = new Date(dateString);
    // Force UTC timezone to ensure consistent dates
    const utcDate = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
    ));
    return utcDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
    });
}

// Validate image file type
export function validateImageType(filename) {
    if (!filename) return false;
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    const extension = filename.split('.').pop().toLowerCase();
    return validExtensions.includes(extension);
}

// Sanitize file name
export function sanitizeFileName(filename) {
    if (!filename) {
        throw new Error('Invalid file name');
    }

    // Split filename into name and extension
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
        // No extension
        return filename.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    const name = filename.slice(0, lastDotIndex);
    const ext = filename.slice(lastDotIndex + 1);

    // Sanitize the name part
    const sanitizedName = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');

    // Return with lowercase extension
    return `${sanitizedName}.${ext.toLowerCase()}`;
}

// Create image element
export function createImageElement(imageData) {
    if (!imageData || !imageData.name || !imageData.path) {
        throw new Error('Invalid image data');
    }

    const container = document.createElement('div');
    container.className = 'image-container';
    container.dataset.name = imageData.name;
    container.dataset.date = imageData.date;

    const img = document.createElement('img');
    img.src = imageData.path;
    img.alt = imageData.name;
    img.loading = 'lazy';

    const name = document.createElement('div');
    name.className = 'image-name';
    name.textContent = imageData.name;

    container.appendChild(img);
    container.appendChild(name);

    // Add click handler for modal
    container.addEventListener('click', () => {
        openModal({
            src: img.src,
            alt: img.alt,
            name: imageData.name
        });
    });

    return container;
}

// Update gallery state
export function updateGalleryState(newState = {}) {
    const defaultState = {
        filter: 'all',
        sort: 'name',
        order: 'asc',
        search: '',
        letter: 'all'
    };

    // Validate input
    if (typeof newState !== 'object') {
        throw new Error('Invalid state object');
    }

    // Check for invalid properties
    const validProperties = ['filter', 'sort', 'order', 'search', 'letter'];
    const hasInvalidProperty = Object.keys(newState).some(key => !validProperties.includes(key));
    if (hasInvalidProperty) {
        throw new Error('Invalid state property');
    }

    // Merge with defaults and validate values
    const state = { ...defaultState, ...newState };

    // Validate sort and order
    if (state.sort && !['name', 'date'].includes(state.sort)) {
        state.sort = defaultState.sort;
    }
    if (state.order && !['asc', 'desc'].includes(state.order)) {
        state.order = defaultState.order;
    }

    // Store in localStorage
    try {
        localStorage.setItem('galleryState', JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save gallery state:', error);
    }

    return state;
}

// Handle errors
export function handleError(error, debug = false) {
    let message = 'Unknown error';
    
    if (error) {
        if (typeof error === 'string') {
            message = error;
        } else if (error instanceof Error) {
            message = error.message;
        } else if (error.message) {
            message = error.message;
        }
    }

    const errorElement = document.querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    if (debug && error instanceof Error) {
        console.error(message, error.stack);
    } else {
        console.error(message);
    }
}

// Filter images
export function filterImages(searchTerm = '') {
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) return;

    const images = Array.from(imageGrid.children);
    let hasVisibleImages = false;

    const searchTerms = searchTerm.toLowerCase().split(' ').filter(Boolean);

    images.forEach(container => {
        const name = container.querySelector('.image-name')?.textContent.toLowerCase() || '';
        const matches = searchTerms.length === 0 || 
                       searchTerms.every(term => name.includes(term));
        container.style.display = matches ? '' : 'none';
        if (matches) hasVisibleImages = true;
    });

    updateNoResultsMessage(!hasVisibleImages);
}

// Filter by letter
export function filterByLetter(letter) {
    if (!letter) return;
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) throw new Error('Image grid element not found');

    const images = Array.from(imageGrid.children);
    let hasVisibleImages = false;

    images.forEach(container => {
        const name = container.querySelector('.image-name').textContent;
        const matches = letter === 'all' || name.charAt(0).toLowerCase() === letter.toLowerCase();
        container.style.display = matches ? '' : 'none';
        if (matches) hasVisibleImages = true;
    });

    updateNoResultsMessage(!hasVisibleImages);
}

// Sort images
export function sortImages(sortBy = 'name', order = 'asc') {
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) return;

    const images = Array.from(imageGrid.children);
    const fragment = document.createDocumentFragment();

    images.sort((a, b) => {
        let valueA, valueB;

        if (sortBy === 'name') {
            valueA = a.querySelector('.image-name')?.textContent.toLowerCase() || '';
            valueB = b.querySelector('.image-name')?.textContent.toLowerCase() || '';
        } else if (sortBy === 'date') {
            valueA = new Date(a.dataset.date || 0).getTime();
            valueB = new Date(b.dataset.date || 0).getTime();
        }

        return order === 'desc' 
            ? (valueA > valueB ? -1 : valueA < valueB ? 1 : 0)
            : (valueA < valueB ? -1 : valueA > valueB ? 1 : 0);
    });

    images.forEach(image => fragment.appendChild(image));
    imageGrid.appendChild(fragment);
}

// Load images
export async function loadImages() {
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) {
        throw new Error('Image grid element not found');
    }

    try {
        const response = await fetch('/api/images');
        if (!response.ok) {
            throw new Error('Failed to load images');
        }
        const images = await response.json();

        // Clear existing images
        imageGrid.innerHTML = '';

        // Add new images
        images.forEach(imageData => {
            const imageElement = createImageElement(imageData);
            imageGrid.appendChild(imageElement);
        });

        return images;
    } catch (error) {
        handleError(error);
        const errorElement = document.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = 'Error loading images';
            errorElement.style.display = 'block';
        }
        throw error; // Re-throw to propagate to caller
    }
}

// Initialize modal events
export function initializeModal() {
    const modal = document.querySelector('.modal');
    if (!modal) return;

    // Close modal when clicking the close button
    const closeButton = modal.querySelector('.modal-close');
    if (closeButton) {
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal();
        });
    }

    // Close modal when clicking outside the image
    modal.addEventListener('click', (e) => {
        // Only close if clicking directly on the modal background
        if (e.target === modal) {
            closeModal();
        }
    });

    // Prevent closing when clicking on modal content
    const modalContent = modal.querySelector('.modal-img');
    if (modalContent) {
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

// Open modal
export function openModal(imageData) {
    if (!imageData || !imageData.src || !imageData.name) {
        console.error('Invalid image data for modal');
        return;
    }

    const modal = document.querySelector('.modal');
    if (!modal) return;

    const modalImg = modal.querySelector('.modal-img');
    const modalCaption = modal.querySelector('.modal-caption');

    if (modalImg) {
        modalImg.src = imageData.src;
        modalImg.alt = imageData.alt || imageData.name;
    }

    if (modalCaption) {
        modalCaption.textContent = imageData.name;
    }

    modal.classList.remove('hidden');
}

// Close modal
export function closeModal() {
    const modal = document.querySelector('.modal');
    if (!modal) return;

    modal.classList.add('hidden');
    
    const modalImg = modal.querySelector('.modal-img');
    if (modalImg) {
        modalImg.src = '';
        modalImg.alt = '';
    }

    const modalCaption = modal.querySelector('.modal-caption');
    if (modalCaption) {
        modalCaption.textContent = '';
    }
}

// Update no results message
export function updateNoResultsMessage(show) {
    const noResults = document.querySelector('.no-results');
    if (noResults) {
        noResults.style.display = show ? 'block' : 'none';
    }
}

// Event handlers
export function handleSearch(event) {
    filterImages(event.target.value);
}

export function handleSort(event) {
    const button = event.target;
    const currentOrder = button.dataset.order;
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    
    button.dataset.order = newOrder;
    sortImages(button.dataset.sort, newOrder);
}

export function handleLetterFilter(event) {
    const letter = event.target.dataset.letter;
    filterByLetter(letter);
}
