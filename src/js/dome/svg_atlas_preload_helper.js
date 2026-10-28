import { Assets } from "pixi.js"

/**
 * TexturePacker atlas for SVG UI assets (see scripts/rasterize-svgs.mjs).
 * After `scripts/transform-svg-imports.mjs`, component `source` values become bare
 * strings like `button_side_up.png`; Pixi must load this JSON first so frames
 * register in the asset cache (otherwise fetch targets the HTML directory → 404).
 */
export const SVG_UI_ATLAS_URL = `${import.meta.env.BASE_URL}tube/svg-ui-atlas.json`

/**
 * @param {unknown} asset
 * @returns {boolean}
 */
export function isAtlasFramePreloadString(asset) {
	if (typeof asset !== "string") return false
	if (asset.includes("/") || asset.includes("\\")) return false
	return /\.png$/i.test(asset)
}

/**
 * @param {unknown[]} assets
 * @returns {unknown[]}
 */
export function filterAtlasFrameStrings(assets) {
	return assets.filter((a) => !isAtlasFramePreloadString(a))
}

/**
 * Loads the SVG UI atlas when the list contains transformed frame keys, then
 * returns a preload list without those bare filenames.
 * @param {unknown[]} assets
 * @returns {Promise<unknown[]>}
 */
export function prepareUiAtlasPreloadList(assets) {
	const filtered = filterAtlasFrameStrings(assets)
	const needAtlas = assets.some(isAtlasFramePreloadString)
	if (!needAtlas) {
		return Promise.resolve(filtered)
	}
	return Assets.load(SVG_UI_ATLAS_URL)
		.then(() => filtered)
		.catch((err) => {
			console.error("[svg-ui-atlas] Failed to load", SVG_UI_ATLAS_URL, err)
			return filtered
		})
}
