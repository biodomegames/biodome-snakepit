import { hexDistance, hexKey, hexRing, neighbor, turnSteps } from "./hex.js"
import { createBoard } from "./board.js"
import {
	generatePitShape,
	irregularityForLevel,
	tileCountForLevel,
} from "./pitShape.js"
import {
	buildOccupancy,
	canEscape,
	cellsOverlap,
	exitRay,
	facesOwnBody,
	pathConnected,
	pathTurnsOk,
	simulateEscape,
} from "./snake.js"

const SNAKE_COLORS = [0x3ea860, 0xdc4646, 0x4678dc, 0xd4a017, 0x9b59b6, 0x1abc9c]

/** Mulberry32 */
export function makeRng(seed) {
	let t = seed >>> 0
	return function rng() {
		t += 0x6d2b79f5
		let r = Math.imul(t ^ (t >>> 15), 1 | t)
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296
	}
}

function pick(rng, arr) {
	return arr[Math.floor(rng() * arr.length)]
}

function shuffle(rng, arr) {
	const a = arr.slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

function freeCells(existing, board, rocks = []) {
	const occ = buildOccupancy(existing, rocks)
	return board.cells.filter((c) => !occ.has(hexKey(c)))
}

function makeSnake(id, cells, dir) {
	return {
		id,
		cells,
		dir,
		color: SNAKE_COLORS[id % SNAKE_COLORS.length],
	}
}

function growCoil(start, dir, length, forbidden, board, rng) {
	/** @type {{ q: number, r: number }[]} */
	const cells = [{ ...start }]
	const used = new Set([hexKey(start)])
	used.add(hexKey(neighbor(start, dir)))
	let cur = start
	let travel = (dir + 3) % 6

	for (let n = 1; n < length; n++) {
		/** @type {number[]} */
		const candidates = []
		for (const turn of [0, 1, -1, 2, -2]) {
			const nd = (travel + turn + 6) % 6
			if (turnSteps(travel, nd) === 3) continue
			const next = neighbor(cur, nd)
			if (!board.has(next)) continue
			const k = hexKey(next)
			if (used.has(k) || forbidden.has(k)) continue
			candidates.push(nd)
		}
		if (!candidates.length) return null
		const bent = candidates.filter((d) => turnSteps(travel, d) > 0)
		const pool = n > 1 && bent.length && rng() < 0.7 ? bent : candidates
		const nd = pick(rng, pool)
		cur = neighbor(cur, nd)
		cells.push(cur)
		used.add(hexKey(cur))
		travel = nd
	}

	if (!pathConnected(cells) || !pathTurnsOk(cells)) return null
	return cells
}

function snakeOk(snake, all, board, rocks = []) {
	if (facesOwnBody(snake)) return false
	return canEscape(snake, all, board, rocks)
}

function blocksSomeone(existing, all, board, rocks = []) {
	for (const s of existing) {
		if (canEscape(s, existing, board, rocks) && !canEscape(s, all, board, rocks)) {
			return true
		}
	}
	return false
}

function placeSeedSnake(board, length, rng, nextId, rocks = []) {
	const rockKeys = new Set(rocks.map(hexKey))
	const cellsOnBoard = shuffle(
		rng,
		board.cells.filter((c) => !rockKeys.has(hexKey(c))),
	)
	const dirs = shuffle(rng, [0, 1, 2, 3, 4, 5])
	for (const start of cellsOnBoard) {
		for (const dir of dirs) {
			const cells = growCoil(start, dir, length, rockKeys, board, rng)
			if (!cells) continue
			const snake = makeSnake(nextId, cells, dir)
			if (snakeOk(snake, [snake], board, rocks)) return snake
		}
	}
	return null
}

function growCoilFromIndex(anchor, index, dir, length, occupied, board, rng) {
	const forbidden = new Set(occupied.keys())
	if (index === 0) return growCoil(anchor, dir, length, forbidden, board, rng)
	const heads = shuffle(rng, board.cells).filter((h) => !forbidden.has(hexKey(h)))
	for (const start of heads.slice(0, 48)) {
		const cells = growCoil(start, dir, length, forbidden, board, rng)
		if (!cells) continue
		if (cells.some((c) => c.q === anchor.q && c.r === anchor.r)) return cells
	}
	return null
}

function placeEscapingSnake(existing, board, rng, nextId, opts = {}) {
	const rocks = opts.rocks ?? []
	const occupied = buildOccupancy(existing, rocks)
	const free = freeCells(existing, board, rocks)
	if (!free.length) return null

	const mustBlock = opts.mustBlock === true
	const maxLen = Math.min(opts.maxLength ?? 7, free.length)
	const minLen = Math.min(opts.minLength ?? 1, maxLen)
	const lengths =
		opts.lengths ??
		shuffle(
			rng,
			Array.from({ length: maxLen - minLen + 1 }, (_, i) => maxLen - i),
		)
	const dirs = shuffle(rng, [0, 1, 2, 3, 4, 5])

	if (existing.length && mustBlock) {
		const blockTargets = []
		for (const s of existing) {
			const next = neighbor(s.cells[0], s.dir)
			if (board.has(next) && !occupied.has(hexKey(next))) blockTargets.push(next)
			for (const c of exitRay(s, board)) {
				if (!occupied.has(hexKey(c))) blockTargets.push(c)
			}
		}
		const targets = shuffle(
			rng,
			blockTargets.filter((c) => free.some((f) => f.q === c.q && f.r === c.r)),
		)
		if (targets.length) {
			for (const target of targets) {
				for (const length of lengths) {
					for (const dir of dirs) {
						for (let bi = 0; bi < length; bi++) {
							const cells = growCoilFromIndex(
								target,
								bi,
								dir,
								length,
								occupied,
								board,
								rng,
							)
							if (!cells) continue
							if (cellsOverlap(cells, existing.flatMap((s) => s.cells))) continue
							const snake = makeSnake(nextId, cells, dir)
							const all = [...existing, snake]
							if (!snakeOk(snake, all, board, rocks)) continue
							if (!blocksSomeone(existing, all, board, rocks)) continue
							return snake
						}
					}
				}
			}
			if (mustBlock) return null
		}
	}

	const starts = shuffle(rng, free)
	const headLimit = opts.headTries ?? Math.min(starts.length, 80)
	for (const length of lengths) {
		for (const start of starts.slice(0, headLimit)) {
			for (const dir of dirs) {
				const cells = growCoil(start, dir, length, new Set(occupied.keys()), board, rng)
				if (!cells) continue
				const snake = makeSnake(nextId, cells, dir)
				const all = [...existing, snake]
				if (!snakeOk(snake, all, board, rocks)) continue
				if (mustBlock && !blocksSomeone(existing, all, board, rocks)) continue
				return snake
			}
		}
	}
	return null
}

function reverseSolvable(placed, board, rocks = []) {
	const test = placed.map((s) => ({
		...s,
		cells: s.cells.map((c) => ({ ...c })),
		escaped: false,
	}))
	for (let i = test.length - 1; i >= 0; i--) {
		if (!simulateEscape(test[i], test, board, rocks).ok) return false
		test[i].escaped = true
		test[i].cells = []
	}
	return true
}

function cellsTouchedInSolve(snakes, board, rocks = [], opts = {}) {
	const includeOffBoard = opts.includeOffBoard === true
	/** @type {Set<string>} */
	const touched = new Set()
	const test = snakes.map((s) => ({
		...s,
		cells: s.cells.map((c) => ({ ...c })),
		escaped: false,
	}))
	for (let i = test.length - 1; i >= 0; i--) {
		const sim = simulateEscape(test[i], test, board, rocks)
		if (!sim.ok) return null
		for (const step of sim.steps) {
			for (const c of step) {
				if (includeOffBoard || board.has(c)) touched.add(hexKey(c))
			}
		}
		test[i].escaped = true
		test[i].cells = []
	}
	return touched
}

function pickInteriorRocks(snakes, board) {
	const touched = cellsTouchedInSolve(snakes, board, [])
	if (!touched) return []
	const occ = buildOccupancy(snakes)
	return board.cells
		.filter((c) => !occ.has(hexKey(c)) && !touched.has(hexKey(c)))
		.map((c) => ({ q: c.q, r: c.r }))
}

function boardPerimeter(board) {
	/** @type {Map<string, { q: number, r: number }>} */
	const rim = new Map()
	for (const c of board.cells) {
		for (let d = 0; d < 6; d++) {
			const n = neighbor(c, d)
			if (!board.has(n)) rim.set(hexKey(n), n)
		}
	}
	return [...rim.values()]
}

function pickRimRocks(snakes, board, rocks, rng) {
	const touched = cellsTouchedInSolve(snakes, board, rocks, { includeOffBoard: true })
	if (!touched) return []
	return shuffle(rng, boardPerimeter(board))
		.filter((c) => !touched.has(hexKey(c)))
		.filter(() => rng() < 0.85)
		.map((c) => ({ q: c.q, r: c.r }))
}

function pickRimGrass(board, rimRocks, rng) {
	const used = new Set(rimRocks.map(hexKey))
	const rad = board.radius
	/** @type {{ q: number, r: number }[]} */
	const pool = []
	for (let r = rad + 1; r <= rad + 10; r++) {
		for (const c of hexRing(r)) {
			if (used.has(hexKey(c)) || board.has(c)) continue
			pool.push(c)
		}
	}
	return shuffle(rng, pool)
		.filter((c) => {
			const d = hexDistance(c, { q: 0, r: 0 }) - rad
			const density = d <= 2 ? 0.55 : d <= 4 ? 0.35 : d <= 7 ? 0.2 : 0.1
			return rng() < density
		})
		.map((c) => ({
			q: c.q,
			r: c.r,
			variant: rng() < 0.5 ? 0 : 1,
		}))
}

/**
 * @param {{
 *   seed?: number,
 *   level?: number,
 *   tileCount?: number,
 *   minLength?: number,
 *   maxLength?: number,
 *   maxAttempts?: number,
 * }} opts
 */
export function generateLevel(opts = {}) {
	const seed = opts.seed ?? (Math.floor(Math.random() * 0xffffffff) >>> 0)
	const level = Math.max(1, opts.level ?? 1)
	const tileCount = opts.tileCount ?? tileCountForLevel(level)
	const minLength = opts.minLength ?? (tileCount <= 10 ? 2 : 2)
	const maxLength = opts.maxLength ?? Math.min(6, Math.max(3, Math.floor(tileCount / 4)))
	const maxAttempts = opts.maxAttempts ?? 100
	const irreg = irregularityForLevel(level)

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const rng = makeRng((seed + attempt * 9973) >>> 0)
		const shape = generatePitShape(tileCount, rng, { irregularity: irreg })
		const board = createBoard(shape)
		const totalCells = board.cells.length
		const gapBudget = Math.min(5, Math.max(0, Math.floor(totalCells / 8)))
		const fillTarget = Math.max(totalCells - gapBudget, Math.ceil(totalCells * 0.82))

		/** @type {import('./snake.js').Snake[]} */
		const placed = []
		let nextId = 0
		const len0 = Math.min(
			maxLength,
			Math.max(minLength, 2 + Math.floor(rng() * (maxLength - 1))),
		)
		const first = placeSeedSnake(board, len0, rng, nextId++)
		if (!first) continue
		placed.push(first)

		let ok = true
		while (buildOccupancy(placed).size < fillTarget) {
			const free = freeCells(placed, board).length
			if (free <= 0) break
			const lo = 1
			const hi = Math.min(maxLength, free)
			const tryBlock = placed.length > 0 && free > Math.max(2, totalCells * 0.15)
			let s = null
			if (tryBlock) {
				s = placeEscapingSnake(placed, board, rng, nextId, {
					mustBlock: true,
					minLength: Math.min(minLength, hi),
					maxLength: hi,
				})
			}
			if (!s) {
				s = placeEscapingSnake(placed, board, rng, nextId, {
					mustBlock: false,
					minLength: lo,
					maxLength: hi,
					headTries: Math.min(free, 100),
				})
			}
			if (!s) {
				ok = false
				break
			}
			placed.push(s)
			nextId++
		}
		if (!ok) continue
		if (buildOccupancy(placed).size < Math.max(3, fillTarget - 2)) continue
		if (!reverseSolvable(placed, board)) continue

		const rocks = pickInteriorRocks(placed, board)
		if (!reverseSolvable(placed, board, rocks)) continue
		const rimRocks = pickRimRocks(placed, board, rocks, rng)
		const rimGrass = pickRimGrass(board, rimRocks, rng)

		return {
			seed: (seed + attempt * 9973) >>> 0,
			level,
			board,
			boardRadius: board.radius,
			boardCells: board.cells,
			snakes: placed,
			rocks,
			rimRocks,
			rimGrass,
		}
	}

	// Fallback: tiny radius-1 disc
	const rng = makeRng(seed)
	const board = createBoard(generatePitShape(7, rng, { irregularity: 0 }))
	const s = placeSeedSnake(board, 3, rng, 0)
	const snakes = s
		? [s]
		: [
				{
					id: 0,
					cells: [
						{ q: 0, r: 0 },
						{ q: -1, r: 0 },
						{ q: 1, r: -1 },
					],
					dir: 0,
					color: SNAKE_COLORS[0],
				},
			]
	const rimRocks = pickRimRocks(snakes, board, [], rng)
	return {
		seed,
		level,
		board,
		boardRadius: board.radius,
		boardCells: board.cells,
		snakes,
		rocks: [],
		rimRocks,
		rimGrass: pickRimGrass(board, rimRocks, rng),
	}
}
