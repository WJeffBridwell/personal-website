// Gallery module for handling image display and interactions
export class Gallery {
    constructor(containerId = 'gallery-container') {
        this.container = document.getElementById(containerId);
        this.imageGrid = document.getElementById('image-grid');
        this.searchInput = document.getElementById('search-input');
        this.letterFilter = document.getElementById('letter-filter');
        this.modal = document.getElementById('imageModal');
        this.modalImg = this.modal?.querySelector('.modal-img');
        this.modalCaption = this.modal?.querySelector('.modal-caption');
        this.closeButton = this.modal?.querySelector('.close-modal');
        this.sortNameButton = document.getElementById('sort-name');
        this.sortDateButton = document.getElementById('sort-date');
        this.images = [];
        
        this.initializeEventListeners();
        this.createLetterFilter();
        this.initializeStickyControls();
    }

    async loadImages() {
        try {
            const response = await fetch('/api/images');
            if (!response.ok) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = 'Failed to fetch images';
                errorMessage.style.display = 'block';
                this.imageGrid.appendChild(errorMessage);
                throw new Error('Failed to fetch images');
            }
            
            this.images = await response.json();
            this.renderImages();
            return this.images;
        } catch (error) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = error.message || 'Network error';
            errorMessage.style.display = 'block';
            this.imageGrid.appendChild(errorMessage);
            return [];
        }
    }

    renderImages() {
        if (!this.imageGrid) return;
        
        this.imageGrid.innerHTML = '';
        this.images.forEach(img => {
            const container = document.createElement('div');
            container.className = 'image-container';
            container.dataset.date = img.date || '';
            
            // Handle malformed data
            const imgUrl = img.url || '';
            const imgName = img.name || 'undefined';
            
            container.innerHTML = `
                <img src="${imgUrl}" alt="${imgName}" loading="lazy" />
                <div class="search-icon">
                    <i class="fas fa-search"></i>
                </div>
                <div class="image-name">${imgName}</div>
            `;

            // Add click handler to container
            container.addEventListener('click', () => this.openModal(img));
            
            this.imageGrid.appendChild(container);
        });
    }

    initializeEventListeners() {
        // Search input with debouncing
        if (this.searchInput) {
            const debouncedSearch = this.debounce(this.handleSearch.bind(this), 300);
            this.searchInput.addEventListener('input', debouncedSearch);
        }

        // Sort buttons
        this.sortNameButton?.addEventListener('click', () => this.sortByName());
        this.sortDateButton?.addEventListener('click', () => this.sortByDate());

        // Letter filter
        if (this.letterFilter) {
            this.letterFilter.addEventListener('click', (event) => {
                if (event.target.classList.contains('letter-button')) {
                    const letter = event.target.dataset.letter;
                    this.filterByLetter(letter);
                }
            });
        }

        // Modal events
        this.modal?.addEventListener('click', e => {
            if (e.target === this.modal) this.closeModal();
        });

        this.closeButton?.addEventListener('click', () => this.closeModal());
        
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        const containers = this.imageGrid.querySelectorAll('.image-container');
        let hasResults = false;
        
        containers.forEach(container => {
            const name = container.querySelector('.image-name').textContent.toLowerCase();
            const isVisible = name.includes(searchTerm);
            container.style.display = isVisible ? 'block' : 'none';
            if (isVisible) hasResults = true;
        });
        
        this.updateNoResultsMessage(!hasResults);
    }

    updateNoResultsMessage(noResults) {
        let message = document.querySelector('.no-results-message');
        
        if (noResults) {
            if (!message) {
                message = document.createElement('div');
                message.className = 'no-results-message';
                message.textContent = 'No matching images found';
                this.container?.insertBefore(message, this.imageGrid);
            }
        } else {
            message?.remove();
        }
    }

    createLetterFilter() {
        if (!this.letterFilter) return;

        const letters = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
        letters.forEach(letter => {
            const button = document.createElement('button');
            button.className = 'letter-button';
            button.dataset.letter = letter;
            button.textContent = letter;
            button.addEventListener('click', () => this.filterByLetter(letter));
            this.letterFilter.appendChild(button);
        });
    }

    filterByLetter(letter) {
        const containers = this.imageGrid?.querySelectorAll('.image-container') ?? [];
        containers.forEach(container => {
            const name = container.querySelector('.image-name')?.textContent ?? '';
            container.style.display = 
                letter === 'All' || name.startsWith(letter) ? '' : 'none';
        });
    }

    initializeStickyControls() {
        const controls = document.querySelector('.gallery-controls');
        if (!controls || !this.imageGrid) return;

        const updateSticky = () => {
            const galleryTop = this.imageGrid.offsetTop;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop >= galleryTop) {
                controls.classList.add('sticky');
            } else {
                controls.classList.remove('sticky');
            }
        };

        // Add event listeners
        window.addEventListener('scroll', updateSticky);
        window.addEventListener('resize', this.debounce(() => {
            updateSticky();
        }, 100));

        // Initial check
        updateSticky();
    }

    sortByName() {
        this.sortImages('name');
        this.renderImages();
    }

    sortByDate() {
        this.sortImages('date');
        this.renderImages();
    }

    sortImages(sortBy) {
        this.images.sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
        this.renderImages();
    }

    openModal(img) {
        if (!this.modal || !this.modalImg || !this.modalCaption) return;
        
        this.modalImg.src = img.src;
        this.modalCaption.textContent = img.alt;
        this.modal.classList.remove('hidden');
    }

    closeModal() {
        if (!this.modal) return;
        this.modal.classList.add('hidden');
    }

    handleError(error) {
        console.error('Gallery error:', error);
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = error.message;
        this.container?.insertBefore(errorElement, this.imageGrid);
    }

    debounce(func, wait) {
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
}

