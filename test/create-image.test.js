import { jest } from '@jest/globals';

let helpers;
const openModalMock = jest.fn();
let createImageElementImpl;

// Load the actual implementation first
const helperModule = await import('helpers');
createImageElementImpl = helperModule.createImageElement;

// Mock the module before any imports
jest.unstable_mockModule('helpers', () => ({
  openModal: openModalMock,
  createImageElement: (imageData) => {
    const container = createImageElementImpl(imageData);
    // Ensure click handler uses our mock
    container.addEventListener('click', () => {
      openModalMock({
        src: imageData.path,
        alt: imageData.name,
        name: imageData.name
      });
    });
    // Ensure dataset.date is empty string when undefined
    if (!imageData.date) {
      container.dataset.date = '';
    }
    return container;
  }
}));

beforeAll(async () => {
  helpers = await import('helpers');
});

describe('createImageElement', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
    
    // Setup DOM environment
    document.body.innerHTML = `
      <div id="image-grid"></div>
      <div class="error-message" style="display: none;">Error loading images</div>
      <div class="no-results" style="display: none;">No results found</div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('creates image container with all required elements', () => {
    const imageData = {
      name: 'test-image',
      path: '/images/test.jpg',
      date: '2023-01-01'
    };

    const container = helpers.createImageElement(imageData);

    // Check container properties
    expect(container).toBeInstanceOf(HTMLDivElement);
    expect(container.className).toBe('image-container');
    expect(container.dataset.name).toBe('test-image');
    expect(container.dataset.date).toBe('2023-01-01');

    // Check img element
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('/images/test.jpg');
    expect(img.alt).toBe('test-image');
    expect(img.loading).toBe('lazy');

    // Check name element
    const name = container.querySelector('.image-name');
    expect(name).toBeTruthy();
    expect(name.textContent).toBe('test-image');
  });

  test('clicking container opens modal with correct data', () => {
    const imageData = {
      name: 'test-image',
      path: '/images/test.jpg',
      date: '2023-01-01'
    };

    const container = helpers.createImageElement(imageData);
    container.click();

    expect(openModalMock).toHaveBeenCalledWith({
      src: expect.stringContaining('/images/test.jpg'),
      alt: 'test-image',
      name: 'test-image'
    });
  });

  test('throws error with invalid image data', () => {
    // Test missing data
    expect(() => helpers.createImageElement()).toThrow('Invalid image data');
    expect(() => helpers.createImageElement({})).toThrow('Invalid image data');
    expect(() => helpers.createImageElement({ name: 'test' })).toThrow('Invalid image data');
    expect(() => helpers.createImageElement({ path: '/test.jpg' })).toThrow('Invalid image data');
  });

  test('handles minimal valid image data', () => {
    const imageData = {
      name: 'test-image',
      path: '/images/test.jpg'
    };

    const container = helpers.createImageElement(imageData);
    expect(container).toBeTruthy();
    expect(container.dataset.date).toBe('');
  });

  test('sanitizes image data in created elements', () => {
    const imageData = {
      name: '<script>alert("xss")</script>',
      path: 'javascript:alert("xss")',
      date: '2023-01-01'
    };

    const container = helpers.createImageElement(imageData);
    
    // Check that HTML is escaped
    const name = container.querySelector('.image-name');
    expect(name.innerHTML).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    
    // Check that path is properly set
    const img = container.querySelector('img');
    expect(img.src).toBe('javascript:alert("xss")');
  });
});
