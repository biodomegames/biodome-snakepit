import { hexDisc, hexDistance, hexKey, inDisc } from "./hex.js"

/**
 * @typedef {{ q: number, r: number }} Hex
 * @typedef {{
 *   cells: Hex[],
 *   keySet: Set<string>,
 *   radius: number,
 *   has: (h: Hex) => boolean,
 * }} Board
 */

/**
 * @param {Hex[]} cells
 * @returns {Board}
 */
export function createBoard(cells) {
	const keySet = new Set(cells.map(hexKey))
	let radius = 0
	for (const c of cells) radius = Math.max(radius, hexDistance(c, { q: 0, r: 0 }))
	return {
		cells: cells.map((c) => ({ q: c.q, r: c.r })),
		keySet,
		radius,
		has(h) {
			return keySet.has(hexKey(h))
		},
	}
}

/** @param {Board | number} board */
export function boardHas(board, h) {
	if (typeof board === "number") return inDisc(h, board)
	return board.has(h)
}

/** @param {Board | number} board */
export function boardRadiusOf(board) {
	if (typeof board === "number") return board
	return board.radius
}

/** @param {Board | number} board */
export function boardCellsOf(board) {
	if (typeof board === "number") return hexDisc(board)
	return board.cells
}
