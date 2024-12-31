import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';

const app = express();
const port = 8082;

app.use(cors({
    origin: '*',
    methods: ['GET', 'HEAD'],
    allowedHeaders: ['Range', 'Accept', 'Content-Type']
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Direct video streaming endpoint
app.get('/videos/direct', (req, res) => {
    try {
        const videoPath = decodeURIComponent(req.query.path);
        console.log('Streaming video from path:', videoPath);

        // Check if file exists
        if (!fs.existsSync(videoPath)) {
            console.error('File does not exist:', videoPath);
            return res.status(404).send('File not found');
        }

        // Set appropriate headers for video streaming
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            console.log('Sending range response:', { start, end, size: fileSize });
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            console.log('Sending full file response:', { size: fileSize });
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        console.error('Error streaming video:', error);
        res.status(500).send('Error streaming video');
    }
});

// Serve videos from any mounted volume
app.use('/videos', async (req, res) => {
    try {
        // Extract the filename from the request
        const filename = req.path.substring(1); // Remove leading slash
        console.error('Request for video:', filename);
        
        // Extract the base name from the filename (e.g., "haley-reed" from "aaliyah-love-haley-reed-ramon-nomar...")
        // Find any name that matches the pattern in the filename
        const baseMatch = filename.match(/haley-reed|aaliyah-love|abella-danger|alexis-tae|aria-valencia|blair-williams|camila-cream|chloe-cherry/);
        const baseName = baseMatch ? baseMatch[0] : '';
        console.error('Base name for lookup:', baseName);
        
        // Get the full path from images-api
        const apiUrl = `http://localhost:8081/image-content?image_name=${encodeURIComponent(baseName)}`;
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
            const file = fs.createReadStream(content.content_url, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            console.error('Sending range response:', head);
            res.writeHead(206, head);
            
            // Add error handlers
            file.on('error', (err) => {
                console.error('Stream error:', err);
                if (!res.headersSent) {
                    res.status(500).send('Error streaming file');
                }
            });
            
            res.on('error', (err) => {
                console.error('Response error:', err);
                file.destroy();
            });
            
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            console.error('Sending full file response:', head);
            res.writeHead(200, head);
            
            const file = fs.createReadStream(content.content_url);
            
            // Add error handlers
            file.on('error', (err) => {
                console.error('Stream error:', err);
                if (!res.headersSent) {
                    res.status(500).send('Error streaming file');
                }
            });
            
            res.on('error', (err) => {
                console.error('Response error:', err);
                file.destroy();
            });
            
            file.pipe(res);
        }
    } catch (error) {
        console.error('Server error:', error);
        if (!res.headersSent) {
            res.status(500).send('Server error');
        }
    }
});

app.listen(port, () => {
    console.log(`Video server running at http://localhost:${port}`);
});
