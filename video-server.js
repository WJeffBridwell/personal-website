import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';

const app = express();
const port = 8082;

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'HEAD'],
    allowedHeaders: ['Range', 'Accept', 'Content-Type']
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Test endpoint to check file stats
app.get('/videos/test', (req, res) => {
    try {
        const videoPath = decodeURIComponent(req.query.path);
        console.log('[Test] Checking video path:', videoPath);

        // Clean up the path - remove any duplicate slashes and handle spaces
        const cleanPath = videoPath
            .replace(/\/+/g, '/'); // Replace multiple slashes with single slash
        
        console.log('[Test] Cleaned path:', cleanPath);

        // Check if file exists and get stats
        if (!fs.existsSync(cleanPath)) {
            console.error('[Test] File does not exist:', cleanPath);
            return res.status(404).json({ error: 'File not found' });
        }

        const stat = fs.statSync(cleanPath);
        const testData = Buffer.alloc(100);
        const fd = fs.openSync(cleanPath, 'r');
        const bytesRead = fs.readSync(fd, testData, 0, 100, 0);
        fs.closeSync(fd);

        res.json({
            exists: true,
            stats: {
                size: stat.size,
                mode: stat.mode,
                uid: stat.uid,
                gid: stat.gid,
                accessTime: stat.atime,
                modifyTime: stat.mtime,
                changeTime: stat.ctime,
            },
            firstBytes: testData.slice(0, bytesRead).toString('hex'),
            readableBy: {
                read: fs.accessSync(cleanPath, fs.constants.R_OK) || true,
            }
        });
    } catch (error) {
        console.error('[Test] Error:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            code: error.code
        });
    }
});

// Direct video streaming endpoint
app.get('/videos/direct', (req, res) => {
    try {
        console.log('\n[Video Server] ========== Request Start ==========');
        console.log('[Video Server] Raw URL:', req.url);
        console.log('[Video Server] Query params:', req.query);
        
        let cleanPath;
        try {
            // Get path from query and decode it - EXACT same as test endpoint
            const videoPath = decodeURIComponent(req.query.path);
            console.log('[Video Server] URL decoded path:', videoPath);
            
            // Clean up the path - EXACT same as test endpoint
            cleanPath = videoPath.replace(/\/+/g, '/');
            console.log('[Video Server] Cleaned path:', cleanPath);
        } catch (decodeError) {
            console.error('[Video Server] Path processing error:', decodeError);
            return res.status(400).json({
                error: 'Invalid path encoding',
                details: decodeError.message
            });
        }

        // Test file access
        try {
            fs.accessSync(cleanPath, fs.constants.R_OK);
            console.log('[Video Server] File is readable');
        } catch (accessError) {
            console.error('[Video Server] File access error:', accessError);
            throw accessError;
        }

        // Check if file exists
        if (!fs.existsSync(cleanPath)) {
            console.error('[Video Server] File does not exist:', cleanPath);
            return res.status(404).json({
                error: 'File not found',
                path: cleanPath
            });
        }

        // Get file stats
        const stat = fs.statSync(cleanPath);
        console.log('[Video Server] File stats:', {
            size: stat.size,
            mode: stat.mode,
            uid: stat.uid,
            gid: stat.gid,
            accessTime: stat.atime,
            modifyTime: stat.mtime
        });

        const fileSize = stat.size;
        const range = req.headers.range;
        console.log('[Video Server] Range header:', range);

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            console.log('[Video Server] Creating read stream with range:', { start, end, chunksize });
            
            const file = fs.createReadStream(cleanPath, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            console.log('[Video Server] Sending range response headers:', head);
            res.writeHead(206, head);
            
            file.on('error', (streamError) => {
                console.error('[Video Server] Stream error:', streamError);
                if (!res.headersSent) {
                    res.status(500).send('Error streaming video');
                }
                res.end();
            });
            
            file.pipe(res);
            console.log('[Video Server] Started streaming with range');
        } else {
            console.log('[Video Server] Sending full file...');
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            console.log('[Video Server] Sending full file response headers:', head);
            res.writeHead(200, head);
            
            const file = fs.createReadStream(cleanPath);
            file.on('error', (streamError) => {
                console.error('[Video Server] Stream error:', streamError);
                if (!res.headersSent) {
                    res.status(500).send('Error streaming video');
                }
                res.end();
            });
            
            file.pipe(res);
            console.log('[Video Server] Started streaming full file');
        }
        
        // Log when streaming ends
        res.on('finish', () => {
            console.log('[Video Server] ========== Request End ==========\n');
        });
    } catch (error) {
        console.error('[Video Server] Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Error streaming video',
                details: error.message,
                code: error.code
            });
        }
        res.end();
    }
});

// API-based video streaming (catch-all route moved to end)
app.get('/videos/:filename', async (req, res) => {
    try {
        // Extract the filename from the request
        const filename = req.params.filename;
        console.error('Request for video:', filename);
        
        // Extract the base name from the filename (e.g., "haley-reed" from "aaliyah-love-haley-reed-ramon-nomar...")
        // Find any name that matches the pattern in the filename
        const baseMatch = filename.match(/haley-reed|aaliyah-love|abella-danger|alexis-tae|aria-valencia|blair-williams|camila-cream|chloe-cherry/);
        const baseName = baseMatch ? baseMatch[0] : '';
        console.error('Base name for lookup:', baseName);
        
        // Get the full path from images-api
        const apiUrl = `http://192.168.86.242:8081/image-content?image_name=${encodeURIComponent(baseName)}`;
        console.error('API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error('Images API error:', response.status);
            return res.status(404).send('Content not found');
        }

        const data = await response.json();
        console.error('Found', data.length, 'items in API response');
        console.error('Looking for exact match:', filename);
        console.error('Available items:', data.map(item => item.content_name).join('\n'));

        // Find the matching content item
        const content = data.find(item => item.content_name === filename);
        if (!content) {
            console.error('Content not found:', filename);
            return res.status(404).send('File not found');
        }

        if (!content.content_url) {
            console.error('Content URL missing for:', filename);
            return res.status(404).send('File URL not found');
        }

        // Check if file exists
        if (!fs.existsSync(content.content_url)) {
            console.error('File does not exist:', content.content_url);
            return res.status(404).send('File not found on disk');
        }

        console.error('Found file at:', content.content_url);
        
        console.error('Serving file from:', content.content_url);
        
        // Set appropriate headers for video streaming
        const stat = fs.statSync(content.content_url);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            console.log('[Video Server] Creating read stream with range:', { start, end, chunksize });
            
            try {
                const file = fs.createReadStream(content.content_url, {start, end});
                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4',
                };
                console.log('[Video Server] Sending range response headers:', head);
                res.writeHead(206, head);
                
                file.on('error', (streamError) => {
                    console.error('[Video Server] Stream error:', streamError);
                    res.end();
                });
                
                file.pipe(res);
            } catch (streamError) {
                console.error('[Video Server] Error creating read stream:', streamError);
                throw streamError;
            }
        } else {
            console.log('[Video Server] Sending full file...');
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            console.log('[Video Server] Sending full file response headers:', head);
            res.writeHead(200, head);
            
            try {
                const file = fs.createReadStream(content.content_url);
                file.on('error', (streamError) => {
                    console.error('[Video Server] Stream error:', streamError);
                    res.end();
                });
                
                file.pipe(res);
            } catch (streamError) {
                console.error('[Video Server] Error creating read stream:', streamError);
                throw streamError;
            }
        }
    } catch (error) {
        console.error('[Video Server] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).send('Error streaming video: ' + error.message);
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Video server running at http://0.0.0.0:${port}`);
});
