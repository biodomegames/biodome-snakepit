#!/usr/bin/env node
/**
 * Open/update anima/tiles.anima: three colored hex sprites + one 3-frame movieclip.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { call } from "./anima-rpc.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")
const animaPath = path.join(projectRoot, "anima", "tiles.anima")
const tubeDir = path.join(projectRoot, "src", "tube")

const COLORS = [
	{
		sprite: "hex_tile_green",
		label: "green",
		fill: { r: 62, g: 168, b: 96, a: 255 },
		edge: { r: 36, g: 110, b: 62, a: 255 },
	},
	{
		sprite: "hex_tile_red",
		label: "red",
		fill: { r: 220, g: 70, b: 70, a: 255 },
		edge: { r: 140, g: 40, b: 40, a: 255 },
	},
	{
		sprite: "hex_tile_blue",
		label: "blue",
		fill: { r: 70, g: 120, b: 220, a: 255 },
		edge: { r: 40, g: 70, b: 140, a: 255 },
	},
]

const CLIP_NAME = "hexTile"
const OLD_CLIPS = ["hexTileGreen", "hexTileRed", "hexTileBlue"]

function hexHalfWidth(y, R) {
	const ay = Math.abs(y)
	const yMax = (Math.sqrt(3) / 2) * R
	if (ay > yMax) return 0
	if (ay <= 1e-6) return R
	return R - ay / Math.sqrt(3)
}

async function drawFlatTopHexagon(cx, cy, R, color, stripH = 2) {
	const yMax = (Math.sqrt(3) / 2) * R
	for (let y0 = -yMax; y0 < yMax; y0 += stripH) {
		const y1 = Math.min(y0 + stripH, yMax)
		const mid = (y0 + y1) / 2
		const hw = hexHalfWidth(mid, R)
		if (hw < 0.6) continue
		await call({
			op: "create_rectangle",
			min: { x: cx - hw, y: cy + y0 },
			max: { x: cx + hw, y: cy + y1 },
			color,
		})
	}
}

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
	await call({ op: "new_document" })
	return call({ op: "get_status" })
}

function libByName(library) {
	const map = {}
	for (const s of library.symbols || []) map[s.name] = s
	return map
}

async function ensureSprite(name, fill, edge) {
	const library = await call({ op: "list_library" })
	const existing = libByName(library)[name]
	if (existing) {
		console.log("keep sprite", name, existing.symbol_id ?? existing.id)
		return existing.id ?? existing.symbol_id
	}
	const created = await call({
		op: "create_symbol",
		name,
		kind: "sprite",
	})
	await call({ op: "enter_symbol_edit", symbol_id: created.symbol_id })
	await drawFlatTopHexagon(0, 0, 64, edge, 2)
	await drawFlatTopHexagon(0, 0, 56, fill, 2)
	await call({ op: "exit_symbol_edit" })
	console.log("created sprite", created)
	return created.symbol_id
}

async function clearStageInstances() {
	await exitToStage()
	const els = await call({ op: "list_elements", layer: 0, frame: 0 })
	const instances = []
	const list = els.elements || els || []
	for (let i = 0; i < list.length; i++) {
		const el = list[i]
		if (el.Instance || el.instance || el.kind === "instance" || el.symbol_id != null) {
			instances.push({ layer: 0, element_index: el.element_index ?? i })
		}
	}
	// Fallback: select by scanning reported shape
	if (instances.length === 0 && Array.isArray(list)) {
		for (let i = 0; i < list.length; i++) {
			if (String(JSON.stringify(list[i])).toLowerCase().includes("symbol")) {
				instances.push({ layer: 0, element_index: i })
			}
		}
	}
	if (instances.length) {
		await call({ op: "select_instances", instances })
		await call({ op: "delete_selection" })
	}
}

async function main() {
	console.log("ping", await call({ op: "ping" }))
	await ensureOpen()
	await exitToStage()

	// Drop old per-color movieclips; keep colored sprites.
	let library = await call({ op: "list_library" })
	let byName = libByName(library)
	for (const name of OLD_CLIPS) {
		const sym = byName[name]
		if (sym) {
			await call({ op: "delete_library_symbol", symbol_id: sym.id })
			console.log("deleted", name)
		}
	}
	if (byName[CLIP_NAME]) {
		await call({ op: "delete_library_symbol", symbol_id: byName[CLIP_NAME].id })
		console.log("deleted", CLIP_NAME)
	}

	const spriteIds = {}
	for (const c of COLORS) {
		spriteIds[c.sprite] = await ensureSprite(c.sprite, c.fill, c.edge)
	}

	const clip = await call({
		op: "create_symbol",
		name: CLIP_NAME,
		kind: "movie_clip",
	})
	console.log("clip", clip)
	await call({ op: "enter_symbol_edit", symbol_id: clip.symbol_id })

	for (let i = 0; i < COLORS.length; i++) {
		const c = COLORS[i]
		await call({ op: "set_current_frame", frame: i })
		if (i > 0) {
			await call({ op: "insert_keyframe", blank: true })
		}
		await call({
			op: "place_instance",
			symbol_id: spriteIds[c.sprite],
			kind: "sprite",
			instance_name: "tile",
			frame: i,
			transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, skew_x: 0, skew_y: 0 },
		})
		await call({ op: "set_frame_label", layer: 0, frame: i, label: c.label })
	}

	await call({ op: "exit_symbol_edit" })
	await clearStageInstances()
	await call({
		op: "place_instance",
		symbol_id: clip.symbol_id,
		kind: "movie_clip",
		instance_name: CLIP_NAME,
		transform: { x: 275, y: 200, scale_x: 1, scale_y: 1, rotation: 0, skew_x: 0, skew_y: 0 },
	})

	if (fs.existsSync(animaPath)) {
		await call({ op: "save_document" })
	} else {
		await call({ op: "save_document_as", path: animaPath })
	}
	console.log("saved", animaPath)

	const pub = await call({ op: "publish_flashtube", out_dir: tubeDir })
	console.log("published", pub)
	console.log("library", JSON.stringify(await call({ op: "list_library" }), null, 2))
	console.log("timeline", JSON.stringify(await call({ op: "list_timeline" }), null, 2))
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
