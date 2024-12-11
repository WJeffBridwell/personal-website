/**
 * Content Gallery functionality
 */
export class ContentGallery {
    constructor() {
        this.container = document.getElementById('gallery-container');
        this.imageGrid = document.getElementById('image-grid');
        this.searchInput = document.getElementById('search-input');
        this.letterFilter = document.getElementById('letter-filter');
        this.sortNameButton = document.getElementById('sort-name');
        this.sortDateButton = document.getElementById('sort-date');
        this.content = [];
        this.contentPlayer = null;
        this.page = 1;
        this.pageSize = 20;
        this.loading = false;
        this.hasMore = true;
        
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

        // Add scroll event listener for infinite scroll
        window.addEventListener('scroll', () => {
            if (this.shouldLoadMore()) {
                this.loadMoreContent();
            }
        });
    }

    shouldLoadMore() {
        if (this.loading || !this.hasMore) return false;
        
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const clientHeight = window.innerHeight || document.documentElement.clientHeight;
        
        return scrollHeight - scrollTop - clientHeight < 200; // Load more when within 200px of bottom
    }

    async loadMoreContent() {
        if (this.loading || !this.hasMore) return;
        
        this.loading = true;
        try {
            const apiUrl = `http://localhost:8081/image-content?page=${this.page}&pageSize=${this.pageSize}${this.nameFilter ? `&image_name=${this.nameFilter}` : ''}`;
            console.log('Making API call to:', apiUrl);
            
            const response = await fetch(apiUrl);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const jsonData = await response.json();
            console.log('Received data:', jsonData);
            
            // Handle both array response and {items: [...]} response
            const items = Array.isArray(jsonData) ? jsonData : jsonData.items;
            
            if (!Array.isArray(items)) {
                throw new Error('Invalid API response format - expected array of items');
            }

            // If response includes hasMore flag, use it; otherwise assume more if we got a full page
            this.hasMore = jsonData.hasMore !== undefined ? jsonData.hasMore : (items.length >= this.pageSize);
            this.content = [...this.content, ...items];
            this.page++;
            
            this.renderNewContent(items);
        } catch (error) {
            console.error('Error loading content:', error);
            this.showError(`Failed to load content: ${error.message}`);
        } finally {
            this.loading = false;
        }
    }

    renderNewContent(newItems) {
        if (!this.imageGrid) return;
        
        newItems.forEach(item => {
            const container = document.createElement('div');
            container.className = 'image-container';
            container.dataset.name = item.content_name?.toLowerCase() || '';
            
            const previewContainer = document.createElement('div');
            previewContainer.className = 'preview-container';

            if (item.content_name?.toLowerCase().endsWith('.mp4')) {
                const video = document.createElement('video');
                video.className = 'preview-content';
                video.src = this.getContentUrl(item.content_url);
                video.controls = true;
                video.preload = 'none';
                video.playsInline = true;
                video.addEventListener('click', () => {
                    if (video.paused) {
                        video.play().catch(err => {
                            console.error('Error playing video:', err);
                        });
                    }
                });
                previewContainer.appendChild(video);
            } else {
                const img = document.createElement('img');
                img.className = 'preview-content';
                img.src = this.getContentUrl(item.content_url);
                img.alt = item.content_name || 'Content';
                img.loading = 'lazy';
                previewContainer.appendChild(img);
            }

            const nameLabel = document.createElement('div');
            nameLabel.className = 'content-name';
            nameLabel.textContent = item.content_name || 'Untitled';
            
            const metadataContainer = document.createElement('div');
            metadataContainer.className = 'content-metadata';
            
            if (item.content_tags && item.content_tags.length > 0) {
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'content-tags';
                tagsDiv.textContent = `Tags: ${item.content_tags.join(', ')}`;
                metadataContainer.appendChild(tagsDiv);
            }
            
            if (item.content_size) {
                const sizeDiv = document.createElement('div');
                sizeDiv.className = 'content-size';
                sizeDiv.textContent = `Size: ${this.formatFileSize(item.content_size)}`;
                metadataContainer.appendChild(sizeDiv);
            }
            
            container.appendChild(previewContainer);
            container.appendChild(nameLabel);
            container.appendChild(metadataContainer);
            this.imageGrid.appendChild(container);
        });
    }

    initializeWithContentPlayer(contentPlayer) {
        this.contentPlayer = contentPlayer;
    }

    getContentUrl(contentPath) {
        if (!contentPath) return '';
        
        if (!contentPath.startsWith('/')) {
            // If it's not an absolute path, treat as relative
            return contentPath;
        }
        // For video content, use the video-content endpoint with the full path
        if (contentPath.toLowerCase().endsWith('.mp4')) {
            return `/gallery/video-content?path=${encodeURIComponent(contentPath)}`;
        }
        // For other content with absolute paths, use as is
        return contentPath;
    }

    async loadContent() {
        this.page = 1;
        this.content = [];
        this.hasMore = true;
        this.imageGrid.innerHTML = '';
        await this.loadMoreContent();
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

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
}
