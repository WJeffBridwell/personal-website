import { jest } from '@jest/globals';
import path from 'path';
import request from 'supertest';
import express from 'express';
import { fileURLToPath } from 'url';

const mockFs = {
    readdir: jest.fn(),
    stat: jest.fn(),
    access: jest.fn()
};

jest.mock('fs/promises', () => mockFs);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app for testing
const app = express();

// Mock routes
app.get('/api/images', async (req, res) => {
    try {
        const images = await mockFs.readdir(path.join(__dirname, '../public/images'));
        const imageData = await Promise.all(images
            .filter(file => file.match(/\.(jpg|jpeg|png|gif)$/i))
            .map(async (file) => {
                const stats = await mockFs.stat(path.join(__dirname, '../public/images', file));
                return {
                    name: file,
                    path: `/images/${file}`,
                    date: stats.mtime.toISOString()
                };
            }));
        res.json(imageData);
    } catch (error) {
        res.status(500).json({ error: 'Error reading image directory' });
    }
});

app.get('/api/images/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const images = await mockFs.readdir(path.join(__dirname, '../public/images'));
        const imageData = await Promise.all(images
            .filter(file => 
                file.match(/\.(jpg|jpeg|png|gif)$/i) && 
                file.toLowerCase().includes(q.toLowerCase())
            )
            .map(async (file) => {
                const stats = await mockFs.stat(path.join(__dirname, '../public/images', file));
                return {
                    name: file,
                    path: `/images/${file}`,
                    date: stats.mtime.toISOString()
                };
            }));
        res.json(imageData);
    } catch (error) {
        res.status(500).json({ error: 'Error searching images' });
    }
});

app.get('/api/images/:id', async (req, res) => {
    const { id } = req.params;
    
    if (!id.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return res.status(400).json({ error: 'Invalid file type' });
    }

    try {
        const imagePath = path.join(__dirname, '../public/images', id);
        await mockFs.access(imagePath);
        const stats = await mockFs.stat(imagePath);
        
        res.json({
            name: id,
            path: `/images/${id}`,
            date: stats.mtime.toISOString()
        });
    } catch (error) {
        res.status(404).json({ error: 'Image not found' });
    }
});

const mockImageData = [
    {
        name: 'test1.jpg',
        path: '/images/test1.jpg',
        date: '2023-01-01'
    },
    {
        name: 'test2.jpg',
        path: '/images/test2.jpg',
        date: '2023-02-01'
    }
];

describe('Gallery Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/images', () => {
        test('returns list of images successfully', async () => {
            mockFs.readdir.mockResolvedValue(['test1.jpg', 'test2.jpg']);
            mockFs.stat.mockImplementation((filePath) => Promise.resolve({
                isFile: () => true,
                mtime: new Date('2023-01-01')
            }));

            const response = await request(app)
                .get('/api/images')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('path');
            expect(response.body[0]).toHaveProperty('date');
        });

        test('handles file system errors gracefully', async () => {
            mockFs.readdir.mockRejectedValue(new Error('File system error'));

            const response = await request(app)
                .get('/api/images')
                .expect('Content-Type', /json/)
                .expect(500);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Error reading image directory');
        });

        test('filters out non-image files', async () => {
            mockFs.readdir.mockResolvedValue(['test1.jpg', 'test.txt', 'test2.png']);
            mockFs.stat.mockImplementation((filePath) => Promise.resolve({
                isFile: () => true,
                mtime: new Date('2023-01-01')
            }));

            const response = await request(app)
                .get('/api/images')
                .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body.every(file => 
                file.name.match(/\.(jpg|jpeg|png|gif)$/i)
            )).toBe(true);
        });
    });

    describe('GET /api/images/search', () => {
        test('searches images by name successfully', async () => {
            mockFs.readdir.mockResolvedValue(['test1.jpg', 'other.jpg']);
            mockFs.stat.mockImplementation((filePath) => Promise.resolve({
                isFile: () => true,
                mtime: new Date('2023-01-01')
            }));

            const response = await request(app)
                .get('/api/images/search')
                .query({ q: 'test' })
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].name).toMatch(/test/i);
        });

        test('returns empty array for no matches', async () => {
            mockFs.readdir.mockResolvedValue(['image1.jpg', 'image2.jpg']);
            mockFs.stat.mockImplementation((filePath) => Promise.resolve({
                isFile: () => true,
                mtime: new Date('2023-01-01')
            }));

            const response = await request(app)
                .get('/api/images/search')
                .query({ q: 'nonexistent' })
                .expect(200);

            expect(response.body).toHaveLength(0);
        });

        test('handles invalid search parameters', async () => {
            const response = await request(app)
                .get('/api/images/search')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Search query is required');
        });
    });

    describe('GET /api/images/:id', () => {
        test('returns specific image successfully', async () => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.stat.mockResolvedValue({
                isFile: () => true,
                mtime: new Date('2023-01-01')
            });

            const response = await request(app)
                .get('/api/images/test1.jpg')
                .expect(200);

            expect(response.body).toHaveProperty('name', 'test1.jpg');
            expect(response.body).toHaveProperty('path');
            expect(response.body).toHaveProperty('date');
        });

        test('handles non-existent image', async () => {
            mockFs.access.mockRejectedValue(new Error('File not found'));

            const response = await request(app)
                .get('/api/images/nonexistent.jpg')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Image not found');
        });

        test('validates image file extension', async () => {
            const response = await request(app)
                .get('/api/images/test.txt')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Invalid file type');
        });
    });

    describe('Error Handling', () => {
        test('handles internal server errors', async () => {
            mockFs.readdir.mockRejectedValue(new Error('Unexpected error'));

            const response = await request(app)
                .get('/api/images')
                .expect(500);

            expect(response.body).toHaveProperty('error');
        });

        test('handles malformed requests', async () => {
            const response = await request(app)
                .get('/api/images/search')
                .query({ invalid: 'parameter' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });
});
