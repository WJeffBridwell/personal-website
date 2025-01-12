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
import httpProxy from 'http-proxy';
import fetch from 'node-fetch';
import sharp from 'sharp';

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

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

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
                return /\.(jpg|jpeg|png|gif|svg)$/i.test(file) && name.includes(query);
            })
            .map(async file => {
                const stats = await fsPromises.stat(path.join(imagesDir, file));
                return {
                    name: file,
                    url: `/images/${file}`,
                    modified: stats.mtime.toISOString(),
                    size: stats.size
                };
            });
        
        res.json({ results: await Promise.all(results) });
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

// Add proxy route for video content
app.get('/proxy/video/direct', async (req, res) => {
    try {
        const imageName = req.query.image_name;
        console.log('[Proxy] Video request image_name:', imageName);
        
        // Forward the request to the video server
        const videoServerUrl = `http://192.168.86.242:8082/videos/direct?image_name=${encodeURIComponent(imageName)}`;
        console.log('[Proxy] Forwarding to:', videoServerUrl);
        
        const response = await fetch(videoServerUrl);
        
        // Copy status and headers
        res.status(response.status);
        for (const [key, value] of response.headers.entries()) {
            res.setHeader(key, value);
        }
        
        // Pipe the response
        response.body.pipe(res);
    } catch (error) {
        console.error('[Proxy] Video error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add proxy route for image preview
app.get('/proxy/image/preview', async (req, res) => {
    try {
        const imageName = req.query.image_name;
        console.log('[Proxy] Image preview request image_name:', imageName);
        
        // Look for image in cache directory
        const cachePath = path.join(__dirname, 'cache', imageName);
        console.log('[Proxy] Looking for preview in:', cachePath);
        
        // Check if file exists
        if (!fs.existsSync(cachePath)) {
            console.error('[Proxy] Preview not found:', cachePath);
            return res.status(404).json({ error: 'Preview not found' });
        }

        // Set content type based on file extension
        const ext = path.extname(cachePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        
        // Stream the file
        const stream = fs.createReadStream(cachePath);
        stream.pipe(res);
        
        stream.on('end', () => {
            console.log('[Proxy] Preview sent successfully');
        });
        
        stream.on('error', (error) => {
            console.error('[Proxy] Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream preview' });
            }
        });
    } catch (error) {
        console.error('[Proxy] Image preview error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add proxy route for direct image access
app.get('/proxy/image/direct', async (req, res) => {
    console.log('\n[Proxy] ========== Image Request Start ==========');
    console.log('[Proxy] Raw URL:', req.url);
    console.log('[Proxy] Method:', req.method);
    console.log('[Proxy] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Proxy] Query:', JSON.stringify(req.query, null, 2));
    
    try {
        // Get the image path and width from query
        const imagePath = decodeURIComponent(req.query.path);
        const width = parseInt(req.query.width) || null;
        console.log('[Proxy] Image path:', imagePath);
        console.log('[Proxy] Requested width:', width);
        
        // Check if this is a full path or just a filename
        const isFullPath = imagePath.startsWith('/');
        const fullPath = isFullPath ? imagePath : path.join('/Volumes/VideosNew/Photo Sets - Red/A', imagePath);
        console.log('[Proxy] Full resolved path:', fullPath);
        
        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            console.error('[Proxy] Image not found:', fullPath);
            return res.status(404).json({ error: 'Image not found' });
        }

        // Set content type based on file extension
        const ext = path.extname(fullPath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        
        // Create Sharp transform stream
        let transform = sharp();
        
        // If width is specified, resize the image
        if (width) {
            transform = transform.resize(width, null, {
                withoutEnlargement: true,
                fit: 'inside'
            });
        }

        // Convert output to WebP for better compression
        transform = transform.webp({ quality: 80 });
        res.setHeader('Content-Type', 'image/webp');
        
        // Stream the file through Sharp
        const stream = fs.createReadStream(fullPath);
        stream
            .pipe(transform)
            .pipe(res);
        
        stream.on('end', () => {
            console.log('[Proxy] Image sent successfully');
            console.log('[Proxy] ========== Image Request End ==========\n');
        });
        
        stream.on('error', (error) => {
            console.error('[Proxy] Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream image' });
            }
            console.log('[Proxy] ========== Image Request End (Error) ==========\n');
        });
    } catch (error) {
        console.error('[Proxy] Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy error', message: error.message });
        }
        console.log('[Proxy] ========== Image Request End (Error) ==========\n');
    }
});

// Add proxy route for video streaming
app.get('/proxy/video/stream', async (req, res) => {
    try {
        const imageName = req.query.image_name;
        console.log('[Proxy] Video stream request image_name:', imageName);
        
        // Forward the request to the video server
        const videoServerUrl = `http://192.168.86.242:8082/videos/stream?image_name=${encodeURIComponent(imageName)}`;
        console.log('[Proxy] Forwarding to:', videoServerUrl);
        
        const response = await fetch(videoServerUrl);
        
        // Copy status and headers
        res.status(response.status);
        for (const [key, value] of response.headers.entries()) {
            res.setHeader(key, value);
        }
        
        // Pipe the response
        response.body.pipe(res);
    } catch (error) {
        console.error('[Proxy] Video stream error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add proxy route for content listing
app.get('/proxy/image/content', async (req, res) => {
    console.log('\n[Proxy] ========== Content Request Start ==========');
    console.log('[Proxy] Content request received:', req.query);
    
    try {
        const imageName = req.query.image_name;
        if (!imageName) {
            return res.status(400).json({ error: 'Missing image_name parameter' });
        }

        // Forward to content service with page size parameter
        const contentUrl = `http://192.168.86.242:8081/image-content?image_name=${encodeURIComponent(imageName)}&page_size=1000`;
        console.log('[Proxy] Forwarding to:', contentUrl);

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 30000); // 30 second timeout

        try {
            const contentResponse = await fetch(contentUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeout);

            if (!contentResponse.ok) {
                throw new Error(`Content service error: ${contentResponse.statusText}`);
            }

            const data = await contentResponse.json();
            console.log('[Proxy] Received response with', data.items?.length || 0, 'items');

            // Send response
            res.json(data);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('[Proxy] Request timed out');
                res.status(504).json({ error: 'Request timed out after 30 seconds' });
            } else {
                throw error;
            }
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        console.error('[Proxy] Content error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cache for image listing
let imageCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Gallery API Endpoints
app.get('/api/gallery/images', async (req, res) => {
    console.log('\n=== Gallery Images Request ===');
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 48; // 6 rows × 8 columns
        const start = (page - 1) * limit;

        // Check cache first
        const now = Date.now();
        if (!imageCache || now - lastCacheUpdate > CACHE_TTL) {
            const imagesDir = '/Volumes/VideosNew/Models';
            console.log('Cache miss - Reading images from:', imagesDir);

            if (!fs.existsSync(imagesDir)) {
                console.error('Models directory not found:', imagesDir);
                return res.status(500).json({ error: 'Models directory not found' });
            }

            // Read directory in chunks
            const files = await fsPromises.readdir(imagesDir);
            console.log(`Found ${files.length} total files`);
            
            // Filter image files
            imageCache = files
                .filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
                })
                .map(file => ({
                    name: file,
                    url: `/api/gallery/image/${encodeURIComponent(file)}`,
                    path: path.join(imagesDir, file)
                }));

            lastCacheUpdate = now;
            console.log(`Cached ${imageCache.length} images`);
        }

        // Paginate from cache
        const paginatedImages = imageCache.slice(start, start + limit);
        
        console.log(`Sending page ${page} (${paginatedImages.length} images)`);
        res.json({ 
            images: paginatedImages,
            total: imageCache.length,
            page,
            pages: Math.ceil(imageCache.length / limit)
        });
    } catch (error) {
        console.error('Error reading images:', error);
        res.status(500).json({ error: 'Failed to read images' });
    }
});

// Serve individual images
app.get('/api/gallery/image/:name', async (req, res) => {
    try {
        const imageName = decodeURIComponent(req.params.name);
        const imagePath = path.join('/Volumes/VideosNew/Models', imageName);
        
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Get image mime type
        const ext = path.extname(imagePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        
        // Stream the image
        const stream = fs.createReadStream(imagePath);
        stream.pipe(res);
    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Failed to serve image' });
    }
});

// Create proxy server
const proxy = httpProxy.createProxyServer({
    target: 'http://192.168.86.242:8082',
    ws: true,
    changeOrigin: true,
    proxyTimeout: 60000,
    timeout: 60000,
    xfwd: true,
    preserveHeaderKeyCase: true,
    followRedirects: true,
    secure: false,
    prependPath: false,
    ignorePath: false,
});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
    console.error('[Proxy] Error:', err);
    if (!res.headersSent) {
        res.status(500).json({
            error: 'Proxy error',
            message: err.message,
            code: err.code
        });
    }
});

// Log proxy events
proxy.on('proxyReq', (proxyReq, req, res) => {
    console.log('[Proxy] Outgoing request headers:', proxyReq.getHeaders());
});

proxy.on('proxyRes', (proxyRes, req, res) => {
    console.log('[Proxy] Received response:', {
        statusCode: proxyRes.statusCode,
        headers: proxyRes.headers
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
