#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const IMAGE_DIRECTORY = '/Volumes/VideosNew/Models';
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'image-tags.json');

// Ensure data directory exists
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

async function getFinderTags(filePath) {
  try {
    // Skip .DS_Store and other hidden files
    if (path.basename(filePath).startsWith('.')) {
      return [];
    }

    const cmd = `xattr -px com.apple.metadata:_kMDItemUserTags "${filePath}" 2>/dev/null | xxd -r -p | plutil -convert json -o - - 2>/dev/null || echo "[]"`;
    const { stdout } = await execPromise(cmd);

    // If no tags found, return empty array without logging error
    if (!stdout.trim() || stdout === '[]') {
      return [];
    }

    try {
      const tags = JSON.parse(stdout);
      return Array.isArray(tags) ? tags.map((tag) => tag.replace(/\n\d+$/, '').toLowerCase().trim()) : [];
    } catch (parseError) {
      // Only log actual parsing errors, not missing tags
      console.error(`Error parsing tags for ${path.basename(filePath)}: Invalid tag format`);
      return [];
    }
  } catch (e) {
    // Only log actual errors, not missing tags
    if (!e.message.includes('No such xattr')) {
      console.error(`Error reading tags for ${path.basename(filePath)}: ${e.message}`);
    }
    return [];
  }
}

async function processImages() {
  console.log('Starting tag extraction...');
  console.log(`Reading from directory: ${IMAGE_DIRECTORY}`);

  const tagCounts = {
    red: 0,
    orange: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    purple: 0,
    gray: 0,
  };

  const tagMap = {};
  const files = fs.readdirSync(IMAGE_DIRECTORY);
  let processed = 0;
  let withTags = 0;
  const totalFiles = files.length;
  const startTime = Date.now();

  console.log(`Found ${totalFiles} files to process`);

  for (const file of files) {
    const filePath = path.join(IMAGE_DIRECTORY, file);
    if (fs.statSync(filePath).isFile()) {
      const tags = await getFinderTags(filePath);
      if (tags.length > 0) {
        tagMap[file] = tags;
        withTags++;
        tags.forEach((tag) => {
          if (tagCounts.hasOwnProperty(tag)) {
            tagCounts[tag]++;
          }
        });
      }

      processed++;
      if (processed % 100 === 0) {
        const percent = ((processed / totalFiles) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Progress: ${processed}/${totalFiles} (${percent}%) - ${withTags} files with tags - ${elapsed}s elapsed`);
      }
    }
  }

  // Write tag map to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tagMap, null, 2));

  // Print summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\nTag Extraction Complete!');
  console.log('=======================');
  console.log('Tag Distribution:');
  Object.entries(tagCounts)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a)
    .forEach(([color, count]) => {
      const percent = ((count / withTags) * 100).toFixed(1);
      console.log(`${color}: ${count} images (${percent}%)`);
    });
  console.log('\nSummary:');
  console.log(`Total files processed: ${processed}`);
  console.log(`Files with tags: ${withTags}`);
  console.log(`Processing time: ${totalTime} seconds`);
  console.log(`Tag map written to: ${OUTPUT_FILE}`);
}

// Run the extraction
processImages().catch(console.error);
