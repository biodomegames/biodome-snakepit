#!/usr/bin/env node
/**
 * Create rsrc/icon.anima (1024×1024 stage) with a snake-face app icon,
 * publish PNG via Anima, write rsrc/icon.png + src/web/favicon.png.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { execFileSync } from "child_process"
import { call } from "./anima-rpc.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")
const animaPath = path.join(projectRoot, "rsrc", "icon.anima")
const tilesAnimaPath = path.join(projectRoot, "anima", "tiles.anima")
const rsrcDir = path.join(projectRoot, "rsrc")
const iconPng = path.join(rsrcDir, "icon.png")
const faviconPng = path.join(projectRoot, "src", "web", "favicon.png")
const STAGE = 1024

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

async function clearStage() {
	await exitToStage()
	try {
		const els = await call({ op: "list_elements", layer: 0, frame: 0 })
		const list = els.elements || els || []
		if (!list.length) return
		const instances = list
			.filter((el) => el.kind === "instance")
			.map((el) => ({ layer: 0, element_index: el.element_index }))
		const shapes = list
			.filter((el) => el.kind === "shape")
			.map((el) => ({ layer: 0, index: el.shape_index ?? el.element_index }))
		if (instances.length) {
			await call({ op: "select_instances", instances })
			await call({ op: "delete_selection" })
		}
		if (shapes.length) {
			await call({ op: "select_shapes", shapes })
			await call({ op: "delete_selection" })
		}
	} catch (e) {
		console.warn("clearStage", e.message)
	}
}

/** Patch manifest stage size inside a saved .anima zip, then reopen. */
async function forceStageSize(docPath, w, h) {
	const tmp = path.join(rsrcDir, ".icon-patch")
	fs.rmSync(tmp, { recursive: true, force: true })
	fs.mkdirSync(tmp, { recursive: true })
	execFileSync("unzip", ["-q", "-o", docPath, "-d", tmp])
	const manifestPath = path.join(tmp, "manifest.json")
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
	manifest.stage_width = w
	manifest.stage_height = h
	manifest.name = "icon"
	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
	const outZip = docPath + ".tmp.zip"
	fs.rmSync(outZip, { force: true })
	execFileSync("zip", ["-q", "-r", "-0", outZip, "."], { cwd: tmp })
	fs.renameSync(outZip, docPath)
	fs.rmSync(tmp, { recursive: true, force: true })
	// Drop the in-memory doc so reopen reloads the patched stage size.
	await call({ op: "new_document" })
	await call({ op: "open_document", path: docPath })
	// open_document can finish behind a short modal; poll until stage matches.
	let st = null
	for (let i = 0; i < 40; i++) {
		await new Promise((r) => setTimeout(r, 150))
		st = await call({ op: "get_status" })
		if (st.modal_blocked) continue
		if (st.stage_width === w && st.stage_height === h && st.path === docPath) return st
	}
	throw new Error(
		`stage size still ${st?.stage_width}x${st?.stage_height} path=${st?.path}, wanted ${w}x${h}`,
	)
}

async function oval(cx, cy, rx, ry, color) {
	await call({
		op: "create_oval",
		min: { x: cx - rx, y: cy - ry },
		max: { x: cx + rx, y: cy + ry },
		color,
	})
}

async function rect(x0, y0, x1, y1, color) {
	await call({
		op: "create_rectangle",
		min: { x: x0, y: y0 },
		max: { x: x1, y: y1 },
		color,
	})
}

