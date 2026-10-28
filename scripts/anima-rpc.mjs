#!/usr/bin/env node
/**
 * Tiny Anima RPC client (same protocol as anima-mcp).
 * Usage: node scripts/anima-rpc.mjs '{"op":"ping"}'
 * Or import { call } from './anima-rpc.mjs'
 */
import net from "net"
import fs from "fs"
import path from "path"
import os from "os"

const runtimeDir = path.join(os.homedir(), ".anima")

function readPort() {
	if (process.env.ANIMA_MCP_PORT) return Number(process.env.ANIMA_MCP_PORT)
	return Number(fs.readFileSync(path.join(runtimeDir, "mcp-port"), "utf8").trim())
}

function readToken() {
	if (process.env.ANIMA_MCP_TOKEN) return process.env.ANIMA_MCP_TOKEN.trim()
	return fs.readFileSync(path.join(runtimeDir, "mcp-token"), "utf8").trim()
}

let nextId = 1

export function call(cmd) {
	return new Promise((resolve, reject) => {
		const port = readPort()
		const token = readToken()
		const id = nextId++
		const body = Buffer.from(JSON.stringify({ id, token, cmd }), "utf8")
		const header = Buffer.alloc(4)
		header.writeUInt32BE(body.length, 0)

		const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
			socket.write(Buffer.concat([header, body]))
		})
		socket.setTimeout(60000)

		let buf = Buffer.alloc(0)
		socket.on("data", (chunk) => {
			buf = Buffer.concat([buf, chunk])
			if (buf.length < 4) return
			const len = buf.readUInt32BE(0)
			if (buf.length < 4 + len) return
			const msg = JSON.parse(buf.subarray(4, 4 + len).toString("utf8"))
			socket.end()
			if (msg.error) reject(new Error(msg.error))
			else resolve(msg.result)
		})
		socket.on("error", reject)
		socket.on("timeout", () => {
			socket.destroy()
			reject(new Error("Anima RPC timeout"))
		})
	})
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const raw = process.argv[2]
	if (!raw) {
		console.error('Usage: node scripts/anima-rpc.mjs \'{"op":"ping"}\'')
		process.exit(1)
	}
	call(JSON.parse(raw))
		.then((r) => console.log(JSON.stringify(r, null, 2)))
		.catch((e) => {
			console.error(e.message || e)
			process.exit(1)
		})
}
