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
  modal: null,
  modalImg: null,
  caption: null,

  initModal() {
    this.modal = createElement('div', { id: 'modal', className: 'modal' });
    this.modalImg = createElement('img', { id: 'modal-img', className: 'modal-content' });
    this.caption = createElement('div', { id: 'caption' });

    this.modal.appendChild(this.modalImg);
    this.modal.appendChild(this.caption);
    document.body.appendChild(this.modal);

    // Modal event handlers
    const handleModalClick = (event) => {
      if (event.target === this.modal) {
        this.closeModal();
      }
    };

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        this.closeModal();
      }
    };

    const handleCloseClick = (event) => {
      event.stopPropagation();
      this.closeModal();
    };

    // Event Listeners for closing modal
    this.modal.onclick = handleModalClick;
    document.addEventListener('keydown', handleKeydown);
    this.modalImg.onclick = handleCloseClick;

    // Handle browser back button
    window.addEventListener('popstate', (event) => {
      if (this.modal.style.display === 'block') {
        this.closeModal();
      }
    });

    return { modal: this.modal, modalImg: this.modalImg, caption: this.caption };
  },

  openModal(imgSrc, captionText) {
    if (!this.modal) {
      this.initModal();
    }

    // Push state to handle browser back button
    window.history.pushState({ modal: true }, '');

    this.modalImg.src = imgSrc;
    this.caption.textContent = captionText || '';
    this.modal.style.display = 'block';
    document.body.classList.add('modal-open');
  },

  closeModal() {
    if (this.modal) {
      this.modal.style.display = 'none';
      this.modalImg.src = '';
      this.caption.textContent = '';
      document.body.classList.remove('modal-open');

      // Update browser history if needed
      if (window.history.state && window.history.state.modal) {
        window.history.pushState({ modal: false }, '');
      }

      // Remove event listeners
      this.modal.removeEventListener('click', this.modal.onclick);
      document.removeEventListener('keydown', handleKeydown);
      this.modalImg.removeEventListener('click', this.modalImg.onclick);
    }
  },
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
