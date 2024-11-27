/**
 * Express server configuration for the personal website.
 * Provides static file serving, API endpoints for Finder integration,
 * and gallery functionality. Includes security middleware and request logging.
 */

// Import required Node.js modules and external dependencies
const express = require('express');
const sharp = require('sharp');
const path = require('path');
const fsPromises = require('fs').promises;
const fsSync = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const port = 3000;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configure Express application and set default port
const app = express();
const port = 3000;

// Import routes
const galleryRouter = require('./routes/gallery');

// Middleware Configuration
// Log all incoming HTTP requests with timestamp
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Static File Serving
// Serve files from the current directory
app.use(express.static(__dirname));

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
    fsSync.writeFileSync(scriptPath, scriptContent);
    
    const osascriptCommand = `osascript ${scriptPath}`;
    exec(osascriptCommand, (err, out, stdErr) => {
        try {
            fsSync.unlinkSync(scriptPath);
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

// Mount Routes
// Use the gallery router for all /gallery routes
app.use('/gallery', galleryRouter);

// Server Initialization
// Start the server with error handling for common issues like port conflicts
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
}).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please try a different port.`);
        process.exit(1);
    } else {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});
