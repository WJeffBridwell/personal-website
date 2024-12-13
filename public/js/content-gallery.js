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

        // Sort buttons
        const sortNameBtn = document.getElementById('sort-name');
        const sortDateBtn = document.getElementById('sort-date');

        if (sortNameBtn) {
            sortNameBtn.addEventListener('click', () => {
                this.sortBy = this.sortBy === 'name-asc' ? 'name-desc' : 'name-asc';
                this.updateSortButtons();
                this.renderContent();
            });
        }

        if (sortDateBtn) {
            sortDateBtn.addEventListener('click', () => {
                this.sortBy = this.sortBy === 'date-asc' ? 'date-desc' : 'date-asc';
                this.updateSortButtons();
                this.renderContent();
            });
        }
    }

    updateSortButtons() {
        const sortNameBtn = document.getElementById('sort-name');
        const sortDateBtn = document.getElementById('sort-date');

        // Remove active class from all buttons
        [sortNameBtn, sortDateBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        // Add icon to indicate sort direction
        if (this.sortBy.startsWith('name')) {
            if (sortNameBtn) {
                sortNameBtn.classList.add('active');
                sortNameBtn.innerHTML = `Sort by Name ${this.sortBy === 'name-asc' ? '↑' : '↓'}`;
            }
        } else if (this.sortBy.startsWith('date')) {
            if (sortDateBtn) {
                sortDateBtn.classList.add('active');
                sortDateBtn.innerHTML = `Sort by Date ${this.sortBy === 'date-asc' ? '↑' : '↓'}`;
            }
        }
    }

    async loadContent() {
        try {
            const response = await fetch(`${this.apiEndpoint}?image_name=${this.imageName}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            // Handle both array and object response formats
            this.content = Array.isArray(data) ? data : (data.content || []);
            
            console.log('Content loaded:', this.content.map(item => ({
                name: item.content_name,
                type: item.content_type,
                url: item.content_url
            })));
            this.renderContent();
        } catch (error) {
            console.error('Error loading content:', error);
            // Show error message to user
            this.galleryGrid.innerHTML = `
                <div class="error-message">
                    <p>Error loading content: ${error.message}</p>
                </div>
            `;
        }
    }

    initializeWithContentPlayer(contentPlayer) {
        this.contentPlayer = contentPlayer;
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

        // Apply sorting
        filtered.sort((a, b) => {
            if (this.sortBy === 'name-asc') {
                return a.content_name.localeCompare(b.content_name);
            } else if (this.sortBy === 'name-desc') {
                return b.content_name.localeCompare(a.content_name);
            } else if (this.sortBy === 'date-asc') {
                return new Date(a.content_created) - new Date(b.content_created);
            } else if (this.sortBy === 'date-desc') {
                return new Date(b.content_created) - new Date(a.content_created);
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
                console.log('Creating video player for:', item.content_name, 'URL:', item.content_url);
                
                element.innerHTML = `
                    <div class="m-video-player">
                        <div class="m-video-thumbnail">
                            <img src="/images/video-thumbnail.svg" alt="Video thumbnail">
                            <div class="m-play-overlay">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                        <video class="a-video-element" preload="metadata" playsinline style="display: none;">
                            <source src="${item.content_url}" type="video/mp4">
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

                // Click thumbnail to start playing
                thumbnail.addEventListener('click', () => {
                    thumbnail.style.display = 'none';
                    video.style.display = 'block';
                    controls.style.display = 'flex';
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            playButton.innerHTML = '<i class="fas fa-pause"></i>';
                        }).catch(error => {
                            console.error('Error playing video:', error);
                            // Show error message
                            const errorMessage = document.createElement('div');
                            errorMessage.className = 'a-video-error';
                            errorMessage.textContent = 'Error playing video';
                            videoPlayer.appendChild(errorMessage);
                        });
                    }
                });

                // Error handling
                video.addEventListener('error', (e) => {
                    console.error('Video error:', e.target.error);
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'a-video-error';
                    errorMessage.textContent = 'Error loading video';
                    videoPlayer.appendChild(errorMessage);
                });

                // Play/Pause
                playButton.addEventListener('click', () => {
                    if (video.paused) {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                playButton.innerHTML = '<i class="fas fa-pause"></i>';
                            }).catch(error => {
                                console.error('Error playing video:', error);
                            });
                        }
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
                    } else if (video.webkitRequestFullscreen) {
                        video.webkitRequestFullscreen();
                    }
                });

                // Update progress bar
                video.addEventListener('timeupdate', () => {
                    const progress = (video.currentTime / video.duration) * 100;
                    progressBar.style.width = progress + '%';
                });

            } else {
                // Handle image content
                element.innerHTML = `
                    <img class="a-gallery-image" src="${item.content_url}" alt="${item.content_name}" loading="lazy">
                    <div class="m-item-info">
                        <span class="a-item-name">${item.content_name}</span>
                        <span class="a-item-size">${this.formatFileSize(item.content_size)}</span>
                    </div>`;
                this.galleryGrid.appendChild(element);
            }
        });
    }
}
