export function initializeModal() {
    // Ensure the modal exists in the DOM
    let modal = document.getElementById('imageModal');
    if (!modal) {
        // Create modal structure if it doesn't exist
        modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <span class="close-modal">&times;</span>
            <img class="modal-img" src="" alt="" />
            <div class="modal-caption"></div>
        `;
        document.body.appendChild(modal);
    }

    const modalImg = modal.querySelector('.modal-img');
    const modalCaption = modal.querySelector('.modal-caption');
    const closeButton = modal.querySelector('.close-modal');

    function openModal(imageSrc, caption) {
        if (!imageSrc || !caption) {
            handleError('Missing image data');
            return;
        }

        modalImg.src = imageSrc;
        modalCaption.textContent = caption;
        modal.classList.add('show');
    }

    function closeModal() {
        modal.classList.remove('show');
        modalImg.classList.remove('error');
        const errorMessage = modal.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    function handleError(message) {
        modalImg.classList.add('error');
        // Remove any existing error messages
        const existingError = modal.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = message;
        modal.appendChild(errorMessage);
    }

    // Event Listeners
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });

    modalImg.addEventListener('error', () => {
        handleError('Failed to load image');
    });

    // Prevent modal close when clicking modal content
    modalImg.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    modalCaption.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Initialize click handlers for image containers
    document.querySelectorAll('.image-container').forEach(container => {
        container.addEventListener('click', () => {
            const img = container.querySelector('img');
            const nameElement = container.querySelector('.image-name');
            const name = nameElement ? nameElement.textContent : '';
            
            if (img && name) {
                openModal(img.src, name);
            } else {
                handleError('Invalid image data');
            }
        });
    });

    return {
        openModal,
        closeModal,
        handleError,
        modal,
        modalImg,
        modalCaption,
        closeButton
    };
}
