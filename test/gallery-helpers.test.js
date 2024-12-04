import { jest } from '@jest/globals';

let helpers;
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock fetch
global.fetch = jest.fn();

beforeAll(async () => {
  helpers = await import('helpers');
});

describe('Gallery Helper Functions', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup DOM environment
    document.body.innerHTML = `
      <div id="image-grid">
        <div class="image-container" data-date="2023-01-01">
          <div class="image-name">Apple</div>
        </div>
        <div class="image-container" data-date="2023-01-02">
          <div class="image-name">Banana</div>
        </div>
        <div class="image-container" data-date="2023-01-03">
          <div class="image-name">Cherry</div>
        </div>
      </div>
      <div class="error-message" style="display: none;">Error loading images</div>
      <div class="no-results" style="display: none;">No results found</div>
      <div class="modal hidden">
        <button class="modal-close">×</button>
        <img class="modal-img" src="" alt="">
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  describe('updateGalleryState', () => {
    test('returns default state when no arguments provided', () => {
      const state = helpers.updateGalleryState();
      expect(state).toEqual({
        filter: 'all',
        sort: 'name',
        order: 'asc',
        search: '',
        letter: 'all'
      });
    });

    test('merges new state with defaults', () => {
      const state = helpers.updateGalleryState({ sort: 'date', order: 'desc' });
      expect(state.sort).toBe('date');
      expect(state.order).toBe('desc');
      expect(state.filter).toBe('all');
    });

    test('validates sort and order values', () => {
      const state = helpers.updateGalleryState({ sort: 'invalid', order: 'invalid' });
      expect(state.sort).toBe('name');
      expect(state.order).toBe('asc');
    });

    test('throws error for invalid state object', () => {
      expect(() => helpers.updateGalleryState('invalid')).toThrow('Invalid state object');
    });

    test('throws error for invalid property', () => {
      expect(() => helpers.updateGalleryState({ invalid: true })).toThrow('Invalid state property');
    });

    test('handles localStorage errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const state = helpers.updateGalleryState({ sort: 'date' });
      expect(state.sort).toBe('date');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save gallery state:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('handleError', () => {
    test('handles string errors', () => {
      helpers.handleError('Test error');
      const errorElement = document.querySelector('.error-message');
      expect(errorElement.textContent).toBe('Test error');
      expect(errorElement.style.display).toBe('block');
    });

    test('handles Error objects', () => {
      const error = new Error('Test error');
      helpers.handleError(error);
      const errorElement = document.querySelector('.error-message');
      expect(errorElement.textContent).toBe('Test error');
    });

    test('handles objects with message property', () => {
      helpers.handleError({ message: 'Test error' });
      const errorElement = document.querySelector('.error-message');
      expect(errorElement.textContent).toBe('Test error');
    });

    test('handles null/undefined errors', () => {
      helpers.handleError(null);
      const errorElement = document.querySelector('.error-message');
      expect(errorElement.textContent).toBe('Unknown error');
    });

    test('logs stack trace in debug mode', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      helpers.handleError(error, true);
      expect(consoleSpy).toHaveBeenCalledWith('Test error', error.stack);
      consoleSpy.mockRestore();
    });
  });

  describe('filterImages', () => {
    test('filters images by single search term', () => {
      helpers.filterImages('apple');
      const containers = document.querySelectorAll('.image-container');
      expect(containers[0].style.display).toBe('');
      expect(containers[1].style.display).toBe('none');
      expect(containers[2].style.display).toBe('none');
    });

    test('filters images by multiple search terms', () => {
      helpers.filterImages('apple banana');
      const containers = document.querySelectorAll('.image-container');
      expect(containers[0].style.display).toBe('none');
      expect(containers[1].style.display).toBe('none');
      expect(containers[2].style.display).toBe('none');
    });

    test('shows all images when search term is empty', () => {
      helpers.filterImages('');
      const containers = document.querySelectorAll('.image-container');
      expect(containers[0].style.display).toBe('');
      expect(containers[1].style.display).toBe('');
      expect(containers[2].style.display).toBe('');
    });

    test('handles missing image grid', () => {
      document.getElementById('image-grid').remove();
      expect(() => helpers.filterImages('test')).not.toThrow();
    });

    test('updates no results message', () => {
      helpers.filterImages('nonexistent');
      const noResults = document.querySelector('.no-results');
      expect(noResults.style.display).toBe('block');
    });
  });

  describe('filterByLetter', () => {
    test('filters images by starting letter', () => {
      helpers.filterByLetter('b');
      const containers = document.querySelectorAll('.image-container');
      expect(containers[0].style.display).toBe('none');
      expect(containers[1].style.display).toBe('');
      expect(containers[2].style.display).toBe('none');
    });

    test('shows all images when letter is "all"', () => {
      helpers.filterByLetter('all');
      const containers = document.querySelectorAll('.image-container');
      expect(containers[0].style.display).toBe('');
      expect(containers[1].style.display).toBe('');
      expect(containers[2].style.display).toBe('');
    });

    test('is case insensitive', () => {
      helpers.filterByLetter('B');
      const containers = document.querySelectorAll('.image-container');
      expect(containers[1].style.display).toBe('');
    });

    test('throws error when image grid is missing', () => {
      document.getElementById('image-grid').remove();
      expect(() => helpers.filterByLetter('a')).toThrow('Image grid element not found');
    });

    test('updates no results message', () => {
      helpers.filterByLetter('z');
      const noResults = document.querySelector('.no-results');
      expect(noResults.style.display).toBe('block');
    });
  });

  describe('sortImages', () => {
    test('sorts by name ascending', () => {
      helpers.sortImages('name', 'asc');
      const names = Array.from(document.querySelectorAll('.image-name'))
        .map(el => el.textContent);
      expect(names).toEqual(['Apple', 'Banana', 'Cherry']);
    });

    test('sorts by name descending', () => {
      helpers.sortImages('name', 'desc');
      const names = Array.from(document.querySelectorAll('.image-name'))
        .map(el => el.textContent);
      expect(names).toEqual(['Cherry', 'Banana', 'Apple']);
    });

    test('sorts by date ascending', () => {
      helpers.sortImages('date', 'asc');
      const dates = Array.from(document.querySelectorAll('.image-container'))
        .map(el => el.dataset.date);
      expect(dates).toEqual(['2023-01-01', '2023-01-02', '2023-01-03']);
    });

    test('sorts by date descending', () => {
      helpers.sortImages('date', 'desc');
      const dates = Array.from(document.querySelectorAll('.image-container'))
        .map(el => el.dataset.date);
      expect(dates).toEqual(['2023-01-03', '2023-01-02', '2023-01-01']);
    });

    test('handles missing dates', () => {
      const container = document.createElement('div');
      container.className = 'image-container';
      container.innerHTML = '<div class="image-name">No Date</div>';
      document.getElementById('image-grid').appendChild(container);

      helpers.sortImages('date', 'asc');
      const names = Array.from(document.querySelectorAll('.image-name'))
        .map(el => el.textContent);
      expect(names[0]).toBe('No Date');
    });

    test('handles missing image grid', () => {
      document.getElementById('image-grid').remove();
      expect(() => helpers.sortImages('name', 'asc')).not.toThrow();
    });
  });

  describe('loadImages', () => {
    test('loads and displays images', async () => {
      const mockImages = [
        { name: 'test1.jpg', path: '/images/test1.jpg', date: '2023-01-01' },
        { name: 'test2.jpg', path: '/images/test2.jpg', date: '2023-01-02' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockImages)
      });

      const images = await helpers.loadImages();
      expect(images).toEqual(mockImages);

      const containers = document.querySelectorAll('.image-container');
      expect(containers).toHaveLength(2);

      const firstImage = containers[0].querySelector('img');
      expect(firstImage.src).toContain('/images/test1.jpg');
      expect(firstImage.alt).toBe('test1.jpg');
    });

    test('handles fetch error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false
      });

      await expect(helpers.loadImages()).rejects.toThrow('Failed to load images');
      expect(document.querySelector('.error-message').style.display).toBe('block');
    });

    test('handles missing image grid', async () => {
      document.getElementById('image-grid').remove();
      await expect(helpers.loadImages()).rejects.toThrow('Image grid element not found');
    });

    test('handles network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(helpers.loadImages()).rejects.toThrow('Network error');
    });
  });

  describe('Modal Functions', () => {
    describe('initializeModal', () => {
      test('sets up modal event listeners', () => {
        helpers.initializeModal();
        
        const modal = document.querySelector('.modal');
        const closeButton = modal.querySelector('.modal-close');
        const modalContent = modal.querySelector('.modal-img');

        // Test close button
        modal.classList.remove('hidden');
        closeButton.click();
        expect(modal.classList.contains('hidden')).toBe(true);

        // Test clicking outside
        modal.classList.remove('hidden');
        modal.click();
        expect(modal.classList.contains('hidden')).toBe(true);

        // Test clicking content doesn't close
        modal.classList.remove('hidden');
        modalContent.click();
        expect(modal.classList.contains('hidden')).toBe(false);
      });

      test('handles missing modal element', () => {
        document.querySelector('.modal').remove();
        expect(() => helpers.initializeModal()).not.toThrow();
      });
    });

    describe('openModal and closeModal', () => {
      test('opens modal with image data', () => {
        const imageData = {
          src: '/images/test.jpg',
          alt: 'Test Image',
          name: 'Test Image'
        };

        const modal = document.querySelector('.modal');
        modal.classList.add('hidden');

        helpers.openModal(imageData);
        const img = modal.querySelector('.modal-img');

        expect(modal.classList.contains('hidden')).toBe(false);
        expect(img.src).toContain('/images/test.jpg');
        expect(img.alt).toBe('Test Image');
      });

      test('closes modal', () => {
        const modal = document.querySelector('.modal');
        modal.classList.remove('hidden');

        helpers.closeModal();
        expect(modal.classList.contains('hidden')).toBe(true);
      });

      test('handles missing modal element', () => {
        document.querySelector('.modal').remove();
        expect(() => helpers.openModal({ src: 'test.jpg' })).not.toThrow();
        expect(() => helpers.closeModal()).not.toThrow();
      });
    });
  });

  describe('Event Handlers', () => {
    test('handleSearch calls filterImages', () => {
      const event = { target: { value: 'test' } };
      helpers.handleSearch(event);
      const containers = document.querySelectorAll('.image-container');
      expect(containers[0].style.display).toBe('none');
      expect(containers[1].style.display).toBe('none');
      expect(containers[2].style.display).toBe('none');
    });

    test('handleSort updates button state and sorts images', () => {
      const button = document.createElement('button');
      button.dataset.sort = 'name';
      button.dataset.order = 'asc';
      const event = { target: button };
      
      helpers.handleSort(event);
      expect(button.dataset.order).toBe('desc');
      const names = Array.from(document.querySelectorAll('.image-name'))
        .map(el => el.textContent);
      expect(names).toEqual(['Cherry', 'Banana', 'Apple']);
    });

    test('handleLetterFilter calls filterByLetter', () => {
      const button = document.createElement('button');
      button.dataset.letter = 'b';
      const event = { target: button };
      
      helpers.handleLetterFilter(event);
      const containers = document.querySelectorAll('.image-container');
      expect(containers[0].style.display).toBe('none');
      expect(containers[1].style.display).toBe('');
      expect(containers[2].style.display).toBe('none');
    });
  });
});
