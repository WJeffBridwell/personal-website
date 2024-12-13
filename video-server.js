import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';

const app = express();
const port = 8082;

app.use(cors());

// Serve videos from any mounted volume
app.use('/videos', async (req, res) => {
    try {
        // Extract the filename from the request
        const filename = req.path.substring(1); // Remove leading slash
        console.error('Requested video:', filename);
        
        // Extract the base name from the filename (e.g., "amarna-miller" from "amarna-miller-something.mp4")
        const baseMatch = filename.match(/^([^-]+(?:-[^-]+)?)/);
        const baseName = baseMatch ? baseMatch[1] : '';
        console.error('Base name for API lookup:', baseName);
        
        // Get the full path from images-api
        const apiUrl = `http://localhost:8081/image-content?image_name=${encodeURIComponent(baseName)}`;
        console.error('Fetching from API:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.error('API response status:', response.status);
        if (!response.ok) {
            console.error('Images API error:', response.status);
            return res.status(404).send('Content not found');
        }

        const data = await response.json();
        console.error('API response data:', JSON.stringify(data, null, 2));
        console.error('Found', data.length, 'items in API response');

        // Find the matching content item
        const content = data.find(item => item.content_name === filename);
        if (!content) {
            console.error('Content not found in API response. Looking for:', filename);
            console.error('Available items:', data.map(item => item.content_name).join('\n'));
            return res.status(404).send('File not found');
        }

        if (!content.content_url) {
            console.error('Content URL missing for:', filename);
            return res.status(404).send('File URL not found');
        }

        // Check if file exists
        console.error('Checking file at path:', content.content_url);
        if (!fs.existsSync(content.content_url)) {
            console.error('File does not exist at path:', content.content_url);
            return res.status(404).send('File not found on disk');
        }

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
