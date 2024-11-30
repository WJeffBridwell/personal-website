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
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';

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
 * @returns {HTML} The gallery.html page
 */
router.get('/', (req, res) => {
    console.log('Gallery root route hit');
    const htmlPath = path.join(__dirname, '../gallery.html');
    console.log('Attempting to serve:', htmlPath);
    res.sendFile(htmlPath, (err) => {
        if (err) {
            console.error('Error serving gallery.html:', err);
            res.status(500).send('Error loading gallery page');
        } else {
            console.log('Successfully served gallery.html');
        }
    });
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
    const startTime = process.hrtime();
    console.log('Gallery images route hit');
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        console.log(`Fetching images - page: ${page}, limit: ${limit}`);
        const directoryPath = '/Volumes/VideosNew/Models';
        
        // Time directory access check
        const accessStartTime = process.hrtime();
        try {
            await fs.access(directoryPath);
            const accessTime = process.hrtime(accessStartTime);
            console.log(`Directory access time: ${accessTime[0]}s ${accessTime[1] / 1000000}ms`);
        } catch (err) {
            console.error('Directory access error:', err);
            return res.status(500).json({ error: 'Directory not accessible', details: err.message });
        }
        
        // Time directory read
        const readStartTime = process.hrtime();
        const allFiles = await fs.readdir(directoryPath, { withFileTypes: true });
        const readTime = process.hrtime(readStartTime);
        console.log(`Directory read time: ${readTime[0]}s ${readTime[1] / 1000000}ms`);
        console.log('Total files found:', allFiles.length);
        
        // Time filtering and processing
        const processStartTime = process.hrtime();
        const totalImages = allFiles.filter(file => !file.isDirectory() && /\.(jpg|jpeg|png|webp)$/i.test(file.name)).length;
        
        const files = allFiles
            .filter(file => !file.isDirectory() && /\.(jpg|jpeg|png|webp)$/i.test(file.name))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(offset, offset + limit)
            .map(file => ({
                name: file.name,
                url: `/images/${encodeURIComponent(file.name)}`
            }));
        
        const processTime = process.hrtime(processStartTime);
        console.log(`Processing time: ${processTime[0]}s ${processTime[1] / 1000000}ms`);
        console.log(`Returning ${files.length} images (total: ${totalImages})`);
        
        const totalTime = process.hrtime(startTime);
        console.log(`Total route time: ${totalTime[0]}s ${totalTime[1] / 1000000}ms`);
        
        res.json({
            images: files,
            pagination: {
                page,
                limit,
                total: totalImages,
                totalPages: Math.ceil(totalImages / limit),
                hasMore: offset + files.length < totalImages
            },
            performance: {
                totalTime: `${totalTime[0]}s ${totalTime[1] / 1000000}ms`,
                readTime: `${readTime[0]}s ${readTime[1] / 1000000}ms`,
                processTime: `${processTime[0]}s ${processTime[1] / 1000000}ms`
            }
        });
    } catch (error) {
        const errorTime = process.hrtime(startTime);
        console.error('Error reading directory:', error);
        console.error(`Error occurred after: ${errorTime[0]}s ${errorTime[1] / 1000000}ms`);
        res.status(500).json({ error: 'Error reading directory', details: error.message });
    }
});

router.get('/images/:imageName', async (req, res) => {
    console.log('Gallery image route hit');
    try {
        const directoryPath = '/Volumes/VideosNew/Models';
        console.log('Checking directory:', directoryPath);
        
        // Check if directory exists and is accessible
        try {
            await fs.access(directoryPath);
            console.log('Directory exists and is accessible');
        } catch (err) {
            console.error('Directory access error:', err);
            return res.status(500).json({ error: 'Directory not accessible', details: err.message });
        }
        
        const imagePath = path.join(directoryPath, req.params.imageName);
        console.log('Checking image file:', imagePath);
        
        // Check if image file exists and is accessible
        try {
            await fs.access(imagePath);
            console.log('Image file exists and is accessible');
        } catch (err) {
            console.error('Image file access error:', err);
            return res.status(404).json({ error: 'Image file not found', details: err.message });
        }
        
        res.sendFile(imagePath);
    } catch (error) {
        console.error('Error reading directory:', error);
        res.status(500).json({ error: 'Error reading directory', details: error.message });
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

// Export the router for use in the main application
export default router;
