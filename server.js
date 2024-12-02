/**
 * Personal Website Server
 * 
 * Main server application that handles:
 * - Static file serving
 * - Image gallery endpoints
 * - Search functionality
 * - Error handling and logging
 * 
 * Dependencies:
 * - Express.js for routing and middleware
 * - Path for file path operations
 * - FS for file system operations
 */

import express from 'express';
import path from 'path';
import { promises as fsPromises } from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;  // Default to 3001 to avoid Windsurf conflicts

// Middleware Configuration
// Log all incoming HTTP requests with timestamp
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Debug static file directory
const publicPath = path.join(__dirname, 'public');
console.log('Serving static files from:', publicPath);

// Configure proper MIME types
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.type('application/javascript');
    }
    next();
});

// Debug middleware to log request details
app.use((req, res, next) => {
    console.log('\n=== Request Debug Info ===');
    console.log('Request URL:', req.url);
    console.log('Request path:', req.path);
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    console.log('Base URL:', req.baseUrl);
    console.log('Original URL:', req.originalUrl);
    console.log('=========================\n');
    next();
});

// Serve static files from the public directory
app.use(express.static(publicPath, {
    extensions: ['html', 'htm'],
    index: ['index.html', 'index.htm'],
    setHeaders: (res, path, stat) => {
        console.log('Serving static file:', path);
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        }
    }
}));

/**
 * GET /
 * Serves the main HTML page
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * GET /gallery
 * Serves the gallery HTML page
 */
app.get('/gallery', (req, res) => {
    console.log('Gallery route hit, serving gallery.html');
    res.sendFile(path.join(__dirname, 'public/gallery.html'));
});

// Import routes
import galleryRouter from './routes/gallery.js';

// Use gallery router for gallery-specific endpoints (like images)
app.use('/gallery', galleryRouter);

/**
 * GET /api/images
 * Returns a list of all images in the gallery
 * 
 * Response format:
 * {
 *   images: [{
 *     name: string,
 *     url: string,
 *     thumbnailUrl: string
 *   }]
 * }
 */
app.get('/api/images', async (req, res) => {
    try {
        const imagesDir = path.join(__dirname, 'public', 'images');
        const files = await fsPromises.readdir(imagesDir);
        
        // Filter for image files and create image objects
        const images = files
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .map(file => ({
                name: file.replace(/\.[^/.]+$/, ''),  // Remove file extension
                url: `/images/${file}`,
                thumbnailUrl: `/images/thumbnails/${file}`
            }));
        
        res.json({ images });
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

/**
 * GET /api/search
 * Searches for images by name
 * 
 * Query parameters:
 * - q: search query string
 * 
 * Response format:
 * {
 *   results: [{
 *     name: string,
 *     url: string,
 *     thumbnailUrl: string
 *   }]
 * }
 */
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase() || '';
        const imagesDir = path.join(__dirname, 'public', 'images');
        const files = await fsPromises.readdir(imagesDir);
        
        // Filter images based on search query
        const results = files
            .filter(file => {
                const name = file.replace(/\.[^/.]+$/, '').toLowerCase();
                return /\.(jpg|jpeg|png|gif)$/i.test(file) && name.includes(query);
            })
            .map(file => ({
                name: file.replace(/\.[^/.]+$/, ''),
                url: `/images/${file}`,
                thumbnailUrl: `/images/thumbnails/${file}`
            }));
        
        res.json({ results });
    } catch (error) {
        console.error('Error searching images:', error);
        res.status(500).json({ error: 'Failed to search images' });
    }
});

/**
 * API endpoint to launch macOS Finder with a search query
 * @route GET /api/finder-search
 * @param {string} term - The search term to look for in Finder
 * @returns {Object} JSON response indicating success or failure
 */
app.get('/api/finder-search', (req, res) => {
    const searchTerm = req.query.term;
    if (!searchTerm) {
        return res.status(400).json({ error: 'Search term is required' });
    }

    const scriptContent = `
-- Define the search string
set searchString to "${searchTerm.replace(/"/g, '\\"')}"

-- Open a new Finder window and set it to search "This Mac"
tell application "Finder"
    activate
    set newWindow to make new Finder window
    set the target of newWindow to startup disk
end tell

-- Pause briefly to ensure the Finder window is ready
delay 1

-- Use System Events to set the Finder search and limit to filenames
tell application "System Events"
    tell process "Finder"
        -- Set focus on the Finder window's search field
        set frontmost to true
        click menu item "Find" of menu "File" of menu bar 1
        
        delay 0.5
        
        -- Enter the search term with filename filter syntax
        keystroke "name:" & searchString
        delay 0.5
        keystroke return
    end tell
end tell`;

    const scriptPath = '/tmp/search_files.applescript';
    fs.writeFileSync(scriptPath, scriptContent);
    
    const osascriptCommand = `osascript ${scriptPath}`;
    exec(osascriptCommand, (err, out, stdErr) => {
        try {
            fs.unlinkSync(scriptPath);
        } catch (e) {
            console.error('Failed to clean up script file:', e);
        }

        if (err) {
            console.error('AppleScript Error:', err);
            return res.status(500).json({
                error: 'Failed to open Finder search',
                details: err.message
            });
        }

        res.json({ 
            success: true,
            message: 'Finder search launched'
        });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Public directory:', publicPath);
    // List files in public directory
    fsPromises.readdir(publicPath).then(files => {
        console.log('Files in public directory:', files);
    }).catch(err => {
        console.error('Error reading public directory:', err);
    });
});
