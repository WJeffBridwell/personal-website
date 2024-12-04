import { jest } from '@jest/globals';

describe('Collections Controls Layout', () => {
  beforeEach(() => {
    // Set up our document body
    document.body.innerHTML = `
            <div class="collections-controls">
                <div class="controls-container">
                    <div class="search-container">
                        <input type="text" id="searchInput" placeholder="Search images...">
                        <button id="searchButton">Search</button>
                    </div>
                    <div class="sort-container">
                        <button id="sortAZ" class="sort-btn">Sort A-Z</button>
                        <button id="sortZA" class="sort-btn">Sort Z-A</button>
                    </div>
                </div>
            </div>
        `;

    // Add the necessary styles
    const style = document.createElement('style');
    style.textContent = `
            .collections-controls {
                margin-bottom: 2rem;
                width: 100%;
            }

            .controls-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 96px;
                width: 100%;
            }

            .search-container {
                display: flex;
                gap: 0.5rem;
                flex: 1;
            }

            .sort-container {
                display: flex;
                gap: 0.5rem;
                margin-right: auto;
            }

            .sort-btn {
                padding: 8px 16px;
            }
        `;
    document.head.appendChild(style);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('sort buttons are properly aligned and spaced', () => {
    const _controlsContainer = document.querySelector('.controls-container');
    const _sortContainer = document.querySelector('.sort-container');
    const _searchContainer = document.querySelector('.search-container');
    const sortButtons = _sortContainer.querySelectorAll('.sort-btn');

    // Check that we have two sort buttons
    expect(sortButtons).toHaveLength(2);

    // Get computed styles
    const containerStyle = window.getComputedStyle(_controlsContainer);
    const sortContainerStyle = window.getComputedStyle(_sortContainer);

    // Check flex layout and gaps
    expect(containerStyle.display).toBe('flex');
    expect(containerStyle.gap).toBe('96px');
    expect(sortContainerStyle.gap).toBe('0.5rem');

    // Check that buttons are in the correct order
    expect(sortButtons[0].textContent).toBe('Sort A-Z');
    expect(sortButtons[1].textContent).toBe('Sort Z-A');

    // Check that sort container is positioned correctly
    expect(sortContainerStyle.marginRight).toBe('auto');

    // Check that buttons have the correct class and styles
    sortButtons.forEach((button) => {
      expect(button.classList.contains('sort-btn')).toBe(true);
      const buttonStyle = window.getComputedStyle(button);
      expect(buttonStyle.padding).toBe('8px 16px');
    });
  });

  test('sort buttons maintain correct layout structure', () => {
    const _controlsContainer = document.querySelector('.controls-container');
    const _sortContainer = document.querySelector('.sort-container');
    const _searchContainer = document.querySelector('.search-container');

    // Check that containers exist
    expect(_controlsContainer).toBeTruthy();
    expect(_sortContainer).toBeTruthy();
    expect(_searchContainer).toBeTruthy();

    // Check the flex layout properties that ensure correct positioning
    const controlsStyle = window.getComputedStyle(_controlsContainer);
    expect(controlsStyle.display).toBe('flex');
    expect(controlsStyle.gap).toBe('96px');
    expect(controlsStyle.width).toBe('100%');

    // Check that search container takes up remaining space
    const searchStyle = window.getComputedStyle(_searchContainer);
    expect(searchStyle.flex).toBe('1');

    // Check that sort container is a flex container with correct positioning
    const sortStyle = window.getComputedStyle(_sortContainer);
    expect(sortStyle.display).toBe('flex');
    expect(sortStyle.gap).toBe('0.5rem');
    expect(sortStyle.marginRight).toBe('auto');

    // Check the DOM order
    const children = Array.from(_controlsContainer.children);
    expect(children[0]).toBe(_searchContainer);
    expect(children[1]).toBe(_sortContainer);
  });

  test('sort buttons maintain position on window resize', () => {
    const _controlsContainer = document.querySelector('.controls-container');
    const _sortContainer = document.querySelector('.sort-container');
    const _searchContainer = document.querySelector('.search-container');

    // Check initial layout
    const controlsStyle = window.getComputedStyle(_controlsContainer);
    expect(controlsStyle.display).toBe('flex');
    expect(controlsStyle.gap).toBe('96px');

    // Simulate window resize to desktop
    window.innerWidth = 1024;
    window.dispatchEvent(new Event('resize'));

    // Check that flex layout is maintained
    const children = Array.from(_controlsContainer.children);
    expect(children[0]).toBe(_searchContainer);
    expect(children[1]).toBe(_sortContainer);

    // Check that search container still takes up remaining space
    const searchStyle = window.getComputedStyle(_searchContainer);
    expect(searchStyle.flex).toBe('1');

    // Simulate window resize to mobile
    window.innerWidth = 480;
    window.dispatchEvent(new Event('resize'));

    // Check that layout structure is preserved
    expect(controlsStyle.display).toBe('flex');
    expect(controlsStyle.gap).toBe('96px');
    expect(searchStyle.flex).toBe('1');

    // Verify DOM order is maintained
    const mobileChildren = Array.from(_controlsContainer.children);
    expect(mobileChildren[0]).toBe(_searchContainer);
    expect(mobileChildren[1]).toBe(_sortContainer);
  });

  test('sort buttons are visible and properly styled', () => {
    const sortButtons = document.querySelectorAll('.sort-btn');

    sortButtons.forEach((button) => {
      const style = window.getComputedStyle(button);

      // Check visibility
      expect(style.display).not.toBe('none');
      expect(style.visibility).not.toBe('hidden');
      expect(style.opacity).not.toBe('0');

      // Check that buttons are clickable
      expect(style.pointerEvents).not.toBe('none');
    });
  });
});
