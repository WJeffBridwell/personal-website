/**
 * Content Gallery functionality
 */
class ContentGallery {
    constructor() {
        this.container = document.getElementById('gallery-container');
        this.imageGrid = document.getElementById('image-grid');
        this.searchInput = document.getElementById('search-input');
        this.letterFilter = document.getElementById('letter-filter');
        this.sortNameButton = document.getElementById('sort-name');
        this.sortDateButton = document.getElementById('sort-date');
        this.content = [];
        this.contentPlayer = null;
        
        // Get the name parameter from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        this.nameFilter = urlParams.get('image_name');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.handleSearch());
        }

        if (this.letterFilter) {
            this.letterFilter.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const letter = e.target.textContent;
                    this.filterByLetter(letter);
                }
            });
        }

        if (this.sortNameButton) {
            this.sortNameButton.addEventListener('click', () => this.sortByName());
        }

        if (this.sortDateButton) {
            this.sortDateButton.addEventListener('click', () => this.sortByDate());
        }
    }

    initializeWithContentPlayer(contentPlayer) {
        this.contentPlayer = contentPlayer;
    }

    getContentUrl(contentPath) {
        if (!contentPath) return '';
        
        // For video content, route through our video endpoint
        if (contentPath.toLowerCase().endsWith('.mp4')) {
            return `/video-content?path=${encodeURIComponent(contentPath)}`;
        }
        
        // For other content, return as is
        return contentPath;
    }

    async loadContent() {
        try {
            const apiUrl = `http://localhost:8081/image-content?image_name=${this.nameFilter}`;
            console.log('Making API call to:', apiUrl);
            console.log('Name filter value:', this.nameFilter);
            
            // Get content metadata from the images API
            const response = await fetch(apiUrl);
            console.log('Server response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const jsonData = await response.json();
            console.log('API Response data (first item):', jsonData[0]);
            console.log('Number of items returned:', jsonData.length);

            if (Array.isArray(jsonData)) {
                this.content = jsonData;
            } else if (jsonData.error) {
                throw new Error(`API error: ${jsonData.error}`);
            } else {
                throw new Error('Invalid API response format');
            }

            this.renderContent();
        } catch (error) {
            console.error('Error loading content:', error);
            this.showError(`Failed to load content: ${error.message}`);
        }
    }

    showError(message) {
        if (this.imageGrid) {
            console.error('Gallery Error:', message);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.padding = '20px';
            errorDiv.style.color = '#721c24';
            errorDiv.style.backgroundColor = '#f8d7da';
            errorDiv.style.border = '1px solid #f5c6cb';
            errorDiv.style.borderRadius = '4px';
            errorDiv.style.margin = '20px';
            errorDiv.style.textAlign = 'center';
            errorDiv.textContent = message;
            this.imageGrid.innerHTML = '';
            this.imageGrid.appendChild(errorDiv);
        }
    }

    renderContent() {
        if (!this.imageGrid) return;

        this.imageGrid.innerHTML = '';
        
        if (!Array.isArray(this.content)) {
            this.showError('Invalid content data received');
            return;
        }

        if (this.content.length === 0) {
            const noContentDiv = document.createElement('div');
            noContentDiv.className = 'error-message';
            noContentDiv.textContent = 'No content found';
            this.imageGrid.appendChild(noContentDiv);
            return;
        }

        this.content.forEach(item => {
            const container = document.createElement('div');
            container.className = 'image-container';
            container.dataset.name = item.content_name?.toLowerCase() || '';
            
            // Preview container
            const previewContainer = document.createElement('div');
            previewContainer.className = 'preview-container';

            // Create preview based on content type
            const isVideo = item.content_name?.toLowerCase().endsWith('.mp4');
            if (isVideo) {
                const video = document.createElement('video');
                const videoUrl = this.getContentUrl(item.content_url);
                console.log('Loading video from URL:', videoUrl);
                
                video.src = videoUrl;
                video.controls = true;
                video.playsInline = true;
                
                // Add error handling
                video.onerror = (e) => {
                    console.error('Video error:', e);
                    console.error('Error details:', video.error);
                };

                // Add load handling
                video.onloadeddata = () => {
                    console.log('Video loaded successfully');
                };

                // Try direct URL if video endpoint fails
                video.addEventListener('error', () => {
                    console.log('Trying direct URL as fallback');
                    video.src = item.content_url;
                });

                previewContainer.appendChild(video);
                container.onclick = null;
            } else {
                const img = document.createElement('img');
                img.src = this.getContentUrl(item.content_url);
                img.alt = item.content_name || 'Content';
                img.loading = 'lazy';
                previewContainer.appendChild(img);
            }

            // Content info section
            const infoContainer = document.createElement('div');
            infoContainer.className = 'content-info';
            
            // Name
            const nameLabel = document.createElement('div');
            nameLabel.className = 'content-name';
            nameLabel.textContent = item.content_name || 'Untitled';
            
            // Tags
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'content-tags';
            if (item.content_tags && Array.isArray(item.content_tags)) {
                item.content_tags.forEach(tag => {
                    const tagSpan = document.createElement('span');
                    tagSpan.className = 'tag';
                    tagSpan.textContent = tag;
                    tagsContainer.appendChild(tagSpan);
                });
            }

            // Size
            const sizeLabel = document.createElement('div');
            sizeLabel.className = 'content-size';
            sizeLabel.textContent = this.formatFileSize(item.content_size || 0);

            infoContainer.appendChild(nameLabel);
            if (item.content_tags?.length > 0) {
                infoContainer.appendChild(tagsContainer);
            }
            infoContainer.appendChild(sizeLabel);

            container.appendChild(previewContainer);
            container.appendChild(infoContainer);
            this.imageGrid.appendChild(container);
        });
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    handleSearch() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const containers = this.imageGrid.getElementsByClassName('image-container');
        
        Array.from(containers).forEach(container => {
            const name = container.dataset.name;
            container.style.display = name.includes(searchTerm) ? '' : 'none';
        });
    }

    filterByLetter(letter) {
        const containers = this.imageGrid.getElementsByClassName('image-container');
        
        Array.from(containers).forEach(container => {
            const name = container.dataset.name;
            if (letter === 'All') {
                container.style.display = '';
            } else {
                container.style.display = name.startsWith(letter.toLowerCase()) ? '' : 'none';
            }
        });
    }

    sortByName() {
        const containers = Array.from(this.imageGrid.getElementsByClassName('image-container'));
        containers.sort((a, b) => {
            return a.dataset.name.localeCompare(b.dataset.name);
        });
        this.reorderContainers(containers);
    }

    sortByDate() {
        const containers = Array.from(this.imageGrid.getElementsByClassName('image-container'));
        containers.sort((a, b) => {
            return (parseInt(b.dataset.date) || 0) - (parseInt(a.dataset.date) || 0);
        });
        this.reorderContainers(containers);
    }

    reorderContainers(containers) {
        containers.forEach(container => this.imageGrid.appendChild(container));
    }
}
