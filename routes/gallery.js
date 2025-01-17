/**
 * Gallery Router Module
 * Handles all gallery-related routes including serving the gallery page
 * and providing API endpoints for image management.
 */

// Import required dependencies for file system and routing
import express from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { exec } from 'child_process';

console.log('=====================================');
console.log('Gallery router loading at:', new Date().toISOString());
console.log('=====================================');

const __filename = import.meta.url;
const __dirname = path.dirname(__filename);

const router = express.Router();
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const AVIF_QUALITY = 50;
const THUMBNAIL_SIZE = 200;
const CACHE_DURATION = 86400; // 24 hours
const WARMUP_BATCH_SIZE = 20;

// Initialize content cache with LRU cache for thumbnails
const contentCache = {
  thumbnails: new Map(),
  previews: new Map(),
  metadata: new Map(),
  updating: false,
};

const ETAG_CACHE = new Map();

// Function to generate ETag for a file
async function generateETag(filePath, stat) {
  if (ETAG_CACHE.has(filePath)) {
    return ETAG_CACHE.get(filePath);
  }

  const fileHash = crypto.createHash('md5');
  fileHash.update(`${filePath}_${stat.size}_${stat.mtime.toISOString()}`);
  const etag = `"${fileHash.digest('hex')}"`;
  ETAG_CACHE.set(filePath, etag);
  return etag;
}

// Setup gallery debug logging
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Create a separate stream for gallery logging
const galleryLog = fs.createWriteStream(path.join(logDir, 'gallery-debug.log'), { flags: 'a' });
const metricsLog = fs.createWriteStream(path.join(logDir, 'gallery-metrics.log'), { flags: 'a' });
const tagLog = fs.createWriteStream(path.join(logDir, 'tag-debug.log'), { flags: 'a' });

// Enhanced logging function with performance metrics
function logGallery(component, event, duration = null, details = null) {
  const timestamp = new Date().toISOString();
  const memory = process.memoryUsage();
  const memoryMB = Math.round(memory.heapUsed / 1024 / 1024);
  const logMessage = `[${timestamp}] [Server] [${component}] [${event}] ${duration ? `[${duration}ms]` : ''} [${memoryMB}MB] ${details ? JSON.stringify(details) : ''}`;
  galleryLog.write(`${logMessage}\n`);

  // Log metrics separately for analysis
  if (duration) {
    const metrics = {
      timestamp,
      component,
      event,
      duration,
      memoryMB,
      details,
    };
    metricsLog.write(`${JSON.stringify(metrics)}\n`);
  }
}

function logTagOperation(operation, filename, tags, error = null) {
  const timestamp = new Date().toISOString();
  const logMessage = {
    timestamp,
    operation,
    filename,
    tags,
    error: error ? error.toString() : null,
  };
  tagLog.write(`${JSON.stringify(logMessage)}\n`);
}

// Performance monitoring middleware
const _performanceMiddleware = (req, res, next) => {
  const start = process.hrtime();
  const originalEnd = res.end;
  const originalWrite = res.write;
  let responseBody = '';

  // Track response size
  res.write = function (chunk) {
    responseBody += chunk;
    originalWrite.apply(res, arguments);
  };

  res.end = function (chunk) {
    if (chunk) {
      responseBody += chunk;
    }

    const diff = process.hrtime(start);
    const time = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    logGallery('Performance', 'Request Complete', parseFloat(time), {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseSize: responseBody.length,
      contentType: res.getHeader('content-type'),
    });

    originalEnd.apply(res, arguments);
  };

  next();
};

