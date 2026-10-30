#!/usr/bin/env node
/**
 * Add a placeholder anteater movieclip (cone mouth + eyes) to anima/tiles.anima.
 * Labels: walk, eat. Publish strips labels, so tiles.xml is patched after.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { call } from "./anima-rpc.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")
const animaPath = path.join(projectRoot, "anima", "tiles.anima")
const tubeDir = path.join(projectRoot, "src", "tube")

const BROWN = { r: 176, g: 122, b: 74, a: 255 }
const BROWN_DARK = { r: 122, g: 78, b: 46, a: 255 }
const MOUTH = { r: 62, g: 24, b: 28, a: 255 }
const TONGUE = { r: 214, g: 92, b: 108, a: 255 }
const WHITE = { r: 255, g: 255, b: 255, a: 255 }
const BLACK = { r: 28, g: 22, b: 18, a: 255 }

const FRAMES = [
	{ sprite: "anteater_walk_a", label: "walk", bob: 0, open: 0 },
	{ sprite: "anteater_walk_b", label: null, bob: -8, open: 0 },
	{ sprite: "anteater_walk_c", label: null, bob: 0, open: 0 },
	{ sprite: "anteater_walk_d", label: null, bob: 8, open: 0 },
	{ sprite: "anteater_eat_a", label: "eat", bob: 0, open: 0.4 },
	{ sprite: "anteater_eat_b", label: null, bob: 2, open: 1 },
	{ sprite: "anteater_eat_c", label: null, bob: -2, open: 0.72 },
	{ sprite: "anteater_eat_d", label: null, bob: 0, open: 0.2 },
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

async function rect(min, max, color) {
	await call({ op: "create_rectangle", min, max, color })
}
async function oval(min, max, color) {
	await call({ op: "create_oval", min, max, color })
}

/** Cone mouth facing left, two eyes on the wide end. `open` 0..1 gapes the mouth. */
async function drawAnteater({ bob = 0, open = 0 }) {
	const tipX = -78
	const baseX = 72
	const bands = 12
	const flare = 1 + open * 1.15
	for (let i = 0; i < bands; i++) {
		const t0 = i / bands
		const t1 = (i + 1) / bands
		const x0 = tipX + (baseX - tipX) * t0
		const x1 = tipX + (baseX - tipX) * t1
		const half = (3 + t1 * 34) * flare
		await rect({ x: x0, y: bob - half }, { x: x1, y: bob + half }, BROWN)
	}
	await rect({ x: tipX + 24, y: bob + 4 }, { x: baseX - 8, y: bob + 12 * flare }, BROWN_DARK)
	if (open > 0.12) {
		const mh = 5 + open * 24
		await oval({ x: tipX + 10, y: bob - mh }, { x: tipX + 48, y: bob + mh }, MOUTH)
		if (open > 0.45) {
			const len = 18 + open * 46
			await rect({ x: tipX - len, y: bob - 3.5 }, { x: tipX + 8, y: bob + 3.5 }, TONGUE)
			await oval({ x: tipX - len - 7, y: bob - 5.5 }, { x: tipX - len + 8, y: bob + 5.5 }, TONGUE)
		}
	}
	const eyeX = baseX - 26
	const spread = 15 + open * 7
	for (const sy of [-1, 1]) {
		const cy = bob + sy * spread
		await oval({ x: eyeX - 9, y: cy - 9 }, { x: eyeX + 9, y: cy + 9 }, WHITE)
		await oval({ x: eyeX - 3.5, y: cy - 3.5 }, { x: eyeX + 3.5, y: cy + 3.5 }, BLACK)
	}
}

async function removeStageAnteater() {
	await exitToStage()
	try {
		const els = await call({ op: "list_elements", layer: 0, frame: 0 })
		const list = (els.elements || els || []).filter((el) => {
			if (el.kind !== "instance") return false
			const blob = JSON.stringify(el)
			return blob.includes("anteater")
		})
		if (!list.length) return
		await call({
			op: "select_instances",
			instances: list.map((el) => ({ layer: 0, element_index: el.element_index })),
		})
		await call({ op: "delete_selection" })
	} catch (e) {
		console.warn("removeStageAnteater", e.message)
	}
}

async function rebuildAnteater() {
	let library = await call({ op: "list_library" })
	let byName = libByName(library)
	const names = ["anteater", ...FRAMES.map((f) => f.sprite)]
	for (const name of names) {
		if (byName[name]) {
			await call({ op: "delete_library_symbol", symbol_id: byName[name].id })
			console.log("deleted", name)
		}
	}

	const sprIds = []
	for (const frame of FRAMES) {
		const spr = await call({ op: "create_symbol", name: frame.sprite, kind: "sprite" })
		await call({ op: "enter_symbol_edit", symbol_id: spr.symbol_id })
		await drawAnteater(frame)
		await call({ op: "exit_symbol_edit" })
		sprIds.push({ ...frame, id: spr.symbol_id })
		console.log("sprite", frame.sprite, spr.symbol_id)
	}

	const clip = await call({ op: "create_symbol", name: "anteater", kind: "movie_clip" })
	await call({ op: "enter_symbol_edit", symbol_id: clip.symbol_id })
	for (let i = 0; i < sprIds.length; i++) {
		const frame = sprIds[i]
		await call({ op: "set_current_frame", frame: i })
		if (i > 0) await call({ op: "insert_keyframe", blank: true })
		await call({
			op: "place_instance",
			symbol_id: frame.id,
			kind: "sprite",
			instance_name: "body",
			frame: i,
			transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, skew_x: 0, skew_y: 0 },
		})
		if (frame.label) {
			try {
				await call({ op: "set_frame_label", layer: 0, frame: i, label: frame.label })
			} catch (e) {
				console.warn("anteater label", frame.label, e.message)
			}
		}
	}
	await call({ op: "exit_symbol_edit" })
	console.log("anteater", clip)
	return clip.symbol_id
}

async function placeOnStage(symbolId) {
	await exitToStage()
	await call({
		op: "place_instance",
		symbol_id: symbolId,
		kind: "movie_clip",
		instance_name: "anteater",
		transform: { x: 500, y: 48, scale_x: 0.35, scale_y: 0.35, rotation: 0, skew_x: 0, skew_y: 0 },
	})
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
		const frameCount = [...block.matchAll(/<frame num="(\d+)"/g)].length
		let i = 0
		return block.replace(/<frame num="(\d+)"(?: label="[^"]*")?>/g, (_, num) => {
			const idx = i++
			let label = null
			if (idx === 0) label = "idle"
			else if (idx === 1) label = "walk"
			else if (idx === frameCount - 1 && frameCount >= 5) label = "dead"
			if (label) return `<frame num="${num}" label="${label}">`
			return `<frame num="${num}">`
		})
	})
	xml = xml.replace(/<sequence name="anteater">([\s\S]*?)<\/sequence>/, (block) => {
		let i = 0
		const labels = FRAMES.map((f) => f.label)
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
	await removeStageAnteater()
	const symbolId = await rebuildAnteater()
	await placeOnStage(symbolId)
	await call({ op: "save_document" })
	const pub = await call({ op: "publish_flashtube", out_dir: tubeDir })
	console.log("published", pub)
	patchTubeLabels()
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
