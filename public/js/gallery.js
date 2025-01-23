/**
 * @fileoverview Gallery module for managing image display and pagination
 * in a responsive grid layout.
 * @module gallery
 */

/**
 * Gallery class that handles image loading, display and pagination.
 *
 * @class
 */
export class Gallery {
  constructor(galleryElement) {
    // DOM Elements
    this.gallery = galleryElement;
    this.imageGrid = document.querySelector('#image-grid');
    this.prevPageBtn = document.querySelector('#prevPage');
    this.nextPageBtn = document.querySelector('#nextPage');
    this.pageNumbers = document.querySelector('#pageNumbers');
    this.searchInput = document.querySelector('#searchInput');
    this.sortSelect = document.querySelector('#sortSelect');
    this.tagSelect = document.querySelector('#tagSelect');
    this.letterFilter = document.querySelector('#letterFilter');

    // Modal elements
    this.modal = document.getElementById('imageModal');
    this.modalImg = this.modal.querySelector('.modal-img');
    this.modalCaption = this.modal.querySelector('.modal-caption');
    this.closeBtn = this.modal.querySelector('.close-modal');

    // State
    this.allImages = []; // All images from server
    this.filteredImages = []; // Images after search/filter
    this.currentPage = 1;
    this.imagesPerPage = 30; // 5 rows × 6 columns
    this.searchTerm = '';
    this.sortOrder = 'name-asc';
    this.currentLetter = 'all';
    this.selectedTags = new Set();
    this.availableTags = new Set();
    this.processingStatus = {
      isProcessing: false,
      progress: 0,
      processedCount: 0,
    };

    // Initialize
    this.loadImages();
    this.initControls();
    this.initLetterFilter();
    this.initModalEvents();
  }

