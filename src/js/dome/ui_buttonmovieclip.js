import { Container, Rectangle } from "pixi.js"
import { Button } from "@pixi/ui"
import { Howl } from "howler"

/**
 * Label action for {@link ComponentTypes.BUTTONMOVIECLIP}.
 * @typedef {string | number | { label?: string, reverse?: boolean | string }} ButtonMovieClipLabelSpec
 */

/**
 * @param {ButtonMovieClipLabelSpec | undefined | null} spec
 * @returns {{ label?: string, reverse: boolean, frame?: number } | null}
 */
export function resolveButtonMovieClipLabel(spec) {
	if (spec == null) return null
	if (typeof spec === "number") return { frame: spec, reverse: false }
	if (typeof spec === "string") {
		if (spec.startsWith("~")) return { label: spec.slice(1), reverse: true }
		return { label: spec, reverse: false }
	}
	if (typeof spec === "object") {
		if (typeof spec.reverse === "string") {
			return { label: spec.reverse, reverse: true }
		}
		if (spec.label) return { label: spec.label, reverse: !!spec.reverse }
	}
	return null
}

/**
 * Interactive UI button backed by a FlashTube movieclip and frame labels.
 */
export class UIButtonMovieClip extends Container {
	/** @type {import('./ui_dialog.js').Dialog | undefined} */
	dialog = undefined
	/** @type {Record<string, unknown> | undefined} */
	def = undefined
	/** @type {Record<string, unknown> | undefined} */
	compDef = undefined
	/** @type {import('./movieclip.js').MovieClip | undefined} */
	mc = undefined
	isEnabled = true
	_pointerOver = false
	_pointerDown = false
	_isDestroyed = false

	/**
	 * @param {import('./ui_dialog.js').Dialog} dialog
	 * @param {Record<string, unknown>} def
	 * @param {Record<string, unknown>} compDef
	 */
	constructor(dialog, def, compDef) {
		super()
		this.dialog = dialog
		this.def = def
		this.compDef = compDef

		const tubedef = dialog.ui.dialogDefinitions.TubeDefinitions[/** @type {string} */ (compDef.tube)]
		if (!tubedef?.tube) {
			console.error("UIButtonMovieClip: tube not loaded:", compDef.tube)
			return
		}

		const mc = tubedef.tube.getMovieClip(/** @type {string} */ (compDef.movieclip))
		if (!mc) {
			console.error("UIButtonMovieClip: movieclip not found:", compDef.movieclip)
			return
		}

		mc.interpolate = compDef.interpolate === true
		if (compDef.framerate) mc.framerate = compDef.framerate
		this.mc = mc
		this.addChild(mc)

		const w = def.width ?? compDef.defaultwidth ?? Math.max(mc.width, 48)
		const h = def.height ?? compDef.defaultheight ?? Math.max(mc.height, 48)
		this.hitArea = new Rectangle(-w / 2, -h / 2, w, h)
		this.eventMode = "static"
		this.cursor = "pointer"

		this._loadSounds(compDef)

		/** @type {boolean} */
		this._isToggle = compDef.toggle === true
		if (this._isToggle) {
			const initial =
				def.initialValueGet && typeof def.initialValueGet === "function"
					? !!def.initialValueGet()
					: def.checked != null
						? !!def.checked
						: false
			this._checked = initial
			this._snapToCheckedState()
		} else {
			this._applyUpState()
		}

		const button = new Button(this)
		button.onDown.connect(() => this._onDown())
		button.onUp.connect(() => this._onUp())
		button.onHover.connect(() => this._onHover())
		button.onOut.connect(() => this._onOut())
		button.onUpOut.connect(() => this._onUpOut())
		button.onPress.connect(() => this._onPress())
		this.button = button
	}

	/** @param {Record<string, unknown>} compDef */
	_loadSounds(compDef) {
		if (compDef.sound) {
			this.sounds = []
			for (const s of /** @type {string[]} */ (compDef.sound)) {
				this.sounds.push(new Howl({ src: s }))
			}
		}
		if (compDef.sounddown) {
			this.soundsdown = []
			for (const s of /** @type {string[]} */ (compDef.sounddown)) {
				this.soundsdown.push(new Howl({ src: s }))
			}
		}
		if (compDef.soundup) {
			this.soundsup = []
			for (const s of /** @type {string[]} */ (compDef.soundup)) {
				this.soundsup.push(new Howl({ src: s }))
			}
		}
		if (compDef.soundtoggleon) {
			this.soundstoggleon = []
			for (const s of /** @type {string[]} */ (compDef.soundtoggleon)) {
				this.soundstoggleon.push(new Howl({ src: s }))
			}
		}
		if (compDef.soundtoggleoff) {
			this.soundstoggleoff = []
			for (const s of /** @type {string[]} */ (compDef.soundtoggleoff)) {
				this.soundstoggleoff.push(new Howl({ src: s }))
			}
		}
	}

	/**
	 * Toggle / checkbox state (only when {@link UIButtonMovieClip#compDef}.toggle is true).
	 * @returns {boolean}
	 */
	get checked() {
		return !!this._checked
	}

	/**
	 * @param {boolean} value
	 */
	set checked(value) {
		if (!this._isToggle) return
		const next = !!value
		if (next === this._checked) {
			this._snapToCheckedState()
			return
		}
		this._checked = next
		this._snapToCheckedState()
	}

