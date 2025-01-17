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
    const cmd = `xattr -px com.apple.metadata:_kMDItemUserTags "${filePath}" 2>/dev/null | xxd -r -p | plutil -convert json -o - - 2>/dev/null || echo "{}"`;
    const { stdout } = await execPromise(cmd);

    if (!stdout.trim() || stdout.trim() === '{}') {
      return [];
    }

    const tags = JSON.parse(stdout);
    return Array.isArray(tags) ? tags.map((tag) => tag.replace(/\n\d+$/, '').toLowerCase().trim()) : [];
  } catch (e) {
    console.error(`Error processing tags for ${filePath}:`, e.message);
    return [];
  }
}

async function processImages() {
  console.log('Starting tag extraction...');
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

  for (const file of files) {
    const filePath = path.join(IMAGE_DIRECTORY, file);
    if (fs.statSync(filePath).isFile()) {
      const tags = await getFinderTags(filePath);
      if (tags.length > 0) {
        tagMap[file] = tags;
        tags.forEach((tag) => {
          if (tagCounts.hasOwnProperty(tag)) {
            tagCounts[tag]++;
          }
        });
      }

      processed++;
      if (processed % 100 === 0) {
        console.log(`Processed ${processed} files...`);
      }
    }
  }

  // Write tag map to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tagMap, null, 2));

  // Print summary
  console.log('\nTag Extraction Complete!');
  console.log('=======================');
  console.log('Tag Distribution:');
  Object.entries(tagCounts).forEach(([color, count]) => {
    console.log(`${color}: ${count} images`);
  });
  console.log('\nTotal files processed:', processed);
  console.log('Files with tags:', Object.keys(tagMap).length);
  console.log('Tag map written to:', OUTPUT_FILE);
}

// Run the extraction
processImages().catch(console.error);
