#!/usr/bin/env node

/**
 * Prebuild script: prepares a clean "prebuild" staging area for Vite.
 *
 * Steps:
 * - Deletes and recreates the "prebuild" directory.
 * - Copies the project entry HTML and src tree into prebuild/.
 * - (Future) Apply custom transforms (SVG → atlas keys, tag stripping, etc.).
 *
 * Vite is then pointed at prebuild/ as its root so all further processing
 * (plugins, obfuscation, etc.) operates on the staged sources only.
 */

import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const prebuildRoot = path.join(projectRoot, 'prebuild');

function log(...args) {
  console.log('[prebuild]', ...args);
}

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rimraf(full);
    } else {
      fs.unlinkSync(full);
    }
  }
  fs.rmdirSync(dir);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  log(`Preparing prebuild directory at ${prebuildRoot}`);

  // Clean previous prebuild contents, but preserve rasterized-svgs to avoid
  // re-rasterizing unchanged SVGs on every build.
  if (fs.existsSync(prebuildRoot)) {
    const entries = fs.readdirSync(prebuildRoot, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(prebuildRoot, entry.name);
      if (entry.name === 'rasterized-svgs') {
        // Keep rasterized PNGs and manifest between builds
        continue;
      }
      if (entry.isDirectory()) {
        rimraf(full);
      } else {
        fs.unlinkSync(full);
      }
    }
  } else {
    fs.mkdirSync(prebuildRoot, { recursive: true });
  }

  // Copy entry HTML
  const indexSrc = path.join(projectRoot, 'index.html');
  const indexDest = path.join(prebuildRoot, 'index.html');
  if (fs.existsSync(indexSrc)) {
    fs.copyFileSync(indexSrc, indexDest);
    log('Copied index.html');
  } else {
    log('Warning: index.html not found at project root');
  }

  // Copy root-level CSS (e.g. style.css) that index.html depends on
  const styleSrc = path.join(projectRoot, 'style.css');
  const styleDest = path.join(prebuildRoot, 'style.css');
  if (fs.existsSync(styleSrc)) {
    fs.copyFileSync(styleSrc, styleDest);
    log('Copied style.css');
  }

  // Copy src tree
  const srcDir = path.join(projectRoot, 'src');
  const prebuildSrcDir = path.join(prebuildRoot, 'src');
  if (fs.existsSync(srcDir)) {
    copyDir(srcDir, prebuildSrcDir);
    log('Copied src/ tree into prebuild/');
  } else {
    log('Warning: src/ directory not found; nothing to stage');
  }

  log('Prebuild staging complete.');
}

main().catch((err) => {
  console.error('[prebuild] Fatal error:', err);
  process.exit(1);
});

