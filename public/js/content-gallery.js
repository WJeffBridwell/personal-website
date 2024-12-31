/**
 * Content Gallery
 * Handles displaying and filtering content in a grid layout
 */
import Gallery from './gallery.js';

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
        // Check if the filename ends with a video extension
        const videoExtensions = ['.mp4', '.MP4', '.m4v', '.webm', '.mov'];
        return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
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
        
        filteredContent.forEach(item => {
            const element = document.createElement('div');
            element.className = 'o-gallery__item';
            
            const isVideo = this.isVideoFile(item.content_name) || 
                          (item.content_type && item.content_type.toLowerCase() === 'video');
            
            if (isVideo) {
                console.log('Creating video player for:', item.content_name);
                
                element.innerHTML = `
                    <div class="m-video-player">
                        <div class="m-video-thumbnail">
                            <img src="/images/video-thumbnail.svg" alt="Video thumbnail">
                            <div class="m-play-overlay">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                        <video class="a-video-element" preload="none" playsinline style="display: none;">
                            Your browser does not support the video tag.
                        </video>
                        <div class="m-video-controls" style="display: none;">
                            <div class="a-video-progress">
                                <div class="a-progress-bar"></div>
                            </div>
                            <div class="a-video-buttons">
                                <button class="a-play-button">
                                    <i class="fas fa-play"></i>
                                </button>
                                <div class="a-volume-control">
                                    <button class="a-mute-button">
                                        <i class="fas fa-volume-up"></i>
                                    </button>
                                    <input type="range" class="a-volume-slider" min="0" max="100" value="100">
                                </div>
                                <button class="a-fullscreen-button">
                                    <i class="fas fa-expand"></i>
                                </button>
                            </div>
                        </div>
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

                this.galleryGrid.appendChild(element);

                const videoPlayer = element.querySelector('.m-video-player');
                const thumbnail = videoPlayer.querySelector('.m-video-thumbnail');
                const video = videoPlayer.querySelector('video');
                const controls = videoPlayer.querySelector('.m-video-controls');
                const playButton = videoPlayer.querySelector('.a-play-button');
                const muteButton = videoPlayer.querySelector('.a-mute-button');
                const volumeSlider = videoPlayer.querySelector('.a-volume-slider');
                const fullscreenButton = videoPlayer.querySelector('.a-fullscreen-button');
                const progressBar = videoPlayer.querySelector('.a-progress-bar');

                // Function to load and play video
                const loadAndPlayVideo = async () => {
                    try {
                        // Check if video is already loaded
                        if (!video.querySelector('source')) {
                            const source = document.createElement('source');
                            // Send the content URL directly to avoid searching
                            source.src = `http://localhost:8082/videos/direct?path=${encodeURIComponent(item.content_url)}`;
                            source.type = 'video/mp4';
                            video.appendChild(source);
                            
                            await video.load();
                        }
                        
                        thumbnail.style.display = 'none';
                        video.style.display = 'block';
                        controls.style.display = 'flex';
                        await video.play();
                        playButton.innerHTML = '<i class="fas fa-pause"></i>';
                        
                    } catch (error) {
                        console.error('Error playing video:', error);
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'a-video-error';
                        errorMessage.textContent = 'Error playing video';
                        videoPlayer.appendChild(errorMessage);
                        
                        thumbnail.style.display = 'flex';
                        video.style.display = 'none';
                        controls.style.display = 'none';
                        
                        const source = video.querySelector('source');
                        if (source) {
                            source.remove();
                        }
                    }
                };

                // Click thumbnail to start playing
                thumbnail.addEventListener('click', () => {
                    loadAndPlayVideo();
                });

                // Play/Pause
                playButton.addEventListener('click', () => {
                    if (video.paused) {
                        loadAndPlayVideo();
                    } else {
                        video.pause();
                        playButton.innerHTML = '<i class="fas fa-play"></i>';
                    }
                });

                // Mute/Unmute
                muteButton.addEventListener('click', () => {
                    video.muted = !video.muted;
                    muteButton.innerHTML = video.muted ? 
                        '<i class="fas fa-volume-mute"></i>' : 
                        '<i class="fas fa-volume-up"></i>';
                });

                // Volume
                volumeSlider.addEventListener('input', (e) => {
                    video.volume = e.target.value / 100;
                });

                // Fullscreen
                fullscreenButton.addEventListener('click', () => {
                    if (video.requestFullscreen) {
                        video.requestFullscreen();
                    }
                });

                // Progress bar
                video.addEventListener('timeupdate', () => {
                    const progress = (video.currentTime / video.duration) * 100;
                    progressBar.style.width = `${progress}%`;
                });

                // Error handling
                video.addEventListener('error', (e) => {
                    console.error('Video error:', e.target.error);
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'a-video-error';
                    errorMessage.textContent = 'Error loading video';
                    videoPlayer.appendChild(errorMessage);
                });

            } else {
                // Handle image content
                element.innerHTML = `
                    <img class="a-gallery-image" src="${item.content_url}" alt="${item.content_name}" loading="lazy">
                    <div class="m-item-info">
                        <span class="a-item-name">${item.content_name}</span>
                        <span class="a-item-size">${this.formatFileSize(item.content_size)}</span>
                        <div class="a-content-tags">
                            ${item.content_tags ? item.content_tags.map(tag => 
                                `<span class="a-tag">${tag}</span>`
                            ).join('') : ''}
                        </div>
                    </div>`;
                this.galleryGrid.appendChild(element);
            }
        });
    }

    initializeWithContentPlayer(contentPlayer) {
        this.contentPlayer = contentPlayer;
    }
}
