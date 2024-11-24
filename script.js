// Function to load images
async function loadImages() {
    const imageGrid = document.getElementById('image-grid');
    if (!imageGrid) return; // Exit if we're not on a page with the gallery

    try {
        // Show loading state
        imageGrid.innerHTML = '<div class="loading">Loading images...</div>';

        // Fetch images from the API
        const response = await fetch('/api/images');
        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error('Invalid response format');
        }

        // Clear loading state
        imageGrid.innerHTML = '';

        // Create image cards
        data.forEach(file => {
            const card = document.createElement('div');
            card.className = 'image-card';

            const img = document.createElement('img');
            img.src = file.url;
            img.alt = file.name;
            img.loading = 'lazy';

            const title = document.createElement('div');
            title.className = 'image-title';
            // Extract prefix (everything before the first underscore or the file extension)
            const prefix = file.name.split(/[_\.]/)[0];
            title.textContent = prefix;

            const searchIcon = document.createElement('div');
            searchIcon.className = 'search-icon';
            searchIcon.innerHTML = '<i class="fas fa-search"></i>';
            
            // Prevent search icon click from triggering modal
            searchIcon.addEventListener('click', (e) => {
                handleSearchIconClick(e, prefix);
            });

            // Extract and add tags
            const tags = extractTags(file.name);
            const tagsElement = createTagElements(tags);

            card.appendChild(img);
            card.appendChild(title);
            card.appendChild(searchIcon);
            card.appendChild(tagsElement);
            imageGrid.appendChild(card);

            // Add error handling for images
            img.onerror = () => {
                console.error(`Failed to load image: ${file.url}`);
                img.src = 'placeholder.jpg';
                img.alt = 'Image not found';
            };

            // Add click handler for modal
            card.addEventListener('click', () => {
                openModal(file.url, prefix);
            });
        });

        // Set up modal handlers
        setupModalHandlers();

    } catch (error) {
        console.error('Error loading images:', error);
        imageGrid.innerHTML = '<div class="error">Error loading images. Please try again later.</div>';
    }
}

// Function to open modal
function openModal(imageUrl, caption) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    
    modal.style.display = 'block';
    modalImg.src = imageUrl;
    modalCaption.textContent = caption;
    
    // Add click handler to the image itself
    modalImg.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent double-closing from modal backdrop
        closeModal();
    });
    
    // Add state to browser history
    history.pushState({ modal: true }, '', '#modal');
}

// Function to display search results in modal
async function showSearchResults(searchTerm) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    
    try {
        modalCaption.textContent = `Searching for "${searchTerm}"...`;
        modal.style.display = 'block';
        
        const response = await fetch(`/api/search?term=${encodeURIComponent(searchTerm)}`);
        const results = await response.json();
        
        if (!Array.isArray(results)) {
            throw new Error('Invalid response format');
        }

        // Create results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p>No matching images found</p>';
        } else {
            results.forEach(result => {
                const resultCard = document.createElement('div');
                resultCard.className = 'result-card';
                
                const img = document.createElement('img');
                img.src = result.url;
                img.alt = result.name;
                img.loading = 'lazy';
                
                const name = document.createElement('div');
                name.className = 'result-name';
                name.textContent = result.name;
                
                resultCard.appendChild(img);
                resultCard.appendChild(name);
                resultsContainer.appendChild(resultCard);
                
                // Click handler for result images
                resultCard.addEventListener('click', () => {
                    openModal(result.url, result.name);
                });
            });
        }
        
        // Replace modal content with results
        modalImg.style.display = 'none';
        modalCaption.textContent = `Search results for "${searchTerm}" (${results.length} found)`;
        modalCaption.after(resultsContainer);
        
        // Add state to browser history
        history.pushState({ modal: true, search: true }, '', '#search');
        
    } catch (error) {
        console.error('Search error:', error);
        modalCaption.textContent = 'Error performing search. Please try again.';
    }
}

// Function to close modal
function closeModal() {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const searchResults = modal.querySelector('.search-results');
    
    modal.style.display = 'none';
    modalImg.style.display = 'block';
    
    if (searchResults) {
        searchResults.remove();
    }
    
    if (location.hash === '#modal') {
        history.back();
    }
}

