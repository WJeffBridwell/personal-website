/**
 * Content Player
 * Handles displaying content (images/videos) in a modal window
 */
export class ContentPlayer {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        if (!this.modal) {
            throw new Error(`Modal with ID ${modalId} not found`);
        }
        
        this.contentElement = this.modal.querySelector('.content-player');
        this.closeButton = this.modal.querySelector('.modal__close');
        
        if (!this.contentElement || !this.closeButton) {
            throw new Error('Required modal elements not found');
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.closeButton.addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    open(content) {
        if (!content) {
            console.error('No content provided');
            return;
        }

        this.contentElement.innerHTML = '';
        
        if (content.isVideo) {
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            
            // Use the content URL directly since it's already properly formatted by the server
            video.poster = content.content_url + '?poster=true';

            const source = document.createElement('source');
            source.src = content.content_url;
            source.type = this.getVideoMimeType(content.content_name);

            video.appendChild(source);

            // Add error handling
            video.addEventListener('error', (e) => {
                console.error('Video error:', e.target.error);
                this.contentElement.innerHTML = `
                    <div class="a-error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Error loading video: ${e.target.error?.message || 'Unknown error'}</span>
                    </div>`;
            });

            this.contentElement.appendChild(video);
        } else {
            // Handle images
            const img = document.createElement('img');
            img.src = content.content_url;
            img.alt = content.content_name;
            this.contentElement.appendChild(img);
        }

        this.modal.classList.add('modal--active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }

    close() {
        this.modal.classList.remove('modal--active');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Stop video playback if present
        const video = this.contentElement.querySelector('video');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        
        this.contentElement.innerHTML = '';
    }

    getVideoMimeType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'mov': 'video/quicktime'
        };
        return mimeTypes[ext] || 'video/mp4';
    }
}
