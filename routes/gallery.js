console.log('=====================================');
console.log('Gallery router loading at:', new Date().toISOString());
console.log('=====================================');

/**
 * Gallery Router Module
 * Handles all gallery-related routes including serving the gallery page
 * and providing API endpoints for image management.
 */

// Import required dependencies for file system and routing
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const DEFAULT_LIMIT = 1000;  // Show 1000 images by default
const MAX_LIMIT = 5000;      // Allow up to 5000 images per request
const CHUNK_SIZE = 5000;   // Process in larger chunks for better performance
const CACHE_TTL = 300000;  // 5 minutes cache TTL
const THUMBNAIL_WIDTH = 300;  // Width for thumbnails
const PREVIEW_WIDTH = 800;   // Width for preview images

// Initialize content cache with LRU cache for thumbnails
const contentCache = {
    files: new Map(),
    thumbnails: new Map(),
    lastUpdate: 0,
    updating: false
};

// Setup gallery debug logging
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Create a separate stream for gallery logging
const galleryLog = fs.createWriteStream(path.join(logDir, 'gallery-debug.log'), { flags: 'a' });

function logGallery(component, event, duration = null, details = null) {
    const timestamp = new Date().toISOString();
    const memory = process.memoryUsage();
    const memoryMB = Math.round(memory.heapUsed / 1024 / 1024);
    const logMessage = `[${timestamp}] [Server] [${component}] [${event}] ${duration ? `[${duration}ms]` : ''} [${memoryMB}MB] ${details ? JSON.stringify(details) : ''}`;
    galleryLog.write(logMessage + '\n');
}

// Debug middleware for gallery router
router.use((req, res, next) => {
    logGallery('Gallery Router', 'Request received', null, { originalUrl: req.originalUrl, baseUrl: req.baseUrl, path: req.path, method: req.method });
    next();
});

// Test route to verify router is mounted
router.get('/test', (req, res) => {
    logGallery('Test Route', 'Request received', null, { message: 'Gallery router is working' });
    res.json({ message: 'Gallery router is working' });
});

// Test endpoint to check directory access
router.get('/test-directory', (req, res) => {
    logGallery('Test Directory', 'Request received', null, { directoryPath: '/Volumes/VideosNew/Models' });
    
    try {
        // Check if directory exists
        if (!fs.existsSync('/Volumes/VideosNew/Models')) {
            return res.status(404).json({
                error: 'Directory not found',
                path: '/Volumes/VideosNew/Models'
            });
        }

        // Try to read directory contents
        const files = fs.readdirSync('/Volumes/VideosNew/Models', { withFileTypes: true });
        
        return res.json({
            success: true,
            fileCount: files.length,
            firstFewFiles: files.slice(0, 5).map(f => ({
                name: f.name,
                isDirectory: f.isDirectory()
            }))
        });
    } catch (error) {
        logGallery('Test Directory', 'Error', null, { error: error.message, code: error.code, path: '/Volumes/VideosNew/Models' });
        return res.status(500).json({
            error: error.message,
            code: error.code,
            path: '/Volumes/VideosNew/Models'
        });
    }
});

/**
 * Serve the main gallery page
 * @route GET /gallery
 * @returns {HTML} The gallery.html page from public directory
 */
router.get('/', async (req, res) => {
    logGallery('Gallery Route', 'Request received', null, { path: req.path });
    
    try {
        // Verify file exists
        if (!fs.existsSync(path.join(__dirname, '../public/gallery.html'))) {
            logGallery('Gallery Route', 'Error', null, { error: 'Gallery file does not exist' });
            res.status(404).send('Gallery file not found');
            return;
        }
        
        // Read file contents for verification
        const contents = fs.readFileSync(path.join(__dirname, '../public/gallery.html'), 'utf8');
        
        // Send the file
        res.setHeader('Content-Type', 'text/html');
        res.sendFile(path.join(__dirname, '../public/gallery.html'), (err) => {
            if (err) {
                logGallery('Gallery Route', 'Error', null, { error: 'Error sending gallery.html' });
                res.status(500).send('Error loading gallery page');
            } else {
                logGallery('Gallery Route', 'Request complete', null, { message: 'Successfully sent gallery.html' });
            }
        });
    } catch (error) {
        logGallery('Gallery Route', 'Error', null, { error: error.message });
        res.status(500).send('Error loading gallery page');
    }
});

