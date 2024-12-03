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
        this.images = [];
        
        this.initializeEventListeners();
        this.createLetterFilter();
    }

    async loadImages() {
        try {
            const response = await fetch('/api/images');
            if (!response.ok) throw new Error('Failed to fetch images');
            
            this.images = await response.json();
            this.renderImages();
            return this.images;
        } catch (error) {
            this.handleError(error);
            return [];
        }
    }

    renderImages() {
        if (!this.imageGrid) return;
        
        this.imageGrid.innerHTML = '';
        this.images.forEach(img => {
            const container = document.createElement('div');
            container.className = 'image-container';
            container.innerHTML = `
                <img src="${img.url}" alt="${img.name}" loading="lazy" />
                <div class="image-name">${img.name}</div>
            `;
            this.imageGrid.appendChild(container);
        });
    }

    initializeEventListeners() {
        // Search input
        this.searchInput?.addEventListener('input', () => this.handleSearch());

        // Modal events
        this.modal?.addEventListener('click', e => {
            if (e.target === this.modal) this.closeModal();
        });

        this.closeButton?.addEventListener('click', () => this.closeModal());

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.closeModal();
        });

        // Sort controls
        document.getElementById('sort-name')?.addEventListener('click', () => this.sortByName());
        document.getElementById('sort-date')?.addEventListener('click', () => this.sortByDate());
    }

    handleSearch() {
        const searchTerm = this.searchInput?.value.toLowerCase() ?? '';
        const containers = this.imageGrid?.querySelectorAll('.image-container') ?? [];

        containers.forEach(container => {
            const name = container.querySelector('.image-name')?.textContent.toLowerCase() ?? '';
            container.style.display = name.includes(searchTerm) ? '' : 'none';
        });

        this.updateNoResultsMessage(
            Array.from(containers).every(c => c.style.display === 'none')
        );
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

    sortByName() {
        this.images.sort((a, b) => a.name.localeCompare(b.name));
        this.renderImages();
    }

    sortByDate() {
        this.images.sort((a, b) => a.date.localeCompare(b.date));
        this.renderImages();
    }

    openModal(img) {
        if (!this.modal || !this.modalImg || !this.modalCaption) return;
        
        this.modalImg.src = img.src;
        this.modalCaption.textContent = img.alt;
        this.modal.classList.add('show');
    }

    closeModal() {
        this.modal?.classList.remove('show');
    }

    handleError(error) {
        console.error('Gallery error:', error);
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = error.message;
        this.container?.insertBefore(errorElement, this.imageGrid);
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
    const containers = Array.from(imageGrid.querySelectorAll('.image-container'));
    
    containers.sort((a, b) => {
        let valueA, valueB;
        
        if (sortBy === 'date') {
            valueA = new Date(a.dataset.date || 0);
            valueB = new Date(b.dataset.date || 0);
        } else {
            valueA = a.querySelector('.image-name').textContent.toLowerCase();
            valueB = b.querySelector('.image-name').textContent.toLowerCase();
        }
        
        if (order === 'asc') {
            return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
            return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
    });
    
    // Reattach sorted elements
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

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterImages(e.target.value);
        });
    }
});

export function loadGalleryImages() {
    const gallery = new Gallery();
    return gallery.loadImages();
}

export default Gallery;