// Image filtering functions
export function filterImages(searchTerm) {
    const containers = document.querySelectorAll('.image-container');
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    containers.forEach(container => {
        const name = container.querySelector('.image-name').textContent;
        const visible = normalizedSearch === '' || 
                       name.toLowerCase().includes(normalizedSearch);
        container.style.display = visible ? '' : 'none';
    });
    
    updateNoResultsMessage();
}

// Helper function to update no results message visibility
function updateNoResultsMessage() {
    const noResults = document.querySelector('.no-results');
    if (!noResults) return;
    
    const hasVisibleImages = Array.from(document.querySelectorAll('.image-container'))
        .some(container => container.style.display !== 'none');
    
    noResults.style.display = hasVisibleImages ? 'none' : 'block';
}

// Sorting functions
export function sortImages(sortBy = 'name', order = 'asc') {
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) {
        return;
    }

    const containers = Array.from(imageGrid.querySelectorAll('.image-container'));
    if (!containers.length) {
        return;
    }
    
    containers.sort((a, b) => {
        let valueA, valueB;
        
        if (sortBy === 'date') {
            valueA = new Date(a.dataset.date || 0).getTime();
            valueB = new Date(b.dataset.date || 0).getTime();
        } else {
            valueA = (a.dataset.name || '').toLowerCase();
            valueB = (b.dataset.name || '').toLowerCase();
        }
        
        return order === 'asc' ? 
            valueA > valueB ? 1 : -1 :
            valueA < valueB ? 1 : -1;
    });
    
    containers.forEach(container => {
        imageGrid.appendChild(container);
    });
}

// Image loading functions
export function loadImages() {
    return fetch('/api/images')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch images');
            }
            return response.json();
        })
        .then(images => {
            const imageGrid = document.getElementById('image-grid');
            images.forEach(img => {
                const container = document.createElement('div');
                container.className = 'image-container';
                container.innerHTML = `
                    <img src="${img.url}" alt="${img.name}" loading="lazy" />
                    <div class="image-name">${img.name}</div>
                `;
                imageGrid.appendChild(container);
            });
        })
        .catch(error => {
            const errorMessage = document.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            }
        });
}

// Initialize gallery controls
export function initializeGalleryControls() {
    const searchInput = document.getElementById('search-input');
    const sortButtons = document.querySelectorAll('.sort-btn');
    const letterFilter = document.querySelector('.letter-filter .letter-buttons');

    // Only proceed if required elements exist
    if (!letterFilter || !searchInput) {
        console.warn('Required gallery control elements not found');
        return;
    }
    
    // Generate A-Z buttons
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    letters.forEach(letter => {
        const button = document.createElement('button');
        button.className = 'letter-btn';
        button.textContent = letter;
        button.dataset.letter = letter.toLowerCase();
        button.addEventListener('click', handleLetterFilter);
        letterFilter.appendChild(button);
    });

    // Add event listeners
    if (searchInput) {
        const debouncedSearch = debounce(handleSearch, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }

    if (sortButtons) {
        sortButtons.forEach(btn => {
            btn.addEventListener('click', handleSort);
        });
    }
}

// Handle search input
export function handleSearch(event) {
    if (!event || !event.target) return;
    const searchTerm = event.target.value.trim();
    filterImages(searchTerm);
}

// Handle sort button clicks
export function handleSort(event) {
    if (!event || !event.target) return;
    
    const button = event.target;
    const sortType = button.dataset.sort;
    
    // Update active state
    const sortButtons = document.querySelectorAll('.sort-btn');
    if (sortButtons) {
        sortButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }
    
    // Sort images
    sortImages(sortType);
}

// Handle letter filter clicks
export function handleLetterFilter(event) {
    if (!event || !event.target) return;
    
    const button = event.target;
    const letter = button.dataset.letter;
    
    // Update active state
    const letterButtons = document.querySelectorAll('.letter-btn');
    if (letterButtons) {
        letterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }
    
    // Filter by letter
    filterByLetter(letter);
}

// Filter images by letter
export function filterByLetter(letter) {
    if (!letter) return;

    const containers = document.querySelectorAll('.image-container');
    if (!containers) return;

    containers.forEach(container => {
        const nameElement = container.querySelector('.image-name');
        if (!nameElement) return;

        const name = nameElement.textContent || '';
        const firstLetter = name.charAt(0).toLowerCase();
        const visible = letter === 'all' || firstLetter === letter.toLowerCase();
        container.style.display = visible ? '' : 'none';
    });

    updateNoResultsMessage();
}

// Initialize controls when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeGalleryControls);

// Debounce function for search
export function debounce(func, wait) {
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

export function loadGalleryImages() {
    const gallery = new Gallery();
    return gallery.loadImages();
}

export default Gallery;
