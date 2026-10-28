#!/usr/bin/env node
/**
 * Add "GAME OVER" sign (sprite + movieclip) to anima/tiles.anima and publish.
 * Keeps existing stage instances so other atlas frames stay published.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { call } from "./anima-rpc.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")
const animaPath = path.join(projectRoot, "anima", "tiles.anima")
const tubeDir = path.join(projectRoot, "src", "tube")
const SPRITE = "gameover_art"
const CLIP = "gameOver"

/** 5×5 bitmaps (rows top→bottom). */
const GLYPHS = {
	G: ["01110", "10000", "10111", "10001", "01110"],
	A: ["01110", "10001", "11111", "10001", "10001"],
	M: ["10001", "11011", "10101", "10001", "10001"],
	E: ["11111", "10000", "11110", "10000", "11111"],
	O: ["01110", "10001", "10001", "10001", "01110"],
	V: ["10001", "10001", "10001", "01010", "00100"],
	R: ["11110", "10001", "11110", "10100", "10010"],
}

const FILL = { r: 255, g: 236, b: 200, a: 255 }
const EDGE = { r: 72, g: 28, b: 22, a: 255 }
const BOARD = { r: 120, g: 48, b: 36, a: 255 }
const POST = { r: 88, g: 56, b: 36, a: 255 }
const CELL = 7
const LETTER_GAP = 4
const LINE_GAP = 8

async function exitToStage() {
	for (let i = 0; i < 8; i++) {
		const st = await call({ op: "get_status" })
		if ((st.edit_depth ?? 0) <= 0) return st
		try {
			await call({ op: "exit_symbol_edit" })
		} catch {
			break
		}
	}
	return call({ op: "get_status" })
}

async function ensureOpen() {
	const st = await call({ op: "get_status" })
	if (st.path === animaPath) return st
	if (fs.existsSync(animaPath)) {
		await call({ op: "open_document", path: animaPath })
		return call({ op: "get_status" })
	}
	throw new Error(`missing ${animaPath}`)
}

function libByName(library) {
	const map = {}
	for (const s of library.symbols || []) map[s.name] = s
	return map
}

async function rect(minX, minY, maxX, maxY, color) {
	await call({
		op: "create_rectangle",
		min: { x: minX, y: minY },
		max: { x: maxX, y: maxY },
		color,
	})
}

function lineWidth(word) {
	const cols = 5
	const letterW = cols * CELL
	return word.length * letterW + (word.length - 1) * LETTER_GAP
}

async function drawLine(word, xCenter, y0) {
	const cols = 5
	const rows = 5
	const letterW = cols * CELL
	const totalW = lineWidth(word)
	let x0 = xCenter - totalW / 2
	for (const ch of word) {
		const glyph = GLYPHS[ch]
		if (!glyph) {
			x0 += letterW + LETTER_GAP
			continue
		}
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				if (glyph[r][c] !== "1") continue
				const x = x0 + c * CELL
				const y = y0 + r * CELL
				await rect(x, y, x + CELL - 1, y + CELL - 1, FILL)
			}
		}
		x0 += letterW + LETTER_GAP
	}
}

async function drawSign() {
	const rows = 5
	const letterH = rows * CELL
	const line1 = "GAME"
	const line2 = "OVER"
	const maxW = Math.max(lineWidth(line1), lineWidth(line2))
	const textH = letterH * 2 + LINE_GAP
	const padX = 18
	const padY = 14
	const boardW = maxW + padX * 2
	const boardH = textH + padY * 2
	const yText0 = -textH / 2

	// Sign post
	await rect(-10, boardH / 2 - 4, 10, boardH / 2 + 48, POST)
	// Board + rim
	await rect(-boardW / 2 - 4, -boardH / 2 - 4, boardW / 2 + 4, boardH / 2 + 4, EDGE)
	await rect(-boardW / 2, -boardH / 2, boardW / 2, boardH / 2, BOARD)

	await drawLine(line1, 0, yText0)
	await drawLine(line2, 0, yText0 + letterH + LINE_GAP)
}

async function stageHasInstance(name) {
	const els = await call({ op: "list_elements", layer: 0, frame: 0 })
	const list = els.elements || els || []
	return list.some((el) => el.instance_name === name || el.name === name)
}

async function main() {
	console.log("ping", await call({ op: "ping" }))
	await ensureOpen()
	await exitToStage()

	let library = await call({ op: "list_library" })
	let byName = libByName(library)
	for (const name of [CLIP, SPRITE]) {
		if (byName[name]) {
			await call({ op: "delete_library_symbol", symbol_id: byName[name].id })
			console.log("deleted", name)
		}
	}

	const spr = await call({ op: "create_symbol", name: SPRITE, kind: "sprite" })
	console.log("sprite", spr)
	await call({ op: "enter_symbol_edit", symbol_id: spr.symbol_id })
	await drawSign()
	await call({ op: "exit_symbol_edit" })

	const clip = await call({ op: "create_symbol", name: CLIP, kind: "movie_clip" })
	console.log("clip", clip)
	await call({ op: "enter_symbol_edit", symbol_id: clip.symbol_id })
	await call({
		op: "place_instance",
		symbol_id: spr.symbol_id,
		kind: "sprite",
		instance_name: "art",
		frame: 0,
		transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, skew_x: 0, skew_y: 0 },
	})
	try {
		await call({ op: "set_frame_label", layer: 0, frame: 0, label: "idle" })
	} catch (e) {
		console.warn("label", e.message)
	}
	await call({ op: "exit_symbol_edit" })

	if (!(await stageHasInstance(CLIP))) {
		await call({
			op: "place_instance",
			symbol_id: clip.symbol_id,
			kind: "movie_clip",
			instance_name: CLIP,
			transform: { x: 440, y: 90, scale_x: 0.7, scale_y: 0.7, rotation: 0, skew_x: 0, skew_y: 0 },
		})
		console.log("placed gameOver on stage")
	}

	await call({ op: "save_document" })
	console.log("saved", animaPath)

	const pub = await call({ op: "publish_flashtube", out_dir: tubeDir })
	console.log("published", pub)
	console.log("library", JSON.stringify(await call({ op: "list_library" }), null, 2))
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
