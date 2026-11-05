import { makeRng } from "./generator.js"
import { simulateEscape } from "./snake.js"

/** Ant-queue difficulty modes. */
export const ANT_MODE = {
	EASY: "easy",
	PARK: "park",
	SWAP: "swap",
}

/**
 * Tunables for ant order and locked dock lanes.
 * Edit here only — gameplay reads the helpers below.
 */
export const DIFFICULTY = {
	/** Levels 1..easyThroughLevel use contiguous solution ant blocks. */
	easyThroughLevel: 4,
	/** Levels easyThroughLevel+1 .. parkThroughLevel force parking before fill. */
	parkThroughLevel: 11,
	/** Levels above parkThroughLevel use inter-swapped ants (still solvable). */
	/** First level that reserves dock lanes behind a rewarded ad. */
	lockedLanesFromLevel: 5,
	/** How many bottom lanes start locked when locking is active. */
	lockedLaneCount: 1,
	/** Show the lives refill button when lives are below this. */
	livesRefillShowBelow: 3,
	/** How many lives a rewarded ad restores. */
	livesRefillAmount: 2,
	/** Random attempts when searching for a harder ant order. */
	parkAttempts: 48,
	swapAttempts: 64,
}

/**
 * @param {number} lives
 * @returns {boolean}
 */
export function shouldShowLivesRefill(lives) {
	return (lives | 0) < DIFFICULTY.livesRefillShowBelow
}

/**
 * @returns {number}
 */
export function livesRefillAmount() {
	return Math.max(0, DIFFICULTY.livesRefillAmount | 0)
}

/**
 * @param {number} level
 * @returns {typeof ANT_MODE[keyof typeof ANT_MODE]}
 */
export function antModeForLevel(level) {
	const n = Math.max(1, level | 0)
	if (n <= DIFFICULTY.easyThroughLevel) return ANT_MODE.EASY
	if (n <= DIFFICULTY.parkThroughLevel) return ANT_MODE.PARK
	return ANT_MODE.SWAP
}

/**
 * @param {number} level
 * @returns {number}
 */
export function lockedLaneCountForLevel(level) {
	const n = Math.max(1, level | 0)
	if (n < DIFFICULTY.lockedLanesFromLevel) return 0
	return Math.max(0, DIFFICULTY.lockedLaneCount | 0)
}

/**
 * Split a color run list into contiguous blocks.
 * @param {number[]} colors
 * @returns {{ color: number, n: number }[]}
 */
export function colorBlocks(colors) {
	/** @type {{ color: number, n: number }[]} */
	const blocks = []
	for (const c of colors) {
		const last = blocks[blocks.length - 1]
		if (last && last.color === c) last.n++
		else blocks.push({ color: c, n: 1 })
	}
	return blocks
}

/**
 * @param {{ color: number, n: number }[]} blocks
 * @returns {number[]}
 */
export function flattenBlocks(blocks) {
	/** @type {number[]} */
	const out = []
	for (const b of blocks) {
		for (let i = 0; i < b.n; i++) out.push(b.color)
	}
	return out
}

/**
 * Whether the ant FIFO can clear with the given lane budget (matching dock rules:
 * board front ant onto any parked matching snake; full snakes leave; player parks
 * any currently escapable snake into a free lane).
 *
 * @param {number[]} colors
 * @param {{ id:number, color:number, dir:number, cells:{q:number,r:number}[], escaped?:boolean }[]} snakes
 * @param {import('./board.js').Board | number} board
 * @param {{q:number,r:number}[]} [rocks]
 * @param {number} laneCount
 * @returns {{ ok: boolean, maxParked: number }}
 */
export function analyzeAntQueue(colors, snakes, board, rocks = [], laneCount = 1) {
	const lanes = Math.max(1, laneCount | 0)
	const initial = snakes.map((s) => ({
		id: s.id,
		color: s.color,
		dir: s.dir,
		cells: (s.cells || []).map((c) => ({ q: c.q, r: c.r })),
		escaped: !!s.escaped,
		cap: Math.max(1, s.cells?.length ?? 1),
	}))
	const antColors = colors.slice()
	/** @type {Map<string, boolean>} */
	const seen = new Map()
	let bestMax = 0
	let solved = false

	/**
	 * @param {typeof initial} live
	 * @param {{ id:number, color:number, filled:number, cap:number }[]} parkedIn
	 * @param {number} antIndex
	 * @param {number} maxParked
	 */
	const dfs = (live, parkedIn, antIndex, maxParked) => {
		const parked = parkedIn.map((p) => ({ ...p }))
		maxParked = Math.max(maxParked, parked.length)
		// Auto-board matching ants; full snakes leave immediately.
		let guard = antColors.length + live.length + 4
		while (guard-- > 0) {
			if (antIndex >= antColors.length) break
			const front = antColors[antIndex]
			const idx = parked.findIndex((p) => p.color === front && p.filled < p.cap)
			if (idx < 0) break
			parked[idx].filled++
			antIndex++
			maxParked = Math.max(maxParked, parked.length)
			if (parked[idx].filled >= parked[idx].cap) parked.splice(idx, 1)
		}
		const allEscaped = live.every((s) => s.escaped)
		if (antIndex >= antColors.length && allEscaped && parked.length === 0) {
			solved = true
			bestMax = Math.max(bestMax, maxParked)
			return true
		}

		const key =
			antIndex +
			"|" +
			live.map((s) => (s.escaped ? "1" : "0")).join("") +
			"|" +
			parked.map((p) => `${p.id}:${p.filled}`).join(",")
		if (seen.has(key)) return false
		seen.set(key, true)
		if (seen.size > 8000) return false

		const free = lanes - parked.length
		if (free <= 0) return false

		const ready = live
			.filter((s) => !s.escaped && s.cells.length && simulateEscape(s, live, board, rocks).ok)
			.sort((a, b) => b.id - a.id)
		if (!ready.length) return false

		for (const snake of ready) {
			const cells = snake.cells
			snake.escaped = true
			snake.cells = []
			const nextParked = [
				...parked,
				{ id: snake.id, color: snake.color, filled: 0, cap: snake.cap },
			]
			const ok = dfs(live, nextParked, antIndex, maxParked)
			snake.escaped = false
			snake.cells = cells
			if (ok) return true
		}
		return false
	}

	dfs(initial, [], 0, 0)
	return { ok: solved, maxParked: bestMax }
}

