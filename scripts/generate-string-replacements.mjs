#!/usr/bin/env node

// Generate/update string-replacements.json with method/identifier names.
// Scans src/js/**/*.js for identifiers longer than a threshold (default: 9+ chars)
// that look like function/method names (identifiers followed by "("), and
// ensures they exist as keys in string-replacements.json, with their own name
// as the default replacement.
// Existing entries in string-replacements.json are preserved; this script only
// adds missing keys.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const srcJsDir = path.join(projectRoot, 'src', 'js');
const configPath = path.join(projectRoot, 'string-replacements.json');

const MIN_LENGTH = 9; // identifiers with length >= 9

function log(...args) {
  console.log('[generate-string-replacements]', ...args);
}

function walkJsFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return {};
    return obj;
  } catch {
    return {};
  }
}

async function main() {
  if (!fs.existsSync(srcJsDir)) {
    log(`Source JS directory not found at ${srcJsDir}.`);
    process.exit(1);
  }

  const files = [];
  walkJsFiles(srcJsDir, files);
  if (files.length === 0) {
    log('No JS files found under src/js.');
    return;
  }

  const idSet = new Set();
  // Identifier regex: capture identifier of length >= MIN_LENGTH before "("
  const idRe = /\b([A-Za-z_$][A-Za-z0-9_$]{8,})\s*\(/g;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = idRe.exec(content))) {
      const name = m[1];
      if (name.length >= MIN_LENGTH) {
        idSet.add(name);
      }
    }
  }

  if (idSet.size === 0) {
    log('No identifiers matching criteria were found.');
    return;
  }

  const existing = loadConfig();
  let added = 0;

  const sortedIds = Array.from(idSet).sort();
  for (const name of sortedIds) {
    if (Object.prototype.hasOwnProperty.call(existing, name)) continue;
    existing[name] = name; // default replacement is itself
    added++;
  }

  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2), 'utf8');

  log(`Found ${sortedIds.length} candidate identifier(s). Added ${added} new entr${added === 1 ? 'y' : 'ies'} to string-replacements.json.`);
}

main().catch((err) => {
  console.error('[generate-string-replacements] Fatal error:', err);
  process.exit(1);
});

