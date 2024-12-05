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
  /**
   * Creates a new Gallery instance.
   * 
   * @param {string} [containerId='gallery-container'] - ID of the gallery container element
   * @throws {Error} If required DOM elements are not found
   */
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

  /**
   * Loads images from the server API.
   * 
   * @async
   * @returns {Promise<Array>} Array of image objects
   * @throws {Error} If image fetching fails
   */
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

  /**
   * Renders images in the gallery grid.
   * Creates image elements with event listeners and metadata.
   * 
   * @returns {void}
   */
  renderImages() {
    if (!this.imageGrid) return;

    this.imageGrid.innerHTML = '';
    this.images.forEach((img) => {
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

  /**
   * Initializes event listeners for gallery controls.
   * Sets up search, sort, and filter functionality.
   * 
   * @private
   * @returns {void}
   */
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
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    this.closeButton?.addEventListener('click', () => this.closeModal());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  /**
   * Handles search input events.
   * Debounces search to prevent excessive filtering.
   * 
   * @param {Event} event - Search input event
   * @returns {void}
   */
  handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const containers = this.imageGrid.querySelectorAll('.image-container');
    let hasResults = false;

    containers.forEach((container) => {
      const name = container.querySelector('.image-name').textContent.toLowerCase();
      const isVisible = name.includes(searchTerm);
      container.style.display = isVisible ? 'block' : 'none';
      if (isVisible) hasResults = true;
    });

    this.updateNoResultsMessage(!hasResults);
  }

  /**
   * Updates visibility of no-results message based on filtered results.
   * 
   * @private
   * @returns {void}
   */
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

  /**
   * Creates letter filter buttons.
   * 
   * @private
   * @returns {void}
   */
  createLetterFilter() {
    if (!this.letterFilter) return;

    const letters = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
    letters.forEach((letter) => {
      const button = document.createElement('button');
      button.className = 'letter-button';
      button.dataset.letter = letter;
      button.textContent = letter;
      button.addEventListener('click', () => this.filterByLetter(letter));
      this.letterFilter.appendChild(button);
    });
  }

  /**
   * Filters images by starting letter.
   * Updates visibility of matching images.
   * 
   * @param {string} letter - Letter to filter by
   * @returns {void}
   */
  filterByLetter(letter) {
    const containers = this.imageGrid?.querySelectorAll('.image-container') ?? [];
    containers.forEach((container) => {
      const name = container.querySelector('.image-name')?.textContent ?? '';
      container.style.display =
                letter === 'All' || name.startsWith(letter) ? '' : 'none';
    });
  }

  /**
   * Initializes sticky controls for gallery.
   * 
   * @private
   * @returns {void}
   */
  initializeStickyControls() {
    const controls = document.querySelector('.gallery-controls');
    if (!controls || !this.imageGrid) return;

    const updateSticky = () => {
      if (!this.imageGrid) return;
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

  /**
   * Sorts images by name.
   * 
   * @returns {void}
   */
  sortByName() {
    this.sortImages('name');
    this.renderImages();
  }

  /**
   * Sorts images by date.
   * 
   * @returns {void}
   */
  sortByDate() {
    this.sortImages('date');
    this.renderImages();
  }

  /**
   * Sorts images by specified criteria and order.
   * 
   * @param {string} [sortBy='name'] - Sort criteria ('name'|'date')
   * @param {string} [order='asc'] - Sort order ('asc'|'desc')
   * @returns {void}
   */
  sortImages(sortBy = 'name', order = 'asc') {
    this.images.sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
    this.renderImages();
  }

  /**
   * Opens modal with image details.
   * 
   * @param {Object} img - Image object
   * @returns {void}
   */
  openModal(img) {
    if (!this.modal || !this.modalImg || !this.modalCaption) return;

    this.modalImg.src = img.src;
    this.modalCaption.textContent = img.alt;
    this.modal.style.display = 'block';
  }

  /**
   * Closes modal.
   * 
   * @returns {void}
   */
  closeModal() {
    if (!this.modal) return;
    this.modal.style.display = 'none';
  }

  /**
   * Handles errors.
   * 
   * @param {Error} error - Error object
   * @returns {void}
   */
  handleError(error) {
    console.error('Gallery error:', error);
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = error.message;
    this.container?.insertBefore(errorElement, this.imageGrid);
  }

  /**
   * Debounces a function call.
   * 
   * @param {Function} func - Function to debounce
   * @param {number} wait - Milliseconds to wait
   * @returns {Function} Debounced function
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

/**
 * Image filtering functions
 */

/**
 * Filters images based on search term.
 * Updates visibility of images that match the search criteria.
 * 
 * @param {string} searchTerm - Term to filter images by
 * @returns {void}
 */
export function filterImages(searchTerm) {
  const containers = document.querySelectorAll('.image-container');
  const normalizedSearch = searchTerm.toLowerCase().trim();

  containers.forEach((container) => {
    const name = container.querySelector('.image-name').textContent;
    const visible = normalizedSearch === '' ||
                       name.toLowerCase().includes(normalizedSearch);
    container.style.display = visible ? '' : 'none';
  });

  updateNoResultsMessage();
}

/**
 * Helper function to update no results message visibility
 * 
 * @returns {void}
 */
function updateNoResultsMessage() {
  const noResults = document.querySelector('.no-results');
  if (!noResults) return;

  const hasVisibleImages = Array.from(document.querySelectorAll('.image-container'))
    .some((container) => container.style.display !== 'none');

  noResults.style.display = hasVisibleImages ? 'none' : 'block';
}

/**
 * Sorting functions
 */

/**
 * Sorts images by specified criteria and order.
 * 
 * @param {string} [sortBy='name'] - Sort criteria ('name'|'date')
 * @param {string} [order='asc'] - Sort order ('asc'|'desc')
 * @returns {void}
 */
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

  containers.forEach((container) => {
    imageGrid.appendChild(container);
  });
}

/**
 * Image loading functions
 */

/**
 * Loads images from the server and initializes the gallery.
 * 
 * @async
 * @returns {Promise<void>}
 */
export function loadImages() {
  return fetch('/api/images')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      return response.json();
    })
    .then((images) => {
      const imageGrid = document.getElementById('image-grid');
      images.forEach((img) => {
        const container = document.createElement('div');
        container.className = 'image-container';
        container.innerHTML = `
                    <img src="${img.url}" alt="${img.name}" loading="lazy" />
                    <div class="image-name">${img.name}</div>
                `;
        imageGrid.appendChild(container);
      });
    })
    .catch((error) => {
      const errorMessage = document.querySelector('.error-message');
      if (errorMessage) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
      }
    });
}

