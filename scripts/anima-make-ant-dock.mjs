#!/usr/bin/env node
/**
 * Add white ant (walk frames) + square slotTile to anima/tiles.anima and publish.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { call } from "./anima-rpc.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")
const animaPath = path.join(projectRoot, "anima", "tiles.anima")
const tubeDir = path.join(projectRoot, "src", "tube")

const WHITE = { r: 255, g: 255, b: 255, a: 255 }
const WHITE_DIM = { r: 230, g: 230, b: 230, a: 255 }
const SLOT_FILL = { r: 245, g: 245, b: 248, a: 255 }
const SLOT_EDGE = { r: 180, g: 180, b: 190, a: 255 }

const STAGE_KEEP = [
	["hexTile", 275, 200, 1],
	["snakeFace", 120, 320, 1],
	["rock", 420, 320, 1],
	["grass", 60, 200, 1],
	["grassB", 160, 200, 1],
	["logo", 275, 60, 0.55],
	["gameOver", 440, 90, 0.7],
	["bonkStar", 60, 80, 1],
	["ant", 200, 80, 1],
	["slotTile", 360, 80, 1],
	["anteater", 500, 48, 0.35],
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

/** Draw ant facing +x. `phase` 0..1 shifts legs for walk. */
async function drawAnt(phase = 0) {
	const legShift = (phase - 0.5) * 6
	// abdomen
	await oval({ x: -14, y: -7 }, { x: 2, y: 7 }, WHITE)
	// thorax
	await oval({ x: -2, y: -5 }, { x: 8, y: 5 }, WHITE)
	// head
	await oval({ x: 6, y: -4.5 }, { x: 16, y: 4.5 }, WHITE)
	// antennae
	await rect({ x: 12, y: -10 }, { x: 14, y: -4 }, WHITE_DIM)
	await rect({ x: 14, y: -12 }, { x: 18, y: -10 }, WHITE_DIM)
	await rect({ x: 12, y: 4 }, { x: 14, y: 10 }, WHITE_DIM)
	await rect({ x: 14, y: 10 }, { x: 18, y: 12 }, WHITE_DIM)
	// legs (3 pairs) — white thin bars
	const pairs = [
		{ x: -8, base: 0 },
		{ x: -1, base: 0 },
		{ x: 5, base: 0 },
	]
	for (let i = 0; i < pairs.length; i++) {
		const p = pairs[i]
		const s = i % 2 === 0 ? legShift : -legShift
		await rect({ x: p.x - 1 + s, y: 5 }, { x: p.x + 1 + s, y: 12 }, WHITE)
		await rect({ x: p.x - 1 - s, y: -12 }, { x: p.x + 1 - s, y: -5 }, WHITE)
	}
}

async function drawSlotTile() {
	await rect({ x: -18, y: -18 }, { x: 18, y: 18 }, SLOT_EDGE)
	await rect({ x: -15, y: -15 }, { x: 15, y: 15 }, SLOT_FILL)
	await rect({ x: -12, y: -12 }, { x: 12, y: 12 }, SLOT_EDGE)
	await rect({ x: -10, y: -10 }, { x: 10, y: 10 }, SLOT_FILL)
}

async function rebuildSlotTile() {
	let library = await call({ op: "list_library" })
	let byName = libByName(library)
	for (const name of ["slotTile", "slot_tile_art"]) {
		if (byName[name]) {
			await call({ op: "delete_library_symbol", symbol_id: byName[name].id })
			console.log("deleted", name)
		}
	}
	const spr = await call({ op: "create_symbol", name: "slot_tile_art", kind: "sprite" })
	await call({ op: "enter_symbol_edit", symbol_id: spr.symbol_id })
	await drawSlotTile()
	await call({ op: "exit_symbol_edit" })

	const clip = await call({ op: "create_symbol", name: "slotTile", kind: "movie_clip" })
	await call({ op: "enter_symbol_edit", symbol_id: clip.symbol_id })
	await call({
		op: "place_instance",
		symbol_id: spr.symbol_id,
		kind: "sprite",
		instance_name: "tile",
		frame: 0,
		transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, skew_x: 0, skew_y: 0 },
	})
	try {
		await call({ op: "set_frame_label", layer: 0, frame: 0, label: "idle" })
	} catch (e) {
		console.warn("slot label", e.message)
	}
	await call({ op: "exit_symbol_edit" })
	console.log("slotTile", clip)
}

