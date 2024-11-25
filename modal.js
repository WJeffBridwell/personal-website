// Helper Functions
function createElement(tag, attrs = {}) {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
        element[key] = value;
    });
    return element;
}

// Modal Functions
const modalFunctions = {
    initModal: function() {
        const modal = createElement('div', { id: 'modal', className: 'modal' });
        const modalImg = createElement('img', { id: 'modal-img', className: 'modal-content' });
        const caption = createElement('div', { id: 'caption' });
        
        modal.appendChild(modalImg);
        modal.appendChild(caption);
        document.body.appendChild(modal);

        // Event Listeners for closing modal
        const self = this;

        // Close when clicking outside the image
        modal.onclick = function(e) {
            if (e.target === modal) {
                self.closeModal();
            }
        };

        // Close when pressing ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                self.closeModal();
            }
        });

        // Close when clicking the image
        modalImg.onclick = function(e) {
            e.stopPropagation(); // Prevent event from bubbling to modal
            self.closeModal();
        };

        // Handle browser back button
        window.addEventListener('popstate', function(e) {
            if (modal.style.display === 'block') {
                self.closeModal();
            }
        });

        return { modal, modalImg, caption };
    },

    openModal: function(imgSrc, captionText) {
        const modal = document.getElementById('modal') || this.initModal().modal;
        const modalImg = document.getElementById('modal-img');
        const caption = document.getElementById('caption');

        // Push state to handle browser back button
        window.history.pushState({ modal: true }, '');

        modalImg.src = imgSrc;
        caption.textContent = captionText || '';
        modal.style.display = 'block';
        document.body.classList.add('modal-open');

        // Ensure click handler is attached
        const self = this;
        modalImg.onclick = function(e) {
            e.stopPropagation();
            self.closeModal();
        };
    },

    closeModal: function() {
        const modal = document.getElementById('modal');
        const modalImg = document.getElementById('modal-img');
        const caption = document.getElementById('caption');

        if (modal) {
            modal.style.display = 'none';
            if (modalImg) {
                modalImg.src = '';
            }
            if (caption) {
                caption.textContent = '';
            }
            document.body.classList.remove('modal-open');

            // Update browser history if needed
            if (window.history.state && window.history.state.modal) {
                window.history.pushState({ modal: false }, '');
            }
        }
    }
};

// Export for both ESM and CommonJS
export { modalFunctions, createElement };

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { modalFunctions, createElement };
}

// Initialize if in browser environment
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        modalFunctions.initModal();
    });
}
