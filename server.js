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
import compression from 'compression';
import timeout from 'connect-timeout';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory if it doesn't exist
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// Create a write stream for logging
const logStream = fs.createWriteStream(path.join(logDirectory, 'console.log'), { flags: 'a' });

// Override console.log to write to the log file
console.log = function(...args) {
    const message = args.join(' ') + '\n'; // Join arguments and add a newline
    logStream.write(message); // Write to the log file
    process.stdout.write(message); // Also output to the terminal
};

const app = express();
const port = process.env.PORT || 3001;  // Default to 3001 to avoid Windsurf conflicts

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Enable compression
app.use(compression());

// Set timeout to 5 minutes
app.use(timeout('300s'));

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
        // Disable caching for development
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
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

/**
 * GET /health
 * Health check endpoint for monitoring server status
 */
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Add proxy route for image-content
app.get('/proxy/image-content', async (req, res) => {
    try {
        const response = await fetch(`http://localhost:8081/image-content?${new URLSearchParams(req.query)}`);
        if (!response.ok) {
            throw new Error('Content API response was not ok');
        }
        const data = await response.json();
        
        // Modify content URLs to use our proxy
        if (data.content_url) {
            const url = new URL(data.content_url);
            if (url.port === '8082') {
                data.content_url = `/proxy/video${url.pathname}${url.search}`;
            }
        }
        
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch from content API' });
    }
});

// Add proxy route for video content
app.get('/proxy/video/direct', async (req, res) => {
    try {
        const videoUrl = `http://localhost:8082/videos/direct${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
        
        // Forward the request with range headers if present
        const headers = {};
        if (req.headers.range) {
            headers.range = req.headers.range;
        }
        
        const response = await fetch(videoUrl, { headers });
        if (!response.ok && response.status !== 206) {  // 206 is Partial Content
            throw new Error('Video API response was not ok');
        }
        
        // Forward all response headers
        response.headers.forEach((value, key) => {
            res.set(key, value);
        });
        
        // Set the same status code
        res.status(response.status);
        
        // Pipe the video stream
        response.body.pipe(res);
    } catch (error) {
        console.error('Video proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch video content' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start server
server.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
