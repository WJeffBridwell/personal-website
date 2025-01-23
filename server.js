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
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer } from 'http';
import cors from 'cors';
import httpProxy from 'http-proxy';
import { exec } from 'child_process';
import util from 'util';
import { Server as SocketIOServer } from 'socket.io';
import compression from 'compression';
import timeout from 'connect-timeout';
import fetch from 'node-fetch';
import sharp from 'sharp';
import galleryRouter from './routes/gallery.js';
import Hexo from 'hexo';
import yaml from 'js-yaml';

const execPromise = util.promisify(exec);

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
console.log = function (...args) {
  const message = `${args.join(' ')}\n`; // Join arguments and add a newline
  logStream.write(message); // Write to the log file
  process.stdout.write(message); // Also output to the terminal
};

const app = express();
const port = parseInt(process.env.PORT || '3001', 10); // Default to 3001

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
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

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create blog directory if it doesn't exist
const blogDirectory = path.join(__dirname, 'blog');
const postsDirectory = path.join(blogDirectory, 'source', '_posts');

if (!fs.existsSync(blogDirectory)) {
  fs.mkdirSync(blogDirectory);
  fs.mkdirSync(path.join(blogDirectory, 'source'), { recursive: true });
  fs.mkdirSync(postsDirectory, { recursive: true });
  
  // Create default _config.yml if it doesn't exist
  const defaultConfig = {
    title: 'My Blog',
    description: 'Welcome to my blog',
    per_page: 10,
    theme: 'landscape',
    url: 'http://localhost:3001',
    root: '/',
    permalink: ':year/:month/:day/:title/',
    source_dir: 'source',
    public_dir: 'public',
    new_post_name: ':title.md'
  };
  
  fs.writeFileSync(
    path.join(blogDirectory, '_config.yml'),
    yaml.dump(defaultConfig)
  );
}

// Middleware Configuration
// Log all incoming HTTP requests with timestamp
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Mount gallery router
app.use('/gallery', galleryRouter);

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
  },
}));

// Serve static files for blog
app.use(express.static(path.join(__dirname, 'public')));
app.use('/blog', express.static(path.join(__dirname, 'blog', 'public')));

// Get all blog posts
app.get('/blog/api/posts', async (req, res) => {
  try {
    console.log('Fetching all blog posts');
    await ensureHexoInitialized();
    
    const posts = hexo.locals.get('posts');
    console.log('Posts object:', posts);
    
    if (!posts || !posts.data) {
      console.error('No posts data available');
      return res.status(500).json({ error: 'No posts data available' });
    }
    
    console.log('Total posts available:', posts.data.length);
    
    // Map posts to a simpler format
    const formattedPosts = posts.data.map(post => ({
      title: post.title || 'Untitled Post',
      path: post.path,
      date: post.date ? post.date.toISOString() : new Date().toISOString(),
      categories: post.categories ? post.categories.toArray().map(cat => cat.name) : [],
      tags: post.tags ? post.tags.toArray().map(tag => tag.name) : [],
      excerpt: post.excerpt || (post._content ? post._content.slice(0, 200) + '...' : 'No content available')
    }));
    
    res.json({ posts: formattedPosts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Error fetching posts: ' + error.message });
  }
});

// Initialize Hexo once
const hexo = new Hexo(path.join(__dirname, 'blog'), {
  debug: true,  // Enable debug mode
  silent: false // Show more logs
});

// Ensure Hexo is initialized before handling requests
let hexoInitialized = false;

async function ensureHexoInitialized() {
  try {
    if (!hexoInitialized) {
      console.log('Initializing Hexo...');
      console.log('Blog directory:', path.join(__dirname, 'blog'));
      console.log('Posts directory:', path.join(__dirname, 'blog', 'source', '_posts'));
      
      // Check if directories exist
      const blogDir = path.join(__dirname, 'blog');
      const postsDir = path.join(blogDir, 'source', '_posts');
      
      if (!fs.existsSync(blogDir)) {
        throw new Error('Blog directory does not exist: ' + blogDir);
      }
      if (!fs.existsSync(postsDir)) {
        throw new Error('Posts directory does not exist: ' + postsDir);
      }
      
      await hexo.init();
      console.log('Hexo init complete');
      
      await hexo.load();
      console.log('Hexo load complete');
      
      hexoInitialized = true;
      console.log('Hexo initialized successfully');
      
      // Log available posts for debugging
      const posts = hexo.locals.get('posts');
      console.log('Posts after initialization:', posts);
      if (posts && posts.data) {
        console.log('Available posts:', posts.data.map(p => ({ 
          title: p.title, 
          path: p.path,
          source: p.source,
          full_source: p.full_source 
        })));
      } else {
        console.log('No posts available after initialization');
      }
    }
  } catch (error) {
    console.error('Error initializing Hexo:', error);
    hexoInitialized = false; // Reset flag on error
    throw error;
  }
}

// Safely execute Hexo command
async function safeExecHexo(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing Hexo command: ${command}`);
    exec(`cd blog && ${command}`, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${command}:`, error);
        console.error('stderr:', stderr);
        reject(new Error(`Failed to execute ${command}: ${error.message}`));
      } else {
        console.log(`${command} output:`, stdout);
        resolve(stdout);
      }
    });
  });
}

