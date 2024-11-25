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
                gap: 1rem;
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
        const sortContainer = document.querySelector('.sort-container');
        const sortButtons = sortContainer.querySelectorAll('.sort-btn');

        // Check that we have two sort buttons
        expect(sortButtons.length).toBe(2);

        // Get computed styles
        const containerStyle = window.getComputedStyle(sortContainer);

        // Check flex layout and gap
        expect(containerStyle.display).toBe('flex');
        expect(containerStyle.gap).toBe('0.5rem');

        // Check that buttons are in the correct order
        expect(sortButtons[0].textContent).toBe('Sort A-Z');
        expect(sortButtons[1].textContent).toBe('Sort Z-A');

        // Check that buttons have the correct class and styles
        sortButtons.forEach(button => {
            expect(button.classList.contains('sort-btn')).toBe(true);
            const buttonStyle = window.getComputedStyle(button);
            expect(buttonStyle.padding).toBe('8px 16px');
        });
    });

    test('sort buttons maintain correct layout structure', () => {
        const controlsContainer = document.querySelector('.controls-container');
        const sortContainer = document.querySelector('.sort-container');
        const searchContainer = document.querySelector('.search-container');

        // Check that containers exist
        expect(controlsContainer).toBeTruthy();
        expect(sortContainer).toBeTruthy();
        expect(searchContainer).toBeTruthy();

        // Check the flex layout properties that ensure correct positioning
        const controlsStyle = window.getComputedStyle(controlsContainer);
        expect(controlsStyle.display).toBe('flex');
        expect(controlsStyle.justifyContent).toBe('space-between');
        expect(controlsStyle.width).toBe('100%');

        // Check that search container takes up remaining space
        const searchStyle = window.getComputedStyle(searchContainer);
        expect(searchStyle.flex).toBe('1');

        // Check that sort container is a flex container
        const sortStyle = window.getComputedStyle(sortContainer);
        expect(sortStyle.display).toBe('flex');
        expect(sortStyle.gap).toBe('0.5rem');

        // Check the DOM order
        const children = Array.from(controlsContainer.children);
        expect(children[0]).toBe(searchContainer);
        expect(children[1]).toBe(sortContainer);
    });

    test('sort buttons maintain position on window resize', () => {
        const controlsContainer = document.querySelector('.controls-container');
        const sortContainer = document.querySelector('.sort-container');
        const searchContainer = document.querySelector('.search-container');

        // Check initial layout
        const controlsStyle = window.getComputedStyle(controlsContainer);
        expect(controlsStyle.display).toBe('flex');
        expect(controlsStyle.justifyContent).toBe('space-between');

        // Simulate window resize to desktop
        window.innerWidth = 1024;
        window.dispatchEvent(new Event('resize'));

        // Check that flex layout is maintained
        const children = Array.from(controlsContainer.children);
        expect(children[0]).toBe(searchContainer);
        expect(children[1]).toBe(sortContainer);

        // Check that search container still takes up remaining space
        const searchStyle = window.getComputedStyle(searchContainer);
        expect(searchStyle.flex).toBe('1');

        // Simulate window resize to mobile
        window.innerWidth = 480;
        window.dispatchEvent(new Event('resize'));

        // Check that layout structure is preserved
        expect(controlsStyle.display).toBe('flex');
        expect(controlsStyle.justifyContent).toBe('space-between');
        expect(searchStyle.flex).toBe('1');

        // Verify DOM order is maintained
        const mobileChildren = Array.from(controlsContainer.children);
        expect(mobileChildren[0]).toBe(searchContainer);
        expect(mobileChildren[1]).toBe(sortContainer);
    });

    test('sort buttons are visible and properly styled', () => {
        const sortButtons = document.querySelectorAll('.sort-btn');

        sortButtons.forEach(button => {
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
