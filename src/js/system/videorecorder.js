import { Howler } from "howler"

/**
 * Debug video recorder: renders the game at an exact output size (e.g. 1080×1920) inside a
 * box that fits the window, and records the canvas itself (plus Howler audio) to a file.
 *
 * Flow: options menu → dialog (pick size) → ARM → box + status pill → HOTKEY starts/stops →
 * file downloads. Only the canvas is captured, so the dialog/pill never appear in the video.
 *
 * Sizing: #gameContainer is pinned to a box of (unitW·n)×(unitH·n) CSS px, and the renderer
 * resolution is set to targetW / boxW, so the canvas backbuffer is exactly targetW×targetH.
 */

export const RECORD_SIZES = [
	{ id: "portrait", w: 1080, h: 1920, unitW: 9, unitH: 16, label: "1080 × 1920 (portrait)" },
	{ id: "landscape", w: 1920, h: 1080, unitW: 16, unitH: 9, label: "1920 × 1080 (landscape)" },
	{ id: "square", w: 1080, h: 1080, unitW: 1, unitH: 1, label: "1080 × 1080 (square)" },
]

/** Ctrl + Alt/Option + R — not bound by Chrome/Safari/Firefox on Mac or Windows. */
const HOTKEY_LABEL = "Ctrl + Alt/Option + R"
const isHotkey = (e) => e.ctrlKey && e.altKey && !e.metaKey && e.code === "KeyR"

const TOP_BAR = 52
const SIDE_PAD = 16
const FPS = 60
const VIDEO_BPS = 16_000_000

const MIME_CANDIDATES = [
	"video/mp4;codecs=avc1.640028,mp4a.40.2",
	"video/mp4;codecs=avc1,mp4a",
	"video/mp4",
	"video/webm;codecs=vp9,opus",
	"video/webm;codecs=vp8,opus",
	"video/webm",
]

export class VideoRecorder {
	/** @param {import("pixi.js").Application} app */
	constructor(app, opts = {}) {
		this.app = app
		this.fileStem = opts.fileStem || "game"
		this.size = RECORD_SIZES[0]
		this.armed = false
		this.recorder = null
		this.chunks = []
		this.startedAt = 0
		this._onKey = (e) => this._handleKey(e)
		this._onResize = () => this.armed && this._layout()
	}

	/** Options-menu entry point: small dialog to choose a size and arm. */
	openDialog() {
		if (this.dialog) return
		const backdrop = el("div", {
			position: "fixed", inset: "0", zIndex: "100001", display: "flex",
			alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)",
		})
		const panel = el("div", {
			minWidth: "260px", maxWidth: "calc(100vw - 32px)", padding: "20px 22px", borderRadius: "12px",
			background: "#1f252d", border: "2px solid #4a5563", color: "#fff",
			font: "15px/1.4 system-ui,-apple-system,sans-serif", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
		})
		const title = el("div", { font: "bold 18px system-ui,-apple-system,sans-serif", marginBottom: "14px" })
		title.textContent = "Record video"
		panel.append(title)