// Create a new blog post
app.post('/blog/api/posts', async (req, res) => {
  try {
    console.log('Creating new post with data:', req.body);
    
    // Validate required fields first
    const { title, content } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string' });
    }
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }
    
    // Ensure categories and tags are arrays
    const categories = Array.isArray(req.body.categories) ? req.body.categories : [];
    const tags = Array.isArray(req.body.tags) ? req.body.tags : [];
    
    const date = new Date();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Create the post file
    const postsDir = path.join(__dirname, 'blog', 'source', '_posts');
    const postPath = path.join(postsDir, `${slug}.md`);
    
    console.log('Creating post directory:', postsDir);
    await fs.promises.mkdir(postsDir, { recursive: true });
    
    console.log('Writing post to:', postPath);
    const postContent = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date.toISOString()}
layout: post
categories:${categories.length ? '\n' + categories.map(cat => `  - ${cat}`).join('\n') : ' []'}
tags:${tags.length ? '\n' + tags.map(tag => `  - ${tag}`).join('\n') : ' []'}
---

${content}`;
    
    await fs.promises.writeFile(postPath, postContent, 'utf8');
    console.log('Post file written successfully');
    
    // Send response immediately after saving the file
    res.json({
      success: true,
      post: {
        title,
        path: slug,
        date: date.toISOString(),
        categories,
        tags,
        content
      }
    });
    
    // Handle Hexo regeneration asynchronously
    (async () => {
      try {
        console.log('Running Hexo clean...');
        await new Promise((resolve, reject) => {
          exec('cd blog && npx hexo clean', (error, stdout, stderr) => {
            if (error) {
              console.error('Error during hexo clean:', error);
              console.error('stderr:', stderr);
              reject(error);
            } else {
              console.log('Hexo clean output:', stdout);
              resolve();
            }
          });
        });
        
        console.log('Running Hexo generate...');
        await new Promise((resolve, reject) => {
          exec('cd blog && npx hexo generate', (error, stdout, stderr) => {
            if (error) {
              console.error('Error during hexo generate:', error);
              console.error('stderr:', stderr);
              reject(error);
            } else {
              console.log('Hexo generate output:', stdout);
              resolve();
            }
          });
        });
        
        console.log('Blog regeneration completed successfully');
      } catch (error) {
        console.error('Error during blog regeneration:', error);
      }
    })();
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Error creating post: ' + error.message });
  }
});

// Blog post routes
app.get('/blog/api/posts/:path(*)', async (req, res) => {
  try {
    console.log('Fetching post with path:', req.params.path);
    await ensureHexoInitialized();
    
    // Get the path and ensure it has the correct format
    let requestedPath = req.params.path;
    if (!requestedPath.endsWith('/')) {
      requestedPath += '/';
    }
    console.log('Looking for post with path:', requestedPath);
    
    // Get all posts and find the matching one
    const posts = hexo.locals.get('posts').data;
    console.log('Total posts available:', posts.length);
    
    // Find the post by matching the path
    const post = posts.find(p => {
      console.log('Comparing post path:', p.path, 'with requested path:', requestedPath);
      return p.path === requestedPath;
    });
    
    if (!post) {
      console.log('Post not found');
      return res.status(404).json({ error: 'Post not found' });
    }
    
    console.log('Found post:', post.title);
    
    // Return the full post data
    const postData = {
      title: post.title || 'Untitled Post',
      path: post.path,
      date: post.date ? post.date.toISOString() : new Date().toISOString(),
      categories: post.categories ? post.categories.toArray().map(cat => cat.name) : [],
      tags: post.tags ? post.tags.toArray().map(tag => tag.name) : [],
      content: post._content || post.content || '',  // Use raw content if available
      raw: post._content || ''  // Include raw content for editing
    };
    
    console.log('Sending post data:', postData);
    res.json(postData);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Error fetching post: ' + error.message });
  }
});

// Handle blog post editing
app.get('/blog/api/posts/:path', async (req, res) => {
  try {
    console.log('Fetching post with path:', req.params.path);
    await ensureHexoInitialized();
    
    // Clean up the path parameter
    const cleanPath = req.params.path.replace(/\.html$/, '');
    console.log('Looking for post with clean path:', cleanPath);
    
    // Get all posts and find the matching one
    const posts = hexo.locals.get('posts');
    console.log('Total posts available:', posts.length);
    
    const post = posts.find(p => {
      console.log('Comparing post path:', p.path, 'with requested path:', cleanPath);
      return p.path.replace(/\.html$/, '') === cleanPath;
    });
    
    if (!post) {
      console.log('Post not found');
      return res.status(404).json({ error: 'Post not found' });
    }
    
    console.log('Found post:', post.title);
    
    // Return the full post data
    res.json({
      title: post.title,
      path: post.path,
      date: post.date,
      categories: post.categories ? post.categories.toArray().map(cat => cat.name) : [],
      tags: post.tags ? post.tags.toArray().map(tag => tag.name) : [],
      content: post.content,
      raw: post._content // Include the raw markdown content for editing
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Error fetching post: ' + error.message });
  }
});

// Delete a blog post
app.delete('/blog/api/posts/:path(*)', async (req, res) => {
  try {
    console.log('Deleting post with path:', req.params.path);
    await ensureHexoInitialized();
    
    // Extract the post name from the path
    const pathParts = req.params.path.split('/').filter(part => part.length > 0);
    const postName = pathParts[pathParts.length - 1]; // Get the last non-empty part
    console.log('Looking for post with name:', postName);
    
    // Find the post by matching the title or filename
    const posts = hexo.locals.get('posts').data;
    if (!Array.isArray(posts)) {
      console.error('No posts found in Hexo');
      return res.status(500).json({ error: 'Error accessing blog posts' });
    }
    
    console.log('Available posts:', posts.map(p => ({ 
      title: p.title,
      source: p.source,
      slug: p.slug,
      path: p.path
    })));
    
    const post = posts.find(p => {
      if (!p || !p.source) {
        console.log('Invalid post entry:', p);
        return false;
      }
      // Try matching by filename (without .md extension) or by title
      const filename = path.basename(p.source, '.md');
      console.log('Comparing:', { filename, postName, title: p.title });
      return filename.toLowerCase() === postName.toLowerCase() || 
             (p.slug && p.slug.toLowerCase() === postName.toLowerCase());
    });
    
    if (!post) {
      console.log('Post not found in Hexo posts');
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (!post.full_source) {
      console.error('Post file path not found:', post);
      return res.status(500).json({ error: 'Post file path not found' });
    }
    
    // Get the actual file path
    const postPath = post.full_source;
    console.log('Found post file at:', postPath);
    
    // Check if file exists before deleting
    try {
      await fs.promises.access(postPath, fs.constants.F_OK);
    } catch (error) {
      console.error('Post file not found on disk:', postPath);
      return res.status(404).json({ error: 'Post file not found' });
    }
    
    // Delete the post file
    try {
      console.log('Deleting post file:', postPath);
      await fs.promises.unlink(postPath);
    } catch (error) {
      console.error('Error deleting file:', error);
      return res.status(500).json({ error: 'Failed to delete post file' });
    }
    
    // Regenerate the blog
    console.log('Regenerating blog...');
    try {
      await new Promise((resolve, reject) => {
        const child = exec('cd blog && npx hexo generate', (error, stdout, stderr) => {
          if (error) {
            console.error('Error regenerating blog:', error);
            console.error('stderr:', stderr);
            reject(error);
          } else {
            console.log('Blog regenerated:', stdout);
            resolve();
          }
        });
        
        // Add timeout to prevent hanging
        setTimeout(() => {
          child.kill();
          reject(new Error('Blog regeneration timed out'));
        }, 30000); // 30 second timeout
      });
    } catch (error) {
      console.error('Failed to regenerate blog:', error);
      return res.status(500).json({ error: 'Failed to regenerate blog' });
    }
    
    // Reinitialize Hexo to pick up the changes
    try {
      hexoInitialized = false;
      await ensureHexoInitialized();
    } catch (error) {
      console.error('Failed to reinitialize Hexo:', error);
      return res.status(500).json({ error: 'Failed to reinitialize blog' });
    }
    
    console.log('Post deleted successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Error deleting post: ' + error.message });
  }
});

// Handle blog post URLs
app.get('/*/post/*', async (req, res) => {
  try {
    const postPath = req.path.replace('/post/', '');
    console.log('Requesting blog post:', postPath);
    
    await ensureHexoInitialized();
    const post = hexo.locals.get('posts').findOne({ path: postPath });
    
    if (!post) {
      console.log('Post not found:', postPath);
      return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
    
    res.sendFile(path.join(__dirname, 'blog', 'public', postPath, 'index.html'));
  } catch (error) {
    console.error('Error serving blog post:', error);
    res.status(500).send('Error serving blog post');
  }
});

// Add favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

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
    const files = await fs.promises.readdir(imagesDir);

    // Filter images based on search query
    const results = files
      .filter((file) => {
        const name = file.replace(/\.[^/.]+$/, '').toLowerCase();
        return /\.(jpg|jpeg|png|gif|svg)$/i.test(file) && name.includes(query);
      })
      .map(async (file) => {
        const stats = await fs.promises.stat(path.join(imagesDir, file));
        return {
          name: file,
          url: `/images/${file}`,
          modified: stats.mtime.toISOString(),
          size: stats.size,
        };
      });

    const result = await Promise.all(results);
    res.json({ results: result });
    return { success: true };
  } catch (error) {
    console.error('Error searching images:', error);
    res.status(500).json({ error: 'Failed to search images' });
    return { success: false, error };
  }
});

/**
 * API endpoint to launch macOS Finder with a search query
 * @route GET /api/finder-search
 * @param {string} term - The search term to look for in Finder
 * @returns {Object} JSON response indicating success or failure
 */
app.get('/api/finder-search', async (req, res) => {
  try {
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
          details: err.message,
        });
      }

      res.json({
        success: true,
        message: 'Finder search launched',
      });
    });
  } catch (error) {
    console.error('Error launching Finder search:', error);
    res.status(500).json({ error: 'Failed to launch Finder search' });
  }
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
    return { success: true };
  } catch (error) {
    console.error('[Proxy] Video error:', error);
    res.status(500).json({ error: error.message });
    return { success: false, error };
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
      '.svg': 'image/svg+xml',
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
    return { success: true };
  } catch (error) {
    console.error('[Proxy] Image preview error:', error);
    res.status(500).json({ error: error.message });
    return { success: false, error };
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
      '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Create Sharp transform stream
    let transform = sharp();

    // If width is specified, resize the image
    if (width) {
      transform = transform.resize(width, null, {
        withoutEnlargement: true,
        fit: 'inside',
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
    return { success: true };
  } catch (error) {
    console.error('[Proxy] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Proxy error',
        message: error.message,
        code: error.code,
      });
    }
    console.log('[Proxy] ========== Image Request End (Error) ==========\n');
    return { success: false, error };
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
    return { success: true };
  } catch (error) {
    console.error('[Proxy] Video stream error:', error);
    res.status(500).json({ error: error.message });
    return { success: false, error };
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
          Accept: 'application/json',
        },
      });

      clearTimeout(timeout);

      if (!contentResponse.ok) {
        throw new Error(`Content service error: ${contentResponse.statusText}`);
      }

      const data = await contentResponse.json();
      console.log('[Proxy] Received response with', data.items?.length || 0, 'items');

      // Send response
      res.json(data);
      return { success: true };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('[Proxy] Request timed out');
        res.status(504).json({ error: 'Request timed out after 30 seconds' });
        return { success: false, error };
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('[Proxy] Content error:', error);
    res.status(500).json({ error: error.message });
    return { success: false, error };
  }
});

// Blog API endpoints
app.get('/blog/api/posts', async (req, res) => {
  try {
    console.log('Loading blog posts...');
    await ensureHexoInitialized();

    // Get all posts
    const posts = hexo.locals.get('posts').sort('-date');
    console.log(`Found ${posts.length} posts`);

    // Convert posts to array and format them
    const formattedPosts = posts.map(post => ({
      title: post.title,
      path: post.path,
      date: post.date,
      categories: post.categories ? post.categories.toArray().map(cat => cat.name) : [],
      tags: post.tags ? post.tags.toArray().map(tag => tag.name) : [],
      excerpt: post.excerpt || '',
      content: post.content
    }));

    console.log('Formatted posts:', formattedPosts);
    res.json({ posts: formattedPosts });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Error fetching blog posts: ' + error.message });
  }
});

app.get('/blog/api/posts/:path', async (req, res) => {
  try {
    console.log('Fetching post with path:', req.params.path);
    await ensureHexoInitialized();
    
    // Clean up the path parameter
    const cleanPath = req.params.path.replace(/\.html$/, '');
    console.log('Looking for post with clean path:', cleanPath);
    
    // Get all posts and find the matching one
    const posts = hexo.locals.get('posts');
    console.log('Total posts available:', posts.length);
    
    const post = posts.find(p => {
      console.log('Comparing post path:', p.path, 'with requested path:', cleanPath);
      return p.path.replace(/\.html$/, '') === cleanPath;
    });
    
    if (!post) {
      console.log('Post not found');
      return res.status(404).json({ error: 'Post not found' });
    }
    
    console.log('Found post:', post.title);
    
    // Return the full post data
    res.json({
      title: post.title,
      path: post.path,
      date: post.date,
      categories: post.categories ? post.categories.toArray().map(cat => cat.name) : [],
      tags: post.tags ? post.tags.toArray().map(tag => tag.name) : [],
      content: post.content,
      raw: post._content // Include the raw markdown content for editing
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Error fetching post: ' + error.message });
  }
});

app.post('/blog/api/posts', async (req, res) => {
  try {
    console.log('Creating new post with data:', req.body);
    await ensureHexoInitialized();
    
    const { title, content, categories = [], tags = [] } = req.body;
    const date = new Date();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Create the post file
    const postPath = path.join(__dirname, 'blog', 'source', '_posts', `${slug}.md`);
    const postContent = `---