  initControls() {
    // Search input
    this.searchInput?.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.filterAndSortImages();
    });

    // Sort select
    this.sortSelect?.addEventListener('change', (e) => {
      this.sortOrder = e.target.value;
      this.filterAndSortImages();
    });

    // Tag select
    this.tagSelect?.addEventListener('change', (e) => {
      const selectedTag = e.target.value;
      console.log('Tag selected:', selectedTag);
      this.selectedTags = selectedTag ? new Set([selectedTag]) : new Set();
      console.log('Selected tags set to:', [...this.selectedTags]);

      // Count images with this tag before filtering
      if (selectedTag) {
        const taggedImages = this.allImages.filter((img) => img.tags && Array.isArray(img.tags)
                    && img.tags.some((tag) => tag.toLowerCase() === selectedTag.toLowerCase()));
        console.log(`Before filtering - Images with tag '${selectedTag}':`, taggedImages.length);
      }

      this.filterAndSortImages();
    });

    // Previous page button
    this.prevPageBtn?.addEventListener('click', () => {
      this.handlePageNavigation(-1);
    });

    // Next page button
    this.nextPageBtn?.addEventListener('click', () => {
      this.handlePageNavigation(1);
    });
  }

  async loadImages() {
    console.log('JEFF CLIENT - About to fetch from gallery service');
    try {
      // Set loading state
      document.title = '⟳ Loading... | Gallery | Jeff Bridwell';
      if (this.imageGrid) {
        const primaryStatusElement = document.createElement('div');
        primaryStatusElement.classList.add('status');
        primaryStatusElement.textContent = 'Loading...';
        this.imageGrid.innerHTML = '';
        this.imageGrid.appendChild(primaryStatusElement);
      }

      const response = await fetch('http://192.168.86.242:8081/gallery/images');
      console.log('JEFF CLIENT - Got response:', response.status);
      if (!response.ok) throw new Error('Failed to fetch images');

      const data = await response.json();

      // Reset title after loading
      document.title = 'Gallery | Jeff Bridwell';

      // Single, clear count of red-tagged images
      const redCount = data.images.filter((img) => img.tags && Array.isArray(img.tags)
                && img.tags.some((tag) => tag.toLowerCase() === 'red')).length;
      console.log('>>>>> TOTAL RED TAGGED IMAGES IN DATA:', redCount);

      // Store the images as-is
      this.allImages = data.images;

      // Log tag statistics
      const tagStats = {};
      let imagesWithoutTags = 0;
      let imagesWithTags = 0;

      let currentIndex = 0;
      while (currentIndex < this.allImages.length) {
        const img = this.allImages[currentIndex];
        if (img.tags && Array.isArray(img.tags)) {
          imagesWithTags++;
          img.tags.forEach((tag) => {
            tagStats[tag] = (tagStats[tag] || 0) + 1;
          });
        } else {
          imagesWithoutTags++;
          console.warn('Image missing tags or invalid tags format:', img.name);
        }
        currentIndex += 1;
      }

      console.log('Tag statistics:', tagStats);
      console.log(`Images with tags: ${imagesWithTags}, without tags: ${imagesWithoutTags}`);

      // Collect all unique tags and update tag select
      this.availableTags = new Set(
        Object.keys(tagStats).sort((a, b) => tagStats[b] - tagStats[a]),
      );

      this.updateTagSelect();
      this.filterAndSortImages();
    } catch (error) {
      console.error('Error loading images:', error);
      // Reset title on error
      document.title = 'Gallery | Jeff Bridwell';
      if (this.imageGrid) {
        const secondaryStatusElement = document.createElement('div');
        secondaryStatusElement.classList.add('status');
        secondaryStatusElement.textContent = 'Error loading images';
        this.imageGrid.innerHTML = '';
        this.imageGrid.appendChild(secondaryStatusElement);
      }
    }
  }

  updateTagSelect() {
    if (!this.tagSelect) return;

    // Clear existing options except the placeholder
    while (this.tagSelect.options.length > 1) {
      this.tagSelect.remove(1);
    }

    // Sort tags alphabetically
    const sortedTags = Array.from(this.availableTags).sort();

    // Add tag options with color indicators
    sortedTags.forEach((tag) => {
      const option = document.createElement('option');
      option.value = tag;
      const normalizedTag = tag.toLowerCase().replace(/[^a-z]/g, '');
      option.innerHTML = `<span class="tag-color-${normalizedTag}"></span>${tag}`;
      this.tagSelect.appendChild(option);
    });

    // Update select2 if it's being used
    if (window.select2) {
      this.tagSelect.select2({
        placeholder: 'Filter by tags...',
        allowClear: true,
        templateResult: (tag) => {
          if (!tag.id) return tag.text;
          const normalizedTag = tag.id.toLowerCase().replace(/[^a-z]/g, '');
          return $(`<span><span class="tag-color-indicator tag-color-${normalizedTag}"></span>${tag.text}</span>`);
        },
      });
    }
  }

  initLetterFilter() {
    if (!this.letterFilter) return;

    // Create A-Z buttons
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const fragment = document.createDocumentFragment();

    letters.forEach((letter) => {
      const button = document.createElement('button');
      button.className = 'letter-filter__btn';
      button.textContent = letter;
      button.dataset.letter = letter;
      fragment.appendChild(button);
    });

    this.letterFilter.appendChild(fragment);

    // Add click event listener
    this.letterFilter.addEventListener('click', (e) => {
      if (e.target.classList.contains('letter-filter__btn')) {
        // Remove active class from all buttons
        this.letterFilter.querySelectorAll('.letter-filter__btn').forEach((btn) => {
          btn.classList.remove('active');
        });

        // Add active class to clicked button
        e.target.classList.add('active');

        // Update filter and refresh display
        this.currentLetter = e.target.dataset.letter;
        this.filterAndSortImages();
      }
    });
  }

  initModalEvents() {
    // Click on gallery item to open modal
    this.imageGrid.addEventListener('click', (e) => {
      const galleryItem = e.target.closest('.image-container');
      if (galleryItem) {
        const imageUrl = galleryItem.querySelector('img').src;
        const imageName = galleryItem.querySelector('img').alt;
        if (imageUrl && imageName) {
          this.openModal(imageUrl, imageName);
        }
      }
    });

    // Close modal on X button click
    this.closeBtn.addEventListener('click', () => this.closeModal());

    // Close modal on clicking outside the image
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Close modal on ESC key or browser back
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    // Handle browser back button
    window.addEventListener('popstate', () => {
      if (this.modal.style.display === 'flex') {
        this.closeModal();
      }
    });
  }

  openModal(imageUrl, imageName) {
    // Push state for back button support
    window.history.pushState({ modal: true }, '', window.location.pathname);

    // Show loading state
    this.modalImg.style.opacity = '0';
    this.modal.style.display = 'flex';

    // Load full size image
    this.modalImg.onload = () => {
      this.modalImg.style.opacity = '1';
    };

    // Use the passed imageUrl to construct the full-size image URL
    const fullSizeUrl = imageUrl.replace('/thumbnails/', '/');
    this.modalImg.src = fullSizeUrl;
    this.modalCaption.textContent = imageName;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Set window controls to image mode
    setWindowControls('image');
  }

  closeModal() {
    this.modal.style.display = 'none';
    this.modalImg.src = '';
    document.body.style.overflow = 'auto';

    // Handle browser history
    if (window.location.hash !== '') {
      window.history.back();
    }

    // Set window controls to gallery mode
    setWindowControls('gallery');
  }

  filterAndSortImages() {
    console.log('Starting filterAndSortImages');
    console.log('Total images before filter:', this.allImages.length);
    console.log('Current search term:', this.searchTerm);
    console.log('Current letter filter:', this.currentLetter);
    console.log('Selected tags:', [...this.selectedTags]);

    // Filter images by search term, letter, and tags
    this.filteredImages = this.allImages.filter((img) => {
      const matchesSearch = img.name.toLowerCase().includes(this.searchTerm);
      const matchesLetter = this.currentLetter === 'all'
                                || img.name.charAt(0).toUpperCase() === this.currentLetter;

      // Tag filtering - normalize tag case for comparison
      let matchesTags = false;
      if (this.selectedTags.size === 0) {
        matchesTags = true;
      } else if (img.tags && Array.isArray(img.tags)) {
        matchesTags = img.tags.some((tag) => {
          const normalizedTag = tag.toLowerCase();
          const matches = Array.from(this.selectedTags).some((selectedTag) => selectedTag.toLowerCase() === normalizedTag);
          if (matches) {
            console.log(`Image ${img.name} matches tag filter with tag: ${tag}`);
          }
          return matches;
        });
      }

      const matches = matchesSearch && matchesLetter && matchesTags;
      if (!matches && this.selectedTags.size > 0) {
        console.log(`Image ${img.name} filtered out:`, {
          matchesSearch,
          matchesLetter,
          matchesTags,
          imgTags: img.tags,
        });
      }
      return matches;
    });

    console.log('Total images after filter:', this.filteredImages.length);

    // Sort images
    this.filteredImages.sort((a, b) => {
      switch (this.sortOrder) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'date-asc':
        return (new Date(a.date || 0)) - (new Date(b.date || 0));
      case 'date-desc':
        return (new Date(b.date || 0)) - (new Date(a.date || 0));
      default:
        return 0;
      }
    });

    // Reset to first page when filter changes
    this.currentPage = 1;

    // Render the first page
    this.renderCurrentPage();
  }

  renderCurrentPage() {
    console.log('renderCurrentPage - current page:', this.currentPage);
    console.log('renderCurrentPage - images per page:', this.imagesPerPage);
    const start = (this.currentPage - 1) * this.imagesPerPage;
    const end = start + this.imagesPerPage;
    const currentImages = this.filteredImages.slice(start, end);
    console.log('renderCurrentPage - showing images from index', start, 'to', end);
    console.log('renderCurrentPage - total filtered images:', this.filteredImages.length);

    // Clear current grid
    this.imageGrid.innerHTML = '';

    // Create and append new images
    currentImages.forEach((img) => {
      const tile = this.createImageTile(img);
      this.imageGrid.appendChild(tile);
    });

    this.updatePagination();
  }

  updatePagination() {
    const totalPages = Math.ceil(this.filteredImages.length / this.imagesPerPage);
    const totalImages = this.filteredImages.length;

    console.log('updatePagination - total pages:', totalPages);
    console.log('updatePagination - total images:', totalImages);
    console.log('updatePagination - images per page:', this.imagesPerPage);

    // Update prev/next buttons
    if (this.prevPageBtn) {
      this.prevPageBtn.disabled = this.currentPage === 1;
    }
    if (this.nextPageBtn) {
      this.nextPageBtn.disabled = this.currentPage === totalPages;
    }

    // Update page numbers
    if (this.pageNumbers) {
      this.pageNumbers.innerHTML = '';

      // Add total count display
      const countDisplay = document.createElement('span');
      countDisplay.className = 'page-count';
      countDisplay.textContent = `${totalImages.toLocaleString()} images (${totalPages.toLocaleString()} pages) `;
      this.pageNumbers.appendChild(countDisplay);

      // Helper function to add page button
      const addPageButton = (page, text = page) => {
        const button = document.createElement('button');
        button.className = `page-number ${page === this.currentPage ? 'active' : ''}`;
        button.textContent = text;
        button.onclick = () => {
          this.currentPage = page;
          this.renderCurrentPage();
        };
        this.pageNumbers.appendChild(button);
      };

      // Add ellipsis
      const addEllipsis = () => {
        const span = document.createElement('span');
        span.className = 'page-ellipsis';
        span.textContent = '...';
        this.pageNumbers.appendChild(span);
      };

      // First page
      if (totalPages > 0) {
        addPageButton(1);
      }

      // Add ellipsis if there's a gap after first page
      if (this.currentPage > 4) {
        addEllipsis();
      }

      // Pages around current page
      for (let i = Math.max(2, this.currentPage - 2); i <= Math.min(totalPages - 1, this.currentPage + 2); i++) {
        addPageButton(i);
      }

      // Add ellipsis if there's a gap before last page
      if (this.currentPage < totalPages - 3) {
        addEllipsis();
      }

      // Last page
      if (totalPages > 1) {
        addPageButton(totalPages);
      }
    }
  }

  updateProcessingStatus(status) {
    this.processingStatus = status;
    // Update UI to show processing status
    const statusElement = document.getElementById('processing-status');
    if (!statusElement) {
      const header = document.querySelector('.gallery-header');
      if (header) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'processing-status';
        statusDiv.className = 'processing-status';
        header.appendChild(statusDiv);
      }
    }

    if (status.isProcessing) {
      const statusElement = document.getElementById('processing-status');
      if (statusElement) {
        statusElement.innerHTML = `Processing images: ${Math.round(status.progress)}% (${status.processedCount} files processed)`;
        statusElement.style.display = 'block';
      }
    } else {
      const statusElement = document.getElementById('processing-status');
      if (statusElement) {
        statusElement.style.display = 'none';
      }
    }
  }

  createImageTile(img) {
    const container = document.createElement('div');
    container.className = 'image-container';

    // Create and append image
    const image = document.createElement('img');
    image.alt = img.name;

    // Add load event listener before setting src
    image.addEventListener('load', () => {
      image.classList.add('loaded');
      container.classList.add('loaded');
    });

    // Set src after adding load listener
    image.src = `http://192.168.86.242:8082/api/images/${encodeURIComponent(img.name)}`;
    container.appendChild(image);

    // Image icon (top left)
    const imageIcon = document.createElement('div');
    imageIcon.className = 'image-icon';
    const imageI = document.createElement('i');
    imageI.className = 'fas fa-image';
    imageIcon.appendChild(imageI);
    imageIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(`/content-gallery.html?image-name=${encodeURIComponent(img.name)}`, '_blank');
    });
    container.appendChild(imageIcon);

    // Folder icon (top right)
    const folderIcon = document.createElement('div');
    folderIcon.className = 'folder-icon';
    const folderI = document.createElement('i');
    folderI.className = 'fas fa-folder';
    folderIcon.appendChild(folderI);
    folderIcon.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const response = await fetch(`/gallery/finder-search/${encodeURIComponent(img.name)}`);
        if (!response.ok) {
          const data = await response.json();
          console.error('Finder search failed:', data);
          if (data.details) {
            console.error('Details:', data.details);
          }
        }
      } catch (error) {
        console.error('Error opening Finder search:', error);
      }
    });
    container.appendChild(folderIcon);

    // Tags (below image icon)
    if (img.tags && img.tags.length > 0) {
      const tagDots = document.createElement('div');
      tagDots.className = 'tag-dots';
      img.tags.forEach((tag) => {
        const dot = document.createElement('div');
        dot.className = 'tag-dot';
        dot.style.backgroundColor = this.getTagColor(tag);
        dot.title = tag;
        tagDots.appendChild(dot);
      });
      container.appendChild(tagDots);
    }

    // Image name (bottom)
    const name = document.createElement('div');
    name.className = 'image-name';
    name.textContent = img.name;
    container.appendChild(name);

    return container;
  }

  getTagColor(tag) {
    // Map tag names to actual colors
    const tagColors = {
      green: '#96CEB4', // Using a nice green from the original colors array
      red: '#FF6B6B', // Using the red from the original colors array
      blue: '#45B7D1', // Using the blue from the original colors array
      orange: '#FFEEAD', // Using the yellow/orange from the original colors array
    };

    // Convert tag to lowercase for case-insensitive matching
    const normalizedTag = tag.toLowerCase();

    // Return the mapped color or a default color if tag is not recognized
    return tagColors[normalizedTag] || '#D4A5A5'; // Default to a neutral color
  }

  renderTags(tags, container) {
    console.log('renderTags called for:', tags);

    if (!tags || !Array.isArray(tags)) {
      console.warn('Invalid tags:', tags);
      return;
    }

    // Clear existing tags
    container.innerHTML = '';

    // Sort tags to ensure consistent order
    const sortedTags = [...tags].sort();
    console.log('Sorted tags:', sortedTags);

    sortedTags.forEach((tag) => {
      const tagEl = document.createElement('div');
      // Convert tag to lowercase and remove any special characters for class name
      const normalizedTag = tag.toLowerCase().replace(/[^a-z]/g, '');
      tagEl.className = `item__tag item__tag--${normalizedTag}`;
      tagEl.title = tag; // Show original tag name on hover

      // Log tag element creation
      console.log('Creating tag element:', {
        originalTag: tag,
        normalizedTag,
        className: tagEl.className,
      });

      container.appendChild(tagEl);
    });
  }

  handlePageNavigation(direction) {
    const newPage = this.currentPage + direction;
    if (newPage >= 1 && newPage <= Math.ceil(this.filteredImages.length / this.imagesPerPage)) {
      this.currentPage = newPage;
      this.renderCurrentPage();
    }
  }
}

// Function to set window controls style
function setWindowControls(mode) {
  if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.windowControls) {
    const controls = mode === 'gallery' ? {
      title: 'Content Gallery | Jeff',
      showClose: true,
      showNav: false,
    } : {
      title: '',
      showClose: true,
      showNav: true,
    };
    window.webkit.messageHandlers.windowControls.postMessage(controls);
  }
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', () => {
  setWindowControls('gallery');
});

const style = document.createElement('style');
style.textContent = `
    .processing-status {
        background-color: #f0f0f0;
        padding: 8px 16px;
        border-radius: 4px;
        margin: 8px 0;
        font-size: 14px;
        color: #666;
        display: none;
    }
`;
document.head.appendChild(style);

export default Gallery;
