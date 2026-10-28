// High-resolution screenshot utility for Pixi.js
// Usage: captureHighResScreenshot(app, displayObject, { scale: 2, filename: "screenshot.png" })
import { RenderTexture } from 'pixi.js'
import { data_screenshotsizes, screenshotPrefix } from './data_screenshotsizes.js'
import { computeStageScaleForSize } from '../mainpixi.js'

/**
 * Capture a high-resolution screenshot of a display object (or the whole stage)
 * @param {import('pixi.js').Application} app - Pixi application
 * @param {import('pixi.js').DisplayObject} displayObject - Object to render (defaults to app.stage)
 * @param {{scale?: number, width?: number, height?: number, background?: string|number, filename?: string}} options
 * @returns {Promise<Blob>} resolves with image Blob (PNG)
 */
export async function captureHighResScreenshot(app, displayObject, options = {}) {
    const scale = options.scale || 1;
    const target = displayObject || app.stage;

    // Determine render size
    const baseWidth = app.renderer.width;
    const baseHeight = app.renderer.height;
    const outWidth = Math.floor((options.width || baseWidth) * scale);
    const outHeight = Math.floor((options.height || baseHeight) * scale);

    // Create a render texture and render at higher resolution (Pixi v8)
    const renderTexture = RenderTexture.create({
        width: outWidth,
        height: outHeight,
        resolution: 1,
    });

    // Save current transform/resolution
    const oldScaleX = target.scale?.x ?? 1;
    const oldScaleY = target.scale?.y ?? 1;

    try {
        // Only apply scaling if we're not already at the target resolution
        if (scale !== 1 || (options.width && options.width !== baseWidth) || (options.height && options.height !== baseHeight)) {
            // Compute per-axis scale to match requested output size
            const scaleX = outWidth / baseWidth;
            const scaleY = outHeight / baseHeight;
            if (target === app.stage) app.stage.scale.set(oldScaleX * scaleX, oldScaleY * scaleY);
        }

        app.renderer.render(target, { renderTexture, clear: true });

        // Extract canvas and convert to Blob
        const canvas = app.renderer.extract.canvas(renderTexture);
        const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));

        // Optionally save to disk
        const filename = options.filename || generateScreenshotName();
        await saveBlob(blob, filename);
        return blob;
    } finally {
        // Restore
        if (target === app.stage) app.stage.scale.set(oldScaleX, oldScaleY);
        renderTexture.destroy(true);
    }
}

function generateScreenshotName() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = `screenshot_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.png`;
    return name;
}

async function saveBlob(blob, filename) {
    // Cordova (if available) - save to Pictures directory
    if (typeof window !== 'undefined' && window.cordova && window.resolveLocalFileSystemURL) {
        try {
            const dir = window.cordova.file?.picturesDirectory || window.cordova.file?.externalDataDirectory || window.cordova.file?.dataDirectory;
            if (dir) {
                await writeFileCordova(dir, filename, blob);
                return;
            }
        } catch (e) {
            // Fallback to browser download
        }
    }

    // Browser fallback: trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function writeFileCordova(dir, filename, blob) {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(dir, (dirEntry) => {
            dirEntry.getFile(filename, { create: true, exclusive: false }, (fileEntry) => {
                fileEntry.createWriter((fileWriter) => {
                    fileWriter.onwriteend = () => resolve();
                    fileWriter.onerror = (e) => reject(e);
                    fileWriter.write(blob);
                }, reject);
            }, reject);
        }, reject);
    });
}

function getAndIncrementCounter() {
    try {
        const key = 'screenshotCounter';
        const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        const next = current + 1;
        localStorage.setItem(key, String(next));
        return next;
    } catch (_e) {
        // Fallback when localStorage is unavailable
        if (!window.__screenshotCounter) window.__screenshotCounter = 1;
        return window.__screenshotCounter++;
    }
}

export async function captureConfiguredScreenshots(app, displayObject, gameInstance, main) {
    const target = displayObject || app.stage;
    const count = getAndIncrementCounter();
    const entries = Object.entries(data_screenshotsizes);

    window.dospam = true;
    window.takingScreenshots = true;

    try {
        for (const [name, cfg] of entries) {
            const filename = `${screenshotPrefix}${count}_${name}.png`;

            app.renderer.resize(cfg.width, cfg.height);
            const scale = computeStageScaleForSize(cfg.width, cfg.height);
            app.stage.scale.set(scale, scale);

            if (gameInstance && typeof gameInstance.resize === 'function') {
                gameInstance.resize();
            }
            if (main?.mainTick) {
                for (let i = 0; i < 5; i++) main.mainTick(1 / 60);
            }

            // Let layout + dialog resizeOnTick settle for the new aspect.
            await new Promise(resolve => requestAnimationFrame(resolve));
            await new Promise(resolve => requestAnimationFrame(resolve));

            await captureHighResScreenshot(app, target, { filename });
        }
    } finally {
        window.takingScreenshots = false;
        window.dospam = false;

        if (main?.resize) {
            main.resize();
        } else if (gameInstance && typeof gameInstance.resize === 'function') {
            gameInstance.resize();
        }
    }
}