// Update cache with chunked processing
async function updateCache(directoryPath) {
    if (contentCache.updating) {
        logGallery('Cache Update', 'Already in progress', null, { message: 'Cache update already in progress' });
        return;
    }

    try {
        contentCache.updating = true;
        logGallery('Cache Update', 'Started', null, { message: 'Starting cache update...' });

        const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });
        const imageFiles = files.filter(file => 
            file.isFile() && /\.(jpg|jpeg|png|gif)$/i.test(file.name)
        );

        // Process files in chunks
        for (let i = 0; i < imageFiles.length; i += CHUNK_SIZE) {
            const chunk = imageFiles.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(async (file) => {
                try {
                    const filePath = path.join(directoryPath, file.name);
                    const stats = await fs.promises.stat(filePath);
                    
                    contentCache.files.set(file.name, {
                        name: file.name,
                        path: filePath,
                        size: stats.size,
                        modified: stats.mtime,
                        type: path.extname(file.name).slice(1)
                    });
                } catch (error) {
                    logGallery('Cache Update', 'Error', null, { error: error.message, file: file.name });
                }
            }));
            
            // Allow other operations between chunks
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        contentCache.lastUpdate = Date.now();
        logGallery('Cache Update', 'Complete', null, { message: `Cache updated with ${contentCache.files.size} files` });
        
    } catch (error) {
        logGallery('Cache Update', 'Error', null, { error: error.message });
        throw error;
    } finally {
        contentCache.updating = false;
    }
}

// Get all available first letters
router.get('/letters', async (req, res) => {
    try {
        const directoryPath = '/Volumes/VideosNew/Models';
        
        // Update cache if needed
        if (Date.now() - contentCache.lastUpdate > CACHE_TTL) {
            await updateCache(directoryPath);
        }
        
        // Get all unique first letters
        const letters = new Set();
        for (const [filename] of contentCache.files) {
            if (filename) {
                const firstLetter = filename.charAt(0).toUpperCase();
                if (/[A-Z]/.test(firstLetter)) {
                    letters.add(firstLetter);
                }
            }
        }
        
        // Convert to sorted array
        const sortedLetters = Array.from(letters).sort();
        
        res.json({
            letters: sortedLetters,
            total: contentCache.files.size
        });
        
    } catch (error) {
        logGallery('Letters Route', 'Error', null, { error: error.message });
        res.status(500).json({ error: 'Failed to get letters' });
    }
});

// Get all available tags
router.get('/tags', async (req, res) => {
    try {
        const directoryPath = '/Volumes/VideosNew/Models';
        
        // Update cache if needed
        if (Date.now() - contentCache.lastUpdate > CACHE_TTL) {
            await updateCache(directoryPath);
        }
        
        // Get all unique tags from cached images
        const tags = new Set();
        for (const [filename, metadata] of contentCache.files.entries()) {
            const fileTags = generateTags(filename);
            fileTags.forEach(tag => tags.add(tag));
        }
        
        // Convert to sorted array
        const sortedTags = Array.from(tags).sort();
        
        res.json({
            tags: sortedTags,
            total: sortedTags.length
        });
        
    } catch (error) {
        logGallery('Tags Route', 'Error', null, { error: error.message });
        res.status(500).json({ error: 'Failed to get tags', details: error.message });
    }
});

