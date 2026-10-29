#!/usr/bin/env node
/** Re-apply FlashTube frame labels after a raw Anima publish of tiles. */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const tubeDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "tube")
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
console.log("patched", xmlPath)
