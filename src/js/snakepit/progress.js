import { MAX_PIT_TILES, tileCountForLevel } from "./pitShape.js"

const KEY_LEVEL = "SnakepitLevel"
const KEY_SEED = "SnakepitLevelSeed"

export function loadProgress() {
	const bdata = window.bdata
	const level = Math.max(1, Number(bdata?.get?.(KEY_LEVEL, 1)) || 1)
	const seed = Number(bdata?.get?.(KEY_SEED, 0)) || 0
	return { level, seed }
}

export function saveProgress(level, seed) {
	const bdata = window.bdata
	if (!bdata?.set) return
	bdata.set(KEY_LEVEL, Math.max(1, level | 0))
	if (seed != null) bdata.set(KEY_SEED, seed >>> 0)
}

export function resetProgress() {
	saveProgress(1, (Math.floor(Math.random() * 0xffffffff) >>> 0))
	return loadProgress()
}

export function nextLevelIndex(level) {
	return (level | 0) + 1
}

export { tileCountForLevel, MAX_PIT_TILES }