title: ${title}
date: ${date.toISOString()}
categories: [${categories.join(', ')}]
tags: [${tags.join(', ')}]
---
${content}`;
    
    await fs.promises.writeFile(postPath, postContent);
    
    // Regenerate the blog
    console.log('Regenerating blog...');
    await new Promise((resolve, reject) => {
      exec('cd blog && npx hexo generate', (error, stdout, stderr) => {
        if (error) {
          console.error('Error regenerating blog:', error);
          console.error('stderr:', stderr);
          reject(error);
        } else {
          console.log('Blog regenerated:', stdout);
          resolve();
        }
      });
    });
    
    // Reinitialize Hexo to pick up the changes
    hexoInitialized = false;
    await ensureHexoInitialized();
    
    // Get the new post data
    const posts = hexo.locals.get('posts').data;
    const newPost = posts.find(p => p.source.endsWith(`${slug}.md`));
    
    if (!newPost) {
      throw new Error('Failed to get new post data');
    }
    
    // Return the new post data
    res.json({
      title: newPost.title,
      path: newPost.path,
      date: newPost.date.toISOString(),
      categories: newPost.categories.toArray().map(cat => cat.name),
      tags: newPost.tags.toArray().map(tag => tag.name),
      content: newPost._content || newPost.content,
      raw: newPost._content
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Error creating post: ' + error.message });
  }
});

app.put('/blog/api/posts/:path(*)', async (req, res) => {
  try {
    console.log('Updating post with path:', req.params.path);
    await ensureHexoInitialized();
    
    // Find the post
    const posts = hexo.locals.get('posts').data;
    const post = posts.find(p => p.path === req.params.path);
    
    if (!post) {
      console.log('Post not found');
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Update the post file
    const postPath = post.full_source;
    const updatedContent = `---