		let choice = this.size
		const rows = RECORD_SIZES.map((size) => {
			const row = el("label", { display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", cursor: "pointer" })
			const radio = document.createElement("input")
			radio.type = "radio"
			radio.name = "recsize"
			radio.checked = size === choice
			radio.addEventListener("change", () => (choice = size))
			const text = document.createElement("span")
			text.textContent = size.label
			row.append(radio, text)
			return row
		})
		panel.append(...rows)

		const hint = el("div", { fontSize: "13px", opacity: "0.65", margin: "12px 0 16px" })
		hint.textContent = `After arming, press ${HOTKEY_LABEL} to start and stop recording.`
		panel.append(hint)

		const buttons = el("div", { display: "flex", gap: "10px", justifyContent: "flex-end" })
		const cancel = button("Cancel", "#3a434f", "#fff")
		const arm = button(this.armed ? "RE-ARM" : "ARM", "#ffc56b", "#1a1e24")
		cancel.addEventListener("click", () => this._closeDialog())
		arm.addEventListener("click", () => {
			this._closeDialog()
			this.arm(choice)
		})
		buttons.append(cancel, arm)
		panel.append(buttons)

		swallowPointer(backdrop)
		backdrop.append(panel)
		document.body.append(backdrop)
		this.dialog = backdrop
	}

	_closeDialog() {
		this.dialog?.remove()
		this.dialog = null
	}

	/** Pin the game to the chosen output size and wait for the hotkey. */
	arm(size) {
		if (this.recorder) return
		this.size = size || this.size
		if (!this.armed) {
			this.armed = true
			this._saved = {
				container: document.getElementById("gameContainer")?.getAttribute("style") || "",
				bodyBg: document.body.style.background,
				resolution: this.app.renderer.resolution,
			}
			window.addEventListener("keydown", this._onKey, true)
			window.addEventListener("resize", this._onResize)
		}
		document.body.style.background = "#0b0d10"
		this._ensurePill()
		this._layout()
		this._renderPill()
	}

	disarm() {
		if (this.recorder) return
		this.armed = false
		window.removeEventListener("keydown", this._onKey, true)
		window.removeEventListener("resize", this._onResize)
		const container = document.getElementById("gameContainer")
		if (container) container.setAttribute("style", this._saved?.container || "")
		document.body.style.background = this._saved?.bodyBg || ""
		const res = this._saved?.resolution || Math.min(2, window.devicePixelRatio || 1)
		const r = this.app.renderer
		r.resize(r.screen.width, r.screen.height, res)
		this.pill?.remove()
		this.pill = null
		window.dispatchEvent(new Event("resize"))
	}

	/** Size the container to an exact multiple of the aspect and set the matching resolution. */
	_layout() {
		const { w, unitW, unitH } = this.size
		const availW = window.innerWidth - SIDE_PAD * 2
		const availH = window.innerHeight - TOP_BAR - SIDE_PAD
		const n = Math.max(1, Math.floor(Math.min(availW / unitW, availH / unitH)))
		const boxW = unitW * n
		const boxH = unitH * n
		const left = Math.round((window.innerWidth - boxW) / 2)
		const top = TOP_BAR + Math.max(0, Math.round((availH - boxH) / 2))
		const container = document.getElementById("gameContainer")
		if (container) {
			Object.assign(container.style, {
				position: "fixed", left: `${left}px`, top: `${top}px`, right: "auto", bottom: "auto",
				width: `${boxW}px`, height: `${boxH}px`, minHeight: `${boxH}px`, overflow: "hidden",
				outline: "1px solid #2c3440",
			})
		}
		// Backbuffer = box × resolution = exactly w × h.
		this.app.renderer.resize(boxW, boxH, w / boxW)
		// Let the game run its normal resize path (reads the container, keeps the resolution).
		window.dispatchEvent(new Event("resize"))
	}

	_handleKey(e) {
		if (!isHotkey(e)) return
		e.preventDefault()
		e.stopPropagation()
		if (this.recorder) this.stop()
		else this.start()
	}

	start() {
		if (this.recorder || !this.armed) return
		const canvas = this.app.canvas || this.app.view
		if (!canvas?.captureStream || typeof MediaRecorder === "undefined") {
			this._flash("This browser can't record a canvas.")
			return
		}
		const stream = canvas.captureStream(FPS)
		// Game audio: tap Howler's master bus.
		try {
			const ctx = Howler.ctx
			if (ctx && Howler.masterGain && ctx.createMediaStreamDestination) {
				this.audioDest = ctx.createMediaStreamDestination()
				Howler.masterGain.connect(this.audioDest)
				for (const t of this.audioDest.stream.getAudioTracks()) stream.addTrack(t)
			}
		} catch (err) {
			console.warn("[rec] audio capture unavailable", err)
		}
		const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m)) || ""
		try {
			this.recorder = new MediaRecorder(stream, {
				mimeType: mimeType || undefined,
				videoBitsPerSecond: VIDEO_BPS,
				audioBitsPerSecond: 192_000,
			})
		} catch (err) {
			console.warn("[rec] MediaRecorder failed", err)
			this._detachAudio()
			this._flash("Recording failed to start (see console).")
			return
		}
		this.mimeType = this.recorder.mimeType || mimeType || "video/webm"
		this.chunks = []
		this.recorder.ondataavailable = (ev) => ev.data?.size && this.chunks.push(ev.data)
		this.recorder.onstop = () => this._save(stream)
		this.recorder.start(1000)
		this.startedAt = performance.now()
		this._tickTimer = setInterval(() => this._renderPill(), 250)
		this._renderPill()
	}

	stop() {
		if (!this.recorder) return
		this.saving = true
		this.recorder.stop()
		clearInterval(this._tickTimer)
		this._renderPill()
	}

	_save(stream) {
		for (const t of stream.getTracks()) t.stop()
		this._detachAudio()
		const ext = this.mimeType.includes("mp4") ? "mp4" : "webm"
		const blob = new Blob(this.chunks, { type: this.mimeType.split(";")[0] })
		const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19)
		const a = document.createElement("a")
		a.href = URL.createObjectURL(blob)
		a.download = `${this.fileStem}-${this.size.w}x${this.size.h}-${stamp}.${ext}`
		document.body.append(a)
		a.click()
		a.remove()
		setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
		this.recorder = null
		this.chunks = []
		this.saving = false
		this._flash(`Saved ${a.download}`)
	}

	_detachAudio() {
		if (!this.audioDest) return
		try {
			Howler.masterGain.disconnect(this.audioDest)
		} catch (err) {
			/* already disconnected */
		}
		this.audioDest = null
	}

	_ensurePill() {
		if (this.pill) return
		const pill = el("div", {
			position: "fixed", top: "10px", left: "50%", transform: "translateX(-50%)", zIndex: "100000",
			display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px 6px 12px",
			borderRadius: "999px", background: "#1f252d", border: "1px solid #4a5563", color: "#fff",
			font: "13px/1.2 system-ui,-apple-system,sans-serif", whiteSpace: "nowrap",
			maxWidth: "calc(100vw - 32px)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
		})
		const dot = el("span", { width: "10px", height: "10px", borderRadius: "50%", flex: "none" })
		const text = el("span", { overflow: "hidden", textOverflow: "ellipsis" })
		const btn = button("Disarm", "#3a434f", "#fff")
		Object.assign(btn.style, { padding: "4px 10px", fontSize: "12px", minWidth: "0" })
		btn.addEventListener("click", () => this.disarm())
		swallowPointer(pill)
		pill.append(dot, text, btn)
		document.body.append(pill)
		this.pill = pill
		this.pillDot = dot
		this.pillText = text
		this.pillBtn = btn
		if (!document.getElementById("vrec-anim")) {
			const style = document.createElement("style")
			style.id = "vrec-anim"
			style.textContent = "@keyframes vrecPulse{0%,100%{opacity:1}50%{opacity:.25}}"
			document.head.append(style)
		}
	}

	_renderPill() {
		if (!this.pill) return
		const size = `${this.size.w}×${this.size.h}`
		if (this.saving) {
			this.pillDot.style.background = "#ffc56b"
			this.pillDot.style.animation = "none"
			this.pillText.textContent = `Saving ${size}…`
			this.pillBtn.style.display = "none"
		} else if (this.recorder) {
			const s = Math.floor((performance.now() - this.startedAt) / 1000)
			const mm = String(Math.floor(s / 60)).padStart(2, "0")
			const ss = String(s % 60).padStart(2, "0")
			this.pillDot.style.background = "#ff3b3b"
			this.pillDot.style.animation = "vrecPulse 1s ease-in-out infinite"
			this.pillText.textContent = `REC ${mm}:${ss} · ${size} · ${HOTKEY_LABEL} to stop`
			this.pillBtn.style.display = "none"
		} else {
			this.pillDot.style.background = "#7d8794"
			this.pillDot.style.animation = "none"
			this.pillText.textContent = `ARMED ${size} · ${HOTKEY_LABEL} to start`
			this.pillBtn.style.display = ""
		}
	}

	/** Brief message in the pill (falls back to console when not armed). */
	_flash(msg) {
		console.warn("[rec]", msg)
		if (!this.pillText) return
		this.pillText.textContent = msg
		clearTimeout(this._flashTimer)
		this._flashTimer = setTimeout(() => this._renderPill(), 2500)
	}
}

function el(tag, style) {
	const node = document.createElement(tag)
	Object.assign(node.style, style)
	return node
}

function button(label, bg, fg) {
	const b = document.createElement("button")
	b.type = "button"
	b.textContent = label
	Object.assign(b.style, {
		minWidth: "88px", padding: "8px 16px", border: "0", borderRadius: "8px", background: bg, color: fg,
		font: "bold 14px system-ui,-apple-system,sans-serif", cursor: "pointer",
	})
	return b
}

/** Keep presses on recorder UI from reaching the game canvas. */
function swallowPointer(node) {
	for (const type of ["pointerdown", "pointerup", "pointermove", "touchstart", "touchend", "click", "wheel"]) {
		node.addEventListener(type, (e) => e.stopPropagation())
	}
}
