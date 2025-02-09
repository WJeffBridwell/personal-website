const express = require('express');
const path = require('path');
const fsPromises = require('fs').promises;
const fs = require('fs');  
const app = express();
const port = 3000;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Import routes
const galleryRouter = require('./routes/gallery');

// Middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve images from the Models directory with proper headers
app.use('/images', express.static('/Volumes/VideosNew/Models', {
    setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=31557600'); // Cache for 1 year
    }
}));

// API endpoint to get images
app.get('/api/images', async (req, res) => {
    try {
        console.log('Fetching images from directory...');
        const directoryPath = '/Volumes/VideosNew/Models';
        console.log('Directory path:', directoryPath);
        
        const files = await fsPromises.readdir(directoryPath, { withFileTypes: true });
        console.log(`Found ${files.length} files in directory`);
        
        const sortedFiles = files
            .filter(file => {
                const isValid = !file.isDirectory() && /\.(jpg|jpeg|webp)$/i.test(file.name);
                if (!isValid) {
                    console.log(`Skipping file: ${file.name} (not an image or is directory)`);
                }
                return isValid;
            })
            .map(file => {
                console.log(`Processing file: ${file.name}`);
                const url = `/images/${encodeURIComponent(file.name)}`;
                console.log(`Generated URL: ${url}`);
                return {
                    name: file.name,
                    url: url
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        console.log(`Sending ${sortedFiles.length} images to client`);
        res.json(sortedFiles);
    } catch (error) {
        console.error('Error reading directory:', error);
        res.status(500).json({ 
            error: 'Error reading directory', 
            details: error.message
        });
    }
});

// API endpoint for finder search
app.get('/api/search', async (req, res) => {
    try {
        const searchTerm = req.query.term;
        if (!searchTerm) {
            return res.status(400).json({ error: 'Search term is required' });
        }

        // Execute mdfind command to search
        const { stdout, stderr } = await execPromise(`mdfind -onlyin /Volumes/VideosNew/Models "${searchTerm}"`);
        
        if (stderr) {
            console.error('Search error:', stderr);
            return res.status(500).json({ error: 'Search failed', details: stderr });
        }

        // Process results
        const results = stdout.split('\n')
            .filter(path => path && /\.(jpg|jpeg|png|webp)$/i.test(path))
            .map(path => ({
                path: path,
                name: path.split('/').pop(),
                url: `/images/${encodeURIComponent(path.split('/').pop())}`
            }));

        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed', details: error.message });
    }
});

// API endpoint to launch Finder with a search query
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
            searchTerm: searchTerm
        });
    });
});

// Use gallery router
app.use('/gallery', galleryRouter);

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running locally at http://localhost:${port}`);
    console.log(`Access from other devices at http://192.168.86.242:${port}`);
});
