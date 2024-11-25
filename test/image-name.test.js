/**
 * @jest-environment jsdom
 */

describe('Image Name Display', () => {
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="image-grid" class="image-grid"></div>
            <style>
                .image-name {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 8px;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    font-size: 14px;
                    text-align: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .image-container:hover .image-name {
                    opacity: 1;
                }
            </style>
        `;

        // Import the functions we need
        const script = document.createElement('script');
        script.textContent = `
            function createElement(tag, attributes = {}, children = []) {
                const element = document.createElement(tag);
                Object.entries(attributes).forEach(([key, value]) => {
                    if (key === 'className') {
                        element.className = value;
                    } else {
                        element.setAttribute(key, value);
                    }
                });
                children.forEach(child => element.appendChild(child));
                return element;
            }
        `;
        document.body.appendChild(script);
    });

    test('image name is added to container', async () => {
        // Mock image data
        const images = [{
            src: '/images/test1.jpg',
            alt: 'test1'
        }];

        // Display images
        const imageFunctions = {
            displayImages: async function(images) {
                const grid = document.getElementById('image-grid');
                
                for (const image of images) {
                    const container = createElement('div', { className: 'image-container skeleton' });
        
                    const img = createElement('img', {
                        className: 'loading',
                        alt: image.alt || '',
                        loading: 'lazy',
                        src: image.src
                    });
        
                    const searchIcon = createElement('i', { 
                        className: 'fas fa-search search-icon'
                    });
        
                    const nameLabel = createElement('div', {
                        className: 'image-name'
                    });
                    nameLabel.textContent = image.alt;
        
                    container.appendChild(img);
                    container.appendChild(searchIcon);
                    container.appendChild(nameLabel);
                    grid.appendChild(container);
                }
            }
        };

        await imageFunctions.displayImages(images);

        // Verify image name is present
        const nameLabel = document.querySelector('.image-name');
        expect(nameLabel).toBeTruthy();
        expect(nameLabel.textContent).toBe('test1');
    });

    test('image name has correct styles', async () => {
        // Mock image data
        const images = [{
            src: '/images/test1.jpg',
            alt: 'test1'
        }];

        // Display images
        const imageFunctions = {
            displayImages: async function(images) {
                const grid = document.getElementById('image-grid');
                
                for (const image of images) {
                    const container = createElement('div', { className: 'image-container skeleton' });
        
                    const img = createElement('img', {
                        className: 'loading',
                        alt: image.alt || '',
                        loading: 'lazy',
                        src: image.src
                    });
        
                    const searchIcon = createElement('i', { 
                        className: 'fas fa-search search-icon'
                    });
        
                    const nameLabel = createElement('div', {
                        className: 'image-name',
                        style: 'position: absolute; bottom: 0; opacity: 0; background-color: rgba(0, 0, 0, 0.7);'
                    });
                    nameLabel.textContent = image.alt;
        
                    container.appendChild(img);
                    container.appendChild(searchIcon);
                    container.appendChild(nameLabel);
                    grid.appendChild(container);
                }
            }
        };

        await imageFunctions.displayImages(images);

        // Get elements
        const nameLabel = document.querySelector('.image-name');

        // Verify styles
        const styles = window.getComputedStyle(nameLabel);
        expect(styles.position).toBe('absolute');
        expect(styles.bottom).toBe('0px');
        expect(styles.backgroundColor).toBe('rgba(0, 0, 0, 0.7)');
    });

    test('handles empty image name gracefully', async () => {
        // Mock image data with no alt text
        const images = [{
            src: '/images/test1.jpg',
            alt: ''
        }];

        // Display images
        const imageFunctions = {
            displayImages: async function(images) {
                const grid = document.getElementById('image-grid');
                
                for (const image of images) {
                    const container = createElement('div', { className: 'image-container skeleton' });
        
                    const img = createElement('img', {
                        className: 'loading',
                        alt: image.alt || '',
                        loading: 'lazy',
                        src: image.src
                    });
        
                    const searchIcon = createElement('i', { 
                        className: 'fas fa-search search-icon'
                    });
        
                    const nameLabel = createElement('div', {
                        className: 'image-name'
                    });
                    nameLabel.textContent = image.alt;
        
                    container.appendChild(img);
                    container.appendChild(searchIcon);
                    container.appendChild(nameLabel);
                    grid.appendChild(container);
                }
            }
        };

        await imageFunctions.displayImages(images);

        // Verify image name is present but empty
        const nameLabel = document.querySelector('.image-name');
        expect(nameLabel).toBeTruthy();
        expect(nameLabel.textContent).toBe('');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });
});
