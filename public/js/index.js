/**
 * Personal Website Frontend JavaScript
 *
 * This module handles client-side functionality for index.html
 */

// Only initialize if we're on index.html
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGallery);
  } else {
    initializeGallery();
  }
}

// Gallery state management
const galleryState = {
  modal: null,
  modalImg: null,
  modalCaption: null,
  closeBtn: null,
  currentPage: 1,
  hasMore: true,
  loadedImages: new Set(),
  batchSize: 80,
  backgroundLoading: false,
  backgroundTimer: null,
  isLoading: false,
  activeLoads: 0,
  maxConcurrentLoads: 3,
};

/**
 * Initializes the modal component with all necessary elements and event listeners
 * Handles cleanup of existing modals and sets up error boundaries
 */
function initializeModal() {
  try {
    // Clean up existing modal if present
    const existingModal = document.getElementById('imageModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create and configure modal elements
    galleryState.modal = document.createElement('div');
    galleryState.modal.id = 'imageModal';
    galleryState.modal.className = 'modal';
    galleryState.modal.style.display = 'none';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Configure close button
    galleryState.closeBtn = document.createElement('span');
    galleryState.closeBtn.className = 'close-modal';
    galleryState.closeBtn.innerHTML = '&times;';

    // Configure modal image with loading and error states
    galleryState.modalImg = document.createElement('img');
    galleryState.modalImg.className = 'modal-img';
    galleryState.modalImg.alt = '';
    galleryState.modalImg.style.cursor = 'pointer';

    galleryState.modalImg.addEventListener('load', () => {
      galleryState.modalImg.style.opacity = '1';
    });

    galleryState.modalImg.addEventListener('error', (e) => {
      console.error('Failed to load image:', e);
      galleryState.modalCaption.textContent = 'Error loading image';
      galleryState.modalImg.style.display = 'none';
    });

    // Handle click events
    galleryState.modalImg.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal();
    });

    // Configure caption
    galleryState.modalCaption = document.createElement('div');
    galleryState.modalCaption.className = 'modal-caption';

    // Assemble modal
    modalContent.appendChild(galleryState.closeBtn);
    modalContent.appendChild(galleryState.modalImg);
    modalContent.appendChild(galleryState.modalCaption);
    galleryState.modal.appendChild(modalContent);
    document.body.appendChild(galleryState.modal);

    // Add event listeners
    galleryState.closeBtn.onclick = closeModal;
    galleryState.modal.onclick = (event) => {
      if (event.target === galleryState.modal) {
        closeModal();
      }
    };
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    });
  } catch (error) {
    console.error('Error initializing modal:', error);
  }
}

/**
 * Opens the modal with the specified image and caption
 * @param {string} imageSrc - URL of the image to display
 * @param {string} caption - Caption text for the image
 */
function openModal(imageSrc, caption) {
  try {
    if (!galleryState.modal) {
      console.error('Modal not initialized');
      initializeModal();
    }

    if (!imageSrc) {
      console.error('No image source provided');
      return;
    }

    galleryState.modalImg.style.opacity = '0';
    galleryState.modalImg.style.display = 'block';
    galleryState.modalImg.src = imageSrc;
    galleryState.modalCaption.textContent = caption || '';
    galleryState.modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Add history state for back button support
    history.pushState({ modal: true }, '');
  } catch (error) {
    console.error('Error opening modal:', error);
  }
}

/**
 * Closes the modal and cleans up its state
 */
function closeModal() {
  try {
    if (!galleryState.modal) return;

    galleryState.modal.style.display = 'none';
    galleryState.modalImg.src = '';
    galleryState.modalImg.style.opacity = '0';
    galleryState.modalCaption.textContent = '';
    document.body.style.overflow = '';
  } catch (error) {
    console.error('Error closing modal:', error);
  }
}