// Gallery images endpoint with optimized loading
router.get('/images', async (req, res) => {
    logGallery('Images Route', 'Request received', null, { query: req.query });
    
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const letter = req.query.letter;
        const directoryPath = '/Volumes/VideosNew/Models';
        
        // Update cache if needed
        if (Date.now() - contentCache.lastUpdate > CACHE_TTL) {
            await updateCache(directoryPath);
        }
        
        // Convert Map to array and filter by letter if specified
        let allFiles = Array.from(contentCache.files.values());
        if (letter) {
            allFiles = allFiles.filter(file => 
                file.name.charAt(0).toUpperCase() === letter.toUpperCase()
            );
        }
        
        // Sort files
        allFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        
        // Calculate pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const totalFiles = allFiles.length;
        
        // Get paginated files
        const paginatedFiles = allFiles.slice(startIndex, endIndex);
        
        // Prepare response data
        const images = paginatedFiles.map(file => ({
            name: file.name,
            url: `/gallery/images/${encodeURIComponent(file.name)}`,
            thumbnailUrl: `/gallery/images/${encodeURIComponent(file.name)}?thumbnail=true`,
            size: file.size,
            modified: file.modified,
            type: file.type,
            tags: generateTags(file.name)
        }));

        res.json({
            images,
            pagination: {
                total: totalFiles,
                totalAll: contentCache.files.size,
                page,
                limit,
                totalPages: Math.ceil(totalFiles / limit),
                hasMore: endIndex < totalFiles,
                currentLetter: letter || null
            }
        });
        
    } catch (error) {
        logGallery('Images Route', 'Error', null, { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to generate tags from filename
function generateTags(filename) {
    const tags = new Set();
    
    // Extract potential tags from filename
    const parts = filename.toLowerCase().split(/[-_\s]/);
    
    // Add tags based on file characteristics
    if (/\.(jpg|jpeg)$/i.test(filename)) tags.add('jpeg');
    if (/\.png$/i.test(filename)) tags.add('png');
    if (/\.gif$/i.test(filename)) tags.add('gif');
    
    // Add tags based on common patterns
    if (/\d{4}/.test(filename)) tags.add('dated');
    if (/^IMG_/.test(filename)) tags.add('camera');
    if (/^DSC/.test(filename)) tags.add('digital');
    if (/screenshot/i.test(filename)) tags.add('screenshot');
    if (/edited|processed/i.test(filename)) tags.add('edited');
    
    // Add tags based on filename parts
    parts.forEach(part => {
        if (part.length > 2) {  // Only add parts longer than 2 characters
            if (/^[0-9]+$/.test(part)) {  // If it's a number
                if (part.length === 4) tags.add('year');
            } else if (/^[a-z]+$/.test(part)) {  // If it's a word
                tags.add(part);
            }
        }
    });
    
    return Array.from(tags);
}

// Batch image endpoint
router.post('/batch-images', async (req, res) => {
    console.log('[Server] [Batch Images] [Request received]', { 
        imageCount: req.body.imageNames?.length || 0,
        memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    });
    
    try {
        const { imageNames } = req.body;
        if (!Array.isArray(imageNames)) {
            console.error('[Server] [Batch Images] [Error] Invalid request - imageNames not an array');
            return res.status(400).json({ error: 'imageNames must be an array' });
        }

        const batchSize = 1000;
        const results = [];
        
        // Process in batches of 1000
        for (let i = 0; i < imageNames.length; i += batchSize) {
            const batch = imageNames.slice(i, i + batchSize);
            console.log(`[Server] [Batch Images] [Processing] Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(imageNames.length/batchSize)}`);
            
            const batchResults = await Promise.all(
                batch.map(async (imageName) => {
                    try {
                        const imagePath = path.join('/Volumes/VideosNew/Models', imageName);
                        const imageBuffer = await fs.promises.readFile(imagePath);
                        return {
                            name: imageName,
                            data: imageBuffer.toString('base64'),
                            error: null
                        };
                    } catch (err) {
                        console.error(`[Server] [Batch Images] [Error] Failed to load image ${imageName}:`, err);
                        return {
                            name: imageName,
                            data: null,
                            error: err.message
                        };
                    }
                })
            );
            results.push(...batchResults);
            console.log(`[Server] [Batch Images] [Complete] Batch ${Math.floor(i/batchSize) + 1} processed`);
        }

        console.log('[Server] [Batch Images] [Complete] All batches processed', {
            totalImages: results.length,
            successCount: results.filter(r => r.data).length,
            failureCount: results.filter(r => r.error).length,
            memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        });

        res.json({ images: results });
    } catch (error) {
        console.error('[Server] [Batch Images] [Error] Batch processing failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Image optimization middleware
const optimizeImage = async (req, res, next) => {
    if (!req.path.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return next();
    }

    const isThumb = req.query.size === 'thumb';
    const isPreview = req.query.size === 'preview';
    
    if (!isThumb && !isPreview) {
        return next();
    }

    const width = isThumb ? THUMBNAIL_WIDTH : PREVIEW_WIDTH;
    const cacheKey = `${req.path}-${width}`;
    const cacheMap = isThumb ? contentCache.thumbnails : contentCache.previews;

    if (cacheMap.has(cacheKey)) {
        res.type('image/webp');
        res.send(cacheMap.get(cacheKey));
        return;
    }

    try {
        const imagePath = path.join(process.cwd(), 'public', req.path);
        const image = await sharp(imagePath)
            .resize(width, null, { withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        cacheMap.set(cacheKey, image);
        res.type('image/webp');
        res.send(image);
    } catch (error) {
        console.error('Image optimization error:', error);
        next();
    }
};

// Apply middleware
router.use(compression());
router.use(optimizeImage);

// Serve individual media files
router.get('/images/:imageName', async (req, res) => {
    const imageName = decodeURIComponent(req.params.imageName);
    logGallery('Image Serve', 'Request received', null, { imageName });
    
    try {
        const filePath = path.join('/Volumes/VideosNew/Models', imageName);
        
        try {
            if (!fs.existsSync(filePath)) {
                logGallery('Image Serve', 'Error', null, { error: 'File not found', filePath });
                res.status(404).json({ 
                    error: 'File not found',
                    details: `File not found at ${filePath}`,
                    path: filePath
                });
                return;
            }
            
            // Determine content type based on file extension
            const ext = path.extname(imageName).toLowerCase();
            let contentType = 'image/jpeg';  // default
            
            if (ext === '.png') contentType = 'image/png';
            else if (ext === '.webp') contentType = 'image/webp';
            else if (ext === '.gif') contentType = 'image/gif';
            else if (ext === '.mp4') contentType = 'video/mp4';
            else if (ext === '.webm') contentType = 'video/webm';
            else if (ext === '.mov') contentType = 'video/quicktime';

            // Handle video thumbnail requests
            if (req.query.poster && ['.mp4', '.webm', '.mov'].includes(ext)) {
                // Generate or fetch video thumbnail
                const thumbnailPath = path.join(path.dirname(filePath), '.thumbnails', `${path.basename(filePath, ext)}.jpg`);
                
                try {
                    if (!fs.existsSync(thumbnailPath)) {
                        logGallery('Image Serve', 'Error', null, { error: 'Thumbnail not found', thumbnailPath });
                        // If thumbnail doesn't exist, send a default video thumbnail or generate one
                        const defaultThumbnailPath = path.join(__dirname, '../public/images/video-thumbnail.jpg');
                        res.sendFile(defaultThumbnailPath, {
                            headers: { 'Content-Type': 'image/jpeg' }
                        });
                        return;
                    }
                    res.sendFile(thumbnailPath, {
                        headers: { 'Content-Type': 'image/jpeg' }
                    });
                    return;
                } catch (err) {
                    logGallery('Image Serve', 'Error', null, { error: 'Failed to serve thumbnail', details: err.message });
                    res.status(500).json({ 
                        error: 'Failed to serve thumbnail',
                        details: err.message
                    });
                    return;
                }
            }

            // Set appropriate headers for range requests (video streaming)
            if (['.mp4', '.webm', '.mov'].includes(ext)) {
                const stat = fs.statSync(filePath);
                const fileSize = stat.size;
                const range = req.headers.range;

                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunksize = (end - start) + 1;
                    const file = fs.createReadStream(filePath, { start, end });

                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': contentType
                    });

                    file.pipe(res);
                    return;
                }
            }

            // For non-range requests, send the file normally
            res.sendFile(filePath, {
                headers: { 'Content-Type': contentType }
            });
        } catch (err) {
            logGallery('Image Serve', 'Error', null, { error: 'File not found', filePath });
            res.status(404).json({ 
                error: 'File not found',
                details: `File not found at ${filePath}`,
                path: filePath
            });
        }
    } catch (error) {
        logGallery('Image Serve', 'Error', null, { error: error.message });
        res.status(500).json({ 
            error: 'Failed to serve file',
            details: error.message
        });
    }
});

// Serve video files
router.get('/video/:videoName', async (req, res) => {
    const videoName = decodeURIComponent(req.params.videoName);
    logGallery('Video Serve', 'Request received', null, { videoName });
    
    try {
        // Get the directory path from the query or use default
        const directoryPath = '/Volumes/VideosNew/Models';
        const videoPath = path.join(directoryPath, videoName);
        
        // Check if file exists
        if (!fs.existsSync(videoPath)) {
            logGallery('Video Serve', 'Error', null, { error: 'Video file not found', videoPath });
            return res.status(404).json({ error: 'Video not found' });
        }
        
        // Get video stats
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;
        
        if (range) {
            // Handle range requests for video streaming
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            const file = fs.createReadStream(videoPath, { start, end });

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'no-cache',
                'Cross-Origin-Resource-Policy': 'cross-origin'
            };

            res.writeHead(206, head);
            
            // Handle stream errors
            file.on('error', (error) => {
                logGallery('Video Serve', 'Error', null, { error: error.message });
                res.end();
            });

            file.on('end', () => {
                logGallery('Video Serve', 'Request complete', null, { message: 'Stream ended successfully' });
            });

            file.pipe(res);
        } else {
            // Handle non-range requests
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'no-cache',
                'Cross-Origin-Resource-Policy': 'cross-origin'
            };
            res.writeHead(200, head);
            
            const stream = fs.createReadStream(videoPath);
            
            // Handle stream errors
            stream.on('error', (error) => {
                logGallery('Video Serve', 'Error', null, { error: error.message });
                res.end();
            });

            stream.on('end', () => {
                logGallery('Video Serve', 'Request complete', null, { message: 'Stream ended successfully' });
            });

            stream.pipe(res);
        }
    } catch (error) {
        logGallery('Video Serve', 'Error', null, { error: error.message });
        res.status(500).json({ error: 'Error serving video file', details: error.message });
    }
});

// Video content endpoint - streams video content
router.get('/video-content/:filename', async (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        logGallery('Video Content', 'Request received', null, { filename });
        
        // Forward request to content API
        const apiUrl = `http://localhost:8081/video-stream/${encodeURIComponent(filename)}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Content API returned ${response.status}`);
        }

        // Forward headers
        res.set('Content-Type', response.headers.get('Content-Type'));
        res.set('Content-Length', response.headers.get('Content-Length'));
        res.set('Accept-Ranges', 'bytes');

        // Stream the response
        response.body.pipe(res);
    } catch (error) {
        logGallery('Video Content', 'Error', null, { error: error.message });
        res.status(500).json({ error: 'Failed to stream video' });
    }
});

// Client logging endpoint
router.post('/log', (req, res) => {
    const { timestamp, component, event, duration, memory, details } = req.body;
    const logMessage = `[${timestamp}] [Client] [${component}] [${event}] ${duration ? `[${duration}ms]` : ''} [${memory}MB] ${details ? JSON.stringify(details) : ''}`;
    galleryLog.write(logMessage + '\n');
    res.sendStatus(200);
});

/**
 * Search for an image using AppleScript
 * @route POST /gallery/search
 * @param {string} imageName - The name of the image to search for
 */
router.post('/search', async (req, res) => {
    logGallery('Search Route', 'Request received', null, { body: req.body });
    const { imageName } = req.body;
    
    if (!imageName) {
        return res.status(400).json({ error: 'Image name is required' });
    }
    
    try {
        const script = `
            tell application "Finder"
                activate
                set searchFolder to POSIX file "/Volumes/VideosNew/Models" as alias
                set searchResults to search searchFolder for "${imageName}"
                if searchResults is not {} then
                    reveal item 1 of searchResults
                    activate
                end if
            end tell
        `;
        
        const { exec } = await import('child_process');
        exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
            if (error) {
                logGallery('Search Route', 'Error', null, { error: error.message, details: error.message });
                return res.status(500).json({ error: 'Failed to execute search', details: error.message });
            }
            logGallery('Search Route', 'Request complete', null, { message: 'Search executed successfully' });
            res.json({ success: true, message: 'Search executed successfully' });
        });
    } catch (error) {
        logGallery('Search Route', 'Error', null, { error: error.message, details: error.message });
        res.status(500).json({ error: 'Failed to execute search', details: error.message });
    }
});

