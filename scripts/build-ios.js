import { execSync } from 'child_process';
import { existsSync, copyFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const cordovaDir = join(projectRoot, 'cordova');

var dontIncrementBuild = process.argv.includes('--dont-increment-build');

function runCommand(command, cwd = projectRoot) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { 
      cwd,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: true }
    });
    return true;
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    return false;
  }
}

async function buildIOS() {
  // Check for release flag
  const isRelease = process.argv.includes('--release');
  const buildType = isRelease ? 'release' : 'debug';
  
  console.log(`🚀 Starting iOS ${buildType} build process...`);

  // Step 1: Prepare builds directory
  console.log('\n📁 Preparing builds directory...');
  if (!runCommand('node scripts/prepare-builds.js ')) {
    console.error('❌ Failed to prepare builds directory');
    process.exit(1);
  }

  // Step 2: Run Vite build
  console.log('\n🔨 Building with Vite (iOS target)...');
  // Always set BUILD_IOS=1 so conditional build sections know we're producing an iOS build
  const envPrefix = 'BUILD_IOS=1 ';
  const buildCommand = isRelease
    ? `${envPrefix}npm run build:production`
    : `${envPrefix}npm run build` + (dontIncrementBuild ? ' --dont-increment-build' : '');
  if (!runCommand(buildCommand)) {
    console.error('❌ Vite build failed');
    process.exit(1);
  }

  // Step 2.5: Copy changelog.txt to dist
  console.log('\n📝 Copying changelog.txt to dist...');
  const changelogPath = join(projectRoot, 'changelog.txt');
  const distChangelogPath = join(projectRoot, 'dist', 'changelog.txt');
  if (existsSync(changelogPath)) {
    copyFileSync(changelogPath, distChangelogPath);
    console.log('✅ Changelog copied successfully');
  } else {
    console.warn('⚠️ Warning: changelog.txt not found in project root');
  }

  // Step 3: Update Cordova www directory
  console.log('\n📦 Updating Cordova www directory...');
  if (!runCommand('npm run update-game', cordovaDir)) {
    console.error('❌ Failed to update Cordova www directory');
    process.exit(1);
  }

  // Step 4: Build iOS
  console.log('\n📱 Building iOS app...');
  if (!runCommand(`cordova build ios --${buildType} --buildFlag="-destination platform=iOS Simulator,name=iPhone SE (3rd generation),OS=18.3.1"`, cordovaDir)) {
    console.error('❌ iOS build failed');
    process.exit(1);
  }

  // Step 5: Generate icons
  console.log('\n🎨 Generating icons...');
  if (!runCommand('./generate_icons.sh', cordovaDir)) {
    console.error('❌ Failed to generate icons');
    process.exit(1);
  }

  // Step 6: Open Xcode workspace (name follows <name> in config.xml, not a fixed string)
  console.log('\n🔧 Opening Xcode workspace...');
  const iosDir = join(cordovaDir, 'platforms/ios');
  let workspacePath = null;
  if (existsSync(iosDir)) {
    const ws = readdirSync(iosDir).find((f) => f.endsWith('.xcworkspace'));
    if (ws) workspacePath = join(iosDir, ws);
  }
  if (workspacePath && existsSync(workspacePath)) {
    runCommand(`open "${workspacePath}"`);
  } else {
    console.error('❌ Could not find Xcode workspace under cordova/platforms/ios/');
    process.exit(1);
  }

  console.log(`\n✅ iOS ${buildType} build process completed successfully!`);
}

buildIOS().catch(error => {
  console.error('❌ Build process failed:', error);
  process.exit(1);
}); 