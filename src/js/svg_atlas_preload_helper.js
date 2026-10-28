// Dev copy: empty atlas stems so all UI assets preload as usual.
// Production builds: scripts/rasterize-svgs.mjs overwrites this file under
// prebuild/src/js/ with real stems before Vite bundles.

export const ATLAS_SVG_STEMS = new Set([]);

/**
 * Tube / Animate exports reference packed textures by **bare filename** (e.g.
 * `main_btn9slicehover.png`). Those names are resolved via the tube JSON, not
 * as standalone `Assets.load()` URLs. Vite `import img from '…'` always yields
 * a string containing `/` (or `http`), so we only skip path-less bare names.
 *
 * @param {unknown} asset
 * @returns {boolean}
 */
export function shouldSkipBareFilenamePreload(asset) {
	if (typeof asset !== 'string') return false;
	const s = asset.trim();
	if (!s) return false;
	if (s.startsWith('data:') || s.startsWith('blob:')) return false;
	if (/^https?:\/\//i.test(s)) return false;
	if (s.includes('/') || s.includes('\\')) return false;
	// Packed raster/audio inside tube atlases — do not fetch from site root.
	return /\.(png|jpe?g|webp|gif|mp3|ogg|wav|m4a)$/i.test(s);
}

export function shouldIgnorePreloadAsset(asset) {
	if (typeof asset !== 'string') return false;

	if (import.meta && import.meta.env && !import.meta.env.PROD) {
		return false;
	}

	const lastSlash = asset.lastIndexOf('/');
	let filename = lastSlash >= 0 ? asset.slice(lastSlash + 1) : asset;
	const q = filename.search(/[?#]/);
	if (q !== -1) filename = filename.slice(0, q);

	const lower = filename.toLowerCase();
	// Only skip standalone PNG preloads (atlas-backed imports become 'stem.png' in prod).
	// Real SVG URLs (e.g. rasterize: ignore, or Vite-hashed .svg) must always preload — a stem
	// can still be in the atlas if another module imported the same file without ignore.
	if (!lower.endsWith('.png')) {
		return false;
	}
	const base = filename.slice(0, -4);

	for (const stem of ATLAS_SVG_STEMS) {
		if (base === stem || base.startsWith(stem + '-')) {
			return true;
		}
	}

	return false;
}
