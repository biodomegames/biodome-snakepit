// FeedbackProbe: lets the Biodome feedback viewer (biodomegames.com/feedback)
// read the game's state and take a screenshot when a tester writes a comment.
//
// Copy this file to src/js/system/feedbackprobe.js in a game. No dependencies.
//
//   import { FeedbackProbe } from "./system/feedbackprobe.js"
//   FeedbackProbe.init({ app, version: config.version, build: config.build })
//   FeedbackProbe.provide("run", () => ({ level, score }))   // any state a tester might comment on
//   FeedbackProbe.mark("level_start", { level })              // optional breadcrumb
//
// The viewer calls globalThis.__BIODOME_FEEDBACK__.getContext() and .capture().
// Without init() the probe still works if globalThis.__PIXI_APP__ is set.

import { STARTERKIT_VERSION } from "../starterkit.js"

const MAX_CRUMBS = 30
const MAX_LOGS = 20
const MAX_CONTEXT_BYTES = 18000

const providers = new Map()
const crumbs = []
const logs = []
const startTime = Date.now()
let options = { app: null, version: null, build: null }
let installed = false

function push(list, item, max) {
	list.push(item)
	if (list.length > max) list.splice(0, list.length - max)
}

function short(value, max = 300) {
	let s
	if (value instanceof Error) s = value.stack || value.message
	else if (typeof value === "string") s = value
	else {
		try { s = JSON.stringify(value) } catch (e) { s = String(value) }
	}
	if (s === undefined) s = String(value)
	return s.length > max ? s.slice(0, max) + "…" : s
}

function safe(value) {
	// Make provider results JSON-safe (drops Pixi objects, cycles, functions).
	const seen = new WeakSet()
	try {
		return JSON.parse(JSON.stringify(value, (k, v) => {
			if (typeof v === "function") return undefined
			if (typeof v === "number" && !Number.isFinite(v)) return String(v)
			if (v && typeof v === "object") {
				if (seen.has(v)) return "[cycle]"
				seen.add(v)
				if (v.constructor && /Container|Sprite|Texture|Graphics|Renderer/.test(v.constructor.name)) return "[" + v.constructor.name + "]"
			}
			return v
		}))
	} catch (e) {
		return "[unserializable: " + e.message + "]"
	}
}

function hookConsole() {
	for (const level of ["error", "warn"]) {
		const orig = console[level]
		console[level] = function (...args) {
			push(logs, { t: Date.now() - startTime, level, msg: args.map(a => short(a, 400)).join(" ") }, MAX_LOGS)
			return orig.apply(this, args)
		}
	}
	window.addEventListener("error", e => {
		push(logs, { t: Date.now() - startTime, level: "uncaught", msg: short(e.error || e.message, 600), at: e.filename ? `${e.filename}:${e.lineno}` : undefined }, MAX_LOGS)
	})
	window.addEventListener("unhandledrejection", e => {
		push(logs, { t: Date.now() - startTime, level: "unhandledrejection", msg: short(e.reason, 600) }, MAX_LOGS)
	})
}

/**
 * Recent errors from the game's CrashLogger (window.crashLogger), which keeps them in
 * localStorage across reloads, so a crash just before the tester reloaded is still attached.
 * Last 2 hours, this game's folder only, warnings skipped, repeats collapsed.
 */
