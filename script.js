// Test module loading
export function init() {
    console.log('Module initialized');
}

console.log('Script file loaded and starting execution');

// Basic image loading
async function fetchImages() {
    console.log('fetchImages called');
    const response = await fetch('http://localhost:3000/gallery/images');
    console.log('fetchImages response:', response.status);
    const data = await response.json();
    console.log('fetchImages data:', data);
    return data.images;
}

// Search for image in Finder
async function searchImageInFinder(imageName) {
    console.log('Searching for image:', imageName);
    try {
        const response = await fetch(`http://localhost:3000/gallery/finder-search?term=${encodeURIComponent(imageName)}`);
        
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
    
    grid.innerHTML = '';
    console.log('Grid cleared, adding images...');
    
    images.forEach((image, index) => {
        console.log(`Processing image ${index + 1}/${images.length}:`, image.name);
        const container = document.createElement('div');
        container.className = 'image-container';
        
        // Create image element
        const img = document.createElement('img');
        img.src = `http://localhost:3000${image.url}`;
        img.alt = image.name;
        img.className = 'loading';
        
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
        
        // Add loading and error handlers
        img.onload = () => {
            img.classList.remove('loading');
            img.classList.add('loaded');
            container.classList.remove('skeleton');
        };
        
        img.onerror = () => {
            console.error('Failed to load image:', image.url);
            img.classList.remove('loading');
            img.classList.add('error');
            container.classList.remove('skeleton');
            container.classList.add('error');
        };
        
        // Add hover effect handlers
        container.addEventListener('mouseenter', () => {
            searchIcon.style.opacity = '1';
            nameLabel.style.opacity = '1';
        });
        
        container.addEventListener('mouseleave', () => {
            searchIcon.style.opacity = '0';
            nameLabel.style.opacity = '0';
        });
        
        // Assemble the container
        container.appendChild(img);
        container.appendChild(searchIcon);
        container.appendChild(nameLabel);
        grid.appendChild(container);
    });
    console.log('All images added to grid');
}

console.log('Setting up initialization');

// Initialize when DOM and stylesheets are loaded
Promise.all([
    new Promise(resolve => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', resolve);
        } else {
            resolve();
        }
    }),
    new Promise(resolve => {
        const styleSheets = Array.from(document.styleSheets);
        if (styleSheets.length === document.querySelectorAll('link[rel="stylesheet"]').length) {
            resolve();
        } else {
            let loadedStyles = 0;
            const stylesToLoad = document.querySelectorAll('link[rel="stylesheet"]').length;
            document.querySelectorAll('link[rel="stylesheet"]').forEach(stylesheet => {
                if (stylesheet.sheet) {
                    loadedStyles++;
                    if (loadedStyles === stylesToLoad) resolve();
                } else {
                    stylesheet.onload = () => {
                        loadedStyles++;
                        if (loadedStyles === stylesToLoad) resolve();
                    };
                }
            });
        }
    })
]).then(async () => {
    console.log('DOM and stylesheets loaded - Starting initialization');
    try {
        console.log('Starting to fetch images...');
        const images = await fetchImages();
        console.log(`Fetched ${images.length} images successfully`);
        displayImages(images);
        console.log('Gallery initialization complete');
    } catch (error) {
        console.error('Failed to initialize gallery:', error);
        const grid = document.getElementById('image-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-message">
                    Failed to load gallery: ${error.message}
                    <br>
                    Check the console for more details.
                </div>`;
        }
    }
});
