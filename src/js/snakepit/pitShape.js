import { hexDisc, hexDistance, hexKey, HEX_DIRS, neighbor } from "./hex.js"

/**
 * Target tile counts by 1-based level. Caps around a phone-friendly max (~55).
 * Level 1 = 7 (classic hex of radius 1).
 */
export const MAX_PIT_TILES = 55

export function tileCountForLevel(levelIndex) {
	const level = Math.max(1, levelIndex | 0)
	// 7, 10, 13, 16, 19, 23, 27, 32, 37, 42, 48, 55...
	const base = 7 + (level - 1) * 3
	const bump = level >= 6 ? Math.floor((level - 5) * 0.6) : 0
	return Math.min(MAX_PIT_TILES, base + bump)
}

/**
 * Grow an organic hex blob of exactly `count` cells.
 * Early levels stay compact; later levels elongate / get irregular.
 * @param {number} count
 * @param {() => number} rng
 * @param {{ irregularity?: number }} [opts] 0 = round, 1 = wild
 */
export function generatePitShape(count, rng, opts = {}) {
	const irregularity = opts.irregularity ?? 0
	const target = Math.max(1, count | 0)

	if (target <= 7 && irregularity < 0.25) {
		// Classic small disc
		return hexDisc(1).slice(0, Math.min(7, target))
	}

	/** @type {{ q: number, r: number }[]} */
	const cells = [{ q: 0, r: 0 }]
	const used = new Set([hexKey(cells[0])])

	// Prefer growth along a random primary axis for elongation on later pits.
	const axis = Math.floor(rng() * 6)
	const axisDir = HEX_DIRS[axis]
	const antiDir = HEX_DIRS[(axis + 3) % 6]

	while (cells.length < target) {
		/** @type {{ q: number, r: number }[]} */
		const frontier = []
		for (const c of cells) {
			for (let d = 0; d < 6; d++) {
				const n = neighbor(c, d)
				if (!used.has(hexKey(n))) frontier.push(n)
			}
		}
		if (!frontier.length) break

		// Score candidates: compact vs elongated vs irregular
		let best = frontier[0]
		let bestScore = -Infinity
		for (const n of frontier) {
			const dist = hexDistance(n, { q: 0, r: 0 })
			const along =
				n.q * axisDir.q +
				n.r * axisDir.r +
				n.q * antiDir.q +
				n.r * antiDir.r
			const noise = rng()
			let score = 0
			if (irregularity < 0.35) {
				// Prefer filling inward / staying round
				score = -dist * 2 + noise * 0.5
			} else if (irregularity < 0.7) {
				// Mild stretch
				score = along * 0.8 - dist * 0.6 + noise
			} else {
				// Wilder lobes
				score = along * (0.5 + irregularity) - dist * 0.2 + noise * 2.2
				// Occasional dig into a pocket
				if (noise > 0.92) score += 3
			}
			if (score > bestScore) {
				bestScore = score
				best = n
			}
		}
		cells.push({ q: best.q, r: best.r })
		used.add(hexKey(best))
	}

	return cells
}

/** Irregularity 0..1 from level index. */
export function irregularityForLevel(levelIndex) {
	const level = Math.max(1, levelIndex | 0)
	if (level <= 2) return 0.05
	if (level <= 4) return 0.25
	if (level <= 7) return 0.45
	if (level <= 10) return 0.65
	return Math.min(0.95, 0.55 + level * 0.03)
}
