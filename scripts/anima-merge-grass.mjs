#!/usr/bin/env node
/**
 * Fold grassB into frame 2 of the grass movieclip. No frame labels.
 * Publish strips other labels, so those are patched back. Grass stays unlabeled.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { call } from "./anima-rpc.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")
const animaPath = path.join(projectRoot, "anima", "tiles.anima")
const tubeDir = path.join(projectRoot, "src", "tube")

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

async function removeStageNamed(name) {
	await exitToStage()
	const els = await call({ op: "list_elements", layer: 0, frame: 0 })
	const list = (els.elements || els || []).filter((el) => {
		if (el.kind !== "instance") return false
		return JSON.stringify(el).includes(`"${name}"`) || JSON.stringify(el).includes(name)
	})
	if (!list.length) return
	await call({
		op: "select_instances",
		instances: list.map((el) => ({ layer: 0, element_index: el.element_index })),
	})
	await call({ op: "delete_selection" })
	console.log("removed stage", name, list.length)
}

async function addSecondGrassFrame(grassId, artBId) {
	await call({ op: "enter_symbol_edit", symbol_id: grassId })
	let already = false
	try {
		const els = await call({ op: "list_elements", layer: 0, frame: 1 })
		const list = els.elements || els || []
		already = list.length > 0
	} catch {
		already = false
	}
	if (!already) {
		await call({ op: "set_current_frame", frame: 1 })
		await call({ op: "insert_keyframe", blank: true })
		await call({
			op: "place_instance",
			symbol_id: artBId,
			kind: "sprite",
			instance_name: "tuft",
			frame: 1,
			transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, skew_x: 0, skew_y: 0 },
		})
		console.log("placed grass frame 2")
	} else {
		console.log("grass frame 2 already present")
	}
	try {
		await call({ op: "set_frame_label", layer: 0, frame: 0, label: "" })
	} catch (e) {
		console.warn("clear grass label", e.message)
	}
	await call({ op: "exit_symbol_edit" })
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
	xml = xml.replace(/\n\t<sequence name="grassB">[\s\S]*?<\/sequence>/, "")
	xml = xml.replace(/\n\t\t\t<subsequence name="grassB"[^>]*><\/subsequence>/, "")
	fs.writeFileSync(xmlPath, xml)
	console.log("patched labels in", xmlPath)
}

async function main() {
	console.log("ping", await call({ op: "ping" }))
	await ensureOpen()
	await exitToStage()
	const library = await call({ op: "list_library" })
	const byName = libByName(library)
	const grass = byName.grass
	const artB = byName.grass_art_b || byName.grassB
	if (!grass) throw new Error("missing grass movieclip")
	if (!artB) throw new Error(`missing grass art, have ${Object.keys(byName).join(", ")}`)
	if (artB.kind === "movie_clip" && byName.grass_art_b) {
		/* prefer the sprite */
	}
	const sprite = byName.grass_art_b || artB
	if (!sprite) throw new Error("no second grass sprite")
	await removeStageNamed("grassB")
	await addSecondGrassFrame(grass.id, sprite.id)
	if (byName.grassB && sprite.id !== byName.grassB.id) {
		await exitToStage()
		await call({ op: "delete_library_symbol", symbol_id: byName.grassB.id })
		console.log("deleted grassB clip")
	}
	await call({ op: "save_document" })
	const pub = await call({ op: "publish_flashtube", out_dir: tubeDir })
	console.log("published", pub)
	patchTubeLabels()
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