// Function to handle search icon click
async function handleSearchIconClick(event, imageName) {
    event.stopPropagation();
    try {
        const response = await fetch(`/api/finder-search?term=${encodeURIComponent(imageName)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.details || data.error || 'Search failed');
        }
        
        if (!data.success) {
            throw new Error('Search operation did not complete successfully');
        }
    } catch (error) {
        console.error('Search error:', error);
        alert(`Search error: ${error.message}`);
    }
}

// Function to extract tags from filename
function extractTags(filename) {
    // Remove file extension
    const nameWithoutExt = filename.split('.').slice(0, -1).join('.');
    
    // Split by underscore and remove the first part (prefix)
    const parts = nameWithoutExt.split('_').slice(1);
    
    // Filter out empty strings and convert to lowercase
    return parts.filter(Boolean).map(tag => tag.toLowerCase());
}

// Function to create tag elements
function createTagElements(tags) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'image-tags';
    
    tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'image-tag';
        tagElement.textContent = tag;
        tagElement.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent image card click
            filterGalleryByTag(tag);
        });
        tagsContainer.appendChild(tagElement);
    });
    
    return tagsContainer;
}

// Function to filter gallery by tag
function filterGalleryByTag(tag) {
    const images = document.querySelectorAll('.image-card');
    const buttons = document.querySelectorAll('.filter-button');
    
    // Remove active state from letter filters
    buttons.forEach(button => button.classList.remove('active'));
    
    // Filter images
    images.forEach(image => {
        const tags = Array.from(image.querySelectorAll('.image-tag'))
            .map(tagEl => tagEl.textContent.toLowerCase());
        
        if (tags.includes(tag.toLowerCase())) {
            image.style.display = 'block';
        } else {
            image.style.display = 'none';
        }
    });
}

// Set up modal event handlers
function setupModalHandlers() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.querySelector('.modal-close');
    
    // Close button click
    closeBtn.onclick = closeModal;

    // Click outside image
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
        if (event.state) {
            if (event.state.modal) {
                // Handle modal back button
                const modal = document.getElementById('imageModal');
                if (modal.style.display === 'block') {
                    closeModal();
                }
            } else if (event.state.section) {
                // Handle section navigation
                const section = document.querySelector(`#${event.state.section}`);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            }
        } else {
            // If no state, assume we're going back to the top/home
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

// Create filter bar
function createFilterBar() {
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    
    // Add "All" button
    const allButton = document.createElement('button');
    allButton.className = 'filter-button all active';
    allButton.textContent = 'All';
    allButton.addEventListener('click', () => filterGallery('all'));
    filterBar.appendChild(allButton);
    
    // Add A-Z buttons
    for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i);
        const button = document.createElement('button');
        button.className = 'filter-button';
        button.textContent = letter;
        button.addEventListener('click', () => filterGallery(letter));
        filterBar.appendChild(button);
    }

    // Add search box
    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.className = 'filter-search';
    searchBox.placeholder = 'Search by name...';
    searchBox.addEventListener('input', (e) => filterGalleryBySearch(e.target.value));
    filterBar.appendChild(searchBox);
    
    // Insert filter bar after the heading but before the image grid
    const gallery = document.querySelector('.gallery');
    const imageGrid = document.querySelector('#image-grid');
    gallery.insertBefore(filterBar, imageGrid);
}

// Filter gallery by search term
function filterGalleryBySearch(searchTerm) {
    const imageCards = document.querySelectorAll('.image-card');
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    
    imageCards.forEach(card => {
        const title = card.querySelector('.image-title').textContent.toLowerCase();
        if (normalizedSearchTerm === '' || title.includes(normalizedSearchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });

    // Reset active state of filter buttons
    document.querySelectorAll('.filter-button').forEach(button => {
        button.classList.remove('active');
    });
    if (normalizedSearchTerm === '') {
        document.querySelector('.filter-button.all').classList.add('active');
    }
}

// Filter gallery by letter
function filterGallery(filter) {
    const imageCards = document.querySelectorAll('.image-card');
    const searchBox = document.querySelector('.filter-search');
    
    // Clear search box
    if (searchBox) {
        searchBox.value = '';
    }
    
    imageCards.forEach(card => {
        const title = card.querySelector('.image-title').textContent;
        if (filter === 'all' || title.charAt(0).toUpperCase() === filter) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });

    // Update active state of filter buttons
    document.querySelectorAll('.filter-button').forEach(button => {
        button.classList.remove('active');
        if ((filter === 'all' && button.classList.contains('all')) || 
            button.textContent === filter) {
            button.classList.add('active');
        }
    });
}

// Handle browser history for sections
document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const sectionId = this.getAttribute('href');
        const section = document.querySelector(sectionId);
        
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            // Add state to browser history
            const stateName = sectionId.replace('#', '');
            history.pushState({ section: stateName }, '', `#${stateName}`);
        }
    });
});

// Load images when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadImages();
    createFilterBar();
    
    // Handle direct navigation to sections
    if (location.hash) {
        const section = document.querySelector(location.hash);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            history.replaceState({ section: location.hash.replace('#', '') }, '', location.hash);
        }
    } else {
        // If no hash, set initial state
        history.replaceState({ section: 'home' }, '', '');
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
