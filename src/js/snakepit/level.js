import { createBoard } from "./board.js"
import { generateLevel } from "./generator.js"
import { tileCountForLevel } from "./pitShape.js"
import { cloneSnake, findSnakeAt, simulateEscape } from "./snake.js"
import { hexEq } from "./hex.js"

/**
 * Mutable play session over a generated level.
 */
export class LevelSession {
	/**
	 * @param {{
	 *   seed?: number,
	 *   level?: number,
	 *   tileCount?: number,
	 * }} opts
	 */
	constructor(opts = {}) {
		this.opts = opts
		/** @type {Set<number>} */
		this.moving = new Set()
		this.escapedCount = 0
		this.onChange = null
		this.level = Math.max(1, opts.level ?? 1)
		this.reload(opts.seed)
	}

	reload(seed) {
		const level = generateLevel({
			...this.opts,
			level: this.level,
			tileCount: this.opts.tileCount ?? tileCountForLevel(this.level),
			seed,
		})
		this.seed = level.seed
		this.level = level.level ?? this.level
		this.board = level.board ?? createBoard(level.boardCells || [])
		this.boardRadius = this.board.radius
		this.boardCells = this.board.cells
		this.snakes = level.snakes.map((s) => cloneSnake(s))
		this.rocks = (level.rocks || []).map((c) => ({ q: c.q, r: c.r }))
		this.rimRocks = (level.rimRocks || []).map((c) => ({ q: c.q, r: c.r }))
		this.rimGrass = (level.rimGrass || []).map((c) => ({
			q: c.q,
			r: c.r,
			variant: c.variant ?? 0,
		}))
		this.escapedCount = 0
		this.moving.clear()
		this._emit()
	}

	newLevel() {
		this.reload((Math.floor(Math.random() * 0xffffffff) >>> 0))
	}

	remaining() {
		return this.snakes.filter((s) => !s.escaped).length
	}

	total() {
		return this.snakes.length
	}

	snakeAt(hex) {
		return findSnakeAt(this.snakes, hex)
	}

	isMoving(snakeId) {
		return this.moving.has(snakeId)
	}

	anyMoving() {
		return this.moving.size > 0
	}

	beginMove(snakeId) {
		this.moving.add(snakeId)
	}

	endMove(snakeId) {
		this.moving.delete(snakeId)
	}

	tryEscape(snakeId) {
		if (this.moving.has(snakeId)) return null
		const snake = this.snakes.find((s) => s.id === snakeId && !s.escaped)
		if (!snake) return null

		const sim = simulateEscape(snake, this.snakes, this.board, this.rocks)
		if (sim.ok) return { kind: "escaped", snake, steps: sim.steps }
		return { kind: "blocked", snake, steps: sim.steps }
	}

	commitEscape(snakeId) {
		const snake = this.snakes.find((s) => s.id === snakeId && !s.escaped)
		if (!snake) return
		snake.escaped = true
		snake.cells = []
		this.escapedCount++
		this._emit()
	}

	isWon() {
		return this.snakes.every((s) => s.escaped)
	}

	_emit() {
		this.onChange?.(this)
	}
}

export function pickSnake(session, hex) {
	if (!hex) return null
	return session.snakeAt(hex)
}

export function sameHex(a, b) {
	return a && b && hexEq(a, b)
}
