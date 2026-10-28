#!/usr/bin/env node

// Generate a frequency report of long identifiers/words in src/js.
// Scans src/js/**/*.js for identifiers (A-Z,a-z,0-9,_,$) of length >= MIN_LENGTH
// and prints a sorted list by descending count to stdout.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const srcJsDir = path.join(projectRoot, 'src', 'js');

const MIN_LENGTH = 9;

function log(...args) {
  console.log('[generate-word-report]', ...args);
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

  /** @type {Map<string, number>} */
  const counts = new Map();

  // Identifier/word regex: sequences of letters/digits/_/$ of sufficient length
  const wordRe = /\b[A-Za-z_$][A-Za-z0-9_$]{8,}\b/g;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = wordRe.exec(content))) {
      const word = m[0];
      if (word.length < MIN_LENGTH) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  if (counts.size === 0) {
    log('No long words/identifiers matching criteria were found.');
    return;
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => {
    // sort by descending count, then alphabetically
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });

  console.log(`\nMost used identifiers/words (length >= ${MIN_LENGTH}) in src/js:\n`);
  for (const [word, count] of sorted) {
    if (count<=1) continue;
    console.log(`${count.toString().padStart(5, ' ')}  ${word}`);
  }
  console.log(`\nTotal unique long words: ${sorted.length}\n`);
}

main().catch((err) => {
  console.error('[generate-word-report] Fatal error:', err);
  process.exit(1);
});

