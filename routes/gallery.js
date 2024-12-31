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
const CHUNK_SIZE = 1000;   // Process in chunks of 1000 for better memory usage
const CACHE_TTL = 300000;  // 5 minutes cache TTL

// Initialize content cache with LRU cache for thumbnails
const contentCache = {
    files: new Map(),
    thumbnails: new Map(),
    lastUpdate: 0,
    updating: false
};

console.log('Initializing gallery router');

// Debug middleware for gallery router
router.use((req, res, next) => {
    console.log('Gallery Router Debug:', {
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path,
        method: req.method
    });
    next();
});

// Test route to verify router is mounted
router.get('/test', (req, res) => {
    console.log('Gallery test route hit');
    res.json({ message: 'Gallery router is working' });
});

// Test endpoint to check directory access
router.get('/test-directory', (req, res) => {
    console.log('Testing directory access');
    const directoryPath = '/Volumes/VideosNew/Models';
    
    try {
        // Check if directory exists
        if (!fs.existsSync(directoryPath)) {
            return res.status(404).json({
                error: 'Directory not found',
                path: directoryPath
            });
        }

        // Try to read directory contents
        const files = fs.readdirSync(directoryPath, { withFileTypes: true });
        
        return res.json({
            success: true,
            fileCount: files.length,
            firstFewFiles: files.slice(0, 5).map(f => ({
                name: f.name,
                isDirectory: f.isDirectory()
            }))
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message,
            code: error.code,
            path: directoryPath
        });
    }
});

/**
 * Serve the main gallery page
 * @route GET /gallery
 * @returns {HTML} The gallery.html page from public directory
 */
router.get('/', async (req, res) => {
    console.log('\n=== Gallery Route Hit ===');
    const galleryPath = path.join(__dirname, '../public/gallery.html');
    console.log('Full gallery path:', galleryPath);
    
    try {
        // Verify file exists
        if (!fs.existsSync(galleryPath)) {
            console.error('Gallery file does not exist at path');
            res.status(404).send('Gallery file not found');
            return;
        }
        
        // Read file contents for verification
        const contents = fs.readFileSync(galleryPath, 'utf8');
        console.log('Gallery file length:', contents.length);
        console.log('Contains modal:', contents.includes('id="imageModal"'));
        
        // Send the file
        res.setHeader('Content-Type', 'text/html');
        res.sendFile(galleryPath, (err) => {
            if (err) {
                console.error('Error sending gallery.html:', err);
                res.status(500).send('Error loading gallery page');
            } else {
                console.log('Successfully sent gallery.html');
            }
        });
    } catch (error) {
        console.error('Error accessing gallery.html:', error);
        res.status(500).send('Error loading gallery page');
    }
    console.log('======================\n');
});

// Update cache with chunked processing
async function updateCache(directoryPath) {
    if (contentCache.updating) {
        console.log('Cache update already in progress');
        return;
    }

    try {
        contentCache.updating = true;
        console.log('Starting cache update...');

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
                    console.error(`Error processing file ${file.name}:`, error);
                }
            }));
            
            // Allow other operations between chunks
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        contentCache.lastUpdate = Date.now();
        console.log(`Cache updated with ${contentCache.files.size} files`);
        
    } catch (error) {
        console.error('Error updating cache:', error);
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
        console.error('Error getting letters:', error);
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
            console.log('Tags for', filename, ':', fileTags);
        }
        
        // Convert to sorted array
        const sortedTags = Array.from(tags).sort();
        console.log('Total unique tags:', sortedTags.length, sortedTags);
        
        res.json({
            tags: sortedTags,
            total: sortedTags.length
        });
        
    } catch (error) {
        console.error('Error getting tags:', error);
        res.status(500).json({ error: 'Failed to get tags', details: error.message });
    }
});

// Gallery images endpoint with optimized loading
router.get('/images', async (req, res) => {
    console.log('\n=== Gallery Images Request ===');
    const startTime = process.hrtime();
    
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
        console.error('Error processing request:', error);
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

// Enable compression for all responses
router.use(compression());

// Serve individual media files
router.get('/images/:imageName', async (req, res) => {
    const imageName = decodeURIComponent(req.params.imageName);
    console.log('GET /gallery/images/:imageName endpoint hit for:', imageName);
    
    try {
        const filePath = path.join('/Volumes/VideosNew/Models', imageName);
        console.log('Attempting to serve file from:', filePath);
        
        try {
            if (!fs.existsSync(filePath)) {
                console.error('File not found:', filePath);
                res.status(404).json({ 
                    error: 'File not found',
                    details: `File not found at ${filePath}`,
                    path: filePath
                });
                return;
            }
            console.log('File exists, serving:', filePath);
            
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
                        console.error('Thumbnail not found:', thumbnailPath);
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
                    console.error('Error serving thumbnail:', err);
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
            console.error('File not found:', filePath, err);
            res.status(404).json({ 
                error: 'File not found',
                details: `File not found at ${filePath}`,
                path: filePath
            });
        }
    } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).json({ 
            error: 'Failed to serve file',
            details: error.message
        });
    }
});

