/**
 * Content Gallery
 * Handles displaying and filtering content in a grid layout
 */
import Gallery from './gallery.js';
import { initializeModal } from './modal.js';

export class ContentGallery {
    constructor(galleryId, apiEndpoint, imageName = '') {
        this.galleryGrid = document.getElementById(galleryId);
        if (!this.galleryGrid) {
            throw new Error(`Gallery grid with ID ${galleryId} not found`);
        }

        this.apiEndpoint = apiEndpoint;
        this.imageName = imageName;
        this.content = [];
        this.searchInput = document.getElementById('search-input');
        this.contentPlayer = null;
        this.searchQuery = '';
        this.sortBy = 'name-asc';
        this.selectedTag = '';
        this.modal = initializeModal();
        this.batchSize = 1000;
        this.imageCache = new Map(); // Cache for loaded images
        
        // Always use the same host as the main site, but with port 8082
        const videoServerHost = window.location.hostname;
        this.videoServerUrl = `http://${videoServerHost}:8082`;
        console.log('Video server URL:', this.videoServerUrl);

        this.galleryInstance = new Gallery(this.galleryGrid);
        this.initializeControls();
    }

    setupIntersectionObserver() {
        return new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        // First load thumbnail
                        this.loadImage(img, true).then(() => {
                            // Then load preview quality
                            if (!img.dataset.preview) {
                                this.loadImage(img, false);
                            }
                        });
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
    }

    async loadImage(img, isThumb) {
        const size = isThumb ? 'thumb' : 'preview';
        const url = `${img.dataset.src}?size=${size}`;
        
        try {
            if (!this.imageCache.has(url)) {
                const response = await fetch(url);
                const blob = await response.blob();
                this.imageCache.set(url, URL.createObjectURL(blob));
            }
            
            const imageUrl = this.imageCache.get(url);
            if (isThumb) {
                img.src = imageUrl;
                img.dataset.preview = 'pending';
            } else {
                img.src = imageUrl;
                img.dataset.preview = 'loaded';
            }
            
            img.classList.add('loaded');
        } catch (error) {
            console.error('Error loading image:', error);
        }
    }

