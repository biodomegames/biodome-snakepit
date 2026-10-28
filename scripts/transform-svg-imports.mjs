#!/usr/bin/env node

/**
 * Transform SVG imports in the prebuild tree into plain string constants.
 *
 * Intended pipeline:
 *   1) node scripts/prebuild.mjs
 *   2) node scripts/rasterize-svgs.mjs
 *   3) node scripts/transform-svg-imports.mjs   <-- this script
 *   4) Vite build (root = prebuild/)
 *
 * For each JS/TS file under prebuild/src:
 *   - Finds imports of the form:
 *       import foo from '../g/ui/foo.svg';
 *   - If that SVG appears in build/rasterized-svgs/manifest.json
 *     (i.e. it was rasterized into the atlas),
 *     AND the import line does NOT contain "// rasterize: ignore",
 *     then it rewrites the import to:
 *       const foo = 'foo.png';
 *
 * This way, Vite sees string keys for atlas-backed assets instead of real
 * SVG imports, so it won’t emit separate SVG files or wrap them in
 * new URL(..., import.meta.url).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const prebuildRoot = path.join(projectRoot, 'prebuild');
const srcDir = path.join(prebuildRoot, 'src');
// Read manifest from prebuild-local rasterized-svgs folder
const manifestPath = path.join(prebuildRoot, 'rasterized-svgs', 'manifest.json');

function log(...args) {
  console.log('[transform-svg-imports]', ...args);
}

function walkFiles(dir, exts, out) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, exts, out);
    } else if (entry.isFile()) {
      if (exts.some((ext) => entry.name.endsWith(ext))) {
        out.push(full);
      }
    }
  }
}

function loadManifest() {
  if (!fs.existsSync(manifestPath)) {
    log(`Manifest not found at ${manifestPath}; nothing to transform.`);
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    log(`Error parsing manifest at ${manifestPath}:`, e.message);
    return {};
  }
}

async function main() {
  if (!fs.existsSync(srcDir)) {
    log(`Prebuild src directory not found at ${srcDir}.`);
    log('Make sure scripts/prebuild.mjs and scripts/rasterize-svgs.mjs have been run first.');
    process.exit(1);
  }

  const manifest = loadManifest();
  const svgRelToStem = new Map();

  for (const rel of Object.keys(manifest)) {
    const stem = path.basename(rel, '.svg');
    svgRelToStem.set(rel, stem);
  }

  if (svgRelToStem.size === 0) {
    log('Manifest has no SVG entries; nothing to transform.');
    return;
  }

  const files = [];
  walkFiles(srcDir, ['.js', '.ts'], files);

  if (files.length === 0) {
    log('No JS/TS files found under prebuild/src; nothing to transform.');
    return;
  }

  log(`Processing ${files.length} JS/TS files for SVG import transformations...`);

  const importRe = /import\s+([A-Za-z0-9_$]+)\s+from\s+['"]([^'"]+\.svg)['"];?/g;

  let filesChanged = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    let changed = false;

    // First, detect which imports in this file should be ignored based on
    // a trailing "// rasterize: ignore" comment on the same line.
    /** @type {Set<string>} */
    const ignoreAbs = new Set();
    const lines = raw.split('\n');
    for (const line of lines) {
      if (!line.includes('rasterize: ignore') || !line.includes('.svg')) continue;
      const m = importRe.exec(line);
      if (m && m[2].startsWith('.')) {
        const abs = path.resolve(path.dirname(file), m[2]);
        ignoreAbs.add(abs);
      }
      importRe.lastIndex = 0; // reset regex state between lines
    }

    let content = raw;
    content = content.replace(importRe, (match, localName, relPath) => {
      if (!relPath.startsWith('.')) return match;

      const absSvg = path.resolve(path.dirname(file), relPath);
      if (ignoreAbs.has(absSvg)) {
        return match; // explicitly ignored
      }

      const relFromRoot = path.relative(projectRoot, absSvg);
      const stem = svgRelToStem.get(relFromRoot);
      if (!stem) {
        return match; // not in manifest / not rasterized
      }

      // Replace the import with a simple const string binding.
      changed = true;
      return `const ${localName} = '${stem}.png';`;
    });

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      filesChanged++;
      log(`Rewrote SVG imports in ${path.relative(projectRoot, file)}`);
    }
  }

  if (filesChanged === 0) {
    log('No SVG imports were transformed.');
  } else {
    log(`Done. Transformed SVG imports in ${filesChanged} file(s).`);
  }
}

main().catch((err) => {
  console.error('[transform-svg-imports] Fatal error:', err);
  process.exit(1);
});