/** Large snake-face icon: green badge + profile face (same language as tiles snakeFace). */
async function drawIcon() {
	const cx = STAGE / 2
	const cy = STAGE / 2
	const bgDeep = { r: 28, g: 48, b: 36, a: 255 }
	const bgMid = { r: 48, g: 110, b: 68, a: 255 }
	const bgLite = { r: 72, g: 168, b: 96, a: 255 }
	const body = { r: 56, g: 150, b: 86, a: 255 }
	const bodyDark = { r: 36, g: 100, b: 58, a: 255 }
	const white = { r: 255, g: 255, b: 255, a: 255 }
	const black = { r: 20, g: 20, b: 28, a: 255 }
	const tongue = { r: 230, g: 64, b: 96, a: 255 }
	const tongueDark = { r: 180, g: 36, b: 72, a: 255 }

	// Full-stage fill so trimmed PNG export keeps 1024×1024.
	await rect(0, 0, STAGE, STAGE, bgDeep)
	await oval(cx, cy, 470, 470, bgMid)
	await oval(cx, cy, 420, 420, bgLite)

	// Soft body behind the face
	await oval(cx - 40, cy + 40, 220, 260, bodyDark)
	await oval(cx - 20, cy + 20, 190, 220, body)

	// Face (profile → +x), scaled ~9× from the in-game art.
	const s = 9
	const fx = cx - 30
	const fy = cy - 10
	const map = (x, y) => ({ x: fx + x * s, y: fy + y * s })
	const o = async (x0, y0, x1, y1, color) => {
		const a = map(x0, y0)
		const b = map(x1, y1)
		await call({
			op: "create_oval",
			min: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
			max: { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
			color,
		})
	}
	const r = async (x0, y0, x1, y1, color) => {
		const a = map(x0, y0)
		const b = map(x1, y1)
		await call({
			op: "create_rectangle",
			min: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
			max: { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
			color,
		})
	}

	await o(-18, -22, 6, -2, white)
	await o(-18, 2, 6, 22, white)
	await o(-4, -16, 8, -6, black)
	await o(-4, 6, 8, 16, black)
	await o(0, -14, 4, -10, white)
	await o(0, 8, 4, 12, white)
	await r(10, -4, 34, 4, tongue)
	await o(28, -12, 42, -2, tongue)
	await o(28, 2, 42, 12, tongue)
	await o(36, -10, 44, -4, tongueDark)
	await o(36, 4, 44, 10, tongueDark)
}

function ensureIconPng(exportedPath) {
	// Prefer sips on macOS to force exact 1024 and write favicon.
	const src = exportedPath
	if (!fs.existsSync(src)) throw new Error(`missing export ${src}`)
	execFileSync("sips", ["-z", String(STAGE), String(STAGE), src, "--out", iconPng])
	fs.mkdirSync(path.dirname(faviconPng), { recursive: true })
	execFileSync("sips", ["-z", "128", "128", iconPng, "--out", faviconPng])
	console.log("wrote", iconPng)
	console.log("wrote", faviconPng)
}

async function main() {
	fs.mkdirSync(rsrcDir, { recursive: true })
	console.log("ping", await call({ op: "ping" }))
	await exitToStage()
	await call({ op: "new_document" })
	await call({ op: "save_document_as", path: animaPath })
	console.log("saved seed", animaPath)
	// Release the file handle before patching the zip on disk.
	await call({ op: "new_document" })

	await forceStageSize(animaPath, STAGE, STAGE)
	console.log("stage", await call({ op: "get_status" }))

	await clearStage()
	await drawIcon()
	await call({ op: "save_document" })

	const pub = await call({ op: "publish_pngs", out_dir: rsrcDir })
	console.log("published", pub)

	const candidates = ["frame_1.png", "frame_0.png", "icon.png"]
	let exported = null
	for (const name of candidates) {
		const p = path.join(rsrcDir, name)
		if (fs.existsSync(p) && path.resolve(p) !== path.resolve(iconPng)) {
			exported = p
			break
		}
		if (name === "icon.png" && fs.existsSync(p)) {
			exported = p
			break
		}
	}
	// publish may have written frame_1.png; also accept newest png that isn't favicon
	if (!exported) {
		const pngs = fs
			.readdirSync(rsrcDir)
			.filter((f) => f.endsWith(".png") && f.startsWith("frame_"))
			.map((f) => path.join(rsrcDir, f))
		exported = pngs[0]
	}
	if (!exported) throw new Error("no PNG from publish_pngs")
	ensureIconPng(exported)
	if (path.resolve(exported) !== path.resolve(iconPng) && fs.existsSync(exported)) {
		fs.rmSync(exported, { force: true })
	}

	if (fs.existsSync(tilesAnimaPath)) {
		await call({ op: "open_document", path: tilesAnimaPath })
		console.log("reopened tiles.anima")
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