// Search in Finder
router.get('/finder-search', async (req, res) => {
    const searchTerm = req.query.term;
    if (!searchTerm) {
        logGallery('Finder Search', 'Error', null, { error: 'Search term is missing' });
        return res.status(400).json({ error: 'Search term is required' });
    }

    // Extract just the filename prefix (remove extension)
    const searchPrefix = searchTerm.replace(/\.[^/.]+$/, "");
    logGallery('Finder Search', 'Request received', null, { searchPrefix });
    
    const scriptContent = `
tell application "Finder"
    activate
    make new Finder window
end tell
delay 1
tell application "System Events"
    tell process "Finder"
        -- Open Find dialog
        click menu item "Find" of menu "File" of menu bar 1
        delay 1
        
        -- Type search term (select all and replace any existing text)
        keystroke "a" using command down
        delay 0.2
        keystroke "name:${searchPrefix.replace(/"/g, '\\"')}"
        delay 0.5
        
        -- Navigate to and click "This Mac" button
        key code 48 -- tab key
        delay 0.2
        key code 48
        delay 0.2
        key code 49 -- space key
        delay 0.5
        
        -- Press return to execute search
        key code 36 -- return key
    end tell
end tell`;

    const scriptPath = '/tmp/search_files.applescript';
    try {
        logGallery('Finder Search', 'Script created', null, { scriptPath });
        fs.writeFileSync(scriptPath, scriptContent, 'utf8');
        
        logGallery('Finder Search', 'Script executed', null, { scriptPath });
        const { stdout, stderr } = await new Promise((resolve, reject) => {
            exec(`osascript "${scriptPath}"`, (error, stdout, stderr) => {
                if (error) {
                    logGallery('Finder Search', 'Error', null, { error: error.message, code: error.code, signal: error.signal, killed: error.killed, cmd: error.cmd });
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });

        try {
            fs.unlinkSync(scriptPath);
            logGallery('Finder Search', 'Script cleaned up', null, { scriptPath });
        } catch (e) {
            logGallery('Finder Search', 'Error', null, { error: e.message });
        }

        if (stderr) {
            logGallery('Finder Search', 'Error', null, { error: stderr });
        }
        
        if (stdout) {
            logGallery('Finder Search', 'Output', null, { stdout });
            if (stdout.startsWith('Error:')) {
                throw new Error(stdout);
            }
        }

        res.json({ 
            success: true,
            searchTerm: searchPrefix,
            output: stdout
        });
    } catch (error) {
        logGallery('Finder Search', 'Error', null, { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Failed to execute Finder search',
            details: error.message,
            stack: error.stack
        });
    }
});

// Initial endpoint for gallery data
router.get('/initial', async (req, res) => {
    const startTime = performance.now();
    logGallery('Initial', 'Request received', null, { query: req.query });
    
    const { page = 1, batchSize = 50 } = req.query;
    
    try {
        const scanStart = performance.now();
        const directoryPath = '/Volumes/VideosNew/Models';
        const files = await fs.promises.readdir(directoryPath);
        const scanDuration = performance.now() - scanStart;
        logGallery('Initial', 'Directory scan complete', scanDuration, { fileCount: files.length });
        
        const imageFiles = files.filter(isImageFile);
        logGallery('Initial', 'Image files filtered', null, { imageCount: imageFiles.length });
        
        const start = (page - 1) * batchSize;
        const end = start + batchSize;
        const batch = imageFiles.slice(start, end);
        
        const processStart = performance.now();
        const processedFiles = await Promise.all(
            batch.map(async (file) => {
                const processed = await processFile(file, directoryPath);
                if (!processed) {
                    logGallery('Initial', 'File processing failed', null, { file });
                    return null;
                }
                return {
                    ...processed,
                    thumbnailUrl: `/gallery/thumbnail/${encodeURIComponent(file)}`,
                    fullUrl: `/gallery/image/${encodeURIComponent(file)}`
                };
            })
        );
        const processDuration = performance.now() - processStart;
        logGallery('Initial', 'Batch processing complete', processDuration, { batchSize: batch.length });
        
        const validFiles = processedFiles.filter(f => f !== null);
        
        const response = {
            files: validFiles,
            total: imageFiles.length,
            page: parseInt(page),
            totalPages: Math.ceil(imageFiles.length / batchSize)
        };
        
        const totalDuration = performance.now() - startTime;
        logGallery('Initial', 'Request complete', totalDuration, { responseSize: JSON.stringify(response).length });
        
        res.json(response);
    } catch (error) {
        logGallery('Initial', 'Error', null, { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to load gallery' });
    }
});

// Export the router
export default router;
