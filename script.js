// Constants
const CHUNK_SIZE = 10;
const MODAL_ID = 'modal';
const MODAL_IMG_ID = 'modal-img';
const MODAL_CAPTION_ID = 'caption';

// Global state
let currentPage = 1;
let isLoading = false;
let hasMoreImages = true;
let currentChunk = 0;
let allImages = [];

// Performance metrics tracking
let performanceMetrics = {
    imageLoading: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 },
    scrollHandling: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 },
    modal: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 },
    memory: {}
};

// DOM Helper Functions
function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    children.forEach(child => element.appendChild(child));
    return element;
}

// Modal Functions
const modalFunctions = {
    initModal: function() {
        let modal = document.getElementById(MODAL_ID);
        let modalImg = document.getElementById(MODAL_IMG_ID);
        let caption = document.getElementById(MODAL_CAPTION_ID);

        // Clean up any existing modal
        if (modal) {
            modal.remove();
            modal = null;
        }

        // Create new modal
        modal = createElement('div', { id: MODAL_ID, className: 'modal' });
        modalImg = createElement('img', { id: MODAL_IMG_ID, className: 'modal-content' });
        caption = createElement('div', { id: MODAL_CAPTION_ID });

        modal.appendChild(modalImg);
        modal.appendChild(caption);
        document.body.appendChild(modal);

        // Event Listeners for closing modal
        const handleClick = (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        };

        const handlePopState = () => {
            if (modal.style.display === 'block') {
                this.closeModal();
            }
        };

        // Add event listeners
        modal.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleKeyDown);
        modalImg.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeModal();
        });
        window.addEventListener('popstate', handlePopState);

        // Store event handlers for cleanup
        modal._handlers = {
            click: handleClick,
            keydown: handleKeyDown,
            popstate: handlePopState
        };

        return { modal, modalImg, caption };
    },

    openModal: function(imgSrc, captionText) {
        console.log('Opening modal with:', { imgSrc, captionText });
        
        const { modal, modalImg, caption } = this.initModal();

        if (!modal || !modalImg || !caption) {
            console.error('Modal elements not found');
            return;
        }

        // Set properties before showing modal
        modalImg.src = imgSrc;
        caption.textContent = captionText || '';
        
        // Show modal
        modal.style.display = 'block';
        document.body.classList.add('modal-open');

        // Push state to handle browser back button
        window.history.pushState({ modal: true }, '');
        
        console.log('Modal opened successfully');
    },

    closeModal: function() {
        const modal = document.getElementById(MODAL_ID);
        if (!modal) return;

        modal.style.display = 'none';
        document.body.classList.remove('modal-open');

        // Pop state if we added one
        if (window.history.state && window.history.state.modal) {
            window.history.back();
        }

        // Clean up event listeners
        if (modal._handlers) {
            modal.removeEventListener('click', modal._handlers.click);
            document.removeEventListener('keydown', modal._handlers.keydown);
            window.removeEventListener('popstate', modal._handlers.popstate);
        }
    },

    handleModalClick: function(event) {
        if (event.target.classList.contains('modal')) {
            modalFunctions.closeModal();
        }
    },

    handleKeyDown: function(event) {
        if (event.key === 'Escape') {
            modalFunctions.closeModal();
        }
    }
};