    setupInfiniteScroll() {
        const options = {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.loading) {
                    this.loadMoreContent();
                }
            });
        }, options);

        // Observe the last item in the gallery
        const sentinel = document.createElement('div');
        sentinel.className = 'scroll-sentinel';
        this.galleryGrid.appendChild(sentinel);
        observer.observe(sentinel);
    }

    async loadMoreContent() {
        if (this.loading) return;
        
        this.loading = true;
        try {
            const response = await fetch(`${this.apiEndpoint}/initial?page=${this.currentPage}&batchSize=${this.batchSize}`);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            if (data.content && data.content.length > 0) {
                this.content.push(...data.content);
                this.currentPage++;
                this.renderNewContent(data.content);
            }
        } catch (error) {
            console.error('Error loading more content:', error);
        } finally {
            this.loading = false;
        }
    }

    renderNewContent(newContent) {
        newContent.forEach(item => {
            const element = this.createGalleryItem(item);
            this.galleryGrid.appendChild(element);
        });
    }

    createGalleryItem(item) {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        
        const img = document.createElement('img');
        img.className = 'gallery-image';
        img.alt = item.name;
        img.dataset.src = `/images/${encodeURIComponent(item.name)}`;
        img.src = 'placeholder.jpg';  // Add a placeholder image
        
        this.intersectionObserver.observe(img);
        
        div.appendChild(img);
        return div;
    }

    async loadContent() {
        if (this.content.length > 0) {
            this.renderContent();
            return;
        }

        try {
            // First, get the list of all images
            const response = await fetch(`${this.apiEndpoint}?image_name=${encodeURIComponent(this.imageName)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            this.content = Array.isArray(data) ? data : (data.content || []);
            
            // Update tag filter after loading content
            this.updateTagFilter();

            // Load images in batches
            const imageNames = this.content.map(item => item.content_name);
            const batches = [];
            
            for (let i = 0; i < imageNames.length; i += this.batchSize) {
                const batch = imageNames.slice(i, i + this.batchSize);
                batches.push(batch);
            }

            console.log(`Loading ${this.content.length} images in ${batches.length} batches`);

            // Load all batches in parallel
            const batchPromises = batches.map(async (batch, index) => {
                try {
                    // Fix the endpoint URL by using the base URL
                    const baseUrl = this.apiEndpoint.replace(/\/gallery$/, '');
                    const batchResponse = await fetch(`${baseUrl}/gallery/batch-images`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ imageNames: batch })
                    });

                    if (!batchResponse.ok) {
                        throw new Error(`Failed to load batch ${index + 1}`);
                    }

                    const batchData = await batchResponse.json();
                    
                    // Cache the loaded images
                    batchData.images.forEach(img => {
                        if (img.data) {
                            this.imageCache.set(img.name, `data:image/jpeg;base64,${img.data}`);
                        }
                    });

                    console.log(`Loaded batch ${index + 1}/${batches.length}`);
                } catch (error) {
                    console.error(`Error loading batch ${index + 1}:`, error);
                }
            });

            // Wait for all batches to load
            await Promise.all(batchPromises);
            console.log('All batches loaded');

            // Render the gallery
            this.renderContent();
        } catch (error) {
            console.error('Error loading content:', error);
            this.galleryGrid.innerHTML = `
                <div class="error-message">
                    <p>Error loading content: ${error.message}</p>
                </div>
            `;
        }
    }

    createContentElement(item) {
        const element = document.createElement('div');
        element.className = 'o-gallery__item';

        if (item.content_type === 'directory') {
            element.innerHTML = `
                <div class="m-folder-preview">
                    <i class="fas fa-folder fa-4x"></i>
                </div>
                <div class="m-item-info">
                    <span class="a-item-name">${item.content_name}</span>
                    <div class="a-content-tags">
                        ${item.content_tags ? item.content_tags.map(tag => 
                            `<span class="a-tag">${tag}</span>`
                        ).join('') : ''}
                    </div>
                </div>`;
        } else if (item.content_type === 'image' || this.isImageFile(item.content_name)) {
            // Use cached image data if available
            const imageData = this.imageCache.get(item.content_name);
            const imageUrl = imageData || `${this.videoServerUrl}/videos/direct?path=${encodeURIComponent(item.content_url)}`;
            
            element.innerHTML = `
                <div class="m-image-preview">
                    <img src="${imageUrl}" alt="${item.content_name}" loading="lazy" class="preview-image">
                </div>
                <div class="m-item-info">
                    <span class="a-item-name">${item.content_name}</span>
                    <span class="a-item-size">${this.formatFileSize(item.content_size)}</span>
                    <div class="a-content-tags">
                        ${item.content_tags ? item.content_tags.map(tag => 
                            `<span class="a-tag">${tag}</span>`
                        ).join('') : ''}
                    </div>
                </div>`;

            // Add click handler for the image preview
            const previewImage = element.querySelector('.preview-image');
            if (previewImage) {
                previewImage.addEventListener('click', () => {
                    this.modal.openModal(imageUrl, item.content_name);
                });
            }
        } else if (item.content_type === 'video' || this.isVideoFile(item.content_name)) {
            console.log('Creating video player for:', item.content_name);
            
            element.innerHTML = `
                <div class="m-video-player">
                    <video class="a-video-element" controls preload="metadata" playsinline>
                        <source src="${this.videoServerUrl}/videos/direct?path=${encodeURIComponent(item.content_url)}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
                <div class="m-item-info">
                    <span class="a-item-name">${item.content_name}</span>
                    <span class="a-item-size">${this.formatFileSize(item.content_size)}</span>
                    <div class="a-content-tags">
                        ${item.content_tags ? item.content_tags.map(tag => 
                            `<span class="a-tag">${tag}</span>`
                        ).join('') : ''}
                    </div>
                </div>`;
        } else {
            // Default file icon for other types
            element.innerHTML = `
                <div class="m-file-preview">
                    <i class="fas fa-file fa-4x"></i>
                </div>
                <div class="m-item-info">
                    <span class="a-item-name">${item.content_name}</span>
                    <span class="a-item-size">${this.formatFileSize(item.content_size)}</span>
                    <div class="a-content-tags">
                        ${item.content_tags ? item.content_tags.map(tag => 
                            `<span class="a-tag">${tag}</span>`
                        ).join('') : ''}
                    </div>
                </div>`;
        }

        return element;
    }

    renderContent() {
        if (!this.galleryGrid) {
            console.error('Gallery grid container not found');
            return;
        }

        this.galleryGrid.innerHTML = '';
        const filteredContent = this.getFilteredContent();

        if (filteredContent.length === 0) {
            const noContent = document.createElement('div');
            noContent.className = 'o-gallery__no-content';
            noContent.textContent = 'No content found';
            this.galleryGrid.appendChild(noContent);
            return;
        }

        // Render all content at once since we have all images cached
        filteredContent.forEach(item => {
            const element = this.createContentElement(item);
            if (element) {
                this.galleryGrid.appendChild(element);
            }
        });
    }

    initializeControls() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderContent();
            });
        }

        // Tag filter
        const tagFilter = document.getElementById('tag-filter');
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.selectedTag = e.target.value;
                this.renderContent();
            });
        }

        // Sort button
        const sortNameBtn = document.getElementById('sort-name');
        if (sortNameBtn) {
            sortNameBtn.addEventListener('click', () => {
                this.sortBy = this.sortBy === 'name-asc' ? 'name-desc' : 'name-asc';
                this.updateSortButtons();
                this.renderContent();
            });
        }
    }

    updateTagFilter() {
        const tagFilter = document.getElementById('tag-filter');
        if (!tagFilter) return;

        // Get unique tags from all content
        const allTags = new Set();
        this.content.forEach(item => {
            if (item.content_tags && Array.isArray(item.content_tags)) {
                item.content_tags.forEach(tag => allTags.add(tag));
            }
        });

        // Sort tags alphabetically
        const sortedTags = Array.from(allTags).sort();

        // Clear existing options except "All Tags"
        while (tagFilter.options.length > 1) {
            tagFilter.remove(1);
        }

        // Add tag options
        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
    }

    updateSortButtons() {
        const sortNameBtn = document.getElementById('sort-name');
        if (sortNameBtn) {
            sortNameBtn.classList.add('active');
            sortNameBtn.innerHTML = `Sort by Name ${this.sortBy === 'name-asc' ? '↑' : '↓'}`;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFilteredContent() {
        let filtered = [...this.content];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(item => 
                item.content_name.toLowerCase().includes(this.searchQuery) ||
                (item.content_tags && item.content_tags.some(tag => 
                    tag.toLowerCase().includes(this.searchQuery)
                ))
            );
        }

        // Apply tag filter
        if (this.selectedTag) {
            filtered = filtered.filter(item => 
                item.content_tags && item.content_tags.includes(this.selectedTag)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (this.sortBy === 'name-asc') {
                return a.content_name.localeCompare(b.content_name);
            } else if (this.sortBy === 'name-desc') {
                return b.content_name.localeCompare(a.content_name);
            }
            return 0;
        });

        return filtered;
    }

    isVideoFile(filename) {
        const videoExtensions = ['.mp4', '.MP4', '.m4v', '.webm', '.mov'];
        return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    }

    isImageFile(filename) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const lowerFilename = filename.toLowerCase();
        // Check both the full extension and parts of compound extensions (e.g., .jpeg.webp)
        const isImage = imageExtensions.some(ext => 
            lowerFilename.endsWith(ext.toLowerCase()) || 
            lowerFilename.includes(ext.toLowerCase() + '.')
        );
        console.log('Checking if file is image:', filename, isImage);
        return isImage;
    }

    initializeWithContentPlayer(contentPlayer) {
        this.contentPlayer = contentPlayer;
    }
}
