#!/usr/bin/env node

/**
 * Script to download web pages and their images for offline use
 * Downloads from master URLs and saves to local www folder
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const BASE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BASE_DIR, '..');

const identity = JSON.parse(
	fs.readFileSync(path.join(PROJECT_ROOT, 'scripts', 'project-identity.json'), 'utf8')
);
const gamePath = identity.slug;

// ============================================================================
// CONFIGURATION - URLs and paths (game URL follows project-identity.json slug)
// ============================================================================

const MASTER_URLS = {
	privacy: 'https://biodomegames.com/privacypolicy/',
	moreinfo: `https://biodomegames.com/${gamePath}/`
};

const LOCAL_PATHS = {
	privacy: 'src/web/privacy',
	moreinfo: 'src/web/moreinfo'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function ensureDir(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

function getProtocol(url) {
	return url.startsWith('https:') ? https : http;
}

function downloadFile(url, outputPath) {
	return new Promise((resolve, reject) => {
		const protocol = getProtocol(url);
		const file = fs.createWriteStream(outputPath);
		
		protocol.get(url, (response) => {
			if (response.statusCode === 301 || response.statusCode === 302) {
				// Handle redirects
				const redirectUrl = response.headers.location;
				if (redirectUrl) {
					file.close();
					fs.unlinkSync(outputPath);
					return downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
				}
			}
			
			if (response.statusCode !== 200) {
				file.close();
				fs.unlinkSync(outputPath);
				reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
				return;
			}
			
			response.pipe(file);
			
			file.on('finish', () => {
				file.close();
				resolve({ path: outputPath, contentType: response.headers['content-type'] });
			});
		}).on('error', (err) => {
			file.close();
			if (fs.existsSync(outputPath)) {
				fs.unlinkSync(outputPath);
			}
			reject(err);
		});
	});
}

function parseHTML(html) {
	// Simple HTML parser to extract images and CSS links
	const images = [];
	const cssLinks = [];
	
	// Match img tags with src attribute
	const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
	let match;
	while ((match = imgRegex.exec(html)) !== null) {
		images.push(match[1]);
	}
	
	// Match link tags with rel="stylesheet" and href attribute (order doesn't matter)
	// Match any link tag that has both rel="stylesheet" and href
	const linkRegex = /<link[^>]*>/gi;
	while ((match = linkRegex.exec(html)) !== null) {
		const linkTag = match[0];
		// Check if it has rel="stylesheet" and extract href
		if (/rel=["']stylesheet["']/i.test(linkTag)) {
			const hrefMatch = linkTag.match(/href=["']([^"']+)["']/i);
			if (hrefMatch) {
				cssLinks.push(hrefMatch[1]);
			}
		}
	}
	
	// Also check for CSS background images
	const bgImageRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
	while ((match = bgImageRegex.exec(html)) !== null) {
		images.push(match[1]);
	}
	
	return { images, cssLinks };
}

function resolveImageUrl(imageUrl, baseUrl) {
	try {
		// If already absolute URL, return as is
		if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
			return imageUrl;
		}
		
		// If data URL, skip it
		if (imageUrl.startsWith('data:')) {
			return null;
		}
		
		// Resolve relative URL
		const base = new URL(baseUrl);
		return new URL(imageUrl, base.href).href;
	} catch (e) {
		console.warn(`Failed to resolve image URL: ${imageUrl}`, e.message);
		return null;
	}
}

function updateHTMLForLocal(html, baseUrl, localDir, downloadedImages, downloadedCSS) {
	let updatedHtml = html;
	const htmlDir = localDir; // HTML file is in localDir
	
	// Update CSS link href attributes
	for (const [originalUrl, localPath] of Object.entries(downloadedCSS)) {
		// Calculate relative path from HTML file to CSS
		const relativePath = path.relative(htmlDir, localPath).replace(/\\/g, '/');
		// Ensure it starts with ./ if in same directory or subdirectory
		const normalizedPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
		
		// Escape the original URL for regex
		const escapedOriginal = escapeRegex(originalUrl);
		
		// Replace in link href - handle both absolute and relative URLs
		// Match: href="..." or href='...' in link tags
		updatedHtml = updatedHtml.replace(
			new RegExp(`(<link[^>]+href=["'])${escapedOriginal}(["'][^>]*>)`, 'gi'),
			`$1${normalizedPath}$2`
		);
	}
	
	// Update image src attributes
	for (const [originalUrl, localPath] of Object.entries(downloadedImages)) {
		// Calculate relative path from HTML file to image
		const relativePath = path.relative(htmlDir, localPath).replace(/\\/g, '/');
		// Ensure it starts with ./ if in same directory or subdirectory
		const normalizedPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
		
		// Escape the original URL for regex, but handle both absolute and relative
		const escapedOriginal = escapeRegex(originalUrl);
		
		// Replace in img src - handle both absolute and relative URLs
		// Match: src="..." or src='...'
		updatedHtml = updatedHtml.replace(
			new RegExp(`(src=["'])${escapedOriginal}(["'])`, 'gi'),
			`$1${normalizedPath}$2`
		);
		
		// Replace in CSS background-image - handle url(...) format
		updatedHtml = updatedHtml.replace(
			new RegExp(`(url\\(["']?)${escapedOriginal}(["']?\\))`, 'gi'),
			`$1${normalizedPath}$2`
		);
	}
	
	return updatedHtml;
}

function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getFilenameFromUrl(url, contentType = null) {
	try {
		const urlObj = new URL(url);
		const pathname = urlObj.pathname;
		let filename = path.basename(pathname) || 'image';
		
		// Remove query string from filename
		filename = filename.split('?')[0];
		
		// If no extension, try to determine from content-type
		if (!path.extname(filename)) {
			if (contentType) {
				const ext = contentType.split('/')[1]?.split(';')[0];
				if (ext) {
					filename = `${filename}.${ext}`;
				} else {
					filename = `${filename}.png`; // Default to PNG
				}
			} else {
				filename = `${filename}.png`; // Default to PNG
			}
		}
		
		return filename;
	} catch (e) {
		// Fallback: extract filename from path
		const match = url.match(/\/([^\/\?]+)(\?|$)/);
		let filename = match ? match[1] : 'image';
		if (!path.extname(filename)) {
			filename = `${filename}.png`;
		}
		return filename;
	}
}

// ============================================================================
// MAIN DOWNLOAD FUNCTION
// ============================================================================

async function downloadPageAndImages(name, url, localPath) {
	console.log(`\n📥 Downloading ${name}...`);
	console.log(`   URL: ${url}`);
	console.log(`   Local: ${localPath}`);
	
	const fullLocalPath = path.resolve(PROJECT_ROOT, localPath);
	ensureDir(fullLocalPath);
	
	// Download HTML
	const htmlPath = path.join(fullLocalPath, 'index.html');
	console.log(`   Downloading HTML...`);
	
	try {
		const result = await downloadFile(url, htmlPath);
		console.log(`   ✓ HTML downloaded`);
	} catch (error) {
		console.error(`   ✗ Failed to download HTML:`, error.message);
		throw error;
	}
	
	// Read and parse HTML
	const html = fs.readFileSync(htmlPath, 'utf-8');
	const { images: imageUrls, cssLinks: cssUrls } = parseHTML(html);
	
	console.log(`   Found ${imageUrls.length} image(s) and ${cssUrls.length} CSS file(s)`);
	
	// Download CSS files
	const downloadedCSS = {};
	const cssDir = path.join(fullLocalPath, 'css');
	ensureDir(cssDir);
	
	for (const cssUrl of cssUrls) {
		// Skip external CSS (like Google Fonts)
		if (cssUrl.startsWith('http://') || cssUrl.startsWith('https://')) {
			if (!cssUrl.includes('biodomegames.com')) {
				console.log(`   ⏭  Skipping external CSS: ${cssUrl}`);
				continue;
			}
		}
		
		const resolvedUrl = resolveImageUrl(cssUrl, url); // Reuse same function
		if (!resolvedUrl) {
			console.log(`   ⏭  Skipping CSS: ${cssUrl}`);
			continue;
		}
		
		// Avoid duplicate downloads
		if (downloadedCSS[resolvedUrl] || downloadedCSS[cssUrl]) {
			continue;
		}
		
		// Download to temp file first to get content type
		const tempPath = path.join(cssDir, 'temp_' + Date.now());
		try {
			console.log(`   Downloading CSS: ${resolvedUrl}`);
			const result = await downloadFile(resolvedUrl, tempPath);
			
			// Get proper filename with extension
			let filename = getFilenameFromUrl(resolvedUrl, result.contentType || 'text/css');
			// Ensure .css extension
			if (!filename.endsWith('.css')) {
				filename = filename.replace(/\.[^.]+$/, '') + '.css';
			}
			const cssPath = path.join(cssDir, filename);
			
			// Rename temp file to final filename
			fs.renameSync(tempPath, cssPath);
			
			downloadedCSS[resolvedUrl] = cssPath;
			downloadedCSS[cssUrl] = cssPath; // Also map original URL
			console.log(`   ✓ ${filename}`);
		} catch (error) {
			// Clean up temp file if it exists
			if (fs.existsSync(tempPath)) {
				try {
					fs.unlinkSync(tempPath);
				} catch (e) {
					// Ignore cleanup errors
				}
			}
			console.warn(`   ✗ Failed to download CSS ${resolvedUrl}:`, error.message);
		}
	}
	
	// Download images
	const downloadedImages = {};
	const imagesDir = path.join(fullLocalPath, 'images');
	ensureDir(imagesDir);
	
	for (const imageUrl of imageUrls) {
		const resolvedUrl = resolveImageUrl(imageUrl, url);
		if (!resolvedUrl) {
			console.log(`   ⏭  Skipping: ${imageUrl}`);
			continue;
		}
		
		// Avoid duplicate downloads
		if (downloadedImages[resolvedUrl] || downloadedImages[imageUrl]) {
			continue;
		}
		
		// Download to temp file first to get content type
		const tempPath = path.join(imagesDir, 'temp_' + Date.now());
		try {
			console.log(`   Downloading image: ${resolvedUrl}`);
			const result = await downloadFile(resolvedUrl, tempPath);
			
			// Get proper filename with extension
			let filename = getFilenameFromUrl(resolvedUrl, result.contentType);
			const imagePath = path.join(imagesDir, filename);
			
			// Rename temp file to final filename
			fs.renameSync(tempPath, imagePath);
			
			downloadedImages[resolvedUrl] = imagePath;
			downloadedImages[imageUrl] = imagePath; // Also map original URL
			console.log(`   ✓ ${filename}`);
		} catch (error) {
			// Clean up temp file if it exists
			if (fs.existsSync(tempPath)) {
				try {
					fs.unlinkSync(tempPath);
				} catch (e) {
					// Ignore cleanup errors
				}
			}
			console.warn(`   ✗ Failed to download ${resolvedUrl}:`, error.message);
		}
	}
	
	// Update HTML with local CSS and image paths
	if (Object.keys(downloadedCSS).length > 0 || Object.keys(downloadedImages).length > 0) {
		const updatedHtml = updateHTMLForLocal(html, url, fullLocalPath, downloadedImages, downloadedCSS);
		fs.writeFileSync(htmlPath, updatedHtml, 'utf-8');
		console.log(`   ✓ HTML updated with local paths`);
	}
	
	console.log(`   ✅ ${name} download complete!`);
	return { htmlPath, imagesDir, cssDir, downloadedImages, downloadedCSS };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
	console.log('🚀 Starting web pages download...\n');
	
	try {
		// Download privacy policy
		await downloadPageAndImages(
			'Privacy Policy',
			MASTER_URLS.privacy,
			LOCAL_PATHS.privacy
		);
		
		// Download moreinfo page
		await downloadPageAndImages(
			'More info page',
			MASTER_URLS.moreinfo,
			LOCAL_PATHS.moreinfo
		);
		
		console.log('\n✨ All downloads completed successfully!');
		console.log('\n📁 Files saved to:');
		console.log(`   - ${path.resolve(PROJECT_ROOT, LOCAL_PATHS.privacy)}`);
		console.log(`   - ${path.resolve(PROJECT_ROOT, LOCAL_PATHS.moreinfo)}`);
		
	} catch (error) {
		console.error('\n❌ Error:', error.message);
		process.exit(1);
	}
}

main();

