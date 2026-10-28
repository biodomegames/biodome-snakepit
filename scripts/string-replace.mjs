#!/usr/bin/env node

/**
 * Simple string replacement pass over the prebuild/src tree.
 *
 * Intended pipeline order:
 *   1) node scripts/prebuild.mjs
 *   2) node scripts/rasterize-svgs.mjs
 *   3) node scripts/transform-svg-imports.mjs
 *   4) node scripts/string-replace.mjs         <-- this script
 *   5) Vite build (root = prebuild/)
 *
 * Replacements are defined in a JSON file at project root:
 *
 *   string-replacements.json
 *
 * Structure:
 *   {
 *     "originalString1": "replacementString1",
 *     "originalString2": "replacementString2"
 *   }
 *
 * Each key is treated as a literal substring; all occurrences in JS/TS files
 * under prebuild/src are replaced with the corresponding value.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const prebuildRoot = path.join(projectRoot, 'prebuild');
const srcDir = path.join(prebuildRoot, 'src');
const configPath = path.join(projectRoot, 'string-replacements.json');

function log(...args) {
  console.log('[string-replace]', ...args);
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

function loadReplacements() {
  if (!fs.existsSync(configPath)) {
    log(`Config file not found at ${configPath}; no replacements will be applied.`);
    return {};
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') {
      log('Config JSON is not an object; ignoring.');
      return {};
    }
    return obj;
  } catch (e) {
    log(`Error reading or parsing ${configPath}:`, e.message);
    return {};
  }
}

async function main() {
  if (!fs.existsSync(srcDir)) {
    log(`Prebuild src directory not found at ${srcDir}.`);
    log('Make sure scripts/prebuild.mjs has been run first.');
    process.exit(1);
  }

  const replacements = loadReplacements();
  const keys = Object.keys(replacements);
  if (keys.length === 0) {
    log('No replacements configured; nothing to do.');
    return;
  }

  log(`Loaded ${keys.length} replacement rule(s) from string-replacements.json.`);

  const files = [];
  walkFiles(srcDir, ['.js', '.ts'], files);

  if (files.length === 0) {
    log('No JS/TS files found under prebuild/src; nothing to transform.');
    return;
  }

  let filesChanged = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    for (const from of keys) {
      const to = replacements[from];
      if (typeof to !== 'string') continue;
      if (!from) continue;
      if (!content.includes(from)) continue;
      content = content.split(from).join(to);
    }

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      filesChanged++;
      log(`Applied replacements in ${path.relative(projectRoot, file)}`);
    }
  }

  if (filesChanged === 0) {
    log('No files were changed by string replacements.');
  } else {
    log(`Done. Updated ${filesChanged} file(s) with string replacements.`);
  }
}

main().catch((err) => {
  console.error('[string-replace] Fatal error:', err);
  process.exit(1);
});

