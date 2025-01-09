/**
 * @fileoverview Gallery module for managing image display, filtering, sorting,
 * and user interactions in a responsive grid layout.
 * @module gallery
 */

/**
 * Gallery class that handles all image gallery functionality including
 * loading, displaying, filtering, and sorting images.
 * 
 * @class
 */
export class Gallery {
  constructor(galleryElement) {
    // DOM Elements
    this.gallery = galleryElement;
    this.imageGrid = document.querySelector('#image-grid');
    this.searchInput = document.querySelector('#search-input');
    this.tagFilter = document.querySelector('#tag-filter');
    this.sortNameButton = document.querySelector('#sort-name');
    this.letterFilter = document.querySelector('.letter-filter');

    // State management
    this.state = {
      images: [],          // All images from server
      filteredImages: [],  // Images after applying filters
      filters: {
        search: '',
        letter: '',
        tag: ''
      },
      sort: {
        by: 'name',
        order: 'asc'
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        batchSize: 88
      }
    };

    // Initialize
    this.initializeControls();
    this.loadCurrentPage();
  }

  /**
   * Initialize all control event listeners
   */
  initializeControls() {
    // Search input with debounce
    this.searchInput?.addEventListener('input', this.debounce(() => {
      this.state.filters.search = this.searchInput.value.toLowerCase();
      this.applyFiltersAndSort();
    }, 300));

    // Letter filter
    this.letterFilter?.addEventListener('click', (e) => {
      if (e.target.matches('.letter-button')) {
        const letter = e.target.dataset.letter || '';
        this.state.filters.letter = letter;
        
        // Update active state
        this.letterFilter.querySelectorAll('.letter-button').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.letter === letter);
        });
        
        this.applyFiltersAndSort();
      }
    });

    // Tag filter
    this.tagFilter?.addEventListener('change', () => {
      this.state.filters.tag = this.tagFilter.value;
      this.applyFiltersAndSort();
    });

    // Sort
    this.sortNameButton?.addEventListener('click', () => {
      this.state.sort.order = this.state.sort.order === 'asc' ? 'desc' : 'asc';
      this.sortNameButton.querySelector('i').className = 
        `fas fa-sort-alpha-${this.state.sort.order === 'asc' ? 'down' : 'up'}`;
      this.applyFiltersAndSort();
    });
  }

  /**
   * Load current page of images from server
   */
  async loadCurrentPage() {
    try {
      const { currentPage, batchSize } = this.state.pagination;
      const response = await fetch(`/api/gallery/images?page=${currentPage}&limit=${batchSize}`);
      
      if (!response.ok) throw new Error('Failed to fetch images');
      
      const data = await response.json();
      this.state.images = data.images;
      this.state.pagination.totalPages = data.totalPages;
      
      this.applyFiltersAndSort();
    } catch (error) {
      console.error('Error loading images:', error);
    }
  }

  /**
   * Apply all current filters and sort
   */
  applyFiltersAndSort() {
    let filtered = [...this.state.images];

    // Apply search filter
    if (this.state.filters.search) {
      filtered = filtered.filter(img => 
        img.name.toLowerCase().includes(this.state.filters.search)
      );
    }

    // Apply letter filter
    if (this.state.filters.letter) {
      filtered = filtered.filter(img => 
        img.name.toLowerCase().startsWith(this.state.filters.letter.toLowerCase())
      );
    }

    // Apply tag filter
    if (this.state.filters.tag) {
      filtered = filtered.filter(img => 
        img.tags?.includes(this.state.filters.tag)
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      const aVal = this.state.sort.by === 'name' ? a.name : a.modified;
      const bVal = this.state.sort.by === 'name' ? b.name : b.modified;
      
      const comparison = aVal.localeCompare(bVal);
      return this.state.sort.order === 'asc' ? comparison : -comparison;
    });

    this.state.filteredImages = filtered;
    this.renderImages();
  }

  /**
   * Render the current filtered and sorted images
   */
  renderImages() {
    if (!this.imageGrid) return;
    
    // Clear existing content
    this.imageGrid.innerHTML = '';
    
    // Show no results message if needed
    if (this.state.filteredImages.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.textContent = 'No images found';
      this.imageGrid.appendChild(noResults);
      return;
    }

    // Create and append all images
    const fragment = document.createDocumentFragment();

    this.state.filteredImages.forEach(imageData => {
      const card = this.createImageCard(imageData);
      if (card) fragment.appendChild(card);
    });

    this.imageGrid.appendChild(fragment);
  }

  /**
   * Create a single image card using template
   */
  createImageCard(imageData) {
    const template = document.getElementById('gallery-card-template');
    if (!template) return null;

    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.gallery__item');
    
    // Set up image
    const img = clone.querySelector('.item__image');
    if (img) {
      img.src = imageData.url;
      img.alt = imageData.name;
    }

    // Set up name
    const name = clone.querySelector('.item__name');
    if (name) {
      name.textContent = imageData.name;
    }

    // Set up icons
    const galleryIcon = clone.querySelector('.gallery-icon');
    if (galleryIcon) {
      console.log('Found gallery icon, adding click listener');
      galleryIcon.addEventListener('click', (e) => {
        console.log('Gallery icon clicked');
        console.log('Image data:', imageData);
        console.log('Target URL:', `/content-gallery.html?image-name=${encodeURIComponent(imageData.name)}`);
        e.stopPropagation();
        window.location.href = `/content-gallery.html?image-name=${encodeURIComponent(imageData.name)}`;
      });
    } else {
      console.log('Gallery icon not found in template');
    }

    const folderIcon = clone.querySelector('.folder-icon');
    if (folderIcon) {
      console.log('Found folder icon, adding click listener');
      folderIcon.addEventListener('click', (e) => {
        console.log('Folder icon clicked');
        e.stopPropagation();
      });
    } else {
      console.log('Folder icon not found in template');
    }

    // Show image in modal when clicking the image itself
    img?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showModal(img.src);
    });

    return card;
  }

  /**
   * Debounce helper function
   */
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

export default Gallery;
