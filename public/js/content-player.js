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

    open(contentUrl) {
        if (!contentUrl) {
            console.error('No content URL provided');
            return;
        }

        this.contentElement.innerHTML = '';
        
        if (this.isVideo(contentUrl)) {
            const video = document.createElement('video');
            video.src = contentUrl;
            video.controls = true;
            video.autoplay = true;
            this.contentElement.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = contentUrl;
            this.contentElement.appendChild(img);
        }

        this.modal.classList.add('modal--active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }

    close() {
        this.modal.classList.remove('modal--active');
        document.body.style.overflow = ''; // Restore scrolling
        this.contentElement.innerHTML = '';
    }

    isVideo(url) {
        return url.match(/\.(mp4|webm|ogg)$/i);
    }
}