// Serve video files
router.get('/video/:videoName', async (req, res) => {
    const videoName = decodeURIComponent(req.params.videoName);
    console.log('\n=== Video Request ===');
    console.log('Video name:', videoName);
    
    try {
        // Get the directory path from the query or use default
        const directoryPath = '/Volumes/VideosNew/Models';
        const videoPath = path.join(directoryPath, videoName);
        console.log('Full video path:', videoPath);
        
        // Check if file exists
        if (!fs.existsSync(videoPath)) {
            console.error('Video file not found:', videoPath);
            console.error('Error details:', 'File not found');
            return res.status(404).json({ error: 'Video not found' });
        }
        
        // Get video stats
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;
        console.log('File size:', fileSize);
        console.log('Range header:', range);

        if (range) {
            // Handle range requests for video streaming
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            console.log('Streaming chunk:', { start, end, chunksize });
            
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
                console.error('Stream error:', error);
                res.end();
            });

            file.on('end', () => {
                console.log('Stream ended successfully');
            });

            file.pipe(res);
        } else {
            // Handle non-range requests
            console.log('Sending full file (no range request)');
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
                console.error('Stream error:', error);
                res.end();
            });

            stream.on('end', () => {
                console.log('Stream ended successfully');
            });

            stream.pipe(res);
        }
    } catch (error) {
        console.error('Error serving video:', error);
        res.status(500).json({ error: 'Error serving video file', details: error.message });
    }
});

// Video content endpoint - streams video content
router.get('/video-content/:filename', async (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        console.log('Video request for:', filename);

        // Forward request to content API
        const apiUrl = `http://localhost:8081/video-stream/${encodeURIComponent(filename)}`;
        console.log('Forwarding to:', apiUrl);
        
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
        console.error('Error streaming video:', error);
        res.status(500).json({ error: 'Failed to stream video' });
    }
});

/**
 * Search for an image using AppleScript
 * @route POST /gallery/search
 * @param {string} imageName - The name of the image to search for
 */
router.post('/search', async (req, res) => {
    console.log('Search route hit with:', req.body);
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
                console.error('AppleScript error:', error);
                return res.status(500).json({ error: 'Failed to execute search', details: error.message });
            }
            console.log('Search executed successfully');
            res.json({ success: true, message: 'Search executed successfully' });
        });
    } catch (error) {
        console.error('Error executing search:', error);
        res.status(500).json({ error: 'Failed to execute search', details: error.message });
    }
});

// Search in Finder
router.get('/finder-search', async (req, res) => {
    const searchTerm = req.query.term;
    if (!searchTerm) {
        console.error('Search term is missing');
        return res.status(400).json({ error: 'Search term is required' });
    }

    // Extract just the filename prefix (remove extension)
    const searchPrefix = searchTerm.replace(/\.[^/.]+$/, "");
    console.log('Executing Finder search for prefix:', searchPrefix);

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
        console.log('Writing AppleScript to:', scriptPath);
        console.log('Script content:', scriptContent);
        fs.writeFileSync(scriptPath, scriptContent, 'utf8');
        
        console.log('Running AppleScript...');
        const { stdout, stderr } = await new Promise((resolve, reject) => {
            exec(`osascript "${scriptPath}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error('AppleScript execution error:', {
                        error: error.message,
                        code: error.code,
                        signal: error.signal,
                        killed: error.killed,
                        cmd: error.cmd
                    });
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });

        try {
            fs.unlinkSync(scriptPath);
            console.log('Cleaned up script file');
        } catch (e) {
            console.error('Failed to clean up script file:', e);
        }

        if (stderr) {
            console.error('AppleScript stderr:', stderr);
        }
        
        if (stdout) {
            console.log('AppleScript stdout:', stdout);
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
        console.error('Error executing AppleScript:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Failed to execute Finder search',
            details: error.message,
            stack: error.stack
        });
    }
});

console.log('Gallery routes registered:', router.stack.map(r => r.route?.path));

// Export the router
export default router;