title: ${req.body.title}
date: ${post.date.toISOString()}
categories: [${req.body.categories.join(', ')}]
tags: [${req.body.tags.join(', ')}]
---
${req.body.content}`;
    
    await fs.promises.writeFile(postPath, updatedContent);
    
    // Regenerate the blog
    console.log('Regenerating blog...');
    await new Promise((resolve, reject) => {
      exec('cd blog && npx hexo generate', (error, stdout, stderr) => {
        if (error) {
          console.error('Error regenerating blog:', error);
          console.error('stderr:', stderr);
          reject(error);
        } else {
          console.log('Blog regenerated:', stdout);
          resolve();
        }
      });
    });
    
    // Reinitialize Hexo to pick up the changes
    hexoInitialized = false;
    await ensureHexoInitialized();
    
    // Get the updated post data
    const updatedPosts = hexo.locals.get('posts').data;
    const updatedPost = updatedPosts.find(p => p.path === req.params.path);
    
    if (!updatedPost) {
      throw new Error('Failed to get updated post data');
    }
    
    // Return the updated post data
    res.json({
      title: updatedPost.title,
      path: updatedPost.path,
      date: updatedPost.date.toISOString(),
      categories: updatedPost.categories.toArray().map(cat => cat.name),
      tags: updatedPost.tags.toArray().map(tag => tag.name),
      content: updatedPost._content || updatedPost.content,
      raw: updatedPost._content
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Error updating post: ' + error.message });
  }
});

app.post('/blog/api/posts', async (req, res) => {
  try {
    console.log('Creating new post with data:', req.body);
    await ensureHexoInitialized();
    
    const { title, content, categories = [], tags = [] } = req.body;
    const date = new Date();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Create the post file
    const postPath = path.join(__dirname, 'blog', 'source', '_posts', `${slug}.md`);
    const postContent = `---
