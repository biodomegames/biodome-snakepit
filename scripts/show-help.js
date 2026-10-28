import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

console.log('\n📦 Available npm scripts:\n');
console.log('═'.repeat(60));

const scripts = packageJson.scripts || {};
const maxLength = Math.max(...Object.keys(scripts).map(key => key.length));

Object.entries(scripts)
  //.sort(([a], [b]) => a.localeCompare(b))
  .forEach(([name, command]) => {
    const padding = ' '.repeat(maxLength - name.length + 2);
    console.log(`  npm run ${name}${padding}→ ${command}`);
  });

console.log('═'.repeat(60));
console.log('\n');

