import { hexEq, hexKey, neighbor, turnSteps, dirBetween } from "./hex.js"
import { boardHas, boardRadiusOf } from "./board.js"

/**
 * @typedef {{ q: number, r: number }} Hex
 * @typedef {{
 *   id: number,
 *   cells: Hex[],
 *   dir: number,
 *   color: number,
 *   escaped?: boolean,
 * }} Snake
 * @typedef {import('./board.js').Board | number} BoardRef
 */

/** Occupancy id used for permanent rocks. */
export const ROCK_ID = -1

/** Occupancy map: key → snake id (or {@link ROCK_ID}). */
export function buildOccupancy(snakes, rocks = []) {
	/** @type {Map<string, number>} */
	const map = new Map()
	for (const s of snakes) {
		if (s.escaped) continue
		for (const c of s.cells) map.set(hexKey(c), s.id)
	}
	for (const r of rocks) map.set(hexKey(r), ROCK_ID)
	return map
}

/**
 * True if the head's next cell is still occupied by this snake after one slide
 * (any body cell except the vacating tip of the tail).
 */
export function facesOwnBody(snake) {
	if (!snake.cells.length) return false
	const next = neighbor(snake.cells[0], snake.dir)
	const k = hexKey(next)
	for (let i = 0; i < snake.cells.length - 1; i++) {
		if (hexKey(snake.cells[i]) === k) return true
	}
	return false
}

/**
 * One chain-slide step forward for snake. Returns new cells, or null if blocked.
 * Length is preserved: off-board hexes stay so the snake can animate fully off-screen.
 * Own body blocks (no self-crossing); the current tail tip vacates and is allowed.
 * @param {BoardRef} board
 */
export function stepForward(snake, occupancy, board) {
	const head = snake.cells[0]
	const next = neighbor(head, snake.dir)
	const nextOnBoard = boardHas(board, next)
	const k = hexKey(next)

	if (nextOnBoard) {
		const blocker = occupancy.get(k)
		if (blocker != null && blocker !== snake.id) return null
	}
	for (let i = 0; i < snake.cells.length - 1; i++) {
		if (hexKey(snake.cells[i]) === k) return null
	}

	/** @type {Hex[]} */
	const newCells = [next]
	for (let i = 0; i < snake.cells.length - 1; i++) {
		newCells.push(snake.cells[i])
	}
	return newCells
}

/** @param {BoardRef} board */
function allOffBoard(cells, board) {
	return cells.length > 0 && cells.every((c) => !boardHas(board, c))
}

/**
 * Simulate escape attempt.
 * @param {BoardRef} board
 * @param {Hex[]} [rocks]
 */
export function simulateEscape(snake, snakes, board, rocks = []) {
	const others = snakes.filter((s) => s.id !== snake.id && !s.escaped)
	/** @type {Hex[][]} */
	const steps = [snake.cells.map((c) => ({ ...c }))]
	let cells = snake.cells.map((c) => ({ ...c }))
	const rad = boardRadiusOf(board)
	const maxSteps = snake.cells.length + rad * 6 + 16
	const padSteps = snake.cells.length + 2

	for (let n = 0; n < maxSteps; n++) {
		if (allOffBoard(cells, board)) {
			for (let p = 0; p < padSteps; p++) {
				const more = stepForward({ ...snake, cells }, new Map(), board)
				if (!more) break
				cells = more
				steps.push(cells.map((c) => ({ ...c })))
			}
			return { ok: true, steps, blockedAfter: steps.length - 1 }
		}
		const occ = buildOccupancy(
			[
				...others,
				{ ...snake, cells: cells.filter((c) => boardHas(board, c)) },
			],
			rocks,
		)
		const next = stepForward({ ...snake, cells }, occ, board)
		if (!next) {
			return { ok: false, steps, blockedAfter: steps.length - 1 }
		}
		cells = next
		steps.push(cells.map((c) => ({ ...c })))
	}
	return { ok: false, steps, blockedAfter: steps.length - 1 }
}

