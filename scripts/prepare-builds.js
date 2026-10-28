import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildsDir = join(__dirname, '..', 'builds');

// Ensure builds directory exists, but do NOT delete its contents.
if (!existsSync(buildsDir)) {
    mkdirSync(buildsDir, { recursive: true });
    console.log('Created builds directory');
} else {
    console.log('Builds directory already exists; leaving contents intact');
}