// Create image container with overlays
function createImageContainer(image) {
  const container = document.createElement('div');
  container.className = 'image-container';

  // Create image element
  const img = document.createElement('img');
  img.src = image.path;
  img.alt = image.name;
  img.loading = 'lazy';

  // Create name label
  const nameLabel = document.createElement('div');
  nameLabel.className = 'image-name';
  nameLabel.textContent = image.name;

  // Add elements to container
  container.appendChild(img);
  container.appendChild(nameLabel);

  return container;
}

// Display images in the grid
function displayImages(images, append = false) {
  const imageGrid = document.getElementById('image-grid');
  if (!imageGrid) return;

  if (!append) {
    imageGrid.innerHTML = '';
  }

  images.forEach((image) => {
    const container = createImageContainer(image);
    imageGrid.appendChild(container);
  });
}

/**
 * Fetches images from the server
 * @param {string} cursor - Cursor for pagination
 * @param {number} limit - Number of images to fetch
 * @returns {Promise<Object>} Object containing images and next cursor
 */
async function fetchImages(page = 1, limit = 100, letter = null) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (letter) {
    params.append('letter', letter);
  }

  const response = await fetch(`/gallery/images?${params}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Searches for an image in the macOS Finder
 * @param {string} imageName - Name of the image to search for
 */
async function searchImageInFinder(imageName) {
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

// Update image loading
async function loadImages(page = 1, batchSize = 80) {
  try {
    const response = await fetch(`/gallery/initial?page=${page}&batchSize=${batchSize}`);
    if (!response.ok) {
      throw new Error('Failed to fetch images');
    }
    const data = await response.json();
    return {
      files: data.files,
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
      hasMore: data.hasMore,
    };
  } catch (error) {
    console.error('Error loading images:', error);
    throw error;
  }
}

// Update image rendering
function renderImage(image) {
  const img = document.createElement('img');
  img.src = `/gallery/image/${encodeURIComponent(image)}?thumbnail=true`;
  img.alt = image;
  img.loading = 'lazy';
  return img;
}

/**
 * Initializes the sort buttons component with all necessary elements and event listeners
 * Handles cleanup of existing buttons and sets up error boundaries
 */
function initializeSortButtons() {
  const sortButtons = document.querySelectorAll('.sort-btn');
  if (!sortButtons.length) return;

  // Function to sort images
  function sortImages(direction) {
    const grid = document.getElementById('image-grid');
    const containers = Array.from(grid.getElementsByClassName('image-container'));

    containers.sort((a, b) => {
      const nameA = a.querySelector('img').alt.toLowerCase();
      const nameB = b.querySelector('img').alt.toLowerCase();
      return direction === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

    // Remove existing containers
    containers.forEach((container) => container.remove());

    // Add sorted containers back
    containers.forEach((container) => grid.appendChild(container));

    // Update active state of sort buttons
    sortButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sort === direction);
    });
  }

  // Add click handlers
  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const direction = button.dataset.sort;
      sortImages(direction);
    });
  });
}

/**
 * Initializes the letter filter component with all necessary elements and event listeners
 * Handles cleanup of existing filters and sets up error boundaries
 */
async function initializeLetterFilter() {
  console.log('Initializing letter filter...');
  const letterButtons = document.querySelector('.letter-buttons');
  if (!letterButtons) return;

  try {
    // Fetch all available letters
    const response = await fetch('/gallery/letters');
    const data = await response.json();

    if (!data.letters || !Array.isArray(data.letters)) {
      console.error('Invalid letters data:', data);
      return;
    }

    // Clear existing buttons
    letterButtons.innerHTML = '';

    // Create "All" button
    const allButton = document.createElement('button');
    allButton.className = 'letter-btn active';
    allButton.textContent = 'All';
    allButton.addEventListener('click', () => filterByLetter(null));
    letterButtons.appendChild(allButton);

    // Create letter buttons
    data.letters.forEach((letter) => {
      const button = document.createElement('button');
      button.className = 'letter-btn';
      button.textContent = letter;
      button.addEventListener('click', () => filterByLetter(letter));
      letterButtons.appendChild(button);
    });

    // Update total count
    const totalCountElement = document.querySelector('.total-count');
    if (totalCountElement) {
      totalCountElement.textContent = `0 / ${data.total} images`;
    }
  } catch (error) {
    console.error('Error initializing letter filter:', error);
  }
}

// Filter images by letter
async function filterByLetter(letter) {
  console.log('Filtering by letter:', letter);

  // Update active button
  const buttons = document.querySelectorAll('.letter-btn');
  buttons.forEach((btn) => {
    btn.classList.toggle(
      'active',
      letter === null ? btn.textContent === 'All' : btn.textContent === letter,
    );
  });

  // Show/hide images based on letter
  const containers = document.querySelectorAll('.image-container');
  containers.forEach((container) => {
    const imageName = container.querySelector('.image-name').textContent.toLowerCase();
    if (letter === null) {
      container.classList.remove('hidden');
    } else {
      const startsWithLetter = imageName.startsWith(letter.toLowerCase());
      container.classList.toggle('hidden', !startsWithLetter);
    }
  });

  // Update visible count
  const visibleCount = Array.from(containers).filter(
    (container) => !container.classList.contains('hidden'),
  ).length;

  const totalCountElement = document.querySelector('.total-count');
  if (totalCountElement) {
    const totalCount = containers.length;
    totalCountElement.textContent = `${visibleCount} / ${totalCount} images`;
  }
}

// Background loading function
async function loadInBackground() {
  if (!galleryState.backgroundLoading
        || !galleryState.hasMore
        || galleryState.isLoading
        || galleryState.activeLoads >= galleryState.maxConcurrentLoads) {
    return;
  }

  try {
    galleryState.activeLoads += 1;
    const nextPage = galleryState.currentPage + 1;
    console.log('Background loading page:', nextPage);

    const response = await loadImages(nextPage, galleryState.batchSize);

    if (response && response.files.length > 0) {
      galleryState.currentPage = response.page;
      galleryState.hasMore = response.hasMore;

      // Pre-load images in memory
      const imagePromises = response.files.map((image) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = `/gallery/thumbnail/${encodeURIComponent(image)}`;
      }));

      // Wait for images to load in memory
      await Promise.all(imagePromises);

      // Add to DOM if we're still in background loading mode
      if (galleryState.backgroundLoading) {
        await displayImages(response.files, true);

        // Update total count
        const totalCountElement = document.querySelector('.total-count');
        if (totalCountElement) {
          totalCountElement.textContent = `${galleryState.loadedImages.size} / ${response.totalPages} images`;
        }
      }

      // Schedule next background load
      if (galleryState.hasMore) {
        setTimeout(loadInBackground, 500); // Throttle to avoid overwhelming browser
      }
    }
  } catch (error) {
    console.error('Background loading error:', error);
  } finally {
    galleryState.activeLoads -= 1;
  }
}

// Start background loading
function startBackgroundLoading() {
  if (galleryState.backgroundTimer) {
    clearTimeout(galleryState.backgroundTimer);
  }

  galleryState.backgroundLoading = true;
  galleryState.backgroundTimer = setTimeout(loadInBackground, 1000);
}

// Stop background loading
function stopBackgroundLoading() {
  galleryState.backgroundLoading = false;
  if (galleryState.backgroundTimer) {
    clearTimeout(galleryState.backgroundTimer);
    galleryState.backgroundTimer = null;
  }
}

// Show loading skeleton
function showLoadingSkeleton(count = 8) {
  const grid = document.getElementById('image-grid');
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'image-container skeleton';
    skeleton.innerHTML = '<div class="skeleton-img"></div><div class="skeleton-text"></div>';
    grid.appendChild(skeleton);
  }
}

// Remove loading skeletons
function removeLoadingSkeletons() {
  const skeletons = document.querySelectorAll('.skeleton');
  skeletons.forEach((skeleton) => skeleton.remove());
}

/**
 * Initializes the tag filter component with all necessary elements and event listeners
 * Handles cleanup of existing filters and sets up error boundaries
 */
async function initializeTagFilter() {
  try {
    console.log('Initializing tag filter...');
    // Wait for jQuery and Select2 to be loaded
    if (typeof $ === 'undefined' || typeof $.fn.select2 === 'undefined') {
      console.error('jQuery or Select2 not loaded');
      return;
    }

    // Fetch available tags
    const response = await fetch('/gallery/tags');
    const data = await response.json();

    if (!data.tags || !Array.isArray(data.tags)) {
      console.error('Invalid tags data:', data);
      return;
    }

    const tagFilter = $('#tag-filter');
    if (tagFilter.length === 0) {
      console.error('#tag-filter element not found');
      return;
    }

    // Clear existing options
    tagFilter.empty();

    // Add options
    data.tags.forEach((tag) => {
      const option = new Option(tag, tag);
      const color = getTagColor(tag);
      $(option).attr('data-color', color);
      tagFilter.append(option);
    });

    console.log('Initializing Select2...');
    // Initialize Select2
    tagFilter.select2({
      placeholder: 'Filter by tags...',
      allowClear: true,
      templateSelection: formatTagSelection,
      templateResult: formatTagOption,
      width: '200px',
    });

    // Handle tag selection
    tagFilter.on('change', function () {
      const selectedTags = $(this).val() || [];
      console.log('Selected tags:', selectedTags);
      filterImagesByTags(selectedTags);
    });

    console.log('Tag filter initialized successfully');
  } catch (error) {
    console.error('Error initializing tag filter:', error);
  }
}

// Format tag options in dropdown
function formatTagOption(tag) {
  if (!tag.id) return tag.text;

  const color = $(tag.element).data('color');
  return $(`<span style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; border: 1px solid rgba(0,0,0,0.1);"></span>
        <span>${tag.text}</span>
    </span>`);
}

// Format selected tags
function formatTagSelection(tag) {
  if (!tag.id) return tag.text;

  const color = $(tag.element).data('color');
  return $(`<span style="display: flex; align-items: center; gap: 4px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; border: 1px solid rgba(0,0,0,0.1);"></span>
        <span>${tag.text}</span>
    </span>`);
}

// Filter images by selected tags
function filterImagesByTags(selectedTags) {
  const containers = document.querySelectorAll('.image-container');

  containers.forEach((container) => {
    const dots = container.querySelector('.tag-dots');
    const tags = dots ? Array.from(dots.children).map((dot) => dot.title) : [];

    if (selectedTags.length === 0 || selectedTags.every((tag) => tags.includes(tag))) {
      container.style.display = '';
    } else {
      container.style.display = 'none';
    }
  });
}

/**
 * Initializes the search filter component with all necessary elements and event listeners
 * Handles cleanup of existing filters and sets up error boundaries
 */
function initializeSearchFilter() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  let debounceTimer;

  searchInput.addEventListener('input', (event) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const searchTerm = event.target.value.toLowerCase().trim();
      const containers = document.querySelectorAll('.image-container');

      containers.forEach((container) => {
        const imageName = container.querySelector('.image-name').textContent.toLowerCase();
        container.classList.toggle('hidden', !imageName.includes(searchTerm));
      });
    }, 300);
  });
}

// Create pagination controls
function createPaginationControls(currentPage, totalPages) {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;

  pagination.innerHTML = '';

  // Create previous button
  if (currentPage > 1) {
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.className = 'pagination-btn';
    prevButton.onclick = () => loadImages(currentPage - 1);
    pagination.appendChild(prevButton);
  }

  // Create page number buttons
  for (let i = 1; i <= totalPages; i++) {
    const button = document.createElement('button');
    button.textContent = i;
    button.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
    button.onclick = () => loadImages(i);
    pagination.appendChild(button);
  }

  // Create next button
  if (currentPage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.className = 'pagination-btn';
    nextButton.onclick = () => loadImages(currentPage + 1);
    pagination.appendChild(nextButton);
  }
}

// Update pagination controls
function updatePagination(currentPage, totalPages) {
  const oldPagination = document.querySelector('.pagination-controls');
  if (oldPagination) {
    oldPagination.remove();
  }

  const grid = document.getElementById('image-grid');
  if (grid) {
    const newPagination = createPaginationControls(currentPage, totalPages);
    grid.parentNode.insertBefore(newPagination, grid.nextSibling);
  }
}

// Filter functions
const filterFunctions = {
  filterByLetter,
  initializeLetterFilter,
  initializeSearchFilter,
  fetchImages,
  displayImages,
  createImageContainer,
  initializeModal,
  openModal,
  closeModal,
  loadImages,
  renderImage,
  initializeSortButtons,
  startBackgroundLoading,
  stopBackgroundLoading,
  showLoadingSkeleton,
  removeLoadingSkeletons,
  initializeTagFilter,
  formatTagOption,
  formatTagSelection,
  filterImagesByTags,
  createPaginationControls,
  updatePagination,
};

export {
  filterFunctions,
  galleryState,
  initializeGallery,
};

/**
 * Initializes the gallery functionality
 */
async function initializeGallery() {
  console.log('\n=== Initializing Gallery ===');

  // Check for required elements
  const gallerySection = document.querySelector('.gallery');
  const imageGrid = document.getElementById('image-grid');

  console.log('Gallery elements check:', {
    gallerySection: !!gallerySection,
    imageGrid: !!imageGrid,
  });

  if (!gallerySection || !imageGrid) {
    console.error('Required gallery elements not found');
    return;
  }

  // Load initial images
  await loadInitialImages();

  console.log('\n=== Gallery Initialization Complete ===');
}

// Load initial images
async function loadInitialImages() {
  console.log('\n=== Loading Initial Images ===');

  if (galleryState.isLoading) {
    console.log('Already loading images, skipping');
    return;
  }

  try {
    galleryState.isLoading = true;
    showLoadingSkeleton();

    // Get or create gallery header
    let header = document.querySelector('.gallery__header');
    if (!header) {
      const gallery = document.querySelector('.gallery');
      header = document.createElement('div');
      header.className = 'gallery__header';

      const title = document.createElement('h2');
      title.className = 'gallery__title';
      title.textContent = 'My Collections';
      header.appendChild(title);

      if (gallery.firstChild) {
        gallery.insertBefore(header, gallery.firstChild);
      } else {
        gallery.appendChild(header);
      }
    }

    // Add or update total count display
    let totalCount = header.querySelector('.total-count');
    if (!totalCount) {
      totalCount = document.createElement('div');
      totalCount.className = 'total-count';
      header.appendChild(totalCount);
    }
    totalCount.textContent = 'Loading...';

    // Fetch first page of images
    const data = await loadImages(1, galleryState.batchSize);

    if (data && data.files.length > 0) {
      galleryState.images = data.files;
      galleryState.currentPage = data.page;
      galleryState.totalPages = data.totalPages;

      // Update total count
      totalCount.textContent = `${data.total} images`;

      // Display images
      await displayImages(data.files);

      // Initialize filters after images are loaded
      await initializeLetterFilter();
      initializeSortButtons();
      await initializeTagFilter();

      // Add pagination controls
      updatePagination(data.page, data.totalPages);

      galleryState.initialized = true;
    }
  } catch (error) {
    console.error('Error loading initial images:', error);
  } finally {
    galleryState.isLoading = false;
    removeLoadingSkeletons();
  }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // const images = await fetchImages();
      // await displayImages(images);
    } catch (error) {
      console.error('Failed to initialize gallery:', error);
      const grid = document.getElementById('image-grid');
      if (grid) {
        grid.innerHTML = `<div class="error-message">Failed to load images: ${error.message}</div>`;
      }
    }
  });
}
