import fs from 'fs';
import { execSync } from 'node:child_process';
import path from 'path';
import archiver from 'archiver';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');
const filePath = path.join(projectRoot, 'src', 'js', 'config.js');

// Helper to remove all files inside a directory (but keep the directory)
function emptyDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      emptyDir(full);
      fs.rmdirSync(full);
    } else {
      fs.unlinkSync(full);
    }
  }
}

// Read and modify config.js
let configContent = fs.readFileSync(filePath, 'utf-8');

// Extract version and build numbers using regex
const versionMatch = configContent.match(/version\s*:\s*["'](\d+\.\d+\.\d+)["']/);
const buildMatch = configContent.match(/build\s*:\s*(\d+)/);
const projectNameMatch = configContent.match(/projectName\s*:\s*["'](.+?)["']/);

if (!versionMatch || !buildMatch) {
  throw new Error('Could not find version or build in config.js');
}

var dontIncrementBuild = process.argv.includes('--dont-increment-build');
const version = versionMatch[1];

const build = dontIncrementBuild ? parseInt(buildMatch[1], 10) : parseInt(buildMatch[1], 10) + 1; // Increment build number
const projectName = projectNameMatch[1].replace(/\s+/g, '-');

// Replace build number in the file
configContent = configContent.replace(/build\s*:\s*\d+/, `build: ${build}`);
fs.writeFileSync(filePath, configContent);
console.log(`Updated build number to: ${build}`);

// Update changelog now (while config has the new build) so the build bundle gets the latest changelog
console.log('Updating changelog...');
execSync('node scripts/update-changelog.cjs', { stdio: 'inherit' });

// Run Vite build
const isProduction = process.argv.includes('--production');
const viteMode = isProduction ? '--mode production' : '--mode development';

// Clean out the previous dist contents before rebuilding, so old assets and
// cache-busted files (including tube atlases) don't accumulate across builds.
if (fs.existsSync(distDir)) {
  console.log(`Cleaning previous dist contents at ${distDir}...`);
  emptyDir(distDir);
}

// Prepare prebuild staging area before running Vite so all transforms and
// tooling operate on a copy of src/ and index.html.
console.log('Running prebuild staging script...');
execSync('node scripts/prebuild.mjs', { stdio: 'inherit' });

// Rasterize SVGs and build the SVG UI atlas in the prebuild tree.
console.log('Rasterizing SVGs and building SVG UI atlas...');
execSync('node scripts/rasterize-svgs.mjs', { stdio: 'inherit' });

// Transform SVG imports in prebuild/src to string constants for atlas-backed
// assets so Vite never sees them as real SVG asset imports.
console.log('Transforming SVG imports into atlas frame keys in prebuild/src...');
execSync('node scripts/transform-svg-imports.mjs', { stdio: 'inherit' });

// Apply simple string replacements (semi-obfuscation) in prebuild/src based on
// string-replacements.json. This runs after SVG import transforms so that both
// original and transformed identifiers can be remapped if desired.
console.log('Applying string replacement rules from string-replacements.json...');
execSync('node scripts/string-replace.mjs', { stdio: 'inherit' });

console.log(`Running Vite build${isProduction ? ' (production mode - debug sections will be removed)' : ' (development mode - debug sections will be kept)'} from prebuild/ root...`);
execSync(`npx vite build ${viteMode}`, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PREBUILD_ROOT: 'prebuild',
  },
});

// Post-build tube asset cache-busting (production only)
// - Renames JSON/PNG/XML files in dist/tube with a build-based suffix
// - Updates meta.image inside each JSON to point at the new PNG name
// - Rewrites references (e.g. from data_tubelist.js) in built files to use the new names
if (isProduction) {
  const distTubeDir = path.join(distDir, 'tube');

  if (fs.existsSync(distTubeDir)) {
    // Dynamically discover tube assets by finding all XML files in the directory
    const tubeBaseNames = fs.readdirSync(distTubeDir)
      .filter(file => file.endsWith('.xml'))
      .map(file => file.replace(/\.xml$/, ''))
      .filter(base => {
        // Only include if all three files (json, png, xml) exist
        const hasJson = fs.existsSync(path.join(distTubeDir, `${base}.json`));
        const hasPng = fs.existsSync(path.join(distTubeDir, `${base}.png`));
        return hasJson && hasPng;
      });

    if (tubeBaseNames.length === 0) {
      console.log('No tube assets found in dist/tube; skipping cache-busting step.');
    } else {
      console.log(`Found ${tubeBaseNames.length} tube asset(s) to cache-bust: ${tubeBaseNames.join(', ')}`);
    }

    const suffix = `-b${build}`;
    /** @type {Record<string, string>} */
    const renameMap = {};

    for (const base of tubeBaseNames) {
      const oldJson = path.join(distTubeDir, `${base}.json`);
      const oldPng = path.join(distTubeDir, `${base}.png`);
      const oldXml = path.join(distTubeDir, `${base}.xml`);

      if (!fs.existsSync(oldJson) || !fs.existsSync(oldPng) || !fs.existsSync(oldXml)) {
        continue;
      }

      const newJsonName = `${base}${suffix}.json`;
      const newPngName = `${base}${suffix}.png`;
      const newXmlName = `${base}${suffix}.xml`;

      const newJsonPath = path.join(distTubeDir, newJsonName);
      const newPngPath = path.join(distTubeDir, newPngName);
      const newXmlPath = path.join(distTubeDir, newXmlName);

      // Rename PNG and XML first
      fs.renameSync(oldPng, newPngPath);
      fs.renameSync(oldXml, newXmlPath);

      // Read, update, and rewrite JSON (ensuring meta.image matches the new PNG name)
      const jsonRaw = fs.readFileSync(oldJson, 'utf-8');
      let jsonData;
      try {
        jsonData = JSON.parse(jsonRaw);
      } catch (e) {
        console.warn(`Warning: failed to parse JSON atlas for tube "${base}" at ${oldJson}:`, e.message);
        continue;
      }

      if (jsonData.meta && typeof jsonData.meta === 'object') {
        jsonData.meta.image = newPngName;
      }

      fs.writeFileSync(newJsonPath, JSON.stringify(jsonData));
      fs.unlinkSync(oldJson);

      // Record path renames for later text replacement in built files
      renameMap[`tube/${base}.json`] = `tube/${newJsonName}`;
      renameMap[`tube/${base}.xml`] = `tube/${newXmlName}`;
    }

    // Also cache-bust the SVG UI atlas (JSON+PNG pair without XML)
    const svgAtlasBase = 'svg-ui-atlas';
    const svgAtlasJsonOld = path.join(distTubeDir, `${svgAtlasBase}.json`);
    const svgAtlasPngOld = path.join(distTubeDir, `${svgAtlasBase}.png`);

    if (fs.existsSync(svgAtlasJsonOld) && fs.existsSync(svgAtlasPngOld)) {
      const svgAtlasJsonNewName = `${svgAtlasBase}${suffix}.json`;
      const svgAtlasPngNewName = `${svgAtlasBase}${suffix}.png`;

      const svgAtlasJsonNewPath = path.join(distTubeDir, svgAtlasJsonNewName);
      const svgAtlasPngNewPath = path.join(distTubeDir, svgAtlasPngNewName);

      // Rename PNG first
      fs.renameSync(svgAtlasPngOld, svgAtlasPngNewPath);

      // Read, update, and rewrite JSON (ensuring meta.image matches the new PNG name)
      const svgAtlasRaw = fs.readFileSync(svgAtlasJsonOld, 'utf-8');
      try {
        const svgAtlasData = JSON.parse(svgAtlasRaw);
        if (svgAtlasData.meta && typeof svgAtlasData.meta === 'object') {
          svgAtlasData.meta.image = svgAtlasPngNewName;
        }
        fs.writeFileSync(svgAtlasJsonNewPath, JSON.stringify(svgAtlasData));
        fs.unlinkSync(svgAtlasJsonOld);

        // Record path renames for later text replacement in built files
        renameMap[`tube/${svgAtlasBase}.json`] = `tube/${svgAtlasJsonNewName}`;
        renameMap[`tube/${svgAtlasBase}.png`] = `tube/${svgAtlasPngNewName}`;
      } catch (e) {
        console.warn(`Warning: failed to parse JSON atlas for "${svgAtlasBase}" at ${svgAtlasJsonOld}:`, e.message);
      }
    }

    const renameKeys = Object.keys(renameMap);
    if (renameKeys.length > 0) {
      console.log('Updating built files to reference cache-busted tube assets...');

      const textFileRegex = /\.(js|html|css|json)$/i;

      const replaceInFile = (filePath) => {
        if (!textFileRegex.test(filePath)) return;
        let content = fs.readFileSync(filePath, 'utf-8');
        let changed = false;

        for (const from of renameKeys) {
          const to = renameMap[from];
          if (content.includes(from)) {
            content = content.split(from).join(to);
            changed = true;
          }
        }

        if (changed) {
          fs.writeFileSync(filePath, content);
          //console.log(`Rewrote tube references in ${filePath}`);
        }
      };

      const walkDir = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else {
            replaceInFile(fullPath);
          }
        }
      };

      walkDir(distDir);
    }
  } else {
    console.warn(`Warning: dist/tube directory not found at ${distTubeDir}; skipping tube cache-busting step.`);
  }
}

