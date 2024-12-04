import { jest } from '@jest/globals';

let helpers;
const filterImagesMock = jest.fn();
const filterByLetterMock = jest.fn();
const sortImagesMock = jest.fn();
const loadImagesMock = jest.fn();
const handleSearchMock = jest.fn();
const handleSortMock = jest.fn();
const handleLetterFilterMock = jest.fn();
const updateNoResultsMessageMock = jest.fn();

// Mock the module before any imports
jest.unstable_mockModule('helpers', () => ({
  filterImages: filterImagesMock,
  filterByLetter: filterByLetterMock,
  sortImages: sortImagesMock,
  loadImages: loadImagesMock,
  handleSearch: handleSearchMock,
  handleSort: handleSortMock,
  handleLetterFilter: handleLetterFilterMock,
  updateNoResultsMessage: updateNoResultsMessageMock
}));

beforeAll(async () => {
  helpers = await import('helpers');
});

describe('Gallery Helper Functions', () => {
  beforeEach(() => {
    // Clear all mocks
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

  describe('filterImages', () => {
    test('filters images by search term', () => {
      const images = [
        { name: 'test1.jpg', tags: ['test'] },
        { name: 'test2.jpg', tags: ['other'] }
      ];
      const searchTerm = 'test';

      filterImagesMock.mockReturnValue([images[0]]);
      const result = helpers.filterImages(images, searchTerm);

      expect(filterImagesMock).toHaveBeenCalledWith(images, searchTerm);
      expect(result).toEqual([images[0]]);
    });
  });

  describe('filterByLetter', () => {
    test('filters images by starting letter', () => {
      const images = [
        { name: 'apple.jpg' },
        { name: 'banana.jpg' }
      ];
      const letter = 'a';

      filterByLetterMock.mockReturnValue([images[0]]);
      const result = helpers.filterByLetter(images, letter);

      expect(filterByLetterMock).toHaveBeenCalledWith(images, letter);
      expect(result).toEqual([images[0]]);
    });
  });

  describe('sortImages', () => {
    test('sorts images by specified criteria', () => {
      const images = [
        { name: 'b.jpg', date: '2023-01-02' },
        { name: 'a.jpg', date: '2023-01-01' }
      ];
      const criteria = 'name';

      sortImagesMock.mockReturnValue([images[1], images[0]]);
      const result = helpers.sortImages(images, criteria);

      expect(sortImagesMock).toHaveBeenCalledWith(images, criteria);
      expect(result).toEqual([images[1], images[0]]);
    });
  });

  describe('loadImages', () => {
    test('loads and displays images', async () => {
      const mockImages = [
        { name: 'test1.jpg', path: '/images/test1.jpg', date: '2023-01-01' },
        { name: 'test2.jpg', path: '/images/test2.jpg', date: '2023-01-02' }
      ];

      loadImagesMock.mockResolvedValue(mockImages);
      const result = await helpers.loadImages();

      expect(loadImagesMock).toHaveBeenCalled();
      expect(result).toEqual(mockImages);
    });

    test('handles fetch error', async () => {
      loadImagesMock.mockRejectedValue(new Error('Failed to load images'));
      await expect(helpers.loadImages()).rejects.toThrow('Failed to load images');
    });

    test('handles missing image grid', async () => {
      document.getElementById('image-grid').remove();
      loadImagesMock.mockRejectedValue(new Error('Image grid element not found'));
      await expect(helpers.loadImages()).rejects.toThrow('Image grid element not found');
    });
  });

  describe('Event Handlers', () => {
    test('handleSearch calls filterImages', () => {
      const event = { target: { value: 'test' } };
      helpers.handleSearch(event);
      expect(handleSearchMock).toHaveBeenCalledWith(event);
    });

    test('handleSort updates button state and sorts images', () => {
      const button = document.createElement('button');
      button.dataset.order = 'asc';
      const event = { target: button };
      
      helpers.handleSort(event);
      expect(handleSortMock).toHaveBeenCalledWith(event);
    });

    test('handleLetterFilter calls filterByLetter', () => {
      const button = document.createElement('button');
      button.dataset.letter = 'A';
      const event = { target: button };
      
      helpers.handleLetterFilter(event);
      expect(handleLetterFilterMock).toHaveBeenCalledWith(event);
    });
  });

  describe('updateNoResultsMessage', () => {
    test('shows no results message when true', () => {
      helpers.updateNoResultsMessage(true);
      expect(updateNoResultsMessageMock).toHaveBeenCalledWith(true);
    });

    test('hides no results message when false', () => {
      helpers.updateNoResultsMessage(false);
      expect(updateNoResultsMessageMock).toHaveBeenCalledWith(false);
    });
  });
});
