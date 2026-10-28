#!/usr/bin/env node

// Sanitize string-replacements.json:
// Remove all entries where key === value (no-op replacements).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'string-replacements.json');

function log(...args) {
  console.log('[sanitize-string-replacements]', ...args);
}

async function main() {
  if (!fs.existsSync(configPath)) {
    log(`Config file not found at ${configPath}; nothing to sanitize.`);
    return;
  }

  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (e) {
    log(`Error reading ${configPath}:`, e.message);
    process.exit(1);
  }

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    log(`Error parsing ${configPath} as JSON:`, e.message);
    process.exit(1);
  }

  if (!obj || typeof obj !== 'object') {
    log('Config JSON is not an object; nothing to do.');
    return;
  }

  const beforeKeys = Object.keys(obj).length;
  let removed = 0;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === key) {
      delete obj[key];
      removed++;
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(obj, null, 2), 'utf8');

  const afterKeys = Object.keys(obj).length;
  log(`Removed ${removed} no-op entr${removed === 1 ? 'y' : 'ies'} (key === value).`);
  log(`Entries before: ${beforeKeys}, after: ${afterKeys}.`);
}

main().catch((err) => {
  console.error('[sanitize-string-replacements] Fatal error:', err);
  process.exit(1);
});

