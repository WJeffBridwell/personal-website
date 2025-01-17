// Global state variables
const modalState = {
  modal: null,
  modalImg: null,
  captionText: null,
  closeBtn: null,
};

// Modal functions
function openModal(imageSrc, caption) {
  console.log('Opening modal with:', { imageSrc, caption });
  if (!modalState.modal || !modalState.modalImg || !modalState.captionText) {
    console.error('Modal elements missing:', {
      modal: !!modalState.modal,
      modalImg: !!modalState.modalImg,
      captionText: !!modalState.captionText,
    });
    return;
  }
  modalState.modal.style.display = 'block';
  modalState.modalImg.src = imageSrc;
  modalState.captionText.textContent = caption;
  console.log('Modal opened');
}

function closeModal() {
  console.log('Closing modal');
  if (!modalState.modal || !modalState.modalImg) {
    console.error('Modal elements missing for close');
    return;
  }
  modalState.modal.style.display = 'none';
  modalState.modalImg.src = '';
  console.log('Modal closed');
}

// Initialize modal elements
function initializeModal() {
  modalState.modal = document.getElementById('imageModal');
  modalState.modalImg = document.getElementById('modalImage');
  modalState.captionText = document.getElementById('caption');
  modalState.closeBtn = document.getElementsByClassName('close')[0];

  console.log('Modal elements found:', {
    modal: !!modalState.modal,
    modalImg: !!modalState.modalImg,
    captionText: !!modalState.captionText,
    closeBtn: !!modalState.closeBtn,
  });

  if (!modalState.modal || !modalState.closeBtn) {
    console.error('Cannot initialize modal listeners - elements missing:', {
      modal: !!modalState.modal,
      closeBtn: !!modalState.closeBtn,
    });
    return;
  }

  // Close on background click
  modalState.modal.addEventListener('click', (event) => {
    if (event.target === modalState.modal) {
      closeModal();
    }
  });

  // Close on button click
  modalState.closeBtn.addEventListener('click', () => {
    closeModal();
  });

  // Handle escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalState.modal.style.display === 'block') {
      closeModal();
    }
  });
}

// Basic image loading
async function fetchImages() {
  console.log('fetchImages called');
  try {
    const response = await fetch('/gallery/images');
    console.log('Response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Fetched image data:', data);
    return data.images;
  } catch (error) {
    console.error('Error fetching images:', error);
    throw error;
  }
}

// Search for image in Finder
async function searchImageInFinder(imageName) {
  console.log('Searching for image:', imageName);
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

// Display images
function displayImages(images) {
  console.log('displayImages called with', images.length, 'images');
  const grid = document.getElementById('image-grid');
  if (!grid) {
    console.error('Image grid not found');
    return;
  }

  grid.innerHTML = ''; // Clear existing images

  images.forEach((image, index) => {
    console.log(`Processing image ${index + 1}/${images.length}:`, image.name);
    const container = document.createElement('div');
    container.className = 'image-container';

    // Create image element
    const img = document.createElement('img');
    img.src = image.url;
    img.alt = image.name;
    img.loading = 'lazy';
    img.className = 'loading';

    // Add click handler for modal
    img.addEventListener('click', () => {
      console.log('Image clicked:', image.name);
      openModal(image.url, image.name);
    });

    // Create search icon
    const searchIcon = document.createElement('i');
    searchIcon.className = 'fas fa-search search-icon';
    searchIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      searchImageInFinder(image.name);
    });

    // Create name label
    const nameLabel = document.createElement('div');
    nameLabel.className = 'image-name';
    nameLabel.textContent = image.name;

    img.onload = () => {
      console.log('Image loaded:', image.name);
      img.classList.remove('loading');
      img.classList.add('loaded');
      container.classList.remove('skeleton');
    };

    img.onerror = (e) => {
      console.error('Failed to load image:', image.url, e);
      img.classList.remove('loading');
      img.classList.add('error');
      container.classList.remove('skeleton');
    };

    container.appendChild(img);
    container.appendChild(searchIcon);
    container.appendChild(nameLabel);
    grid.appendChild(container);
  });
}

// Export functions for testing
export {
  openModal,
  closeModal,
  initializeModal,
  fetchImages,
  searchImageInFinder,
  displayImages,
};

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing gallery');

  // Initialize modal elements (this will also get modal elements)
  initializeModal();

  try {
    const images = await fetchImages();
    await displayImages(images);
  } catch (error) {
    console.error('Failed to initialize gallery:', error);
    const grid = document.getElementById('image-grid');
    if (grid) {
      grid.innerHTML = `<div class="error-message">Failed to load images: ${error.message}</div>`;
    }
  }
});
