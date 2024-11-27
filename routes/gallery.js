/**
 * Gallery Router Module
 * Handles all gallery-related routes including serving the gallery page
 * and providing API endpoints for image management.
 */

// Import required dependencies for file system and routing
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

/**
 * Serve the main gallery page
 * @route GET /gallery
 * @returns {HTML} The gallery.html page
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../gallery.html'));
});

/**
 * Retrieve a list of images from the specified directory
 * @route GET /gallery/images
 * @returns {Object[]} Array of image objects containing name and URL
 * @property {string} name - The original filename of the image
 * @property {string} url - The URL path to access the image
 * @throws {500} If there's an error reading the directory
 */
router.get('/images', async (req, res) => {
    try {
        const directoryPath = '/Volumes/VideosNew/Models';
        const files = await fs.readdir(directoryPath, { withFileTypes: true });
        
        // Filter for image files and create URL-friendly objects
        const sortedFiles = files
            .filter(file => !file.isDirectory() && /\.(jpg|jpeg|webp)$/i.test(file.name))
            .map(file => ({
                name: file.name,
                url: `/images/${encodeURIComponent(file.name)}`
            }))
            // Sort files alphabetically by name
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json(sortedFiles);
    } catch (error) {
        console.error('Error reading directory:', error);
        res.status(500).json({ error: 'Error reading directory', details: error.message });
    }
});

// Export the router for use in the main application
module.exports = router;