title: ${title}
date: ${date.toISOString()}
categories: [${categories.join(', ')}]
tags: [${tags.join(', ')}]
---
${content}`;
    
    await fs.promises.writeFile(postPath, postContent);
    
    // Regenerate the blog
    console.log('Regenerating blog...');
    await new Promise((resolve, reject) => {
      exec('cd blog && npx hexo generate', (error, stdout, stderr) => {
        if (error) {
          console.error('Error regenerating blog:', error);
          console.error('stderr:', stderr);
          reject(error);
        } else {
          console.log('Blog regenerated:', stdout);
          resolve();
        }
      });
    });
    
    // Reinitialize Hexo to pick up the changes
    hexoInitialized = false;
    await ensureHexoInitialized();
    
    // Get the new post data
    const posts = hexo.locals.get('posts').data;
    const newPost = posts.find(p => p.source.endsWith(`${slug}.md`));
    
    if (!newPost) {
      throw new Error('Failed to get new post data');
    }
    
    // Return the new post data
    res.json({
      title: newPost.title,
      path: newPost.path,
      date: newPost.date.toISOString(),
      categories: newPost.categories.toArray().map(cat => cat.name),
      tags: newPost.tags.toArray().map(tag => tag.name),
      content: newPost._content || newPost.content,
      raw: newPost._content
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Error creating post: ' + error.message });
  }
});

app.delete('/blog/api/posts/:path', async (req, res) => {
  try {
    const post = hexo.locals.get('posts').findOne({ path: req.params.path });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await fs.unlink(post.full_source);

    // Regenerate blog
    await new Promise((resolve, reject) => {
      exec('cd blog && npx hexo generate', (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Error deleting post' });
  }
});

app.get('/blog/api/config', async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'blog', '_config.yml');
    const config = yaml.load(await fs.readFile(configPath, 'utf8'));
    res.json({
      title: config.title,
      description: config.description,
      postsPerPage: config.per_page
    });
  } catch (error) {
    console.error('Error loading configuration:', error);
    res.status(500).json({ error: 'Error loading configuration' });
  }
});

app.post('/blog/api/config', async (req, res) => {
  try {
    const { title, description, postsPerPage } = req.body;
    const configPath = path.join(__dirname, 'blog', '_config.yml');
    const config = yaml.load(await fs.readFile(configPath, 'utf8'));

    config.title = title;
    config.description = description;
    config.per_page = postsPerPage;

    await fs.writeFile(configPath, yaml.dump(config));

    // Regenerate blog
    await new Promise((resolve, reject) => {
      exec('cd blog && npx hexo generate', (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({ error: 'Error saving configuration' });
  }
});

// Serve Hexo blog files
app.use('/blog', express.static(path.join(__dirname, 'blog/public')));

// Load pre-generated tags file
const tagMapPath = path.join(__dirname, 'data', 'image-tags.json');
let imageTagMap = {};

try {
  const tagData = fs.readFileSync(tagMapPath, 'utf8');
  imageTagMap = JSON.parse(tagData);
  console.log('Loaded image tags from:', tagMapPath);
  console.log('Number of images with tags:', Object.keys(imageTagMap).length);
} catch (error) {
  console.error('Error loading image tags:', error);
}

// Function to get tags from our pre-generated map
function getFileTags(filePath) {
  console.log('JEFF TEST - getFileTags called with:', filePath);
  const filename = path.basename(filePath);
  console.log('JEFF TEST - looking for tags for:', filename);

  const tags = imageTagMap[filename];
  console.log('JEFF TEST - found tags:', tags);

  if (tags && tags.includes('red')) {
    console.log('JEFF TEST - RED TAG FOUND for:', filename);
  }

  return tags || [];
}

// Cache for image listing
let imageCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Gallery API Endpoints
app.get('/gallery/images', async (req, res) => {
  console.log('\n=== Gallery Images Request ===');
  try {
    // Check cache first
    const now = Date.now();
    if (!imageCache || now - lastCacheUpdate > CACHE_TTL) {
      const imagesDir = '/Volumes/VideosNew/Models';
      console.log('Cache miss - Reading images from:', imagesDir);

      if (!fs.existsSync(imagesDir)) {
        console.error('Models directory not found:', imagesDir);
        return res.status(500).json({ error: 'Models directory not found' });
      }

      // Read directory
      const files = await fs.promises.readdir(imagesDir);
      console.log(`Found ${files.length} total files`);

      // Filter image files and get their tags
      imageCache = await Promise.all(
        files
          .filter((file) => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
          })
          .map(async (file) => {
            const filePath = path.join(imagesDir, file);
            // Get file info
            const fileInfo = await getFileInfo(filePath);
            const fileStat = fileInfo.stat;
            const tags = await getFileTags(filePath);
            return {
              name: file,
              url: `/api/gallery/image/${encodeURIComponent(file)}`,
              path: filePath,
              tags,
            };
          }),
      );

      lastCacheUpdate = now;
      console.log(`Cached ${imageCache.length} images`);
    }

    console.log('Sending all images');
    res.json({ images: imageCache });
    return { success: true };
  } catch (error) {
    console.error('Error reading images:', error);
    res.status(500).json({ error: 'Failed to read images' });
    return { success: false, error };
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
      '.webp': 'image/webp',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Stream the image
    const stream = fs.createReadStream(imagePath);
    stream.pipe(res);
    return { success: true };
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
    return { success: false, error };
  }
});

// Create proxy server
const proxy = httpProxy.createProxyServer({
  target: 'http://192.168.86.242:8081',
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
      code: err.code,
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
    headers: proxyRes.headers,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

// Helper function to get file info
async function getFileInfo(filePath) {
  const stats = await fs.promises.stat(filePath);
  return { path: filePath, stat: stats };
}
