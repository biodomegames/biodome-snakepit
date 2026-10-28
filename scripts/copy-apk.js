import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildsDir = join(__dirname, '..', 'builds');
const cordovaDir = join(__dirname, '..', 'cordova');

// Ensure builds directory exists
if (!existsSync(buildsDir)) {
    mkdirSync(buildsDir, { recursive: true });
}

// Copy the APK to our builds directory
const isRelease = process.argv.includes('--release');
const apkName = isRelease ? 'app-release.apk' : 'app-debug.apk';
const sourcePath = join(cordovaDir, 'platforms', 'android', 'app', 'build', 'outputs', 'apk', isRelease ? 'release' : 'debug', apkName);
const targetPath = join(buildsDir, isRelease ? 'android-release.apk' : 'android-debug.apk');

try {
    copyFileSync(sourcePath, targetPath);
    console.log(`Copied APK to ${targetPath}`);
} catch (error) {
    console.error('Failed to copy APK:', error.message);
    process.exit(1);
} 