// Debug middleware for gallery router
router.use((req, res, next) => {
  logGallery('Gallery Router', 'Request received', null, {
    originalUrl: req.originalUrl, baseUrl: req.baseUrl, path: req.path, method: req.method,
  });
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
        path: '/Volumes/VideosNew/Models',
      });
    }

    // Try to read directory contents
    const files = fs.readdirSync('/Volumes/VideosNew/Models', { withFileTypes: true });

    return res.json({
      success: true,
      fileCount: files.length,
      firstFewFiles: files.slice(0, 5).map((f) => ({
        name: f.name,
        isDirectory: f.isDirectory(),
      })),
    });
  } catch (error) {
    logGallery('Test Directory', 'Error', null, { error: error.message, code: error.code, path: '/Volumes/VideosNew/Models' });
    return res.status(500).json({
      error: error.message,
      code: error.code,
      path: '/Volumes/VideosNew/Models',
    });
  }
});

// Test route to check first few images
router.get('/test-images', async (req, res) => {
  try {
    const fileNames = fs.readdirSync('/Volumes/VideosNew/Models').filter(isImageFile).slice(0, 5);
    const filesWithTags = await Promise.all(
      fileNames.map(async (filename) => {
        const filePath = path.join('/Volumes/VideosNew/Models', filename);
        const stats = fs.statSync(filePath);
        const tags = await getFinderTags(filePath);
        const imagePath = `http://192.168.86.242:8082/api/video/image/${encodeURIComponent(filename)}`;
        return {
          name: filename,
          path: imagePath,
          size: stats.size,
          date: stats.mtime,
          tags,
        };
      }),
    );
    res.json({ images: filesWithTags });
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to test getFinderTags directly
router.get('/test-tags/:filename', async (req, res) => {
  const { filename } = req.params;
  const testPath = path.join('/Volumes/VideosNew/Models', filename);
  console.log('Testing getFinderTags for:', testPath);
  const tags = await getFinderTags(testPath);
  res.json({ path: testPath, tags });
});

// Test single file tags
router.get('/test-single', async (req, res) => {
  const testFile = '/Volumes/VideosNew/Models/aaliyah-hadid.jpeg';
  const tags = await getFinderTags(testFile);
  res.json({ file: testFile, tags });
});

// Test getFinderTags directly
router.get('/testtags', async (req, res) => {
  const tags = await getFinderTags('/Volumes/VideosNew/Models/aaliyah-hadid.jpeg');
  res.json(tags);
});

// Test getFinderTags with path argument
router.get('/testtags/:filepath(*)', async (req, res) => {
  const filepath = `/${req.params.filepath}`;
  console.log('Testing path:', filepath);
  const tags = await getFinderTags(filepath);
  res.json(tags);
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
  if (contentCache.updating) return;
  contentCache.updating = true;

  try {
    const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    const processedFiles = new Set();

    for (const file of files) {
      if (processedFiles.has(file.name)) continue;
      processedFiles.add(file.name);

      if (file.isFile() && isImageFile(file.name)) {
        try {
          const filePath = path.join(directoryPath, file.name);
          const stats = await fs.promises.stat(filePath);

          contentCache.metadata.set(file.name, {
            name: file.name,
            url: `/api/gallery/proxy-image/${encodeURIComponent(file.name)}`,
            size: stats.size,
            mtime: stats.mtime,
            type: path.extname(file.name).slice(1),
          });
        } catch (error) {
          logGallery('Cache Update', 'Error', null, {
            file: file.name,
            error: error.message,
          });
        }
      }
    }

    contentCache.updating = false;
  } catch (error) {
    logGallery('Cache Update', 'Error', null, { error: error.message });
  }
}

// Cache warmup function
async function warmupCache(files) {
  logGallery('Cache Warmup', 'Started', null, {
    totalFiles: files.length,
    batchSize: WARMUP_BATCH_SIZE,
  });

  const startTime = process.hrtime();
  let processed = 0;
  const errors = [];

  // Process in batches
  for (let i = 0; i < files.length; i += WARMUP_BATCH_SIZE) {
    const batch = files.slice(i, i + WARMUP_BATCH_SIZE);
    await Promise.all(batch.map(async (file) => {
      try {
        const imagePath = path.join(process.cwd(), 'cache', file.name);
        const imageBuffer = await fs.promises.readFile(imagePath);

        // Generate thumbnail
        const thumbnail = await sharp(imageBuffer)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
            fit: 'cover',
            position: 'attention',
          })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();

        // Store in cache
        storeThumbnail(file.name, 'thumb', thumbnail);
        processed++;

        // Log progress every 100 images
        if (processed % 100 === 0) {
          const diff = process.hrtime(startTime);
          const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
          const memoryUsage = process.memoryUsage();
          logGallery('Cache Warmup', 'Progress', parseFloat(duration), {
            processed,
            total: files.length,
            percentComplete: ((processed / files.length) * 100).toFixed(1),
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            cacheSize: contentCache.thumbnails.size,
          });
        }
      } catch (error) {
        errors.push({ file: file.name, error: error.message });
        logGallery('Cache Warmup', 'Error', null, {
          file: file.name,
          error: error.message,
        });
      }
    }));
  }

  const diff = process.hrtime(startTime);
  const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

  logGallery('Cache Warmup', 'Complete', parseFloat(duration), {
    processed,
    errors: errors.length,
    cacheSize: contentCache.thumbnails.size,
    totalMemoryMB: (Array.from(contentCache.thumbnails.values())
      .reduce((sum, entry) => sum + entry.size, 0) / (1024 * 1024)).toFixed(2),
  });

  if (errors.length > 0) {
    logGallery('Cache Warmup', 'Errors', null, { errors });
  }
}

// Load pre-generated tags file
const tagMapPath = path.join(__dirname, '..', 'data', 'image-tags.json');
let imageTagMap = {};

try {
  if (fs.existsSync(tagMapPath)) {
    const tagData = fs.readFileSync(tagMapPath, 'utf8');
    imageTagMap = JSON.parse(tagData);

    // Count red tags immediately after loading
    const redTagCount = Object.values(imageTagMap).filter((tags) => Array.isArray(tags) && tags.includes('red')).length;

    console.log('>>>>> TOTAL RED TAGS IN JSON FILE:', redTagCount);
    console.log(
      '>>>>> First few red-tagged images:',
      Object.entries(imageTagMap)
        .filter(([_, tags]) => Array.isArray(tags) && tags.includes('red'))
        .slice(0, 5)
        .map(([filename]) => filename),
    );

    logTagOperation('load_tag_map', 'image-tags.json', {
      totalEntries: Object.keys(imageTagMap).length,
      redTagCount,
    });
  } else {
    logTagOperation('tag_map_missing', tagMapPath, null, new Error('Tag map file not found'));
  }
} catch (error) {
  logTagOperation('tag_map_error', tagMapPath, null, error);
  console.error('Error loading tag map:', error);
}

// Helper function to get macOS Finder color tags from pre-generated map
function getFinderTags(filePath) {
  console.log('JEFF TEST - getFinderTags called with:', filePath);
  const filename = path.basename(filePath);
  console.log('JEFF TEST - looking for tags for:', filename);

  const tags = imageTagMap[filename];
  console.log('JEFF TEST - found tags:', tags);

  if (tags && tags.includes('red')) {
    console.log('JEFF TEST - RED TAG FOUND for:', filename);
  }

  return tags || [];
}

// Serve images with tags
router.get('/images', async (req, res) => {
  console.log('JEFF SERVER - /images endpoint hit at:', new Date().toISOString());
  console.log('JEFF SERVER - Request headers:', req.headers);
  const startTime = performance.now();

  try {
    logGallery('Images', 'Request started', null);

    // Check if cache is valid
    if (contentCache.metadata.size > 0 && !contentCache.updating) {
      const cachedFiles = Array.from(contentCache.metadata.values());
      logGallery('Images', 'Serving from cache', null, {
        cacheSize: cachedFiles.length,
        sampleTags: cachedFiles.slice(0, 5).map((f) => ({ name: f.name, tags: f.tags })),
      });
      return res.json({ images: cachedFiles });
    }

    // Read directory
    const imageFiles = await fs.promises.readdir('/Volumes/VideosNew/Models');
    console.log('JEFF TEST - Found this many images:', imageFiles.length);

    // Process files
    const processedFiles = await Promise.all(
      imageFiles.map(async (filename) => {
        const filePath = path.join('/Volumes/VideosNew/Models', filename);
        console.log('JEFF TEST - Processing file:', filename);
        const stats = fs.statSync(filePath);
        const tags = getFinderTags(filePath);
        console.log('JEFF TEST - Got tags:', tags);

        // Log tag information for each file
        logTagOperation('process_file', filename, tags);

        return {
          name: filename,
          url: `/api/gallery/proxy-image/${encodeURIComponent(filename)}`,
          size: stats.size,
          date: stats.mtime,
          tags,
        };
      }),
    );

    // Update cache
    processedFiles.forEach((file) => {
      contentCache.metadata.set(file.name, file);
    });

    const endTime = performance.now();
    logGallery('Images', 'Request completed', endTime - startTime, {
      totalProcessed: processedFiles.length,
      sampleTags: processedFiles.slice(0, 5).map((f) => ({ name: f.name, tags: f.tags })),
    });

    return res.json({ images: processedFiles });
  } catch (error) {
    logGallery('Images', 'Error', null, { error: error.message });
    console.error('Error serving images:', error);
    return res.status(500).json({ error: 'Failed to serve images' });
  }
});

// Initial endpoint for gallery data
router.get('/initial', async (req, res) => {
  const startTime = performance.now();
  logGallery('Initial', 'Request received', null, { query: req.query });

  try {
    const page = parseInt(req.query.page, 10) || 1;
    const batchSize = parseInt(req.query.batchSize, 10) || 80;
    const start = (page - 1) * batchSize;

    // Get all image files
    const files = fs.readdirSync('/Volumes/VideosNew/Models')
      .filter((file) => isImageFile(file))
      .sort((a, b) => a.localeCompare(b));

    const totalFiles = files.length;
    const totalPages = Math.ceil(totalFiles / batchSize);
    const hasMore = page < totalPages;

    // Get subset of files for current page
    const pageFiles = files.slice(start, start + batchSize);

    return res.json({
      files: pageFiles,
      total: totalFiles,
      page,
      totalPages,
      hasMore,
    });
  } catch (error) {
    logGallery('Initial', 'Error', null, { error: error.message });
    return res.status(500).json({ error: 'Failed to get initial images' });
  }
});

// Serve individual images
router.get('/image/:imageName', async (req, res) => {
  const imageName = decodeURIComponent(req.params.imageName);
  logGallery('Image Serve', 'Request received', null, { imageName });

  try {
    const filePath = path.join('/Volumes/VideosNew/Models', imageName);

    if (!fs.existsSync(filePath)) {
      logGallery('Image Serve', 'Error', null, { error: 'File not found', filePath });
      return res.status(404).json({ error: 'File not found' });
    }

    // Set content type based on file extension
    const ext = path.extname(imageName).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    }[ext] || 'image/jpeg';

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (error) {
    logGallery('Image Serve', 'Error', null, { error: error.message });
    return res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Proxy endpoint for images
router.get('/proxy-image/:imageName', async (req, res) => {
  const imageName = decodeURIComponent(req.params.imageName);
  logGallery('Proxy Image', 'Request received', null, { imageName });

  try {
    const filePath = path.join('/Volumes/VideosNew/Models', imageName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logGallery('Proxy Image', 'Error', null, { error: 'File not found', filePath });
      return res.status(404).json({ error: 'Image not found' });
    }

    // Get file stats for cache headers
    const stat = fs.statSync(filePath);
    const etag = await generateETag(filePath, stat);

    // Check if client has a cached version
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    // Set appropriate content type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }[ext] || 'application/octet-stream';

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', `public, max-age=${CACHE_DURATION}`);
    res.setHeader('ETag', etag);

    // Stream the file
    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    logGallery('Proxy Image', 'Error', null, { error: error.message });
    return res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Proxy endpoint for images
router.get('/proxy-image/:imageName', async (req, res) => {
  const imageName = decodeURIComponent(req.params.imageName);
  const videoServerUrl = `http://192.168.86.242:8082/api/images/${encodeURIComponent(imageName)}`;

  console.log('=== Image Proxy Request ===');
  console.log('Image name:', imageName);
  console.log('Video server URL:', videoServerUrl);

  try {
    console.log('Fetching from video server...');
    const response = await fetch(videoServerUrl);

    if (!response.ok) {
      console.error('Video server returned error:', response.status, response.statusText);
      throw new Error(`Failed to fetch image from video server: ${response.status}`);
    }

    console.log('Video server response:', {
      status: response.status,
      type: response.headers.get('content-type'),
      length: response.headers.get('content-length'),
    });

    // Forward the content type
    res.set('Content-Type', response.headers.get('content-type'));
    res.set('Content-Length', response.headers.get('content-length'));

    // Pipe the response to our response
    return response.body.pipe(res);
  } catch (error) {
    console.error('Error proxying image:', error);
    return res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// Thumbnail cache functions
async function checkThumbnailCache(imagePath) {
  const hash = crypto.createHash('md5').update(imagePath).digest('hex');
  const thumbnailPath = path.join('/Volumes/VideosNew/Models', '.thumbnails', `${hash}.webp`);

  try {
    await fs.promises.access(thumbnailPath);
    return thumbnailPath;
  } catch {
    return null;
  }
}

async function storeThumbnail(imagePath, thumbnailBuffer) {
  const hash = crypto.createHash('md5').update(imagePath).digest('hex');
  const thumbnailPath = path.join('/Volumes/VideosNew/Models', '.thumbnails', `${hash}.webp`);

  try {
    await fs.promises.mkdir(path.dirname(thumbnailPath), { recursive: true });
    await fs.promises.writeFile(thumbnailPath, thumbnailBuffer);
    return thumbnailPath;
  } catch (error) {
    console.error('Error storing thumbnail:', error);
    return null;
  }
}

// Helper function to check if a file is an image
function isImageFile(filename) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
}

// Image optimization middleware
async function optimizeImage(inputPath, outputPath, options) {
  try {
    const image = sharp(inputPath);
    await image
      .resize(options.width, options.height)
      .toFormat(options.format)
      .toFile(outputPath);
    return { success: true };
  } catch (error) {
    console.error('Error optimizing image:', error);
    return { success: false, error };
  }
}

// Batch image endpoint with improved error handling and metrics
router.post('/batch-images', async (req, res) => {
  const startTime = process.hrtime();
  const batchId = Date.now().toString();

  logGallery('Batch Images', 'Request received', null, {
    batchId,
    imageCount: req.body.imageNames?.length || 0,
    memory: process.memoryUsage().heapUsed,
  });

  if (!req.body.imageNames || !Array.isArray(req.body.imageNames)) {
    logGallery('Batch Images', 'Invalid request', null, { batchId, error: 'Invalid request body' });
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    const images = [];
    const errors = [];
    const startProcessing = process.hrtime();

    // Process images in sequence to avoid memory spikes
    for (const imageName of req.body.imageNames) {
      try {
        const imagePath = path.join('/Volumes/VideosNew/Models', imageName);
        const imageStartTime = process.hrtime();

        if (fs.existsSync(imagePath)) {
          const imageBuffer = await fs.promises.readFile(imagePath);

          // Process thumbnail
          const thumbnail = await sharp(imageBuffer)
            .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
              fit: 'cover',
              position: 'attention',
            })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();

          const imageDiff = process.hrtime(imageStartTime);
          const imageTime = (imageDiff[0] * 1e3 + imageDiff[1] * 1e-6).toFixed(2);

          images.push({
            name: imageName,
            data: `data:image/webp;base64,${thumbnail.toString('base64')}`,
          });

          logGallery('Image Processing', 'Success', parseFloat(imageTime), {
            batchId,
            imageName,
            originalSize: imageBuffer.length,
            thumbnailSize: thumbnail.length,
          });
        } else {
          errors.push({ name: imageName, error: 'File not found' });
          logGallery('Image Processing', 'File not found', null, { batchId, imageName });
        }
      } catch (error) {
        errors.push({ name: imageName, error: error.message });
        logGallery('Image Processing', 'Error', null, { batchId, imageName, error: error.message });
      }
    }

    const processingDiff = process.hrtime(startProcessing);
    const processingTime = (processingDiff[0] * 1e3 + processingDiff[1] * 1e-6).toFixed(2);

    const totalDiff = process.hrtime(startTime);
    const totalTime = (totalDiff[0] * 1e3 + totalDiff[1] * 1e-6).toFixed(2);

    logGallery('Batch Images', 'Processing complete', parseFloat(processingTime), {
      batchId,
      successCount: images.length,
      errorCount: errors.length,
      totalTime: parseFloat(totalTime),
      memory: process.memoryUsage().heapUsed,
    });

    return res.json({
      images,
      errors: errors.length > 0 ? errors : undefined,
      metrics: {
        processingTime: parseFloat(processingTime),
        totalTime: parseFloat(totalTime),
      },
    });
  } catch (error) {
    logGallery('Batch Images', 'Fatal error', null, { batchId, error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve individual media files
router.get('/images/:imageName', async (req, res) => {
  const imageName = decodeURIComponent(req.params.imageName);
  logGallery('Image Serve', 'Request received', null, { imageName, query: req.query });

  try {
    const filePath = path.join('/Volumes/VideosNew/Models', imageName);

    if (!fs.existsSync(filePath)) {
      logGallery('Image Serve', 'Error', null, { error: 'File not found', filePath });
      return res.status(404).json({
        error: 'File not found',
        details: `File not found at ${filePath}`,
        path: filePath,
      });
    }

    // Determine content type based on file extension
    const ext = path.extname(imageName).toLowerCase();
    let contentType = 'image/jpeg'; // default

    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.mov') contentType = 'video/quicktime';

    // Handle thumbnail requests for images
    if (req.query.thumbnail && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      const thumbnailDir = path.join('/Volumes/VideosNew/Models', '.thumbnails');
      const thumbnailPath = path.join(thumbnailDir, imageName);

      // Create thumbnail directory if it doesn't exist
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      // Check if thumbnail exists
      if (fs.existsSync(thumbnailPath)) {
        return res.sendFile(thumbnailPath);
      }

      // Generate thumbnail
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Resize maintaining aspect ratio
      const resized = await image
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();

      // Save thumbnail
      await fs.promises.writeFile(thumbnailPath, resized);

      // Send response
      res.setHeader('Content-Type', 'image/jpeg');
      return res.send(resized);
    }

    // Handle video thumbnail requests
    if (req.query.poster && ['.mp4', '.webm', '.mov'].includes(ext)) {
      // Generate or fetch video thumbnail
      const thumbnailPath = path.join(path.dirname(filePath), '.thumbnails', `${path.basename(filePath, ext)}.jpg`);

      try {
        if (!fs.existsSync(thumbnailPath)) {
          logGallery('Image Serve', 'Error', null, { error: 'Thumbnail not found', thumbnailPath });
          // If thumbnail doesn't exist, send a default video thumbnail or generate one
          const defaultThumbnailPath = path.join(__dirname, '../public/images/video-thumbnail.jpg');
          return res.sendFile(defaultThumbnailPath, {
            headers: { 'Content-Type': 'image/jpeg' },
          });
        }
        return res.sendFile(thumbnailPath, {
          headers: { 'Content-Type': 'image/jpeg' },
        });
      } catch (err) {
        logGallery('Image Serve', 'Error', null, { error: 'Failed to serve thumbnail', details: err.message });
        return res.status(500).json({
          error: 'Failed to serve thumbnail',
          details: err.message,
        });
      }
    }

    // Set appropriate headers for range requests (video streaming)
    if (['.mp4', '.webm', '.mov'].includes(ext)) {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const { range } = req.headers;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        });

        return file.pipe(res);
      }

      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });

      const stream = fs.createReadStream(filePath);
      return stream.pipe(res);
    }

    // For regular images, just send the file
    res.setHeader('Content-Type', contentType);
    return res.sendFile(filePath);
  } catch (error) {
    logGallery('Image Serve', 'Error', null, { error: error.message });
    return res.status(500).json({ error: 'Failed to serve image' });
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
    const { range } = req.headers;

    if (range) {
      // Handle range requests for video streaming
      const parts = range.replace(/bytes=/, '').split('-');
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
        'Cross-Origin-Resource-Policy': 'cross-origin',
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

      return file.pipe(res);
    }
    // Handle non-range requests
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
      'Cross-Origin-Resource-Policy': 'cross-origin',
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

    return stream.pipe(res);
  } catch (error) {
    logGallery('Video Serve', 'Error', null, { error: error.message });
    return res.status(500).json({ error: 'Error serving video file', details: error.message });
  }
});

// Video content endpoint - streams video content
router.get('/video-content/:filename', async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    logGallery('Video Content', 'Request received', null, { filename });

    // Forward request to content API
    const apiUrl = `http://192.168.86.242:8081/video-stream/${encodeURIComponent(filename)}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Content API returned ${response.status}`);
    }

    // Forward headers
    res.set('Content-Type', response.headers.get('Content-Type'));
    res.set('Content-Length', response.headers.get('Content-Length'));
    res.set('Accept-Ranges', 'bytes');

    // Stream the response
    return response.body.pipe(res);
  } catch (error) {
    logGallery('Video Content', 'Error', null, { error: error.message });
    return res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Client logging endpoint
router.post('/log', (req, res) => {
  const {
    timestamp, component, event, duration, memory, details,
  } = req.body;
  const logMessage = `[${timestamp}] [Client] [${component}] [${event}] ${duration ? `[${duration}ms]` : ''} [${memory}MB] ${details ? JSON.stringify(details) : ''}`;
  galleryLog.write(`${logMessage}\n`);
  return res.sendStatus(200);
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
                make new Finder window
                delay 0.5
            end tell
            
            tell application "System Events"
                tell process "Finder"
                    click menu item "Find" of menu "File" of menu bar 1
                    delay 0.5
                    keystroke "a" using command down
                    keystroke "${imageName}"
                    delay 0.2
                    click button "Search This Mac" of window 1
                end tell
            end tell
        `;

    const execPromise = promisify(require('child_process').exec);
    const { stdout, stderr } = await execPromise(`osascript -e '${script}'`);

    if (stderr) {
      logGallery('Search Route', 'Error', null, { error: stderr });
      return res.status(500).json({ error: 'Failed to execute search', details: stderr });
    }

    if (stdout) {
      logGallery('Search Route', 'Output', null, { stdout });
      if (stdout.startsWith('Error:')) {
        throw new Error(stdout);
      }
    }

    logGallery('Search Route', 'Request complete', null, { message: 'Search executed successfully' });
    return res.json({ success: true, message: 'Search executed successfully' });
  } catch (error) {
    logGallery('Search Route', 'Error', null, { error: error.message, details: error.message });
    return res.status(500).json({ error: 'Failed to execute search', details: error.message });
  }
});

// Add route to trigger Finder search
router.get('/finder-search/:filename', (req, res) => {
  const { filename } = req.params;
  const searchPrefix = filename.replace(/\.[^/.]+$/, ''); // Remove file extension

  const searchScript = `tell application "Finder"
    activate
    make new Finder window
    delay 0.5
end tell

tell application "System Events"
    keystroke "f" using command down
    delay 0.5
    keystroke "${searchPrefix}"
    delay 0.2
    key code 36
end tell`;

  exec(`osascript -e '${searchScript}'`, (error, stdout, stderr) => {
    if (error) {
      console.error('Error executing AppleScript:', error);
      res.status(500).json({ error: error.message }); // Send actual error for better debugging
      return;
    }
    res.json({ success: true });
  });
});

// Export the router
export default router;