/**
 * @param {number[]} colors
 * @param {Parameters<typeof analyzeAntQueue>[1]} snakes
 * @param {Parameters<typeof analyzeAntQueue>[2]} board
 * @param {{q:number,r:number}[]} [rocks]
 * @param {number} laneCount
 */
export function isAntQueueSolvable(colors, snakes, board, rocks = [], laneCount = 1) {
	return analyzeAntQueue(colors, snakes, board, rocks, laneCount).ok
}

/**
 * @param {number[]} arr
 * @param {() => number} rng
 */
function shuffleInPlace(arr, rng) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

/**
 * Reorder whole color blocks so play often needs to park before fill.
 * @param {number[]} base
 * @param {object} ctx
 * @param {() => number} rng
 */
function hardenPark(base, ctx, rng) {
	const { snakes, board, rocks, laneCount } = ctx
	const blocks = colorBlocks(base)
	if (blocks.length <= 1 || laneCount < 2) return base.slice()

	let best = base.slice()
	let bestScore = -1
	const baseAnalysis = analyzeAntQueue(base, snakes, board, rocks, laneCount)
	if (baseAnalysis.ok) {
		bestScore = baseAnalysis.maxParked
	}

	const attempts = Math.max(8, DIFFICULTY.parkAttempts | 0)
	for (let a = 0; a < attempts; a++) {
		const perm = shuffleInPlace(blocks.map((b) => ({ ...b })), rng)
		// Mild bias: put the original first block later so ants don't match the first exit.
		if (a % 3 === 0 && perm.length > 1) {
			const first = perm.shift()
			perm.splice(1 + Math.floor(rng() * (perm.length - 1)), 0, first)
		}
		const colors = flattenBlocks(perm)
		const analysis = analyzeAntQueue(colors, snakes, board, rocks, laneCount)
		if (!analysis.ok) continue
		const score = analysis.maxParked * 10 + (colors[0] !== base[0] ? 2 : 0)
		if (score > bestScore) {
			bestScore = score
			best = colors
			if (analysis.maxParked >= 2 && colors[0] !== base[0]) break
		}
	}
	return best
}

/**
 * Cross-block ant swaps on a park-hardened queue; keep only solvable results.
 * @param {number[]} base
 * @param {object} ctx
 * @param {() => number} rng
 */
function hardenSwap(base, ctx, rng) {
	const { snakes, board, rocks, laneCount } = ctx
	let best = hardenPark(base, ctx, rng)
	if (best.length < 2) return best

	const attempts = Math.max(8, DIFFICULTY.swapAttempts | 0)
	for (let a = 0; a < attempts; a++) {
		const colors = best.slice()
		const swaps = 1 + Math.floor(rng() * Math.min(4, Math.max(1, colors.length / 3)))
		for (let s = 0; s < swaps; s++) {
			const i = Math.floor(rng() * colors.length)
			let j = Math.floor(rng() * colors.length)
			if (i === j) j = (j + 1) % colors.length
			if (colors[i] === colors[j]) continue
			;[colors[i], colors[j]] = [colors[j], colors[i]]
		}
		const analysis = analyzeAntQueue(colors, snakes, board, rocks, laneCount)
		if (!analysis.ok) continue
		if (analysis.maxParked >= 2 || a > attempts / 2) {
			best = colors
			if (analysis.maxParked >= 2) break
		}
	}
	return best
}

/**
 * Apply level ant-queue difficulty on top of {@link solutionAntColors} output.
 *
 * @param {typeof ANT_MODE[keyof typeof ANT_MODE]} mode
 * @param {number[]} base
 * @param {{
 *   snakes: Parameters<typeof analyzeAntQueue>[1],
 *   board: Parameters<typeof analyzeAntQueue>[2],
 *   rocks?: {q:number,r:number}[],
 *   laneCount: number,
 *   seed?: number,
 * }} ctx
 * @returns {number[]}
 */
export function applyAntDifficulty(mode, base, ctx) {
	if (!base?.length) return []
	if (mode === ANT_MODE.EASY || !mode) return base.slice()
	const seed = (ctx.seed ?? 1) >>> 0
	const rng = makeRng(seed ^ 0xa27e91c3)
	const fullCtx = {
		snakes: ctx.snakes,
		board: ctx.board,
		rocks: ctx.rocks || [],
		laneCount: Math.max(1, ctx.laneCount | 0),
	}
	if (mode === ANT_MODE.PARK) return hardenPark(base, fullCtx, rng)
	if (mode === ANT_MODE.SWAP) return hardenSwap(base, fullCtx, rng)
	return base.slice()
}