function recentCrashes() {
	const cl = globalThis.crashLogger
	if (!cl || typeof cl.getAllCrashLogs !== "function") return undefined
	let all
	try { all = cl.getAllCrashLogs() || [] } catch (e) { return undefined }
	const dirOf = (u) => { try { return new URL(u, location.href).pathname.replace(/[^/]*$/, "") } catch (e) { return "" } }
	const here = dirOf(location.href)
	const since = Date.now() - 2 * 60 * 60 * 1000
	const out = []
	for (const l of all) {
		if (!l || !(l.timestampMs >= since) || /warn/i.test(l.type || "")) continue
		if (l.url && dirOf(l.url) !== here) continue
		const d = l.data || {}
		const r = d.reason && typeof d.reason === "object" ? d.reason : null
		const msg = short(d.message || (r && r.message) || d.reason || l.type, 400)
		const prev = out.find((x) => x.msg === msg && x.type === l.type)
		if (prev) { prev.count++; prev.ago = Math.round((Date.now() - l.timestampMs) / 1000); continue }
		out.push({
			type: l.type,
			msg,
			count: 1,
			ago: Math.round((Date.now() - l.timestampMs) / 1000),
			thisSession: l.sessionStart === cl.currentSessionStart,
			at: d.filename ? `${String(d.filename).split("/").pop()}:${d.lineno}` : undefined,
			stack: short(d.stack || (r && r.stack) || "", 1500) || undefined,
		})
	}
	return out.slice(-8)
}

function getApp() {
	return options.app || globalThis.__PIXI_APP__ || null
}

function runtimeInfo() {
	const app = getApp()
	const info = {
		sessionSeconds: Math.round((Date.now() - startTime) / 1000),
		devicePixelRatio: window.devicePixelRatio,
		window: `${window.innerWidth}x${window.innerHeight}`,
	}
	if (app && app.renderer) {
		info.renderer = `${app.renderer.width}x${app.renderer.height}`
		if (app.ticker) info.fps = Math.round(app.ticker.FPS)
		if (app.renderer.name) info.rendererType = app.renderer.name
	}
	return info
}

