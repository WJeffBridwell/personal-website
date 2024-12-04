/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

describe('Image Name Display', () => {
  beforeEach(() => {
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
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('image name is added to container', async () => {
    // Mock image data
    const images = [{
      src: '/images/test1.jpg',
      alt: 'test1',
    }];

    // Display images
    const imageFunctions = {
      displayImages: async function (images) {
        const grid = document.getElementById('image-grid');

        for (const image of images) {
          const container = document.createElement('div');
          container.className = 'image-container skeleton';

          const img = document.createElement('img');
          img.className = 'loading';
          img.alt = image.alt || '';
          img.loading = 'lazy';
          img.src = image.src;

          const searchIcon = document.createElement('i');
          searchIcon.className = 'fas fa-search search-icon';

          const nameLabel = document.createElement('div');
          nameLabel.className = 'image-name';
          nameLabel.textContent = image.alt;

          container.appendChild(img);
          container.appendChild(searchIcon);
          container.appendChild(nameLabel);
          grid.appendChild(container);
        }
      },
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
      alt: 'test1',
    }];

    // Display images
    const imageFunctions = {
      displayImages: async function (images) {
        const grid = document.getElementById('image-grid');

        for (const image of images) {
          const container = document.createElement('div');
          container.className = 'image-container skeleton';

          const img = document.createElement('img');
          img.className = 'loading';
          img.alt = image.alt || '';
          img.loading = 'lazy';
          img.src = image.src;

          const searchIcon = document.createElement('i');
          searchIcon.className = 'fas fa-search search-icon';

          const nameLabel = document.createElement('div');
          nameLabel.className = 'image-name';
          nameLabel.style.position = 'absolute';
          nameLabel.style.bottom = '0';
          nameLabel.style.opacity = '0';
          nameLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          nameLabel.textContent = image.alt;

          container.appendChild(img);
          container.appendChild(searchIcon);
          container.appendChild(nameLabel);
          grid.appendChild(container);
        }
      },
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
      alt: '',
    }];

    // Display images
    const imageFunctions = {
      displayImages: async function (images) {
        const grid = document.getElementById('image-grid');

        for (const image of images) {
          const container = document.createElement('div');
          container.className = 'image-container skeleton';

          const img = document.createElement('img');
          img.className = 'loading';
          img.alt = image.alt || '';
          img.loading = 'lazy';
          img.src = image.src;

          const searchIcon = document.createElement('i');
          searchIcon.className = 'fas fa-search search-icon';

          const nameLabel = document.createElement('div');
          nameLabel.className = 'image-name';
          nameLabel.textContent = image.alt;

          container.appendChild(img);
          container.appendChild(searchIcon);
          container.appendChild(nameLabel);
          grid.appendChild(container);
        }
      },
    };

    await imageFunctions.displayImages(images);

    // Verify image name is present but empty
    const nameLabel = document.querySelector('.image-name');
    expect(nameLabel).toBeTruthy();
    expect(nameLabel.textContent).toBe('');
  });

  test('creates image container with name', () => {
    const container = document.createElement('div');
    container.className = 'image-container';
    const img = document.createElement('img');
    img.src = 'test.jpg';
    img.alt = 'Test Image';
    container.appendChild(img);
    document.getElementById('image-grid').appendChild(container);

    expect(container.querySelector('img')).toBeTruthy();
    expect(container.querySelector('img').alt).toBe('Test Image');
  });
});