/**
 * Initialize gallery controls
 */

/**
 * Initializes and loads gallery images.
 * Entry point for gallery functionality.
 * 
 * @returns {Promise<void>}
 */
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
  letters.forEach((letter) => {
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
    sortButtons.forEach((btn) => {
      btn.addEventListener('click', handleSort);
    });
  }
}

/**
 * Handles search input events.
 * Debounces search to prevent excessive filtering.
 * 
 * @param {Event} event - Search input event
 * @returns {void}
 */
export function handleSearch(event) {
  if (!event || !event.target) return;
  const searchTerm = event.target.value.trim();
  filterImages(searchTerm);
}

/**
 * Handles sort button clicks.
 * Updates active state and sorts images.
 * 
 * @param {Event} event - Sort button click event
 * @returns {void}
 */
export function handleSort(event) {
  if (!event || !event.target) return;

  const button = event.target;
  const sortType = button.dataset.sort;

  // Update active state
  const sortButtons = document.querySelectorAll('.sort-btn');
  if (sortButtons) {
    sortButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
  }

  // Sort images
  sortImages(sortType);
}

/**
 * Handles letter filter clicks.
 * Updates active filter and filters images.
 * 
 * @param {Event} event - Letter filter click event
 * @returns {void}
 */
export function handleLetterFilter(event) {
  if (!event || !event.target) return;

  const button = event.target;
  const letter = button.dataset.letter;

  // Update active state
  const letterButtons = document.querySelectorAll('.letter-btn');
  if (letterButtons) {
    letterButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
  }

  // Filter by letter
  filterByLetter(letter);
}

/**
 * Filters images by starting letter.
 * Updates visibility of matching images.
 * 
 * @param {string} letter - Letter to filter by
 * @returns {void}
 */
export function filterByLetter(letter) {
  if (!letter) return;

  const containers = document.querySelectorAll('.image-container');
  if (!containers) return;

  containers.forEach((container) => {
    const nameElement = container.querySelector('.image-name');
    if (!nameElement) return;

    const name = nameElement.textContent || '';
    const firstLetter = name.charAt(0).toLowerCase();
    const visible = letter === 'all' || firstLetter === letter.toLowerCase();
    container.style.display = visible ? '' : 'none';
  });

  updateNoResultsMessage();
}

/**
 * Debounce function for search
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
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

/**
 * Initializes and loads gallery images.
 * Entry point for gallery functionality.
 * 
 * @returns {Promise<void>}
 */
async function loadGalleryImages() {
  const gallery = new Gallery();
  return gallery.loadImages();
}

export default Gallery;