export const FeedbackProbe = {
	/** Call once after the Pixi Application exists. All fields optional. */
	init(opts = {}) {
		options = { ...options, ...opts }
		if (options.app) globalThis.__PIXI_APP__ = options.app
		FeedbackProbe.install()
		FeedbackProbe.reloadIfStale()
		return FeedbackProbe
	},

	/**
	 * On biodomegames.com: if the server has a newer build than the one running (a phone kept an
	 * old cached index.html), reload once at ?b=<newest>, an address no cache has. Guarded per build
	 * in sessionStorage so it can never loop. Not on FRVR, Cordova or localhost.
	 */
	async reloadIfStale() {
		try {
			if (window.cordova || options.build == null) return
			const host = location.hostname
			if (host !== "biodomegames.com" && !host.endsWith(".biodomegames.com")) return
			const dir = location.pathname.replace(/[^/]*$/, "")
			const res = await fetch(dir + "changelog.txt?nocache=" + Date.now(), { cache: "no-store" })
			if (!res.ok) return
			const m = (await res.text()).match(/\(Build\s+(\d+)\)/i)
			const latest = m ? Number(m[1]) : 0
			if (!(latest > Number(options.build))) return
			const guard = "bfb.reloadedFor:" + dir
			if (sessionStorage.getItem(guard) === String(latest)) return
			sessionStorage.setItem(guard, String(latest))
			console.warn(`[FeedbackProbe] running b${options.build}, server has b${latest}; reloading`)
			const url = new URL(location.href)
			url.searchParams.set("b", String(latest))
			location.replace(url.toString())
		} catch (e) { /* offline, no changelog, storage blocked: just keep running */ }
	},

	/** Register a function returning JSON-able state. Re-registering a name replaces it. */
	provide(name, fn) {
		providers.set(name, fn)
		return FeedbackProbe
	},

	remove(name) {
		providers.delete(name)
	},

	/** Record a breadcrumb (what the player just did). */
	mark(event, data) {
		push(crumbs, { t: Date.now() - startTime, event: String(event), data: data === undefined ? undefined : safe(data) }, MAX_CRUMBS)
	},

	getContext() {
		const state = {}
		for (const [name, fn] of providers) {
			try { state[name] = safe(fn()) } catch (e) { state[name] = "[provider error: " + e.message + "]" }
		}
		const ctx = {
			probe: 1,
			version: options.version,
			build: options.build,
			starterkit: STARTERKIT_VERSION,
			state,
			runtime: runtimeInfo(),
			errors: logs.slice(),
			crashes: recentCrashes(),
			breadcrumbs: crumbs.slice(),
		}
		// Keep under the server limit: drop oldest breadcrumbs, then logs, then crash stacks, then state.
		while (JSON.stringify(ctx).length > MAX_CONTEXT_BYTES) {
			if (ctx.breadcrumbs.length) ctx.breadcrumbs.shift()
			else if (ctx.errors.length) ctx.errors.shift()
			else if (ctx.crashes && ctx.crashes.some((c) => c.stack)) ctx.crashes.find((c) => c.stack).stack = undefined
			else if (ctx.crashes && ctx.crashes.length) ctx.crashes.shift()
			else { ctx.state = "[state too large]"; break }
		}
		return ctx
	},

	/** Screenshot of the stage as a JPEG data URL, longest side <= maxSize. */
	async capture(maxSize = 720, quality = 0.75) {
		const app = getApp()
		if (!app || !app.renderer) return null
		const canvas = app.canvas || app.view
		if (!canvas || !canvas.width) return null
		const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height))
		const out = document.createElement("canvas")
		out.width = Math.max(1, Math.round(canvas.width * scale))
		out.height = Math.max(1, Math.round(canvas.height * scale))
		const ctx = out.getContext("2d")
		ctx.fillStyle = "#000"
		ctx.fillRect(0, 0, out.width, out.height)
		// A WebGL drawing buffer is only readable right after a render, so render
		// and copy synchronously. This grabs exactly what the player sees.
		try {
			app.renderer.render(app.stage)
			ctx.drawImage(canvas, 0, 0, out.width, out.height)
		} catch (e) {
			return null
		}
		return out.toDataURL("image/jpeg", quality)
	},

	/**
	 * URL of the feedback page for this game, or null where feedback doesn't apply:
	 * not on biodomegames.com (FRVR, app stores, Cordova), or already inside the feedback page.
	 * The slug is the first path segment, so /snakepit/ and /snakepit-dev/ both work.
	 */
	feedbackUrl() {
		try {
			if (window.cordova) return null
			if (window.top !== window) return null
			const host = location.hostname
			const ok = host === "biodomegames.com" || host.endsWith(".biodomegames.com")
				|| host === "localhost" || host === "127.0.0.1"
			if (!ok) return null
			let slug = location.pathname.split("/").filter(Boolean)[0]
			// e.g. snakepit.biodomegames.com serves the same build as /snakepit/
			if (slug && /\.html?$/i.test(slug)) slug = null
			if (!slug && host.endsWith(".biodomegames.com") && !host.startsWith("www.")) slug = host.split(".")[0]
			// Local dev server runs at "/", so allow ?feedbackGame=<slug> for testing.
			slug = new URLSearchParams(location.search).get("feedbackGame") || slug
			if (!slug || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return null
			const origin = host.endsWith(".biodomegames.com") ? "https://biodomegames.com" : location.origin
			return origin + "/feedback/?game=" + encodeURIComponent(slug.toLowerCase())
		} catch (e) {
			return null
		}
	},

	/** Leave the game for its feedback page. Returns false if there is none. */
	openFeedback() {
		const url = FeedbackProbe.feedbackUrl()
		if (!url) return false
		window.location.href = url
		return true
	},

	install() {
		if (installed) return
		installed = true
		hookConsole()
		globalThis.__BIODOME_FEEDBACK__ = {
			version: 1,
			getContext: () => FeedbackProbe.getContext(),
			capture: (maxSize, quality) => FeedbackProbe.capture(maxSize, quality),
			mark: (e, d) => FeedbackProbe.mark(e, d),
		}
	},
}

// Install on import so console errors from early startup are captured too.
FeedbackProbe.install()
