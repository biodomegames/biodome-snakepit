#!/usr/bin/env node
/**
 * Add snakeFace blink frames + rising bonkStar to anima/tiles.anima and publish.
 * Preserves other stage instances (hex/logo/gameOver/…).
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { call } from "./anima-rpc.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")
const animaPath = path.join(projectRoot, "anima", "tiles.anima")
const tubeDir = path.join(projectRoot, "src", "tube")

const FACE_CLIP = "snakeFace"
const STAR_SPRITE = "star_art"
const STAR_CLIP = "bonkStar"

const FACE_FRAMES = [
	{ sprite: "snake_face_art", label: "idle", eyes: "open" },
	{ sprite: "snake_face_blink_both", label: "blinkBoth", eyes: "both" },
	{ sprite: "snake_face_blink_top", label: "blinkTop", eyes: "top" },
	{ sprite: "snake_face_blink_bot", label: "blinkBot", eyes: "bot" },
	{ sprite: "snake_face_blink_half", label: "blinkHalf", eyes: "half" },
]

const STAGE_KEEP = [
	["hexTile", 275, 200, 1],
	["snakeFace", 120, 320, 1],
	["rock", 420, 320, 1],
	["grass", 60, 200, 1],
	["logo", 275, 60, 0.55],
	["gameOver", 440, 90, 0.7],
	["bonkStar", 60, 80, 1],
]

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
	if (!fs.existsSync(animaPath)) throw new Error(`missing ${animaPath}`)
	await call({ op: "open_document", path: animaPath })
	return call({ op: "get_status" })
}

function libByName(library) {
	const map = {}
	for (const s of library.symbols || []) map[s.name] = s
	return map
}

async function oval(min, max, color) {
	await call({ op: "create_oval", min, max, color })
}
async function rect(min, max, color) {
	await call({ op: "create_rectangle", min, max, color })
}

async function drawTongue() {
	const tongue = { r: 230, g: 64, b: 96, a: 255 }
	const tongueDark = { r: 180, g: 36, b: 72, a: 255 }
	await rect({ x: 10, y: -4 }, { x: 34, y: 4 }, tongue)
	await oval({ x: 28, y: -12 }, { x: 42, y: -2 }, tongue)
	await oval({ x: 28, y: 2 }, { x: 42, y: 12 }, tongue)
	await oval({ x: 36, y: -10 }, { x: 44, y: -4 }, tongueDark)
	await oval({ x: 36, y: 4 }, { x: 44, y: 10 }, tongueDark)
}

async function drawOpenEye(top) {
	const white = { r: 255, g: 255, b: 255, a: 255 }
	const black = { r: 20, g: 20, b: 28, a: 255 }
	const y0 = top ? -22 : 2
	const y1 = top ? -2 : 22
	const py0 = top ? -16 : 6
	const py1 = top ? -6 : 16
	const gy0 = top ? -14 : 8
	const gy1 = top ? -10 : 12
	await oval({ x: -18, y: y0 }, { x: 6, y: y1 }, white)
	await oval({ x: -4, y: py0 }, { x: 8, y: py1 }, black)
	await oval({ x: 0, y: gy0 }, { x: 4, y: gy1 }, white)
}

async function drawClosedEye(top) {
	const lid = { r: 200, g: 210, b: 190, a: 255 }
	const line = { r: 40, g: 50, b: 40, a: 255 }
	const cy = top ? -12 : 12
	await oval({ x: -16, y: cy - 4 }, { x: 4, y: cy + 4 }, lid)
	await rect({ x: -14, y: cy - 1.5 }, { x: 2, y: cy + 1.5 }, line)
}

async function drawHalfEye(top) {
	const white = { r: 255, g: 255, b: 255, a: 255 }
	const black = { r: 20, g: 20, b: 28, a: 255 }
	const y0 = top ? -18 : 6
	const y1 = top ? -6 : 18
	const py0 = top ? -14 : 10
	const py1 = top ? -9 : 15
	await oval({ x: -18, y: y0 }, { x: 6, y: y1 }, white)
	await oval({ x: -4, y: py0 }, { x: 8, y: py1 }, black)
}

async function drawFaceEyes(mode) {
	if (mode === "open") {
		await drawOpenEye(true)
		await drawOpenEye(false)
	} else if (mode === "both") {
		await drawClosedEye(true)
		await drawClosedEye(false)
	} else if (mode === "top") {
		await drawClosedEye(true)
		await drawOpenEye(false)
	} else if (mode === "bot") {
		await drawOpenEye(true)
		await drawClosedEye(false)
	} else if (mode === "half") {
		await drawHalfEye(true)
		await drawHalfEye(false)
	}
	await drawTongue()
}

async function ensureFaceSprites() {
	let library = await call({ op: "list_library" })
	let byName = libByName(library)
	for (const fr of FACE_FRAMES) {
		if (byName[fr.sprite]) {
			await call({ op: "delete_library_symbol", symbol_id: byName[fr.sprite].id })
			console.log("deleted sprite", fr.sprite)
		}
		const spr = await call({ op: "create_symbol", name: fr.sprite, kind: "sprite" })
		await call({ op: "enter_symbol_edit", symbol_id: spr.symbol_id })
		await drawFaceEyes(fr.eyes)
		await call({ op: "exit_symbol_edit" })
		console.log("sprite", fr.sprite, spr.symbol_id)
	}
}

async function rebuildSnakeFace() {
	let library = await call({ op: "list_library" })
	let byName = libByName(library)
	if (byName[FACE_CLIP]) {
		await call({ op: "delete_library_symbol", symbol_id: byName[FACE_CLIP].id })
		console.log("deleted", FACE_CLIP)
	}
	const clip = await call({ op: "create_symbol", name: FACE_CLIP, kind: "movie_clip" })
	await call({ op: "enter_symbol_edit", symbol_id: clip.symbol_id })
	library = await call({ op: "list_library" })
	byName = libByName(library)

	for (let i = 0; i < FACE_FRAMES.length; i++) {
		const fr = FACE_FRAMES[i]
		await call({ op: "set_current_frame", frame: i })
		if (i > 0) await call({ op: "insert_keyframe", blank: true })
		const spr = byName[fr.sprite]
		await call({
			op: "place_instance",
			symbol_id: spr.id,
			kind: "sprite",
			instance_name: "face",
			frame: i,
			transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, skew_x: 0, skew_y: 0 },
		})
		try {
			await call({ op: "set_frame_label", layer: 0, frame: i, label: fr.label })
		} catch (e) {
			console.warn("label", fr.label, e.message)
		}
	}
	await call({ op: "exit_symbol_edit" })
	console.log("clip", FACE_CLIP, clip)
	return clip.symbol_id
}

async function drawStar() {
	const yellow = { r: 255, g: 220, b: 64, a: 255 }
	const tip = { r: 255, g: 180, b: 40, a: 255 }
	// Simple 4-point star from overlapping diamonds / bars.
	await rect({ x: -4, y: -18 }, { x: 4, y: 18 }, yellow)
	await rect({ x: -18, y: -4 }, { x: 18, y: 4 }, yellow)
	await oval({ x: -10, y: -10 }, { x: 10, y: 10 }, tip)
	await oval({ x: -5, y: -5 }, { x: 5, y: 5 }, yellow)
}

async function rebuildBonkStar() {
	let library = await call({ op: "list_library" })
	let byName = libByName(library)
	for (const name of [STAR_CLIP, STAR_SPRITE]) {
		if (byName[name]) {
			await call({ op: "delete_library_symbol", symbol_id: byName[name].id })
			console.log("deleted", name)
		}
	}
	const spr = await call({ op: "create_symbol", name: STAR_SPRITE, kind: "sprite" })
	await call({ op: "enter_symbol_edit", symbol_id: spr.symbol_id })
	await drawStar()
	await call({ op: "exit_symbol_edit" })

	const clip = await call({ op: "create_symbol", name: STAR_CLIP, kind: "movie_clip" })
	await call({ op: "enter_symbol_edit", symbol_id: clip.symbol_id })

	// Rising star: keyframes 0→12 (playLabel "rise" runs until "end").
	const last = 12
	for (let f = 0; f <= last; f++) {
		await call({ op: "set_current_frame", frame: f })
		if (f > 0) await call({ op: "insert_keyframe", blank: true })
		const t = f / last
		const y = -56 * t
		const s = 1 + 0.2 * Math.sin(t * Math.PI) - 0.45 * t
		await call({
			op: "place_instance",
			symbol_id: spr.symbol_id,
			kind: "sprite",
			instance_name: "star",
			frame: f,
			transform: {
				x: (f % 3) - 1,
				y,
				scale_x: s,
				scale_y: s,
				rotation: t * 0.8,
				skew_x: 0,
				skew_y: 0,
			},
		})
	}
	try {
		await call({ op: "set_frame_label", layer: 0, frame: 0, label: "rise" })
		await call({ op: "set_frame_label", layer: 0, frame: last, label: "end" })
	} catch (e) {
		console.warn("star labels", e.message)
	}
	await call({ op: "exit_symbol_edit" })
	console.log("clip", STAR_CLIP, clip)
	return clip.symbol_id
}

async function clearStageInstances() {
	await exitToStage()
	try {
		const els = await call({ op: "list_elements", layer: 0, frame: 0 })
		const list = (els.elements || els || []).filter((el) => el.kind === "instance")
		if (!list.length) return
		await call({
			op: "select_instances",
			instances: list.map((el) => ({ layer: 0, element_index: el.element_index })),
		})
		await call({ op: "delete_selection" })
	} catch (e) {
		console.warn("clearStage", e.message)
	}
}

async function placeStageKeep() {
	const library = await call({ op: "list_library" })
	const byName = libByName(library)
	for (const [name, x, y, scale] of STAGE_KEEP) {
		const sym = byName[name]
		if (!sym) {
			console.warn("missing symbol", name)
			continue
		}
		await call({
			op: "place_instance",
			symbol_id: sym.id,
			kind: "movie_clip",
			instance_name: name,
			transform: {
				x,
				y,
				scale_x: scale,
				scale_y: scale,
				rotation: 0,
				skew_x: 0,
				skew_y: 0,
			},
		})
	}
}

async function main() {
	console.log("ping", await call({ op: "ping" }))
	await ensureOpen()
	await exitToStage()
	await clearStageInstances()

	await ensureFaceSprites()
	await rebuildSnakeFace()
	await rebuildBonkStar()

	await placeStageKeep()
	await call({ op: "save_document" })
	const pub = await call({ op: "publish_flashtube", out_dir: tubeDir })
	console.log("published", pub)
	patchTubeLabels()
	console.log("library", JSON.stringify(await call({ op: "list_library" }), null, 2))
}

/** Anima publish currently drops frame labels — reapply for FlashTube playLabel/setFrame. */
function patchTubeLabels() {
	const xmlPath = path.join(tubeDir, "tiles.xml")
	let xml = fs.readFileSync(xmlPath, "utf8")
	const faceLabels = ["idle", "blinkBoth", "blinkTop", "blinkBot", "blinkHalf"]
	xml = xml.replace(
		/<sequence name="snakeFace">([\s\S]*?)<\/sequence>/,
		(block) => {
			let i = 0
			return block.replace(/<frame num="(\d+)"(?: label="[^"]*")?>/g, (_, num) => {
				const label = faceLabels[i++] || faceLabels[faceLabels.length - 1]
				return `<frame num="${num}" label="${label}">`
			})
		},
	)
	xml = xml.replace(
		/<sequence name="bonkStar">([\s\S]*?)<\/sequence>/,
		(block) => {
			const frames = [...block.matchAll(/<frame num="(\d+)"/g)].map((m) => Number(m[1]))
			const first = frames[0]
			const last = frames[frames.length - 1]
			return block.replace(/<frame num="(\d+)"(?: label="[^"]*")?>/g, (tag, num) => {
				const n = Number(num)
				if (n === first) return `<frame num="${num}" label="rise">`
				if (n === last) return `<frame num="${num}" label="end">`
				return `<frame num="${num}">`
			})
		},
	)
	fs.writeFileSync(xmlPath, xml)
	console.log("patched labels in", xmlPath)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
