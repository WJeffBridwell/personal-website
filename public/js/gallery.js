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
    this.startTime = performance.now();
    this.logClient('Constructor', 'Started');
    
    this.gallery = galleryElement;
    this.container = galleryElement.querySelector('.gallery-container');
    this.imageGrid = galleryElement.querySelector('#image-grid');
    this.searchInput = galleryElement.querySelector('#search-input');
    this.letterFilter = galleryElement.querySelector('#letter-filter');
    
    // Get modal elements
    this.modal = document.querySelector('#imageModal');
    console.log('Found modal:', this.modal);
    this.modalImg = this.modal?.querySelector('.modal-img');
    console.log('Found modal img:', this.modalImg);
    this.modalCaption = this.modal?.querySelector('.modal-caption');
    console.log('Found modal caption:', this.modalCaption);
    this.closeButton = this.modal?.querySelector('.close-modal');
    console.log('Found close button:', this.closeButton);
    
    // Pagination elements
    this.prevButton = document.querySelector('#prevPage');
    this.nextButton = document.querySelector('#nextPage');
    this.pageNumbers = document.querySelector('#pageNumbers');
    if (!this.prevButton || !this.nextButton || !this.pageNumbers) {
      console.error('Missing pagination elements');
    }
    this.currentPage = 1;
    this.totalPages = 1;
    this.batchSize = 80; // Show 80 images per page
    
    this.sortNameButton = galleryElement.querySelector('#sort-name');
    this.sortDateButton = galleryElement.querySelector('#sort-date');
    this.images = [];
    this.controls = galleryElement.querySelector('.gallery-controls');

    const initDuration = performance.now() - this.startTime;
    this.logClient('Constructor', 'Complete', initDuration);
    
    // Initialize components
    this.initializeEventListeners();
    this.createLetterFilter();
    this.initializeStickyControls();
    this.initSearch();
  }

  async logClient(component, event, duration = null, details = null) {
    const memory = window.performance?.memory ? 
      Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A';
    const logMessage = `[${new Date().toISOString()}] [Client] [${component}] [${event}] ${duration ? `[${duration}ms]` : ''} [${memory}MB] ${details ? JSON.stringify(details) : ''}`;
    
    try {
      await fetch('/gallery/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          component,
          event,
          duration,
          memory,
          details
        })
      });
    } catch (error) {
      // Fallback to console only if logging endpoint fails
      console.error('Failed to log to server:', error);
    }
  }

  /**
   * Loads images from the server API with pagination support.
   * 
   * @async
   * @returns {Promise<Array>} Array of all image objects
   * @throws {Error} If image fetching fails
   */
  async loadImages() {
    const startTime = performance.now();
    this.logClient('Images', 'Loading started');
    
    try {
      const response = await fetch(`/gallery/initial?page=${this.currentPage}&batchSize=${this.batchSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.files || !Array.isArray(data.files)) {
        throw new Error('Invalid image data received');
      }

      this.images = data.files;
      this.totalPages = data.totalPages;
      this.currentPage = data.page;
      
      this.renderImages();
      this.updatePaginationControls();
      
      const renderDuration = performance.now() - startTime;
      this.logClient('Images', 'Render complete', renderDuration, { 
        renderedCount: data.files.length,
        totalImages: data.total,
        currentPage: data.page,
        totalPages: data.totalPages
      });
      
      const totalDuration = performance.now() - startTime;
      this.logClient('Images', 'Loading complete', totalDuration);
    } catch (error) {
      this.logClient('Images', 'Error', null, { error: error.message });
      this.handleError(error);
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

    // Clear the grid
    this.imageGrid.innerHTML = '';
    
    // Create fragment to avoid reflows
    const fragment = document.createDocumentFragment();

    // Create and append image containers
    this.images.forEach((img) => {
      const container = document.createElement('div');
      container.className = 'image-container';
      container.dataset.date = img.modified || '';

      const imgUrl = img.url;
      const imgName = img.name;

      container.innerHTML = `
        <div class="image-container" data-name="${imgName}">
            <img src="${imgUrl}" alt="${imgName}" loading="lazy" />
            <div class="image-info">
                <span class="image-name">${imgName}</span>
            </div>
        </div>
      `;

      // Add click handler for folder icon
      const folderIcon = container.querySelector('.folder-icon');
      if (folderIcon) {
        folderIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          fetch(`/gallery/finder-search?term=${encodeURIComponent(imgName)}`);
        });
      }

      // Add click handler for image icon
      const imageIcon = container.querySelector('.image-icon');
      if (imageIcon) {
        imageIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(`http://localhost:3001/content-gallery?image-name=${encodeURIComponent(imgName)}`, '_blank');
        });
      }

      // Add click handler for image modal
      container.addEventListener('click', (e) => {
        console.log('Container clicked');
        if (!e.target.closest('.folder-icon') && !e.target.closest('.image-icon')) {
          console.log('Not clicking icons');
          const img = container.querySelector('img');
          if (img) {
            console.log('Found img:', img);
            this.openModal({
              url: img.src,
              name: imgName
            });
          }
        }
      });

      fragment.appendChild(container);
    });

    // Add all images at once
    this.imageGrid.appendChild(fragment);
    
    // Update pagination display
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.textContent = `Showing ${this.images.length} images - Page ${this.currentPage} of ${this.totalPages}`;
    this.imageGrid.parentNode.insertBefore(paginationInfo, this.imageGrid.nextSibling);
    
    const duration = performance.now() - this.startTime;
    this.logClient('Render', 'Complete', duration, { 
      renderedCount: this.images.length 
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
    // Sort buttons
    this.sortNameButton?.addEventListener('click', () => this.sortByName());
    this.sortDateButton?.addEventListener('click', () => this.sortByDate());

    // Modal events
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    this.closeButton?.addEventListener('click', () => this.closeModal());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    // Pagination events
    this.prevButton?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadImages();
      }
    });

    this.nextButton?.addEventListener('click', () => {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.loadImages();
      }
    });

    this.pageNumbers?.addEventListener('click', (e) => {
      const pageButton = e.target.closest('.page-number');
      if (pageButton) {
        const page = parseInt(pageButton.dataset.page);
        if (page !== this.currentPage) {
          this.currentPage = page;
          this.loadImages();
        }
      }
    });
  }

  updatePaginationControls() {
    if (!this.pageNumbers) return;

    this.pageNumbers.innerHTML = '';
    this.prevButton.disabled = this.currentPage === 1;
    this.nextButton.disabled = this.currentPage === this.totalPages;

    const createPageButton = (page, text = page) => {
      const button = document.createElement('button');
      button.className = `page-number ${page === this.currentPage ? 'active' : ''}`;
      button.dataset.page = page;
      button.textContent = text;
      return button;
    };

    const maxButtons = 7;
    const pages = [];

    // Always show first page
    pages.push(1);

    if (this.totalPages <= maxButtons) {
      // Show all pages if total is less than maxButtons
      for (let i = 2; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex pagination with ellipsis
      if (this.currentPage <= 3) {
        // Near start
        pages.push(2, 3, 4, '...', this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        // Near end
        pages.push('...', this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages);
      } else {
        // Middle
        pages.push('...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages);
      }
    }

    // Create and append page buttons
    pages.forEach(page => {
      if (page === '...') {
        const span = document.createElement('span');
        span.className = 'page-ellipsis';
        span.textContent = '...';
        this.pageNumbers.appendChild(span);
      } else {
        this.pageNumbers.appendChild(createPageButton(page));
      }
    });

    // Update button states
    this.prevButton.disabled = this.currentPage === 1;
    this.nextButton.disabled = this.currentPage === this.totalPages;
  }

  /**
   * Initializes the search functionality
   */
  initSearch() {
    if (!this.searchInput) return;

    let timeoutId;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        this.handleSearch(e);
      }, 300);
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
    if (!event?.target) return;
    const searchTerm = event.target.value.toLowerCase().trim();
    const containers = this.imageGrid.querySelectorAll('.image-container');
    let hasResults = false;

    containers.forEach((container) => {
      const name = container.querySelector('.image-name')?.textContent.toLowerCase() || '';
      const isVisible = name.includes(searchTerm);
      container.classList.toggle('hidden', !isVisible);
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
    if (!letter) return;
    
    const containers = this.imageGrid.querySelectorAll('.image-container');
    const isAll = letter.toLowerCase() === 'all';
    let hasResults = false;

    containers.forEach((container) => {
      const name = container.querySelector('.image-name')?.textContent || '';
      const isVisible = isAll || name.startsWith(letter);
      container.classList.toggle('hidden', !isVisible);
      container.style.display = isVisible ? 'block' : 'none';
      if (isVisible) hasResults = true;
    });

    this.updateNoResultsMessage(!hasResults);
  }

  /**
   * Initializes sticky behavior for gallery controls
   * Makes controls stick to top of viewport when scrolling
   * 
   * @returns {void}
   */
  initializeStickyControls() {
    if (!this.controls) return;

    const handleScroll = () => this.updateStickyState();
    const debouncedScroll = this.debounce(handleScroll, 10);

    window.addEventListener('scroll', debouncedScroll);
    window.addEventListener('resize', debouncedScroll);
    
    // Initial check
    this.updateStickyState();
  }

  /**
   * Updates sticky state of controls based on scroll position
   * @private
   * @returns {void}
   */
  updateStickyState() {
    if (!this.controls || !this.container) return;
    
    const rect = this.container.getBoundingClientRect();
    if (rect.top <= 0) {
      this.controls.classList.add('sticky');
    } else {
      this.controls.classList.remove('sticky');
    }
  }

  /**
   * Sorts images by name.
   * 
   * @returns {void}
   */
  sortByName() {
    this.sortImages('name', 'desc');
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
    this.images.sort((a, b) => {
      const comparison = a[sortBy].localeCompare(b[sortBy]);
      return order === 'asc' ? comparison : -comparison;
    });
    this.renderImages();
  }

  /**
   * Opens modal with image details.
   * 
   * @param {Object} img - Image object
   * @returns {void}
   */
  openModal(img) {
    console.log('Opening modal with:', img);
    console.log('Modal elements:', {
      modal: this.modal,
      modalImg: this.modalImg,
      modalCaption: this.modalCaption
    });
    
    if (this.modal && this.modalImg && this.modalCaption) {
      this.modalImg.src = img.url;
      this.modalCaption.textContent = img.name;
      this.modal.classList.add('show');
      console.log('Modal opened');
    } else {
      console.error('Missing modal elements');
    }
  }

  /**
   * Closes modal.
   * 
   * @returns {void}
   */
  closeModal() {
    if (this.modal) {
      this.modal.classList.remove('show');
    }
  }

  /**
   * Handles errors.
   * 
   * @param {Error} error - Error object
   * @returns {void}
   */
  handleError(error) {
    console.error('Gallery error:', error);
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = error.message || 'Network error';
    errorMessage.style.display = 'block';
    this.imageGrid.appendChild(errorMessage);
  }

  /**
   * Debounces a function call.
   * 
   * @param {Function} func - Function to debounce
   * @param {number} wait - Milliseconds to wait
   * @returns {Function} Debounced function
   * @private
   */
  debounce(func, wait) {
    let timeout;
    return (...args) => {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
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
export async function loadGalleryImages() {
  try {
    const response = await fetch(`/gallery/initial?page=1&batchSize=80`);
    if (!response.ok) {
      throw new Error('Failed to fetch images');
    }
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error loading gallery images:', error);
    throw error;
  }
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
    container.style.display = visible ? 'block' : 'none';
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

export default Gallery;
