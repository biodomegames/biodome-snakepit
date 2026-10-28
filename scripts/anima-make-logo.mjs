#!/usr/bin/env node
/**
 * Add block-letter "SNAKEPIT" logo (sprite + movieclip) to anima/tiles.anima and publish.
 * Keeps existing stage instances so hex/face/rock/grass stay in the atlas.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { call } from "./anima-rpc.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")
const animaPath = path.join(projectRoot, "anima", "tiles.anima")
const tubeDir = path.join(projectRoot, "src", "tube")
const SPRITE = "logo_art"
const CLIP = "logo"

/** 5×5 bitmaps (rows top→bottom). */
const GLYPHS = {
	S: ["01110", "10000", "01110", "00001", "01110"],
	N: ["10001", "11001", "10101", "10011", "10001"],
	A: ["01110", "10001", "11111", "10001", "10001"],
	K: ["10001", "10010", "11100", "10010", "10001"],
	E: ["11111", "10000", "11110", "10000", "11111"],
	P: ["11110", "10001", "11110", "10000", "10000"],
	I: ["11111", "00100", "00100", "00100", "11111"],
	T: ["11111", "00100", "00100", "00100", "00100"],
}

const FILL = { r: 236, g: 248, b: 220, a: 255 }
const EDGE = { r: 40, g: 72, b: 48, a: 255 }
const CELL = 7
const LETTER_GAP = 5

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

async function drawWord(word) {
	const rows = 5
	const cols = 5
	const letterW = cols * CELL
	const letterH = rows * CELL
	const totalW = word.length * letterW + (word.length - 1) * LETTER_GAP
	let x0 = -totalW / 2
	const y0 = -letterH / 2

	await rect(x0 - 10, y0 - 8, x0 + totalW + 10, y0 + letterH + 8, EDGE)

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
	await drawWord("SNAKEPIT")
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
			transform: { x: 275, y: 60, scale_x: 0.55, scale_y: 0.55, rotation: 0, skew_x: 0, skew_y: 0 },
		})
		console.log("placed logo on stage")
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