	_checkboxLabels() {
		const defaults = { off: "off", on: "on", turnOn: "turnon", turnOff: "turnoff" }
		return { ...defaults, ...(this.compDef?.checkboxLabels || {}) }
	}

	/** Jump to the idle frame for the current checked state (no animation). */
	_snapToCheckedState() {
		if (!this.mc) return
		const labels = this._checkboxLabels()
		const label = this._checked ? labels.on : labels.off
		const fl = this.mc.framelabels?.[label]
		this.mc.stop()
		if (fl) this.mc.setFrame(fl.s)
		else this.mc.setFrame(this._checked ? 10 : 0)
	}

	/**
	 * Play turnon / turnoff, then settle on on / off.
	 * @param {boolean} animate
	 */
	_applyCheckedVisual(animate) {
		if (!this.mc) return
		const labels = this._checkboxLabels()
		if (!animate) {
			this._snapToCheckedState()
			return
		}
		const animLabel = this._checked ? labels.turnOn : labels.turnOff
		if (!this.mc.framelabels?.[animLabel]) {
			this._snapToCheckedState()
			return
		}
		this.mc.looping = false
		this.mc.playLabel(animLabel, () => {
			this._snapToCheckedState()
		})
	}

	/** Idle / default visual (optional `labels.up`, else `frame`). */
	_applyUpState() {
		if (this._isToggle) {
			this._snapToCheckedState()
			return
		}
		const labels = /** @type {Record<string, ButtonMovieClipLabelSpec> | undefined} */ (
			this.compDef?.labels
		)
		const upSpec = labels?.up
		if (upSpec != null) {
			this._playLabelSpec(upSpec)
			return
		}
		const frame = this.compDef?.frame ?? 0
		this.mc?.stop()
		this.mc?.setFrame(/** @type {number} */ (frame))
	}

	/** @param {ButtonMovieClipLabelSpec} spec */
	_playLabelSpec(spec) {
		const action = resolveButtonMovieClipLabel(spec)
		if (!action || !this.mc) return
		if (action.frame != null) {
			this.mc.stop()
			this.mc.setFrame(action.frame)
			return
		}
		if (!action.label) return
		if (!this.mc.framelabels?.[action.label]) {
			console.error("UIButtonMovieClip: label not found:", action.label)
			return
		}
		this.mc.looping = false
		this.mc.playLabel(action.label, undefined, action.reverse)
	}

	_playRandom(howlList) {
		if (!howlList?.length) return
		howlList[Math.floor(Math.random() * howlList.length)].play()
	}

	_onDown() {
		if (!this.isEnabled) return
		this._pointerDown = true
		if (!this._isToggle) {
			const press = /** @type {Record<string, ButtonMovieClipLabelSpec> | undefined} */ (
				this.compDef?.labels
			)?.press
			if (press != null) this._playLabelSpec(press)
		}
		this._playRandom(this.sounds)
		this._playRandom(this.soundsdown)
	}

	_onUp() {
		if (!this.isEnabled) return
		this._pointerDown = false
		if (!this._isToggle && this._pointerOver) {
			const hover = /** @type {Record<string, ButtonMovieClipLabelSpec> | undefined} */ (
				this.compDef?.labels
			)?.hover
			if (hover != null) this._playLabelSpec(hover)
		}
		this._playRandom(this.soundsup)
	}

	_onHover() {
		if (!this.isEnabled || this._isToggle) return
		this._pointerOver = true
		if (this._pointerDown) return
		const hover = /** @type {Record<string, ButtonMovieClipLabelSpec> | undefined} */ (
			this.compDef?.labels
		)?.hover
		if (hover != null) this._playLabelSpec(hover)
	}

	_onOut() {
		if (!this.isEnabled) return
		this._pointerOver = false
		this._pointerDown = false
		if (!this._isToggle) this._playUnhoverOrUp()
	}

	_onUpOut() {
		if (!this.isEnabled) return
		this._pointerOver = false
		this._pointerDown = false
		if (!this._isToggle) this._playUnhoverOrUp()
	}

	_playUnhoverOrUp() {
		const labels = /** @type {Record<string, ButtonMovieClipLabelSpec> | undefined} */ (
			this.compDef?.labels
		)
		if (labels?.unhover != null) {
			this._playLabelSpec(labels.unhover)
			return
		}
		this._applyUpState()
	}

	_onPress() {
		if (!this.isEnabled || !this.dialog || !this.def) return
		if (this._isToggle) {
			this._checked = !this._checked
			this._applyCheckedVisual(true)
			this._playRandom(this._checked ? this.soundstoggleon : this.soundstoggleoff)
			const res = this._checked
				? /** @type {string} */ (this.def.restrue ?? this.def.res)
				: /** @type {string} */ (this.def.resfalse ?? this.def.res)
			this.dialog.buttonPress(res, this)
			if (typeof this.def.callback === "function") this.def.callback(this._checked)
			return
		}
		this.dialog.buttonPress(/** @type {string} */ (this.def.res), this)
	}

	destroymc() {
		if (this.mc) {
			this.mc.stop?.()
			this.mc.destroy?.({ children: true })
			this.mc = undefined
		}
	}

	destroy(options) {
		this._isDestroyed = true
		this.destroymc()
		this.dialog = undefined
		this.def = undefined
		this.compDef = undefined
		super.destroy(options)
	}
}
