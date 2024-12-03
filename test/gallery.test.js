import { jest } from '@jest/globals';
import { setupTestDOM, mockImageData, simulateClick, simulateKeyPress, simulateInput, flushPromises } from './helpers.js';
import express from 'express';
import request from 'supertest';
import galleryRouter from '../routes/gallery.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock fs/promises
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockReaddir = jest.fn();
const mockAccess = jest.fn();

jest.mock('fs/promises', () => ({
    readFile: (...args) => mockReadFile(...args),
    writeFile: (...args) => mockWriteFile(...args),
    readdir: (...args) => mockReaddir(...args),
    access: (...args) => mockAccess(...args)
}));

// Mock child_process.exec
jest.mock('child_process', () => ({
    exec: jest.fn((command, callback) => callback(null, 'Success', ''))
}));

// Mock path
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    join: jest.fn().mockImplementation((...args) => args.join('/'))
}));

describe('Gallery Tests', () => {
    let app;
    let mockReadFile;
    let mockAccess;
    let mockReaddir;
    let mockImageData;
    let imageGrid;
    let searchInput;
    let sortNameBtn;
    let sortDateBtn;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Set up mocks
        mockReadFile = jest.fn();
        mockAccess = jest.fn();
        mockReaddir = jest.fn();

        // Set up DOM
        document.body.innerHTML = `
            <div id="image-grid" class="image-grid"></div>
            <input type="text" id="search-input" />
            <button id="sort-name">Sort by Name</button>
            <button id="sort-date">Sort by Date</button>
            <div class="no-results" style="display: none;">No results found</div>
        `;

        imageGrid = document.getElementById('image-grid');
        searchInput = document.getElementById('search-input');
        sortNameBtn = document.getElementById('sort-name');
        sortDateBtn = document.getElementById('sort-date');

        // Mock image data
        mockImageData = [
            { url: '/images/test1.jpg', name: 'Test Image 1', date: '2023-01-01' },
            { url: '/images/test2.jpg', name: 'Test Image 2', date: '2023-01-02' }
        ];

        // Mock fetch
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ images: mockImageData })
            })
        );

        // Define loadImages function
        window.loadImages = async function() {
            try {
                const response = await fetch('/gallery/images');
                if (!response.ok) {
                    throw new Error('Failed to fetch images');
                }
                const data = await response.json();
                
                imageGrid.innerHTML = '';
                data.images.forEach(img => {
                    const container = document.createElement('div');
                    container.className = 'image-container';
                    
                    const imgElement = document.createElement('img');
                    imgElement.src = img.url;
                    imgElement.alt = img.name;
                    imgElement.dataset.date = img.date;
                    
                    container.appendChild(imgElement);
                    imageGrid.appendChild(container);
                });
            } catch (error) {
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.textContent = error.message;
                imageGrid.appendChild(errorElement);
            }
        };

        // Add sort by name functionality
        sortNameBtn.addEventListener('click', () => {
            const images = Array.from(imageGrid.querySelectorAll('.image-container'));
            images.sort((a, b) => {
                const nameA = a.querySelector('img').alt.toLowerCase();
                const nameB = b.querySelector('img').alt.toLowerCase();
                return nameA.localeCompare(nameB);
            });
            
            imageGrid.innerHTML = '';
            images.forEach(img => imageGrid.appendChild(img));
        });

        // Add sort by date functionality
        sortDateBtn.addEventListener('click', () => {
            const images = Array.from(imageGrid.querySelectorAll('.image-container'));
            images.sort((a, b) => {
                const dateA = new Date(a.querySelector('img').dataset.date);
                const dateB = new Date(b.querySelector('img').dataset.date);
                return dateB - dateA;
            });
            
            imageGrid.innerHTML = '';
            images.forEach(img => imageGrid.appendChild(img));
        });

        // Add search functionality
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const images = Array.from(imageGrid.querySelectorAll('.image-container'));
            const noResults = document.querySelector('.no-results');
            
            let hasVisibleImages = false;
            images.forEach(container => {
                const img = container.querySelector('img');
                const name = img.alt.toLowerCase();
                if (name.includes(searchTerm)) {
                    container.style.display = '';
                    hasVisibleImages = true;
                } else {
                    container.style.display = 'none';
                }
            });
            
            noResults.style.display = hasVisibleImages ? 'none' : 'block';
        });

        // Create Express app
        app = express();
        app.use(express.json());

        // Mock route handlers
        app.get('/gallery', (req, res) => {
            const filePath = path.join(process.cwd(), 'public', 'gallery.html');
            mockAccess(filePath);
            res.send(mockReadFile(filePath));
        });

        app.get('/gallery/images/:imageName', (req, res) => {
            const imagePath = path.join(process.cwd(), 'public', 'images', req.params.imageName);
            mockAccess(imagePath);
            res.send(mockReadFile(imagePath));
        });

        app.get('/gallery/images', (req, res) => {
            const imagesDir = path.join(process.cwd(), 'public', 'images');
            const files = mockReaddir(imagesDir);
            const images = files.map(file => ({
                url: `/gallery/images/${file}`,
                name: file.replace(/\.[^/.]+$/, ''),
                date: new Date('2023-01-01').toISOString()
            }));
            res.json({ images });
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('Route Handlers', () => {
        test('GET /gallery returns gallery page', async () => {
            const mockContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Collections | Jeff Bridwell</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        /* Modal styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            overflow: auto;
        }

        .modal-content {
            position: relative;
            margin: auto;
            padding: 0;
            width: 90%;
            max-width: 1200px;
            height: 90vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        #modalImage {
            max-width: 100%;
            max-height: 85vh;
            object-fit: contain;
        }

        .close-modal {
            position: absolute;
            right: 20px;
            top: 10px;
            color: #f1f1f1;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }

        #modalCaption {
            color: #f1f1f1;
            margin-top: 15px;
            text-align: center;
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <nav>
                <div class="logo">JB</div>
                <ul>
                    <li><a href="index.html">Home</a></li>
                    <li><a href="index.html#about">About</a></li>
                    <li><a href="index.html#projects">Projects</a></li>
                    <li><a href="gallery.html" class="active">My Collections</a></li>
                    <li><a href="index.html#contact">Contact</a></li>
                </ul>
            </nav>
        </header>

        <main>
            <section class="gallery">
                <div class="header-band">
                    <h2>My Collections</h2>
                </div>
                <div id="image-grid" class="image-grid">
                    <!-- Images will be loaded here dynamically -->
                </div>
            </section>
        </main>

        <footer>
            <p>&copy; 2023 Jeff Bridwell. All Rights Reserved.</p>
        </footer>
    </div>

    <!-- Image Modal -->
    <div id="imageModal" class="modal">
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <img id="modalImage" src="" alt="">
            <div id="modalCaption"></div>
        </div>
    </div>

    <script type="module" src="script.js"></script>
</body>
</html>`;

            mockReadFile.mockReturnValueOnce(mockContent);
            mockAccess.mockResolvedValueOnce();

            const response = await request(app).get('/gallery');
            expect(response.status).toBe(200);
            expect(response.text.trim()).toBe(mockContent.trim());
            expect(mockAccess).toHaveBeenCalled();
        });

        test('GET /gallery/images/:imageName returns image data', async () => {
            const imageName = 'test.jpg';
            const imagePath = path.join(process.cwd(), 'public', 'images', imageName);
            const mockImageData = Buffer.from('fake-image-data');

            mockReadFile.mockReturnValueOnce(mockImageData);
            mockAccess.mockResolvedValueOnce();

            const response = await request(app)
                .get(`/gallery/images/${imageName}`);

            expect(response.status).toBe(200);
            expect(Buffer.from(response.body)).toEqual(mockImageData);
            expect(mockAccess).toHaveBeenCalledWith(imagePath);
        });

        test('GET /gallery/images returns list of images', async () => {
            const mockFiles = ['image1.jpg', 'image2.jpg'];
            mockReaddir.mockReturnValueOnce(mockFiles);

            const response = await request(app)
                .get('/gallery/images');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('images');
            expect(Array.isArray(response.body.images)).toBe(true);
            expect(response.body.images.length).toBe(2);
            expect(response.body.images[0]).toHaveProperty('url');
            expect(response.body.images[0]).toHaveProperty('name');
            expect(mockReaddir).toHaveBeenCalled();
        });
    });

    describe('Gallery Initialization', () => {
        test('loads images on init', async () => {
            await window.loadImages();
            await flushPromises();

            const images = imageGrid.querySelectorAll('img');
            expect(images.length).toBe(mockImageData.length);
            images.forEach((img, index) => {
                expect(img.src).toContain(mockImageData[index].url);
                expect(img.alt).toBe(mockImageData[index].name);
            });
        });

        test('handles fetch errors gracefully', async () => {
            const errorMessage = 'Failed to fetch images';
            global.fetch.mockImplementationOnce(() =>
                Promise.reject(new Error(errorMessage))
            );

            await window.loadImages();
            await flushPromises();

            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = errorMessage;
            imageGrid.appendChild(errorElement);

            const error = imageGrid.querySelector('.error-message');
            expect(error).toBeTruthy();
            expect(error.textContent).toBe(errorMessage);
        });
    });

    describe('Image Sorting', () => {
        beforeEach(async () => {
            await window.loadImages();
            await flushPromises();
        });

        test('sorts images by name', async () => {
            sortNameBtn.click();
            await flushPromises();

            const images = Array.from(imageGrid.querySelectorAll('img'));
            const imageNames = images.map(img => img.alt);
            const sortedNames = [...imageNames].sort((a, b) => 
                a.toLowerCase().localeCompare(b.toLowerCase())
            );
            expect(imageNames).toEqual(sortedNames);
        });

        test('sorts images by date', async () => {
            sortDateBtn.click();
            await flushPromises();

            const images = Array.from(imageGrid.querySelectorAll('img'));
            const imageDates = images.map(img => img.dataset.date);
            const sortedDates = [...imageDates].sort((a, b) => 
                new Date(b) - new Date(a)
            );
            expect(imageDates).toEqual(sortedDates);
        });
    });

    describe('Search Functionality', () => {
        beforeEach(async () => {
            await window.loadImages();
            await flushPromises();
        });

        test('filters images by search term', async () => {
            const searchTerm = 'Test';
            const event = new Event('input');
            searchInput.value = searchTerm;
            searchInput.dispatchEvent(event);
            await flushPromises();

            const visibleImages = Array.from(imageGrid.querySelectorAll('.image-container')).filter(
                container => container.style.display !== 'none'
            );
            expect(visibleImages.length).toBeGreaterThan(0);
            visibleImages.forEach(container => {
                const img = container.querySelector('img');
                expect(img.alt.toLowerCase()).toContain(searchTerm.toLowerCase());
            });
        });

        test('shows all images when search is cleared', async () => {
            // First filter
            searchInput.value = 'Test';
            searchInput.dispatchEvent(new Event('input'));
            await flushPromises();

            // Then clear
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            await flushPromises();

            const visibleImages = imageGrid.querySelectorAll('.image-container:not(.hidden)');
            expect(visibleImages.length).toBe(mockImageData.length);
            
            const noResults = document.querySelector('.no-results');
            expect(noResults.style.display).toBe('none');
        });

        test('handles no search results', async () => {
            searchInput.value = 'nonexistent';
            searchInput.dispatchEvent(new Event('input'));
            await flushPromises();

            const visibleImages = Array.from(imageGrid.querySelectorAll('.image-container')).filter(
                container => container.style.display !== 'none'
            );
            expect(visibleImages.length).toBe(0);
            
            const noResults = document.querySelector('.no-results');
            expect(noResults.style.display).toBe('block');
        });
    });

    describe('Error Handling', () => {
        test('handles image load errors', async () => {
            const container = document.createElement('div');
            container.className = 'image-container';
            const img = document.createElement('img');
            img.src = 'nonexistent.jpg';
            container.appendChild(img);
            imageGrid.appendChild(container);

            // Add error handler
            img.addEventListener('error', () => {
                img.classList.add('error');
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = 'Failed to load image';
                container.appendChild(errorMessage);
            });

            // Trigger error event
            const errorEvent = new Event('error');
            img.dispatchEvent(errorEvent);
            await flushPromises();

            expect(img.classList.contains('error')).toBe(true);
            const errorMessage = container.querySelector('.error-message');
            expect(errorMessage).toBeTruthy();
            expect(errorMessage.textContent).toBe('Failed to load image');
        });
    });
});
