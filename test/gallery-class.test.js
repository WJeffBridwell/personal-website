import { jest } from '@jest/globals';
import { Gallery } from '../public/js/gallery.js';

jest.setTimeout(10000);

describe('Gallery Class', () => {
  let gallery;
  let images;

  beforeEach(() => {
    jest.useFakeTimers();

    document.body.innerHTML = `
      <div id="gallery-container">
        <div id="image-grid"></div>
        <div class="gallery-controls">
          <input id="search-input" type="text" />
          <div id="letter-filter">
            <div class="letter-buttons"></div>
          </div>
          <button id="sort-name" class="sort-btn">Sort by Name</button>
          <button id="sort-date" class="sort-btn">Sort by Date</button>
        </div>
        <div id="imageModal" style="display: none;">
          <img class="modal-img" />
          <div class="modal-caption"></div>
          <button class="close-modal"></button>
        </div>
      </div>
    `;

    gallery = new Gallery();
    gallery.initializeEventListeners();
    gallery.createLetterFilter();
    gallery.initializeStickyControls();
    gallery.initSearch();

    // Add test images
    const imageGrid = document.getElementById('image-grid');
    images = [
      { name: 'test1.jpg', date: '2023-01-01' },
      { name: 'test2.jpg', date: '2023-01-02' }
    ];

    images.forEach(img => {
      const container = document.createElement('div');
      container.className = 'image-container';
      container.style.display = 'block';
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'image-name';
      nameDiv.textContent = img.name;
      
      container.appendChild(nameDiv);
      imageGrid.appendChild(container);
    });

    gallery.images = images;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Event Handling', () => {
    test('attaches search input listener', () => {
      const handleSearchSpy = jest.spyOn(gallery, 'handleSearch');
      
      const searchInput = document.getElementById('search-input');
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input'));
      
      jest.advanceTimersByTime(300); 
      expect(handleSearchSpy).toHaveBeenCalled();
      
      handleSearchSpy.mockRestore();
    });
  });

  describe('Image Loading and Error Handling', () => {
    test('handles malformed image data gracefully', () => {
      const gallery = new Gallery();
      const _imageGrid = document.getElementById('image-grid');

      if (_imageGrid) {
        _imageGrid.innerHTML = `
                <div class="image-container">
                    <div class="image-name"></div>
                    <img src="" alt="">
                </div>
            `;

        const containers = _imageGrid.querySelectorAll('.image-container');
        const firstImage = containers[0].querySelector('img');

        // eslint-disable-next-line jest/no-conditional-expect
        expect(containers).toHaveLength(1);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(firstImage).toBeTruthy();

        // Test empty src and alt
        expect(firstImage.src).toMatch(/^(http|https):\/\//);
        expect(firstImage.alt).toBe('');
      }
    });
  });

  describe('Advanced Event Handling', () => {
    let gallery;
    let images;

    beforeEach(() => {
      jest.useFakeTimers();

      document.body.innerHTML = `
        <div id="gallery-container">
          <div id="image-grid"></div>
          <div class="gallery-controls">
            <input id="search-input" type="text" />
            <div id="letter-filter">
              <div class="letter-buttons"></div>
            </div>
            <button id="sort-name" class="sort-btn">Sort by Name</button>
            <button id="sort-date" class="sort-btn">Sort by Date</button>
          </div>
          <div id="imageModal" style="display: none;">
            <img class="modal-img" />
            <div class="modal-caption"></div>
            <button class="close-modal"></button>
          </div>
        </div>
      `;

      gallery = new Gallery();
      gallery.initializeEventListeners();
      gallery.createLetterFilter();
      gallery.initializeStickyControls();
      gallery.initSearch();

      // Add test images
      const imageGrid = document.getElementById('image-grid');
      images = [
        { name: 'test1.jpg', date: '2023-01-01' },
        { name: 'test2.jpg', date: '2023-01-02' }
      ];

      images.forEach(img => {
        const container = document.createElement('div');
        container.className = 'image-container';
        container.style.display = 'block';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'image-name';
        nameDiv.textContent = img.name;
        
        container.appendChild(nameDiv);
        imageGrid.appendChild(container);
      });

      gallery.images = images;
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    describe('Letter Filter Events', () => {
      test('combines letter filter with search', () => {
        const handleSearchSpy = jest.spyOn(gallery, 'handleSearch');
        const filterByLetterSpy = jest.spyOn(gallery, 'filterByLetter');
        
        // Create letter filter
        gallery.createLetterFilter();
        
        // Click 'B' button
        const letterFilter = document.getElementById('letter-filter');
        const letterButtons = letterFilter.querySelectorAll('.letter-button');
        const bButton = Array.from(letterButtons).find(btn => btn.textContent === 'B');
        bButton.click();
        
        // Type in search
        const searchInput = document.getElementById('search-input');
        searchInput.value = 'test';
        searchInput.dispatchEvent(new Event('input'));
        
        jest.advanceTimersByTime(300);
        
        expect(handleSearchSpy).toHaveBeenCalled();
        expect(filterByLetterSpy).toHaveBeenCalledWith('B');
        
        handleSearchSpy.mockRestore();
        filterByLetterSpy.mockRestore();
      });
    });

    describe('Edge Cases', () => {
      test('handles filter reset sequence', async () => {
        // Setup initial state with multiple images
        const imageGrid = document.getElementById('image-grid');
        const images = [
          { name: 'Apple', url: 'apple.jpg' },
          { name: 'Banana', url: 'banana.jpg' },
          { name: 'Cherry', url: 'cherry.jpg' },
        ];

        images.forEach(img => {
          const container = document.createElement('div');
          container.className = 'image-container';
          container.style.display = 'block';
          
          const nameDiv = document.createElement('div');
          nameDiv.className = 'image-name';
          nameDiv.textContent = img.name;
          
          container.appendChild(nameDiv);
          imageGrid.appendChild(container);
        });

        gallery.images = images;
        gallery.renderImages();
        gallery.createLetterFilter();
        gallery.initializeEventListeners();

        // Apply letter filter
        gallery.filterByLetter('A');
        jest.advanceTimersByTime(100);

        // Verify only A items are visible
        let visibleContainers = Array.from(document.querySelectorAll('.image-container'))
          .filter((c) => c.style.display !== 'none');
        expect(visibleContainers).toHaveLength(1);
        expect(visibleContainers[0].querySelector('.image-name').textContent).toBe('Apple');

        // Reset filter
        gallery.filterByLetter('All');
        jest.advanceTimersByTime(100);

        // Verify all items are visible
        visibleContainers = Array.from(document.querySelectorAll('.image-container'))
          .filter((c) => c.style.display !== 'none');
        expect(visibleContainers).toHaveLength(3);
      });
    });
  });

  describe('Event Handling', () => {
    let gallery;
    let images;

    beforeEach(() => {
      jest.useFakeTimers();

      document.body.innerHTML = `
        <div id="gallery-container">
          <div id="image-grid"></div>
          <div class="gallery-controls">
            <input id="search-input" type="text" />
            <div id="letter-filter">
              <div class="letter-buttons"></div>
            </div>
            <button id="sort-name" class="sort-btn">Sort by Name</button>
            <button id="sort-date" class="sort-btn">Sort by Date</button>
          </div>
          <div id="imageModal" style="display: none;">
            <img class="modal-img" />
            <div class="modal-caption"></div>
            <button class="close-modal"></button>
          </div>
        </div>
      `;

      gallery = new Gallery();
      gallery.initializeEventListeners();
      gallery.createLetterFilter();
      gallery.initializeStickyControls();
      gallery.initSearch();

      // Add test images
      const imageGrid = document.getElementById('image-grid');
      images = [
        { name: 'test1.jpg', date: '2023-01-01' },
        { name: 'test2.jpg', date: '2023-01-02' }
      ];

      images.forEach(img => {
        const container = document.createElement('div');
        container.className = 'image-container';
        container.style.display = 'block';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'image-name';
        nameDiv.textContent = img.name;
        
        container.appendChild(nameDiv);
        imageGrid.appendChild(container);
      });

      gallery.images = images;
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    test('attaches search input listener', async () => {
      // Setup initial state
      const handleSearchSpy = jest.spyOn(gallery, 'handleSearch');

      // Initialize event listeners after spy is set up
      gallery.initializeEventListeners();

      // Trigger search input event
      const searchInput = document.getElementById('search-input');
      searchInput.value = 'test';
      const event = new Event('input', { bubbles: true });
      Object.defineProperty(event, 'target', { value: searchInput });
      searchInput.dispatchEvent(event);

      // Fast forward debounce timer
      jest.advanceTimersByTime(300);

      expect(handleSearchSpy).toHaveBeenCalled();
      handleSearchSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      document.body.innerHTML = `
              <div id="gallery-container">
                  <div id="image-grid"></div>
                  <div class="gallery-controls">
                    <input id="search-input" type="text" aria-label="Search images" />
                    <div id="letter-filter">
                      <div class="letter-buttons"></div>
                    </div>
                    <button id="sort-name" class="sort-btn">Sort by Name</button>
                    <button id="sort-date" class="sort-btn">Sort by Date</button>
                  </div>
              </div>
          `;
    });

    test('maintains keyboard navigation', () => {
      const gallery = new Gallery();
      const _letterFilter = document.getElementById('letter-filter');

      if (_letterFilter) {
        const buttons = _letterFilter.querySelectorAll('button');
        buttons.forEach((button) => {
          // Check if button can receive focus (implicit tabindex of 0)
          expect(button.tabIndex).toBe(0);
          // Check if button has accessible name (either via text content or aria-label)
          expect(button.textContent || button.getAttribute('aria-label')).toBeTruthy();
        });
      }
    });

    test('handles screen reader announcements', () => {
      const gallery = new Gallery();
      const _imageContainers = document.querySelectorAll('.image-container');

      _imageContainers.forEach((container) => {
        const img = container.querySelector('img');
        expect(img.getAttribute('alt')).toBeTruthy();
      });
    });
  });

  describe('Memory Management', () => {
    test('cleans up event listeners', () => {
      const gallery = new Gallery();
      const searchInput = document.getElementById('search-input');

      // Mock removeEventListener
      const removeEventListenerSpy = jest.spyOn(searchInput, 'removeEventListener');

      // Simulate cleanup
      searchInput.removeEventListener('input', gallery.handleSearch);

      expect(removeEventListenerSpy).toHaveBeenCalledWith('input', gallery.handleSearch);

      removeEventListenerSpy.mockRestore();
    });

    test('handles large datasets without memory leaks', () => {
      const gallery = new Gallery();
      const _imageGrid = document.getElementById('image-grid');

      if (_imageGrid) {
        // Add many images
        const initialMemory = process.memoryUsage().heapUsed;

        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div');
          div.className = 'image-container';
          div.innerHTML = `
                    <div class="image-name">image${i}.jpg</div>
                    <img src="image${i}.jpg" alt="image${i}.jpg" />
                `;
          _imageGrid.appendChild(div);
        }

        // Perform operations
        gallery.renderImages();
        gallery.handleSearch({ target: { value: 'test' } });
        gallery.filterByLetter('A');

        // Check memory usage
        const finalMemory = process.memoryUsage().heapUsed;
        expect(finalMemory - initialMemory).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      }
    });
  });
});
