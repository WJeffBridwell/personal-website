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

        this.galleryInstance = new Gallery(this.galleryGrid);
        this.initializeControls();
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

    async loadContent() {
        if (this.content.length > 0) {
            this.renderContent();
            return;
        }

        try {
            const response = await fetch(`${this.apiEndpoint}?image_name=${encodeURIComponent(this.imageName)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            this.content = Array.isArray(data) ? data : (data.content || []);
            
            // Log content data
            console.log('Loaded content:', this.content);
            
            // Update tag filter after loading content
            this.updateTagFilter();
            
            console.log('Content loaded:', this.content.map(item => ({
                name: item.content_name,
                type: item.content_type,
                url: item.content_url,
                tags: item.content_tags
            })));
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

    renderContent() {
        if (!this.galleryGrid) {
            console.error('Gallery grid container not found');
            return;
        }
        this.galleryGrid.innerHTML = '';
        const filteredContent = this.getFilteredContent();
        
        console.log('Filtered content:', filteredContent);

        if (filteredContent.length === 0) {
            const noContent = document.createElement('div');
            noContent.className = 'o-gallery__no-content';
            noContent.textContent = 'No content found';
            this.galleryGrid.appendChild(noContent);
            return;
        }
        
        filteredContent.forEach(item => {
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
                console.log('Rendering image item:', item);
                // Use the video server (port 8082) to serve image files
                const imageUrl = `http://localhost:8082/videos/direct?path=${encodeURIComponent(item.content_url)}`;
                console.log('Using video server for image:', imageUrl);
                
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
                            <source src="http://localhost:8082/videos/direct?path=${encodeURIComponent(item.content_url)}" type="video/mp4">
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

            this.galleryGrid.appendChild(element);

            const video = element.querySelector('video');
            if (video) {
                // Error handling
                video.addEventListener('error', (e) => {
                    console.error('Video error:', e.target.error);
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'a-video-error';
                    errorMessage.textContent = 'Error loading video';
                    video.parentElement.appendChild(errorMessage);
                });
            }
        });
    }

    initializeWithContentPlayer(contentPlayer) {
        this.contentPlayer = contentPlayer;
    }
}
