#!/usr/bin/env node
/**
 * Add a squashed "dead" frame to the existing ant movieclip.
 * Does not redraw the idle or walk frames.
 * Publish strips labels, so those are patched back afterward.
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

/** Flat splat in the same drawing space as the live ant, already squashed. */
async function drawDeadAnt() {
	await oval({ x: -22, y: -3.2 }, { x: 16, y: 3.2 }, WHITE)
	await oval({ x: 14, y: -2.6 }, { x: 24, y: 2.6 }, WHITE)
	await rect({ x: 18, y: -5.5 }, { x: 27, y: -4 }, WHITE_DIM)
	await rect({ x: 18, y: 4 }, { x: 27, y: 5.5 }, WHITE_DIM)
	await rect({ x: -18, y: 2.4 }, { x: -6, y: 4.2 }, WHITE)
	await rect({ x: -10, y: -4.2 }, { x: 2, y: -2.4 }, WHITE)
	await rect({ x: 0, y: 2.4 }, { x: 12, y: 4.2 }, WHITE)
	await rect({ x: 6, y: -4.2 }, { x: 16, y: -2.4 }, WHITE)
}

function elementsOf(res) {
	if (Array.isArray(res)) return res
	if (Array.isArray(res?.elements)) return res.elements
	return []
}

async function frameElements(frame) {
	try {
		const res = await call({ op: "list_elements", layer: 0, frame })
		return elementsOf(res)
	} catch {
		return null
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
		const labels = ["walk", null, null, null, "eat", null, null, null]
		return block.replace(/<frame num="(\d+)"(?: label="[^"]*")?>/g, (_, num) => {
			const label = labels[i++]
			if (label) return `<frame num="${num}" label="${label}">`
			return `<frame num="${num}">`
		})
	})
	xml = xml.replace(/<sequence name="grass">([\s\S]*?)<\/sequence>/, (block) =>
		block.replace(/ label="[^"]*"/g, ""),
	)
	fs.writeFileSync(xmlPath, xml)
	console.log("patched labels in", xmlPath)
}

async function main() {
	console.log("ping", await call({ op: "ping" }))
	await ensureOpen()
	await exitToStage()

	let library = await call({ op: "list_library" })
	let byName = libByName(library)
	const ant = byName.ant
	if (!ant) throw new Error("missing ant movieclip")

	await call({ op: "enter_symbol_edit", symbol_id: ant.id })
	const idleEls = await frameElements(0)
	console.log("idle elements", JSON.stringify(idleEls, null, 2))
	let frameCount = 0
	let alreadyDead = false
	for (let f = 0; f < 12; f++) {
		const els = await frameElements(f)
		if (els == null) break
		if (!els.length && f > 0) break
		frameCount = f + 1
		const deadId = byName.ant_dead_art?.id
		if (deadId != null && els.some((el) => el.symbol_id === deadId)) alreadyDead = true
	}
	await call({ op: "exit_symbol_edit" })
	console.log("ant frames", frameCount, "alreadyDead", alreadyDead)

	const idleBody = (idleEls || []).find((el) => el.kind === "instance") || idleEls?.[0]
	// Match the squish the game plays (about 1.4× wide and 0.32× tall of the live ant).
	const transform = {
		x: idleBody?.x ?? 0,
		y: idleBody?.y ?? 0,
		scale_x: 1.75,
		scale_y: 1.15,
		rotation: 0,
		skew_x: 0,
		skew_y: 0,
	}

	if (!byName.ant_dead_art) {
		const spr = await call({ op: "create_symbol", name: "ant_dead_art", kind: "sprite" })
		await call({ op: "enter_symbol_edit", symbol_id: spr.symbol_id })
		await drawDeadAnt()
		await call({ op: "exit_symbol_edit" })
		byName.ant_dead_art = { id: spr.symbol_id, name: "ant_dead_art" }
		console.log("sprite ant_dead_art", spr.symbol_id)
	}

	if (alreadyDead) {
		await call({ op: "enter_symbol_edit", symbol_id: ant.id })
		const deadFrame = frameCount - 1
		await call({ op: "set_current_frame", frame: deadFrame })
		const els = await frameElements(deadFrame)
		const inst = (els || []).filter((el) => el.kind === "instance")
		if (inst.length) {
			await call({
				op: "select_instances",
				instances: inst.map((el) => ({ layer: 0, element_index: el.element_index })),
			})
			await call({ op: "delete_selection" })
		}
		await call({
			op: "place_instance",
			symbol_id: byName.ant_dead_art.id,
			kind: "sprite",
			instance_name: "body",
			frame: deadFrame,
			transform,
		})
		await call({ op: "exit_symbol_edit" })
		console.log("rescaled dead frame", deadFrame)
	} else if (!alreadyDead) {
		const deadFrame = frameCount
		await call({ op: "enter_symbol_edit", symbol_id: ant.id })
		await call({ op: "set_current_frame", frame: deadFrame })
		await call({ op: "insert_keyframe", blank: true })
		await call({
			op: "place_instance",
			symbol_id: byName.ant_dead_art.id,
			kind: "sprite",
			instance_name: "body",
			frame: deadFrame,
			transform: {
				x: transform.x ?? 0,
				y: transform.y ?? 0,
				scale_x: transform.scale_x ?? transform.scaleX ?? 1,
				scale_y: transform.scale_y ?? transform.scaleY ?? 1,
				rotation: transform.rotation ?? 0,
				skew_x: transform.skew_x ?? 0,
				skew_y: transform.skew_y ?? 0,
			},
		})
		try {
			await call({ op: "set_frame_label", layer: 0, frame: deadFrame, label: "dead" })
		} catch (e) {
			console.warn("dead label", e.message)
		}
		await call({ op: "exit_symbol_edit" })
		console.log("placed dead frame", deadFrame)
	} else {
		console.log("dead frame already present")
	}

	await exitToStage()
	await call({ op: "save_document" })
	const pub = await call({ op: "publish_flashtube", out_dir: tubeDir })
	console.log("published", pub)
	patchTubeLabels()
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
