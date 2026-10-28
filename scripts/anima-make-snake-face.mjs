#!/usr/bin/env node
/**
 * Add snakeFace (raster sprite + movieclip) to anima/tiles.anima and publish.
 * Keeps hexTile on stage so publish includes all atlas frames.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { call } from "./anima-rpc.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")
const animaPath = path.join(projectRoot, "anima", "tiles.anima")
const tubeDir = path.join(projectRoot, "src", "tube")
const SPRITE = "snake_face_art"
const CLIP = "snakeFace"

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

/** Face faces +x: tongue forward, eyes stacked behind. */
async function drawFace() {
	const white = { r: 255, g: 255, b: 255, a: 255 }
	const black = { r: 20, g: 20, b: 28, a: 255 }
	const tongue = { r: 230, g: 64, b: 96, a: 255 }
	const tongueDark = { r: 180, g: 36, b: 72, a: 255 }

	await call({ op: "create_oval", min: { x: -18, y: -22 }, max: { x: 6, y: -2 }, color: white })
	await call({ op: "create_oval", min: { x: -18, y: 2 }, max: { x: 6, y: 22 }, color: white })
	await call({ op: "create_oval", min: { x: -4, y: -16 }, max: { x: 8, y: -6 }, color: black })
	await call({ op: "create_oval", min: { x: -4, y: 6 }, max: { x: 8, y: 16 }, color: black })
	await call({ op: "create_oval", min: { x: 0, y: -14 }, max: { x: 4, y: -10 }, color: white })
	await call({ op: "create_oval", min: { x: 0, y: 8 }, max: { x: 4, y: 12 }, color: white })
	await call({ op: "create_rectangle", min: { x: 10, y: -4 }, max: { x: 34, y: 4 }, color: tongue })
	await call({ op: "create_oval", min: { x: 28, y: -12 }, max: { x: 42, y: -2 }, color: tongue })
	await call({ op: "create_oval", min: { x: 28, y: 2 }, max: { x: 42, y: 12 }, color: tongue })
	await call({ op: "create_oval", min: { x: 36, y: -10 }, max: { x: 44, y: -4 }, color: tongueDark })
	await call({ op: "create_oval", min: { x: 36, y: 4 }, max: { x: 44, y: 10 }, color: tongueDark })
}

async function clearStageInstances() {
	await exitToStage()
	try {
		const els = await call({ op: "list_elements", layer: 0, frame: 0 })
		const list = els.elements || els || []
		if (!list.length) return
		const instances = list.map((el, i) => ({ layer: 0, element_index: el.element_index ?? i }))
		await call({ op: "select_instances", instances })
		await call({ op: "delete_selection" })
	} catch (e) {
		console.warn("clearStageInstances", e.message)
	}
}

async function main() {
	console.log("ping", await call({ op: "ping" }))
	await ensureOpen()
	await exitToStage()
	await clearStageInstances()

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
	await drawFace()
	await call({ op: "exit_symbol_edit" })

	const clip = await call({ op: "create_symbol", name: CLIP, kind: "movie_clip" })
	console.log("clip", clip)
	await call({ op: "enter_symbol_edit", symbol_id: clip.symbol_id })
	await call({
		op: "place_instance",
		symbol_id: spr.symbol_id,
		kind: "sprite",
		instance_name: "face",
		frame: 0,
		transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, skew_x: 0, skew_y: 0 },
	})
	try {
		await call({ op: "set_frame_label", layer: 0, frame: 0, label: "idle" })
	} catch (e) {
		console.warn("label", e.message)
	}
	await call({ op: "exit_symbol_edit" })

	library = await call({ op: "list_library" })
	byName = libByName(library)
	// Stage must reference both clips so publish keeps hex + face atlas frames.
	for (const [name, x, y] of [
		["hexTile", 275, 200],
		[CLIP, 120, 320],
	]) {
		const sym = byName[name]
		if (!sym) {
			console.warn("missing on stage place", name)
			continue
		}
		await call({
			op: "place_instance",
			symbol_id: sym.id,
			kind: "movie_clip",
			instance_name: name,
			transform: { x, y, scale_x: 1, scale_y: 1, rotation: 0, skew_x: 0, skew_y: 0 },
		})
	}

	if (fs.existsSync(animaPath)) await call({ op: "save_document" })
	else await call({ op: "save_document_as", path: animaPath })
	console.log("saved", animaPath)

	const pub = await call({ op: "publish_flashtube", out_dir: tubeDir })
	console.log("published", pub)
	console.log("library", JSON.stringify(await call({ op: "list_library" }), null, 2))
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