async function rebuildAnt() {
	let library = await call({ op: "list_library" })
	let byName = libByName(library)
	const names = ["ant", "ant_idle_art", "ant_walk_a_art", "ant_walk_b_art", "ant_walk_c_art"]
	for (const name of names) {
		if (byName[name]) {
			await call({ op: "delete_library_symbol", symbol_id: byName[name].id })
			console.log("deleted", name)
		}
	}

	const phases = [
		{ sprite: "ant_idle_art", phase: 0.5, label: "idle" },
		{ sprite: "ant_walk_a_art", phase: 0.15, label: "walk" },
		{ sprite: "ant_walk_b_art", phase: 0.5, label: null },
		{ sprite: "ant_walk_c_art", phase: 0.85, label: null },
	]
	const sprIds = []
	for (const p of phases) {
		const spr = await call({ op: "create_symbol", name: p.sprite, kind: "sprite" })
		await call({ op: "enter_symbol_edit", symbol_id: spr.symbol_id })
		await drawAnt(p.phase)
		await call({ op: "exit_symbol_edit" })
		sprIds.push({ ...p, id: spr.symbol_id })
		console.log("sprite", p.sprite, spr.symbol_id)
	}

	const clip = await call({ op: "create_symbol", name: "ant", kind: "movie_clip" })
	await call({ op: "enter_symbol_edit", symbol_id: clip.symbol_id })
	for (let i = 0; i < sprIds.length; i++) {
		const p = sprIds[i]
		await call({ op: "set_current_frame", frame: i })
		if (i > 0) await call({ op: "insert_keyframe", blank: true })
		await call({
			op: "place_instance",
			symbol_id: p.id,
			kind: "sprite",
			instance_name: "body",
			frame: i,
			transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, skew_x: 0, skew_y: 0 },
		})
		if (p.label) {
			try {
				await call({ op: "set_frame_label", layer: 0, frame: i, label: p.label })
			} catch (e) {
				console.warn("ant label", p.label, e.message)
			}
		}
	}
	await call({ op: "exit_symbol_edit" })
	console.log("ant", clip)
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

function patchTubeLabels() {
	const xmlPath = path.join(tubeDir, "tiles.xml")
	let xml = fs.readFileSync(xmlPath, "utf8")
	const faceLabels = ["idle", "blinkBoth", "blinkTop", "blinkBot", "blinkHalf"]
	xml = xml.replace(/<sequence name="snakeFace">([\s\S]*?)<\/sequence>/, (block) => {
		let i = 0
		return block.replace(/<frame num="(\d+)"(?: label="[^"]*")?>/g, (_, num) => {
			const label = faceLabels[i++] || faceLabels[faceLabels.length - 1]
			return `<frame num="${num}" label="${label}">`
		})
	})
	xml = xml.replace(/<sequence name="bonkStar">([\s\S]*?)<\/sequence>/, (block) => {
		const frames = [...block.matchAll(/<frame num="(\d+)"/g)].map((m) => Number(m[1]))
		const first = frames[0]
		const last = frames[frames.length - 1]
		return block.replace(/<frame num="(\d+)"(?: label="[^"]*")?>/g, (tag, num) => {
			const n = Number(num)
			if (n === first) return `<frame num="${num}" label="rise">`
			if (n === last) return `<frame num="${num}" label="end">`
			return `<frame num="${num}">`
		})
	})
	xml = xml.replace(/<sequence name="ant">([\s\S]*?)<\/sequence>/, (block) => {
		let i = 0
		const labels = ["idle", "walk", null, null]
		return block.replace(/<frame num="(\d+)"(?: label="[^"]*")?>/g, (_, num) => {
			const label = labels[i++]
			if (label) return `<frame num="${num}" label="${label}">`
			return `<frame num="${num}">`
		})
	})
	xml = xml.replace(/<sequence name="anteater">([\s\S]*?)<\/sequence>/, (block) => {
		let i = 0
		const labels = ["walk", null, null, null, "eat", null, null, null]
		return block.replace(/<frame num="(\d+)"(?: label="[^"]*")?>/g, (_, num) => {
			const label = labels[i++]
			if (label) return `<frame num="${num}" label="${label}">`
			return `<frame num="${num}">`
		})
	})
	fs.writeFileSync(xmlPath, xml)
	console.log("patched labels in", xmlPath)
}

async function main() {
	console.log("ping", await call({ op: "ping" }))
	await ensureOpen()
	await exitToStage()
	await clearStageInstances()
	await rebuildSlotTile()
	await rebuildAnt()
	await placeStageKeep()
	await call({ op: "save_document" })
	const pub = await call({ op: "publish_flashtube", out_dir: tubeDir })
	console.log("published", pub)
	patchTubeLabels()
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