// Copy built files to Cordova www directory
console.log('Copying built files to Cordova www directory...');
const cordovaWwwDir = path.join(projectRoot, 'cordova', 'www');

// Add cache-buster to index.html in dist
const distIndexPath = path.join(distDir, 'index.html');
if (fs.existsSync(distIndexPath)) {
  let indexContent = fs.readFileSync(distIndexPath, 'utf-8');
  // Replace script tag with cache-busted version
  // Match: <script type="module" src="./src/js/main.js"></script>
  // Or: <script type="module" src="./src/js/main.js?v=XXX"></script>
  // Handle both single and double quotes, and various whitespace
  const scriptPattern = /(<script\s+type=["']module["']\s+src=["'])(\.\/src\/js\/main\.js)(\?v=\d+)?(["']><\/script>)/g;
  const originalContent = indexContent;
  indexContent = indexContent.replace(scriptPattern, `$1$2?v=${build}$4`);
  if (indexContent !== originalContent) {
    fs.writeFileSync(distIndexPath, indexContent);
    console.log(`Added cache-buster (v=${build}) to index.html in dist`);
  } else {
    console.warn('Warning: Could not find script tag to add cache-buster in dist/index.html');
  }
}

// Ensure cordova www directory exists
if (!fs.existsSync(cordovaWwwDir)) {
  fs.mkdirSync(cordovaWwwDir, { recursive: true });
}

// Copy all files from dist to cordova/www
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(distDir, cordovaWwwDir);

// Add cache-buster to index.html in cordova/www as well
// Also remove modern ES module scripts since Cordova WebView doesn't support them
const cordovaIndexPath = path.join(cordovaWwwDir, 'index.html');
if (fs.existsSync(cordovaIndexPath)) {
  let indexContent = fs.readFileSync(cordovaIndexPath, 'utf-8');
  const originalContent = indexContent;
  
  // Remove modern ES module scripts - Cordova WebView doesn't support ES modules
  // Remove ALL script tags with type="module" that have src attributes (polyfills, main, etc.)
  indexContent = indexContent.replace(
    /<script[^>]*type\s*=\s*["']module["'][^>]*src\s*=\s*["'][^"']*["'][^>]*>\s*<\/script>/gi,
    ''
  );
  // Remove modern browser detection scripts (inline scripts with type="module")
  // Remove scripts with import.meta.url
  indexContent = indexContent.replace(
    /<script[^>]*type\s*=\s*["']module["'][^>]*>[\s\S]*?import\.meta\.url[\s\S]*?<\/script>/gi,
    ''
  );
  // Remove scripts with __vite_is_modern_browser
  indexContent = indexContent.replace(
    /<script[^>]*type\s*=\s*["']module["'][^>]*>[\s\S]*?__vite_is_modern_browser[\s\S]*?<\/script>/gi,
    ''
  );
  
  // Remove script reload logic that causes "module already defined" errors in Cordova
  // This reloads scripts after deviceready, which can re-initialize Cordova plugins
  // Match the script reload block (from comment to end of for loop)
  indexContent = indexContent.replace(
    /\/\/\s*Force\s+reload\s+assets[^\n]*\n[\s\S]*?const\s+scripts[^\n]*\n[\s\S]*?for\s*\([^)]*\)\s*\{[\s\S]*?\}\s*\}/g,
    '// Script reload disabled for Cordova to prevent "module already defined" errors'
  );
  
  // Clean up any extra blank lines left by removals
  indexContent = indexContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  if (indexContent !== originalContent) {
    fs.writeFileSync(cordovaIndexPath, indexContent);
    console.log(`Processed index.html for Cordova (removed ES modules, will use legacy/nomodule versions only)`);
  }
  
  // Delete modern ES module JS files from Cordova build - they contain 'export' statements that Cordova can't parse
  const assetsDir = path.join(cordovaWwwDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    for (const file of files) {
      // Remove modern polyfills (not legacy)
      if (file.startsWith('polyfills-') && !file.includes('legacy') && file.endsWith('.js')) {
        const filePath = path.join(assetsDir, file);
        fs.unlinkSync(filePath);
        console.log(`Deleted modern polyfills file: ${file} (Cordova incompatible)`);
      }
      // Remove modern main bundle (not legacy)
      if (file.startsWith('main-') && !file.includes('legacy') && file.endsWith('.js')) {
        const filePath = path.join(assetsDir, file);
        fs.unlinkSync(filePath);
        console.log(`Deleted modern main bundle: ${file} (Cordova incompatible)`);
      }
    }
  }
}

// Ensure changelog.txt is available in dist for web deployments
try {
  const changelogSrc = path.join(projectRoot, 'changelog.txt');
  const changelogDest = path.join(distDir, 'changelog.txt');
  if (fs.existsSync(changelogSrc)) {
    fs.copyFileSync(changelogSrc, changelogDest);
    console.log('Copied changelog.txt to dist');
  } else {
    console.warn('Warning: changelog.txt not found at project root');
  }
} catch (err) {
  console.warn('Warning: failed to copy changelog.txt to dist:', err.message);
}

// Copy Cordova.js from platforms
const platforms = ['android', 'ios'];
for (const platform of platforms) {
    const cordovaJsPath = path.join(projectRoot, 'cordova', 'platforms', platform, 'platform_www', 'cordova.js');
    const cordovaJsDest = path.join(cordovaWwwDir, 'cordova.js');
    if (fs.existsSync(cordovaJsPath)) {
        fs.copyFileSync(cordovaJsPath, cordovaJsDest);
        console.log(`Copied cordova.js from ${platform} platform`);
    }
}

console.log('Copied dist files to cordova/www');

// Create ZIP file
const date = new Date().toISOString().split('T')[0];
const outputFolder = path.join(projectRoot, 'builds');
const buildType = isProduction ? 'PRODUCTION' : 'DEVELOPMENT';

// Derive a human-readable target suffix from build flags (WEB/FRVR/GOOGLE/IOS)
const buildTargets = [];
if (process.env.BUILD_WEB) buildTargets.push('WEB');
if (process.env.BUILD_FRVR) buildTargets.push('FRVR');
if (process.env.BUILD_GOOGLE) buildTargets.push('GOOGLE');
if (process.env.BUILD_IOS) buildTargets.push('IOS');
const targetSuffix = buildTargets.length ? `-${buildTargets.join('+')}` : '';

const zipName = `${projectName}-v${version}-b${build}-${buildType}${targetSuffix}-${date}.zip`;
const zipPath = path.join(outputFolder, zipName);

// Ensure builds directory exists
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder);
}

const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Created zip file: ${zipName} (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add built files to the ZIP
archive.directory(path.join(projectRoot, 'dist'), false);
archive.finalize();

// Read version and build number from config.js
const configPath = path.join(projectRoot, 'src', 'js', 'config.js');
const configJsContent = fs.readFileSync(configPath, 'utf8');
const configJsVersionMatch = configJsContent.match(/version:\s*['"]([^'"]+)['"]/);
const configJsBuildMatch = configJsContent.match(/build:\s*(\d+)/);

if (!configJsVersionMatch || !configJsBuildMatch) {
  console.error('Could not find version or build number in config.js');
  process.exit(1);
}

const configJsVersion = configJsVersionMatch[1];
const configJsBuildNumber = configJsBuildMatch[1];

const identityPath = path.join(projectRoot, 'scripts', 'project-identity.json');
const cordovaWidgetId = JSON.parse(fs.readFileSync(identityPath, 'utf8')).cordovaWidgetId;

// Update cordova/config.xml
const configXmlPath = path.join(projectRoot, 'cordova', 'config.xml');
let configXmlContent = fs.readFileSync(configXmlPath, 'utf8');

// Update widget tag
configXmlContent = configXmlContent.replace(
  /<widget[^>]*>/,
  `<widget id="${cordovaWidgetId}" version="${configJsVersion}" ios-CFBundleVersion="${configJsBuildNumber}" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">`
);

fs.writeFileSync(configXmlPath, configXmlContent);
console.log(`Updated cordova/config.xml with version ${configJsVersion} and build number ${configJsBuildNumber}`);

// Read changelog and create release notes
const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
const releaseNotesPath = path.join(projectRoot, 'cordova', 'release_notes.txt');

if (fs.existsSync(changelogPath)) {
  const changelogContent = fs.readFileSync(changelogPath, 'utf8');
  
  // Extract the latest version's changes
  const unreleasedMatch = changelogContent.match(/## \[Unreleased\]([\s\S]*?)(?=## \[|$)/);
  if (unreleasedMatch) {
    const unreleasedChanges = unreleasedMatch[1].trim();
    fs.writeFileSync(releaseNotesPath, unreleasedChanges);
    console.log('Created release notes for TestFlight');
  }
}