// Image Loading Functions
const imageFunctions = {
    fetchImages: async function(page = 1, limit = 10) {
        try {
            console.log(`Fetching images for page ${page}`);
            const response = await fetch(`/api/images?page=${page}&limit=${limit}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                console.error('Expected array of images, got:', typeof data);
                showError('Failed to load images');
                return [];
            }
            
            return data.map(image => ({
                src: `/images/${encodeURIComponent(image.name)}`,
                alt: image.name.replace(/\.[^/.]+$/, '') // Remove file extension
            }));
        } catch (error) {
            console.error('Error fetching images:', error);
            showError('Failed to load images');
            return [];
        }
    },

    displayImages: async function(images) {
        console.log('Starting to display images:', images.length);
        const grid = document.getElementById('image-grid');
        if (!grid) {
            console.error('Image grid element not found');
            return;
        }

        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('visible');
        }

        for (const image of images) {
            const container = createElement('div', { className: 'image-container skeleton' });

            const img = createElement('img', {
                className: 'loading',
                alt: image.alt || '',
                loading: 'lazy',
                src: image.src
            });

            const searchIcon = createElement('i', { 
                className: 'fas fa-search search-icon'
            });

            const nameLabel = createElement('div', {
                className: 'image-name'
            });
            nameLabel.textContent = image.alt;

            img.onload = () => {
                img.classList.remove('loading');
                img.classList.add('loaded');
                container.classList.remove('skeleton');
                setupClickHandlers();
            };

            img.onerror = () => {
                img.classList.remove('loading');
                img.classList.add('error');
                container.classList.remove('skeleton');
                container.classList.add('error');
                setupClickHandlers();
            };

            // Set up click handlers
            function setupClickHandlers() {
                // Add click handler to search icon
                searchIcon.onclick = async function(e) {
                    e.stopPropagation(); // Prevent event from bubbling
                    try {
                        const response = await fetch(`/api/finder-search?term=${encodeURIComponent(img.alt)}`);
                        if (!response.ok) {
                            throw new Error('Search failed');
                        }
                        const data = await response.json();
                        if (!data.success) {
                            throw new Error(data.error || 'Search failed');
                        }
                    } catch (error) {
                        console.error('Search error:', error);
                        showError('Search failed');
                    }
                };

                // Add click handler to container
                container.onclick = function() {
                    modalFunctions.openModal(image.src, img.alt);
                };
            }

            container.appendChild(img);
            container.appendChild(searchIcon);
            container.appendChild(nameLabel);
            grid.appendChild(container);
        }

        if (loadingIndicator) {
            loadingIndicator.classList.remove('visible');
        }
    },

    loadNextImageChunk: async function() {
        if (isLoading || !hasMoreImages) return;
        
        try {
            isLoading = true;
            console.log('Loading next chunk, page:', currentPage);
            
            const images = await imageFunctions.fetchImages(currentPage);
            console.log(`Fetched ${images.length} images for page ${currentPage}`);
            
            if (images.length === 0) {
                console.log('No more images to load');
                hasMoreImages = false;
                return;
            }
            
            await imageFunctions.displayImages(images);
            currentPage++;
            
        } catch (error) {
            console.error('Error loading next chunk:', error);
            showError('Failed to load more images');
        } finally {
            isLoading = false;
        }
    }
};

// Additional Image Loading Functions
const additionalImageFunctions = {
    loadImages: async function(page = 1, limit = 10) {
        try {
            console.log('Setting up image grid...');
            const grid = gridFunctions.setupImageGrid();
            if (!grid) {
                throw new Error('Failed to initialize image grid');
            }
            console.log('Fetching images...');
            const images = await imageFunctions.fetchImages(page, limit);
            console.log('Displaying images...');
            await imageFunctions.displayImages(images);
            console.log('Images loaded successfully');
            return images;
        } catch (error) {
            console.error('Error loading images:', error);
            showError('Failed to load images');
            return [];
        }
    },

    loadImagesInChunks: async function(images, chunkSize = CHUNK_SIZE) {
        const startTime = performance.now();
        const grid = document.getElementById('image-grid');

        if (!grid) {
            console.error('Image grid element not found');
            return 0;
        }

        for (let i = 0; i < images.length; i += chunkSize) {
            const chunk = images.slice(i, i + chunkSize);
            await imageFunctions.displayImages(chunk);
        }

        const duration = performance.now() - startTime;
        updatePerformanceMetrics('imageLoading', duration);
        return duration;
    }
};

// Grid and Sorting Functions
const gridFunctions = {
    setupImageGrid: function() {
        const grid = document.getElementById('image-grid');
        if (!grid) {
            console.error('Image grid not found');
            return;
        }
        return grid;
    },

    sortImagesAZ: function() {
        const sortAZBtn = document.getElementById('sortAZ');
        const sortZABtn = document.getElementById('sortZA');
        
        // Update button states
        sortAZBtn.classList.add('active');
        sortZABtn.classList.remove('active');
        
        const grid = document.getElementById('image-grid');
        const containers = Array.from(grid.getElementsByClassName('image-container'));
        
        containers.sort((a, b) => {
            const aName = a.querySelector('img').alt.toLowerCase();
            const bName = b.querySelector('img').alt.toLowerCase();
            return aName.localeCompare(bName);
        });
        
        containers.forEach(container => grid.appendChild(container));
    },

    sortImagesZA: function() {
        const sortAZBtn = document.getElementById('sortAZ');
        const sortZABtn = document.getElementById('sortZA');
        
        // Update button states
        sortZABtn.classList.add('active');
        sortAZBtn.classList.remove('active');
        
        const grid = document.getElementById('image-grid');
        const containers = Array.from(grid.getElementsByClassName('image-container'));
        
        containers.sort((a, b) => {
            const aName = a.querySelector('img').alt.toLowerCase();
            const bName = b.querySelector('img').alt.toLowerCase();
            return bName.localeCompare(aName);
        });
        
        containers.forEach(container => grid.appendChild(container));
    },

    setupSortingControls: function() {
        const sortAZBtn = document.getElementById('sortAZ');
        const sortZABtn = document.getElementById('sortZA');
        
        if (sortAZBtn) {
            sortAZBtn.addEventListener('click', () => {
                this.sortImagesAZ();
            });
        }
        
        if (sortZABtn) {
            sortZABtn.addEventListener('click', () => {
                this.sortImagesZA();
            });
        }
    }
};

// Error handling
function showError(message) {
    const errorElement = createElement('div', {
        className: 'error-message'
    });
    errorElement.textContent = message;
    document.body.appendChild(errorElement);
}

function createErrorElement(message) {
    const errorDiv = createElement('div', {
        className: 'error-message',
        textContent: message
    });
    return errorDiv;
}

// Utility Functions
function createLoadingIndicator() {
    return createElement('div', {
        className: 'loading-indicator',
        textContent: 'Loading more images...'
    });
}

function extractTags(filename) {
    try {
        const tagMatch = filename.match(/\[(.*?)\]/);
        if (tagMatch && tagMatch[1]) {
            return tagMatch[1].split(',').map(tag => tag.trim());
        }
        return [];
    } catch (error) {
        console.error('Error extracting tags:', error);
        return [];
    }
}

function createTagElements(tags) {
    const container = createElement('div', { className: 'tag-container' });
    tags.forEach(tag => {
        const tagElement = createElement('span', {
            className: 'tag',
            textContent: tag
        });
        container.appendChild(tagElement);
    });
    return container;
}

// Performance Monitoring Functions
function updatePerformanceMetrics(metric, duration) {
    if (!performanceMetrics[metric]) {
        performanceMetrics[metric] = { total: 0, count: 0, avg: 0, min: Infinity, max: 0 };
    }
    
    performanceMetrics[metric].total += duration;
    performanceMetrics[metric].count++;
    performanceMetrics[metric].avg = performanceMetrics[metric].total / performanceMetrics[metric].count;
    performanceMetrics[metric].min = Math.min(performanceMetrics[metric].min, duration);
    performanceMetrics[metric].max = Math.max(performanceMetrics[metric].max, duration);
}

function resetPerformanceMetrics() {
    performanceMetrics = {
        imageLoading: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 },
        scrollHandling: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 },
        modal: { total: 0, count: 0, avg: 0, min: Infinity, max: 0 },
        memory: {}
    };
}

function getPerformanceMetrics() {
    return performanceMetrics;
}

function updateMemoryMetrics() {
    if (window.performance && window.performance.memory) {
        performanceMetrics.memory = {
            usedJSHeapSize: window.performance.memory.usedJSHeapSize,
            totalJSHeapSize: window.performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
        };
    }
}

// Search functionality
async function searchImages(query) {
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error('Search failed');
        }

        const results = await response.json();
        return results;
    } catch (error) {
        console.error('Search error:', error);
        showError('Search failed');
        return [];
    }
}

// Event Handlers
function handleScroll() {
    if (isLoading || !hasMoreImages) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const bodyHeight = document.body.offsetHeight;
    
    // Load more when user scrolls near the bottom
    if (bodyHeight - scrollPosition < 1000) {
        imageFunctions.loadNextImageChunk();
    }
}

// Initialization
async function init() {
    try {
        console.log('Initializing...');
        
        // Reset state
        currentPage = 1;
        isLoading = false;
        hasMoreImages = true;
        
        // Initialize modal
        modalFunctions.initModal();

        // Initialize grid
        const grid = gridFunctions.setupImageGrid();
        if (!grid) {
            throw new Error('Failed to initialize image grid');
        }

        // Set up sorting controls
        gridFunctions.setupSortingControls();

        // Load initial images
        console.log('Loading initial images from local directory...');
        await imageFunctions.loadNextImageChunk();
        console.log('Initial images loaded');

        // Add scroll event listener for infinite scroll
        window.addEventListener('scroll', handleScroll);
        console.log('Scroll listener added');

        // Add search functionality
        const searchButton = document.getElementById('searchButton');
        const searchInput = document.getElementById('searchInput');

        if (searchButton && searchInput) {
            searchButton.addEventListener('click', async () => {
                const query = searchInput.value.trim();
                if (!query) return;

                try {
                    const response = await fetch(`/api/finder-search?term=${encodeURIComponent(query)}`);
                    if (!response.ok) {
                        throw new Error('Search failed');
                    }
                    const data = await response.json();
                    if (!data.success) {
                        throw new Error(data.error || 'Search failed');
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    showError('Search failed');
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchButton.click();
                }
            });
        }
        
        console.log('Initialization complete');
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the gallery');
    }
}

// Call init when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
