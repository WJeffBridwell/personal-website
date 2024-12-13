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
import { promises as fs } from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

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
        await fs.access(galleryPath);
        console.log('Gallery file exists at path');
        
        // Read file contents for verification
        const contents = await fs.readFile(galleryPath, 'utf8');
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

/**
 * Retrieve a list of images from the specified directory
 * @route GET /gallery/images
 * @returns {Object[]} Array of image objects containing name and URL
 * @property {string} name - The original filename of the image
 * @property {string} url - The URL path to access the image
 * @throws {500} If there's an error reading the directory
 */
router.get('/images', async (req, res) => {
    console.log('GET /gallery/images endpoint hit');
    try {
        const directoryPath = '/Volumes/VideosNew/Models';
        console.log('Checking directory:', directoryPath);
        
        // Check if directory exists and is accessible
        try {
            await fs.access(directoryPath);
            console.log('Directory exists and is accessible');
        } catch (err) {
            console.error('Directory access error:', err);
            return res.status(500).json({ 
                error: 'Failed to read directory',
                details: err.message
            });
        }

        // Read directory contents
        const files = await fs.readdir(directoryPath, { withFileTypes: true });
        console.log(`Found ${files.length} total files in directory`);
        
        // Filter for images and videos
        const content = files
            .filter(file => {
                const isMedia = !file.isDirectory() && 
                    (/\.(jpg|jpeg|png|webp|mp4|webm|mov)$/i.test(file.name));
                if (isMedia) console.log('Found media file:', file.name);
                return isMedia;
            })
            .map(file => {
                const ext = path.extname(file.name).toLowerCase();
                const isVideo = ['.mp4', '.webm', '.mov'].includes(ext);
                
                try {
                    const stats = fs.statSync(path.join(directoryPath, file.name));
                    return {
                        content_name: file.name,
                        content_url: isVideo ? `/gallery/video/${encodeURIComponent(file.name)}` : `/gallery/images/${encodeURIComponent(file.name)}`,
                        content_type: isVideo ? 'video' : 'image',
                        content_size: stats.size,
                        content_created: stats.birthtime,
                        content_tags: []  // Add empty tags array for future use
                    };
                } catch (err) {
                    console.error(`Error processing file ${file.name}:`, err);
                    return null;
                }
            })
            .filter(item => item !== null);  // Remove any failed items

        console.log(`Returning ${content.length} media files:`, content.map(c => ({
            name: c.content_name,
            type: c.content_type,
            url: c.content_url
        })));
        
        res.json({ content });
        
    } catch (error) {
        console.error('Error in /gallery/images:', error);
        res.status(500).json({ 
            error: 'Failed to read directory',
            details: error.message
        });
    }
});

// Serve individual media files
router.get('/images/:imageName', async (req, res) => {
    const imageName = decodeURIComponent(req.params.imageName);
    console.log('GET /gallery/images/:imageName endpoint hit for:', imageName);
    
    try {
        const filePath = path.join('/Volumes/VideosNew/Models', imageName);
        console.log('Attempting to serve file from:', filePath);
        
        try {
            await fs.access(filePath);
            console.log('File exists, serving:', filePath);
            
            // Determine content type based on file extension
            const ext = path.extname(imageName).toLowerCase();
            let contentType = 'image/jpeg';  // default
            
            if (ext === '.png') contentType = 'image/png';
            else if (ext === '.webp') contentType = 'image/webp';
            else if (ext === '.mp4') contentType = 'video/mp4';
            else if (ext === '.webm') contentType = 'video/webm';
            else if (ext === '.mov') contentType = 'video/quicktime';

            // Handle video thumbnail requests
            if (req.query.poster && ['.mp4', '.webm', '.mov'].includes(ext)) {
                // Generate or fetch video thumbnail
                const thumbnailPath = path.join(path.dirname(filePath), '.thumbnails', `${path.basename(filePath, ext)}.jpg`);
                
                try {
                    await fs.access(thumbnailPath);
                    res.sendFile(thumbnailPath, {
                        headers: { 'Content-Type': 'image/jpeg' }
                    });
                    return;
                } catch (err) {
                    // If thumbnail doesn't exist, send a default video thumbnail or generate one
                    const defaultThumbnailPath = path.join(__dirname, '../public/images/video-thumbnail.jpg');
                    res.sendFile(defaultThumbnailPath, {
                        headers: { 'Content-Type': 'image/jpeg' }
                    });
                    return;
                }
            }

            // Set appropriate headers for range requests (video streaming)
            if (['.mp4', '.webm', '.mov'].includes(ext)) {
                const stat = await fs.stat(filePath);
                const fileSize = stat.size;
                const range = req.headers.range;

                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunksize = (end - start) + 1;
                    const file = await fs.open(filePath, 'r');
                    const stream = file.createReadStream({ start, end });

                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': contentType
                    });

                    stream.pipe(res);
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
                details: `${err.code}: ${err.message}, access '${filePath}'`,
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
        try {
            await fs.access(videoPath);
            console.log('Video file exists');
        } catch (err) {
            console.error('Video file not found:', videoPath);
            console.error('Error details:', err);
            return res.status(404).json({ error: 'Video not found' });
        }
        
        // Get video stats
        const stat = await fs.stat(videoPath);
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
            
            const file = await fs.open(videoPath, 'r');
            const stream = file.createReadStream({ start, end });

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
            stream.on('error', (error) => {
                console.error('Stream error:', error);
                file.close();
                res.end();
            });

            stream.on('end', () => {
                console.log('Stream ended successfully');
                file.close();
            });

            stream.pipe(res);
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
            
            const stream = await fs.createReadStream(videoPath);
            
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
        await fs.writeFile(scriptPath, scriptContent, 'utf8');
        
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
            await fs.unlink(scriptPath);
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
