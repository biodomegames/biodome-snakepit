import { MAX_PIT_TILES, tileCountForLevel } from "./pitShape.js"

const KEY_LEVEL = "SnakepitLevel"
const KEY_SEED = "SnakepitLevelSeed"
const KEY_RUN = "SnakepitRun"

function randomSeed() {
	return (Math.floor(Math.random() * 0xffffffff) >>> 0)
}

/**
 * @returns {{
 *   level: number,
 *   seed: number,
 *   lives: number | null,
 *   snakes: object[] | null,
 *   antColors: number[] | null,
 *   unlockedLanes: number,
 *   parked: object[],
 * }}
 */
export function loadProgress() {
	const bdata = window.bdata
	const level = Math.max(1, Number(bdata?.get?.(KEY_LEVEL, 1)) || 1)
	const seed = Number(bdata?.get?.(KEY_SEED, 0)) || 0
	const run = bdata?.get?.(KEY_RUN, null)
	if (
		run &&
		typeof run === "object" &&
		(run.level | 0) === level &&
		(run.seed >>> 0) === (seed >>> 0)
	) {
		return {
			level,
			seed,
			lives: Number.isFinite(run.lives) ? Math.max(0, run.lives | 0) : null,
			snakes: Array.isArray(run.snakes) ? run.snakes : null,
			antColors: Array.isArray(run.antColors) ? run.antColors : null,
			unlockedLanes: Math.max(0, run.unlockedLanes | 0),
			parked: Array.isArray(run.parked) ? run.parked : [],
		}
	}
	return {
		level,
		seed,
		lives: null,
		snakes: null,
		antColors: null,
		unlockedLanes: 0,
		parked: [],
	}
}

/**
 * @param {number} level
 * @param {number} [seed]
 * @param {{
 *   lives: number,
 *   snakes: object[],
 *   antColors: number[],
 *   unlockedLanes?: number,
 *   parked?: object[],
 * } | null} [run]
 */
export function saveProgress(level, seed, run = null) {
	const bdata = window.bdata
	if (!bdata?.set) return
	const lvl = Math.max(1, level | 0)
	bdata.set(KEY_LEVEL, lvl)
	if (seed != null) bdata.set(KEY_SEED, seed >>> 0)
	if (run == null) {
		bdata.set(KEY_RUN, null)
		return
	}
	bdata.set(KEY_RUN, {
		level: lvl,
		seed: seed >>> 0,
		lives: Math.max(0, run.lives | 0),
		snakes: run.snakes || [],
		antColors: run.antColors || [],
		unlockedLanes: Math.max(0, run.unlockedLanes | 0),
		parked: run.parked || [],
	})
}

export function resetProgress() {
	const seed = randomSeed()
	saveProgress(1, seed, null)
	return loadProgress()
}

export function nextLevelIndex(level) {
	return (level | 0) + 1
}

export { tileCountForLevel, MAX_PIT_TILES }
