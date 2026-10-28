/** Flat-top axial hex helpers (q, r). Dir 0 = +q (east), then CCW. */

export const HEX_DIRS = [
	{ q: 1, r: 0 },
	{ q: 1, r: -1 },
	{ q: 0, r: -1 },
	{ q: -1, r: 0 },
	{ q: -1, r: 1 },
	{ q: 0, r: 1 },
]

/**
 * Pixel angles for flat-top dir 0..5 (radians, y-down).
 * Derived from {@link hexToPixel} deltas — not 0/60/120, because +q is 30° off +x.
 */
export const HEX_DIR_ANGLE = HEX_DIRS.map((d) => {
	const dx = (3 / 2) * d.q
	const dy = (Math.sqrt(3) / 2) * d.q + Math.sqrt(3) * d.r
	return Math.atan2(dy, dx)
})

export function hexKey(h) {
	return `${h.q},${h.r}`
}

export function hexEq(a, b) {
	return a.q === b.q && a.r === b.r
}

export function hexAdd(a, b) {
	return { q: a.q + b.q, r: a.r + b.r }
}

export function neighbor(h, dir) {
	const d = HEX_DIRS[((dir % 6) + 6) % 6]
	return hexAdd(h, d)
}

export function hexDistance(a, b) {
	const aq = a.q
	const ar = a.r
	const as_ = -aq - ar
	const bq = b.q
	const br = b.r
	const bs = -bq - br
	return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs(as_ - bs))
}

/** Direction index from a → b if adjacent, else -1. */
export function dirBetween(a, b) {
	const dq = b.q - a.q
	const dr = b.r - a.r
	for (let i = 0; i < 6; i++) {
		if (HEX_DIRS[i].q === dq && HEX_DIRS[i].r === dr) return i
	}
	return -1
}

/** Absolute turn in steps (1=60°, 2=120°, 3=180°). */
export function turnSteps(dirIn, dirOut) {
	return Math.min(Math.abs(dirOut - dirIn), 6 - Math.abs(dirOut - dirIn))
}

/** Cells in a hex disc of given radius (center 0,0). */
export function hexDisc(radius) {
	const cells = []
	for (let q = -radius; q <= radius; q++) {
		const r1 = Math.max(-radius, -q - radius)
		const r2 = Math.min(radius, -q + radius)
		for (let r = r1; r <= r2; r++) cells.push({ q, r })
	}
	return cells
}

export function inDisc(h, radius) {
	return hexDistance(h, { q: 0, r: 0 }) <= radius
}

/** Cells with exact distance `radius` from origin (hex ring). */
export function hexRing(radius) {
	if (radius <= 0) return [{ q: 0, r: 0 }]
	return hexDisc(radius).filter((c) => hexDistance(c, { q: 0, r: 0 }) === radius)
}

/**
 * Flat-top pixel center. size = distance center → vertex.
 * x right, y down.
 */
export function hexToPixel(h, size) {
	const x = size * ((3 / 2) * h.q)
	const y = size * ((Math.sqrt(3) / 2) * h.q + Math.sqrt(3) * h.r)
	return { x, y }
}

export function hexWidth(size) {
	return 2 * size
}

export function hexHeight(size) {
	return Math.sqrt(3) * size
}
