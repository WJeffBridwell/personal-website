const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Serve the gallery page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../gallery.html'));
});

// Get list of images
router.get('/images', async (req, res) => {
    try {
        const directoryPath = '/Volumes/VideosNew/Models';
        const files = await fs.readdir(directoryPath, { withFileTypes: true });
        
        const sortedFiles = files
            .filter(file => !file.isDirectory() && /\.(jpg|jpeg|webp)$/i.test(file.name))
            .map(file => ({
                name: file.name,
                url: `/images/${encodeURIComponent(file.name)}`
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json(sortedFiles);
    } catch (error) {
        console.error('Error reading directory:', error);
        res.status(500).json({ error: 'Error reading directory', details: error.message });
    }
});

module.exports = router;