/** True if path only uses 60° or 120° turns (no 180° hairpins). Straight OK. */
export function pathTurnsOk(cells) {
	if (cells.length < 3) return true
	for (let i = 1; i < cells.length - 1; i++) {
		const travelIn = dirBetween(cells[i - 1], cells[i])
		const travelOut = dirBetween(cells[i], cells[i + 1])
		if (travelIn < 0 || travelOut < 0) return false
		const t = turnSteps(travelIn, travelOut)
		if (t === 3) return false
		if (t > 2) return false
	}
	return true
}

/** Path is connected adjacent steps. */
export function pathConnected(cells) {
	for (let i = 1; i < cells.length; i++) {
		if (dirBetween(cells[i - 1], cells[i]) < 0) return false
	}
	return true
}

export function snakeHead(snake) {
	return snake.cells[0]
}

export function cloneSnake(snake) {
	return {
		...snake,
		cells: snake.cells.map((c) => ({ ...c })),
	}
}

/** @param {BoardRef} board */
export function canEscape(snake, snakes, board, rocks = []) {
	return simulateEscape(snake, snakes, board, rocks).ok
}

/** @param {BoardRef} board */
export function exitRay(snake, board, max = 24) {
	/** @type {Hex[]} */
	const ray = []
	let c = snake.cells[0]
	for (let i = 0; i < max; i++) {
		c = neighbor(c, snake.dir)
		if (!boardHas(board, c)) break
		ray.push(c)
	}
	return ray
}

export function cellsOverlap(a, b) {
	const set = new Set(a.map(hexKey))
	return b.some((c) => set.has(hexKey(c)))
}

export function findSnakeAt(snakes, hex) {
	for (const s of snakes) {
		if (s.escaped) continue
		if (s.cells.some((c) => hexEq(c, hex))) return s
	}
	return null
}

/** Parked snakes at once. Half the pit, never more than this. */
export const MAX_LANES = 7

export function laneCountForSnakes(snakeCount) {
	const n = Math.max(0, snakeCount | 0)
	return Math.min(MAX_LANES, Math.max(1, Math.floor(n / 2)))
}

/**
 * Ant colors for a clear that does not leave ants behind.
 * Snakes exit in simulated solution order, at most {@link MAX_LANES} parked at once.
 * Each parked snake is filled from the front of the queue before the next one,
 * so index 0 is the first ant that should board.
 * @param {BoardRef} board
 * @param {Hex[]} [rocks]
 * @returns {number[]}
 */
export function solutionAntColors(snakes, board, rocks = []) {
	/** @type {Map<number, number>} */
	const caps = new Map()
	const test = snakes.map((s) => {
		const cap = Math.max(1, s.cells?.length ?? 1)
		caps.set(s.id, cap)
		return {
			id: s.id,
			color: s.color,
			dir: s.dir,
			cells: (s.cells || []).map((c) => ({ q: c.q, r: c.r })),
			escaped: false,
		}
	})
	const laneCount = laneCountForSnakes(test.length)
	/** @type {{ id: number, color: number, need: number }[]} */
	const parked = []
	/** @type {number[]} */
	const colors = []

	const escapable = () =>
		test.filter((s) => !s.escaped && s.cells.length && simulateEscape(s, test, board, rocks).ok)

	let guard = test.length * 8 + 4
	while (guard-- > 0 && (test.some((s) => !s.escaped) || parked.length)) {
		if (parked.length < laneCount) {
			const ready = escapable()
			if (ready.length) {
				// Highest id is the snake the generator placed last, which is the intended next exit.
				ready.sort((a, b) => b.id - a.id)
				const next = ready[0]
				next.escaped = true
				next.cells = []
				parked.push({ id: next.id, color: next.color, need: caps.get(next.id) ?? 1 })
				continue
			}
		}
		if (!parked.length) break
		const snake = parked[0]
		colors.push(snake.color)
		snake.need--
		if (snake.need <= 0) parked.shift()
	}

	for (const s of test) {
		if (s.escaped) continue
		const need = caps.get(s.id) ?? 1
		for (let i = 0; i < need; i++) colors.push(s.color)
	}
	for (const s of parked) {
		for (let i = 0; i < s.need; i++) colors.push(s.color)
	}
	return colors
}
