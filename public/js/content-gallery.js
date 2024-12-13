/**
 * Content Gallery
 * Handles displaying and filtering content in a grid layout
 */
export class ContentGallery {
    constructor(galleryId, apiEndpoint) {
        this.gallery = document.getElementById(galleryId);
        if (!this.gallery) {
            throw new Error(`Gallery with ID ${galleryId} not found`);
        }

        this.apiEndpoint = apiEndpoint;
        this.content = [];
        this.searchInput = document.getElementById('search-input');
        this.letterFilters = document.getElementById('letter-filters');
        this.sortButtons = document.querySelectorAll('.sort-button');
        this.tagFilters = document.getElementById('tag-filters');

        this.setupEventListeners();
        this.loadContent();
    }

    setupEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.filterContent());
        }

        if (this.letterFilters) {
            this.letterFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('letter-filter')) {
                    this.filterContent();
                }
            });
        }

        if (this.sortButtons) {
            this.sortButtons.forEach(button => {
                button.addEventListener('click', () => {
                    this.sortContent(button.dataset.sort);
                });
            });
        }

        if (this.tagFilters) {
            this.tagFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-filter')) {
                    this.filterContent();
                }
            });
        }
    }

    async loadContent() {
        try {
            const response = await fetch(this.apiEndpoint);
            if (!response.ok) {
                throw new Error('Failed to fetch content');
            }
            this.content = await response.json();
            this.renderContent();
            this.updateTagFilters();
        } catch (error) {
            console.error('Error loading content:', error);
            this.gallery.innerHTML = '<p>Error loading content. Please try again later.</p>';
        }
    }

    renderContent() {
        this.gallery.innerHTML = '';
        const filteredContent = this.getFilteredContent();
        
        filteredContent.forEach(item => {
            const element = document.createElement('div');
            element.className = 'gallery-item';
            element.innerHTML = `
                <img src="${item.thumbnail}" alt="${item.title}">
                <div class="gallery-item__info">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                </div>
            `;
            element.addEventListener('click', () => {
                const event = new CustomEvent('contentSelected', { detail: item });
                this.gallery.dispatchEvent(event);
            });
            this.gallery.appendChild(element);
        });
    }

    getFilteredContent() {
        let filtered = [...this.content];

        // Apply search filter
        if (this.searchInput && this.searchInput.value) {
            const searchTerm = this.searchInput.value.toLowerCase();
            filtered = filtered.filter(item => 
                item.title.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm)
            );
        }

        // Apply letter filter
        if (this.letterFilters) {
            const activeLetterFilter = this.letterFilters.querySelector('.letter-filter.active');
            if (activeLetterFilter && activeLetterFilter.dataset.letter !== 'all') {
                const letter = activeLetterFilter.dataset.letter;
                filtered = filtered.filter(item => 
                    item.title.toLowerCase().startsWith(letter.toLowerCase())
                );
            }
        }

        // Apply tag filters
        if (this.tagFilters) {
            const activeTags = Array.from(this.tagFilters.querySelectorAll('.tag-filter.active'))
                .map(tag => tag.dataset.tag);
            if (activeTags.length > 0) {
                filtered = filtered.filter(item =>
                    item.tags && item.tags.some(tag => activeTags.includes(tag))
                );
            }
        }

        return filtered;
    }

    sortContent(sortType) {
        switch (sortType) {
            case 'title':
                this.content.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'date':
                this.content.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            default:
                console.warn('Unknown sort type:', sortType);
                return;
        }
        this.renderContent();
    }

    filterContent() {
        this.renderContent();
    }

    updateTagFilters() {
        if (!this.tagFilters) return;

        const allTags = new Set();
        this.content.forEach(item => {
            if (item.tags) {
                item.tags.forEach(tag => allTags.add(tag));
            }
        });

        this.tagFilters.innerHTML = '';
        allTags.forEach(tag => {
            const button = document.createElement('button');
            button.className = 'tag-filter';
            button.dataset.tag = tag;
            button.textContent = tag;
            this.tagFilters.appendChild(button);
        });
    }
}
