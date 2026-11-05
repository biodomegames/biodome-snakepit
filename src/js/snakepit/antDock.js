import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js"
import { Easing, newTween } from "../dome/Tween.js"
import { solutionAntColors, laneCountForSnakes } from "./snake.js"
import {
	antModeForLevel,
	applyAntDifficulty,
	lockedLaneCountForLevel,
} from "./difficulty.js"
import { SLITHER_AMP, SLITHER_WAVE, pointOnTrail, wiggleRateForCells, wiggleScaleForCells, wiggleTrail } from "./slitherWave.js"
import { paintSnakeBody, shadeForNormal } from "./snakeDraw.js"
import { adManager } from "../system/ads.js"
import watchAdIcon from "../../g/icon-watchad.svg"
import * as sfx from "./sfx.js"

const STICK_H = 7
const LANE_H = 46
const ANT_SCALE = 0.52
/** Screen pixels from the ant's origin down to the shadow. */
const ANT_SHADOW_DROP = 4
/** Screen Y nudge on a parked snake. Negative sits higher toward the body middle. */
const ANT_SEAT_DROP = -4

/**
 * Lane stack + ant queue in pit/world space (BoardView local pixels).
 * Sticks separate horizontal lanes. Escaped snakes path around the pit
 * into the topmost free lane; matching ants board the back; a full snake leaves.
 * When the ant queue is empty, any remaining parked snakes auto-exit.
 */
export class AntDock extends Container {
	constructor({
		getTube,
		getUi,
		onAntDied,
		onAntGameOver,
		onStateChange,
		onInteract,
		pace = 1,
		groundLayer = null,
	} = {}) {
		super()
		this.getTube = getTube
		this.getUi = getUi
		this.onAntDied = onAntDied
		this.onAntGameOver = onAntGameOver
		this.onStateChange = onStateChange
		this.onInteract = onInteract
		this.pace = pace
		this.eventMode = "passive"
		this.interactiveChildren = true

		this.stickLayer = new Container()
		this.stickLayer.eventMode = "none"
		this.antLayer = new Container()
		// Passive so the front ant can take a click; the layer itself does not.
		this.antLayer.eventMode = "passive"
		this.lockLayer = new Container()
		this.lockLayer.eventMode = "passive"
		this.lockLayer.interactiveChildren = true
		// Escaped snakes share BoardView's Y-sorted ground layer with grass/rocks.
		this.groundLayer = groundLayer
		this.snakeLayer = groundLayer || new Container()
		this._dockSnakeSeq = 0
		// stickLayer is parented by BoardView under the grass/rocks.
		if (!groundLayer) this.addChild(this.snakeLayer)
		this.addChild(this.antLayer)
		this.addChild(this.lockLayer)

		/** @type {{ clip: any, color: number, boarding?: boolean }[]} */
		this.ants = []
		/** @type {{ y: number, occupied: boolean }[]} */
		this.lanes = []
		/** @type {any[]} */
		this.pending = []
		this._busy = 0
		this._boarding = false
		/** Ants mid-walk from the queue onto a parked snake. */
		this._inflightBoard = 0
		/** @type {any[]} */
		this._parked = []
		this._eating = false
		/** @type {any} */
		this._anteaterClip = null
		/** @type {(() => void)[]} */
		this._idleWaiters = []
		/** @type {{ minX:number, maxX:number, minY:number, maxY:number, cx:number, cy:number, w:number, h:number } | null} */
		this.pit = null
		/** @type {{ minX:number, minY:number, maxX:number, maxY:number } | null} */
		this.layoutBox = null
		this.hexSize = 36
		this._left = 0
		this._laneW = 200
		this._seg = 18
		this._thick = 16
		/** @type {Container[]} */
		this._lockOverlays = []
		this._adBusy = false
		this._level = 1
		/** @type {any} */
		this._unlockDialog = null
	}

	isIdle() {
		return this._busy === 0 && this.pending.length === 0 && this.lanes.every((l) => !l.occupied)
	}

	/**
	 * True when no snake is mid-slither into/out of a lane.
	 * Parked snakes waiting for ants are considered stable.
	 */
	isStableForSave() {
		if (this.pending.length) return false
		if (this._parked.some((s) => s.leaving)) return false
		const occupied = this.lanes.filter((l) => l.occupied).length
		const stableParked = this._parked.filter((s) => !s.leaving).length
		return occupied === stableParked
	}

	waitUntilIdle() {
		if (this.isIdle()) return Promise.resolve()
		return new Promise((resolve) => this._idleWaiters.push(resolve))
	}

	_bumpBusy(delta) {
		this._busy = Math.max(0, this._busy + delta)
		this._flushIdle()
	}

	_flushIdle() {
		if (!this.isIdle()) return
		const waiters = this._idleWaiters.splice(0)
		for (const w of waiters) w()
	}

	clear() {
		this.pending.length = 0
		for (const a of this.ants) a.clip?.parent?.removeChild(a.clip)
		this.ants = []
		this.lanes = []
		this._clearLockOverlays()
		this.stickLayer.removeChildren()
		for (const child of [...this.snakeLayer.children]) {
			if (child.isDockSnake) child.parent?.removeChild(child)
		}
		this.antLayer.removeChildren()
		this.layoutBox = null
		this._busy = 0
		this._boarding = false
		this._inflightBoard = 0
		this._eating = false
		this._parked = []
		this._adBusy = false
		this._anteaterClip?.parent?.removeChild(this._anteaterClip)
		this._anteaterClip = null
		this._flushIdle()
	}

	_clearLockOverlays() {
		for (const overlay of this._lockOverlays) {
			overlay.parent?.removeChild(overlay)
		}
		this._lockOverlays = []
		this.lockLayer?.removeChildren()
		if (this._unlockDialog) {
			const ui = this.getUi?.()
			const open = this._unlockDialog
			this._unlockDialog = null
			ui?.closeDialog?.(open)
		}
	}

	/**
	 * @param {{ snakes: { color: number, cells: unknown[] }[], seed?: number, level?: number, board?: any, rocks?: any[] }} session
	 * @param {{ cx:number, cy:number, w:number, h:number }} pit
	 * @param {number} hexSize
	 * @param {{ antColors?: number[], unlockedLanes?: number } | null} [saved]
	 */
	setup(session, pit, hexSize = 36, saved = null) {
		this.clear()
		if (!session?.snakes?.length || !pit) return
		this.pit = pit
		this.hexSize = hexSize
		this._level = Math.max(1, session.level | 0)
		this._thick = hexSize * 0.72
		this._laneW = Math.max(140, pit.w)
		this._left = pit.cx - this._laneW / 2

		const snakes = session.snakes
		const laneCount = laneCountForSnakes(snakes.length)
		const lockCount = Math.min(laneCount, lockedLaneCountForLevel(this._level))
		const pitTop = pit.cy - pit.h / 2
		const gap = hexSize * 0.85
		const stackH = laneCount * LANE_H + (laneCount + 1) * STICK_H
		const stackBottom = pitTop - gap
		const stackTop = stackBottom - stackH

		for (let i = 0; i < laneCount + 1; i++) {
			const y = stackTop + i * (STICK_H + LANE_H) + STICK_H / 2
			this.stickLayer.addChild(this._makeStick(this._left + this._laneW / 2, y, this._laneW))
		}
		this.lanes = []
		for (let i = 0; i < laneCount; i++) {
			const y = stackTop + STICK_H + i * (STICK_H + LANE_H) + LANE_H / 2
			const locked = lockCount > 0 && i >= laneCount - lockCount
			this.lanes.push({ y, occupied: false, locked })
		}
		let unlocked = Math.max(0, saved?.unlockedLanes | 0)
		for (let i = this.lanes.length - 1; i >= 0 && unlocked > 0; i--) {
			if (!this.lanes[i].locked) continue
			this.lanes[i].locked = false
			unlocked--
		}
		this._buildLockOverlays()

		const rocks = session.rocks || []
		const colors = Array.isArray(saved?.antColors)
			? saved.antColors.slice()
			: applyAntDifficulty(
					antModeForLevel(this._level),
					solutionAntColors(snakes, session.board, rocks),
					{
						snakes,
						board: session.board,
						rocks,
						laneCount,
						seed: session.seed,
					},
				)

		const tube = this.getTube?.()
		const antY = stackTop - 16
		const right = this._left + this._laneW - 8
		// Wider than the ant graphic so neighbors don't overlap. The line grows to the left.
		const antGap = colors.length <= 1 ? 0 : hexSize * 1.15
		this._antGap = antGap
		this._antRight = right
		this._antY = antY
		for (let i = 0; i < colors.length; i++) {
			const clip = tube?.getMovieClip?.("ant")
			if (!clip) break
			clip.eventMode = "none"
			clip.interactiveChildren = false
			clip.scale.set(ANT_SCALE)
			clip.looping = false
			if (clip.framelabels?.idle != null) clip.setFrame?.("idle")
			else clip.setFrame?.(0)
			this._tintAnt(clip, colors[i])
			this._attachAntShadow(clip)
			// Queue front is index 0, standing at the right. The rest extend left.
			clip.position.set(right - i * antGap, antY)
			this.antLayer.addChild(clip)
			this.ants.push({ clip, color: colors[i] })
		}
		this._armFrontClick()

		const pad = 8
		this.layoutBox = {
			minX: this._left - pad,
			maxX: this._left + this._laneW + pad,
			minY: antY - 18,
			maxY: stackBottom + pad,
		}

		if (lockCount > 0) adManager.loadRewarded?.(() => {})
	}

	getAntColors() {
		return this.ants.map((a) => a.color)
	}

	getUnlockedLaneCount() {
		const expected = lockedLaneCountForLevel(this._level)
		if (expected <= 0) return 0
		const stillLocked = this.lanes.filter((l) => l.locked).length
		return Math.max(0, expected - stillLocked)
	}

	getParkedSnapshot() {
		return this._parked
			.filter((s) => !s.leaving && s.lane)
			.map((s) => ({
				color: s.color,
				capacity: s.capacity | 0,
				filled: Math.max(s.arrived | 0, s.reserved | 0),
				laneIndex: this.lanes.indexOf(s.lane),
			}))
			.filter((p) => p.laneIndex >= 0)
	}

	/**
	 * Re-create parked dock snakes after a reload (no entry animation).
	 * @param {object[]} list
	 */
	restoreParked(list) {
		if (!Array.isArray(list) || !list.length) return
		for (const snap of list) {
			const lane = this.lanes[snap.laneIndex]
			if (!lane || lane.occupied) continue
			if (lane.locked) {
				lane.locked = false
				if (lane.lockOverlay) {
					lane.lockOverlay.parent?.removeChild(lane.lockOverlay)
					this._lockOverlays = this._lockOverlays.filter((o) => o !== lane.lockOverlay)
					lane.lockOverlay = null
				}
			}
			this._spawnParkedAtRest(lane, snap)
		}
		// Safety net if kickBoard was skipped (e.g. already boarding).
		this._maybeAutoExitParked()
	}

	_notifyStateChange() {
		this.onStateChange?.()
	}

	/** Tint named ant sprites. The clip itself stays white so the colors are not multiplied. */
	_tintAnt(clip, color) {
		clip.tint = 0xffffff
		clip._antColor = color
		clip.tintInstance?.("antbody", color)
		for (let i = 1; i <= 6; i++) clip.tintInstance?.("leg" + i, color)
		this._shadeAnt(clip)
		if (clip.curframe != null) clip.setFrame(clip.curframe)
	}

	/**
	 * The highlight sits on the ant's local top. Spin that side toward the
	 * upper-left light, and give the opposite sprite the shadow color.
	 */
	_shadeAnt(clip) {
		const color = clip._antColor
		if (color == null) return
		const rot = clip.rotation || 0
		const pair = shadeForNormal(Math.sin(rot), -Math.cos(rot), color)
		this._setPartTint(clip, "light", pair.light)
		this._setPartTint(clip, "dark", pair.dark)
		this._placeAntShadow(clip)
	}

	_attachAntShadow(clip) {
		if (clip._antShadow) return
		const shadow = new Sprite(Texture.from("tiles_antshadow.png"))
		shadow.anchor.set(0.5)
		shadow.eventMode = "none"
		clip._antShadow = shadow
		clip.addChildAt(shadow, 0)
		this._placeAntShadow(clip)
	}

	/** Keep the blob under the ant in screen space, without spinning or squashing with the body. */
	_placeAntShadow(clip) {
		const shadow = clip._antShadow
		if (!shadow) return
		const rot = clip.rotation || 0
		const sx = clip.scale.x || ANT_SCALE
		const sy = clip.scale.y || ANT_SCALE
		shadow.position.set(
			(ANT_SHADOW_DROP * Math.sin(rot)) / sx,
			(ANT_SHADOW_DROP * Math.cos(rot)) / sy,
		)
		shadow.rotation = -rot
		shadow.scale.set(ANT_SCALE / sx, ANT_SCALE / sy)
		if (shadow.parent === clip) clip.setChildIndex(shadow, 0)
	}

	_setPartTint(clip, name, color) {
		clip.tintInstance?.(name, color)
		const spr = clip.spritecache?.[name]
		if (spr) spr.tint = color
	}

	/** Board-local point over the lanes, including a long snake hanging past the left edge. */
	coversLocal(x, y) {
		const box = this.layoutBox
		if (!box) return false
		const reach = this.hexSize * 14
		return x >= box.minX - reach && x <= box.maxX + reach && y >= box.minY - 24 && y <= box.maxY + 24
	}

	_makeStick(x, y, w) {
		const row = new Container()
		const stickW = 16
		const gap = 8
		const count = Math.max(4, Math.floor(w / (stickW + gap)))
		const total = count * stickW + (count - 1) * gap
		let sx = -total / 2 + stickW / 2
		for (let i = 0; i < count; i++) {
			const g = new Graphics()
			g.roundRect(-stickW / 2, -STICK_H / 2, stickW, STICK_H, 3)
			g.fill({ color: 0xf2efe8 })
			g.stroke({ width: 1.5, color: 0x9a958c })
			g.position.set(sx, 0)
			row.addChild(g)
			sx += stickW + gap
		}
		row.position.set(x, y)
		return row
	}

	topFreeLane() {
		return this.lanes.find((l) => !l.occupied && !l.locked) ?? null
	}

	hasFreeLane() {
		return this.topFreeLane() != null
	}

	/** Mark a lane taken before the pit exit animation starts. */
	reserveLane() {
		const lane = this.topFreeLane()
		if (!lane) return null
		lane.occupied = true
		return lane
	}

	_buildLockOverlays() {
		this._clearLockOverlays()
		for (const lane of this.lanes) {
			if (!lane.locked) continue
			const overlay = new Container()
			overlay.eventMode = "static"
			overlay.cursor = "pointer"
			overlay.hitArea = new Rectangle(this._left, lane.y - LANE_H / 2, this._laneW, LANE_H)

			const dim = new Graphics()
			dim.roundRect(this._left + 4, lane.y - LANE_H / 2 + 2, this._laneW - 8, LANE_H - 4, 8)
			dim.fill({ color: 0x0d1f0d, alpha: 0.62 })
			dim.stroke({ width: 2, color: 0x33a12d, alpha: 0.85 })
			dim.eventMode = "none"
			overlay.addChild(dim)

			const icon = new Sprite(Texture.from(watchAdIcon))
			icon.anchor.set(0.5)
			const iconSize = Math.min(44, LANE_H - 4)
			icon.width = iconSize
			icon.height = iconSize
			icon.position.set(this._left + this._laneW / 2, lane.y)
			icon.eventMode = "none"
			overlay.addChild(icon)

			overlay.on("pointertap", (e) => {
				e.stopPropagation()
				this._openUnlockLaneDialog(lane, overlay)
			})
			this.lockLayer.addChild(overlay)
			this._lockOverlays.push(overlay)
			lane.lockOverlay = overlay
		}
	}

	_openUnlockLaneDialog(lane, overlay) {
		if (!lane?.locked || this._adBusy || this._unlockDialog) return
		this.onInteract?.()
		const ui = this.getUi?.()
		if (!ui?.displayDialog) {
			// No UI shell — still allow unlock via rewarded flow.
			this._playUnlockAd(lane, overlay)
			return
		}
		this._unlockDialog = ui.displayDialog("unlockLane", {}, (res, dialog) => {
			if (dialog?.isClosing || dialog?.isClosed) {
				if (this._unlockDialog === dialog) this._unlockDialog = null
			}
			if (res === "watchad") this._playUnlockAd(lane, overlay)
		})
	}

	_playUnlockAd(lane, overlay) {
		if (!lane?.locked || this._adBusy) return
		this._adBusy = true
		adManager.showRewarded((ok) => {
			this._adBusy = false
			if (!ok) return
			this._unlockLane(lane, overlay)
		})
	}

	_unlockLane(lane, overlay) {
		if (!lane) return
		lane.locked = false
		const node = overlay || lane.lockOverlay
		if (node) {
			node.parent?.removeChild(node)
			this._lockOverlays = this._lockOverlays.filter((o) => o !== node)
		}
		lane.lockOverlay = null
		this._notifyStateChange()
		this._takeNextPending()
		this._flushIdle()
	}

	/**
	 * @param {{
	 *   color: number,
	 *   capacity: number,
	 *   from: { x: number, y: number, ang?: number },
	 *   bodyPts?: { x: number, y: number }[],
	 * }} job
	 */
	enqueueEscapedSnake(job) {
		const capacity = Math.max(1, job.capacity | 0)
		const lane = job.lane?.occupied ? job.lane : this.reserveLane()
		const payload = { ...job, capacity, lane }
		if (lane) this._run(lane, payload)
		else this.pending.push(payload)
		return this.waitUntilIdle()
	}

	_takeNextPending() {
		const lane = this.topFreeLane()
		if (!lane || !this.pending.length) {
			this._flushIdle()
			return
		}
		this._run(lane, this.pending.shift())
	}

	_run(lane, job) {
		lane.occupied = true
		this._bumpBusy(1)
		const run = async () => {
			const root = new Container()
			const g = new Graphics()
			const riders = new Container()
			root.addChild(g)
			root.addChild(riders)
			let face = null
			try {
				face = this.getTube?.()?.getMovieClip?.("snakeFace")
				if (face) {
					face.eventMode = "none"
					face.scale.set((this.hexSize * 0.7) / 44)
					root.addChild(face)
				}
			} catch {
				face = null
			}
			root.isSnake = true
			root.isDockSnake = true
			root.snakeId = 1000 + this._dockSnakeSeq++
			this.snakeLayer.addChild(root)
			/** @type {{ clip: any, fromTail: number }[]} */
			const riderList = []
			const state = {
				g,
				face,
				riders: riderList,
				color: job.color,
				thick: this._thick,
				bodyLen: 1,
				dense: /** @type {{x:number,y:number}[]} */ ([]),
				cum: /** @type {number[]} */ ([0]),
				headDist: 0,
				waveFrom: 0,
				waveTo: 0,
				wavePhase: Math.random() * Math.PI * 2,
				wiggleScale: wiggleScaleForCells(job.capacity || 2),
				wiggleRate: wiggleRateForCells(job.capacity || 2),
				lane,
			}
			const paint = (headDist) => {
				state.headDist = headDist
				const slice = this._sliceBack(state.dense, state.cum, headDist, state.bodyLen)
				const amp = this._travelAmp(headDist, state.waveFrom, state.waveTo, state.wiggleScale)
				const wave = (this.hexSize * SLITHER_WAVE) / (state.wiggleRate || 1)
				const phase = state.wavePhase + (headDist / wave) * Math.PI * 2
				let pts = slice.pts
				let headAng = slice.headAng
				const waved = wiggleTrail(pts, amp, phase, this.hexSize, wave)
				if (waved) {
					pts = waved.pts
					headAng = waved.headAng
				}
				this._stroke(g, face, pts, headAng, state.color, state.thick)
				this._applySnakeDepth(root, pts)
				for (const r of riderList) {
					const behind = Math.max(0, state.bodyLen - r.fromTail)
					if (waved) {
						const seat = pointOnTrail(pts, behind, state.bodyLen)
						// Keep riders near the stroke centerline (middle of the body).
						const lift = state.thick * 0.02
						r.clip.position.set(
							seat.x - Math.sin(seat.ang) * lift,
							seat.y + Math.cos(seat.ang) * lift + ANT_SEAT_DROP,
						)
						if (r.rotOffset == null) r.rotOffset = r.clip.rotation - seat.ang
						r.clip.rotation = seat.ang + r.rotOffset
					} else {
						const d = headDist - state.bodyLen + r.fromTail
						const p = this._pointAt(state.dense, state.cum, d)
						r.clip.position.set(p.x, p.y + ANT_SEAT_DROP)
					}
					this._shadeAnt(r.clip)
				}
			}
			let slitherHeld = true
			try {
				const bodyPts = job.bodyPts?.length
					? job.bodyPts.map((p) => ({ x: p.x, y: p.y }))
					: [job.from, job.from]
				const body = this._dedupe(bodyPts)
				const roughLen = Math.max(this._pathLength(body), this.hexSize * 0.45)
				const route = this._shortestRoute(job.from, lane, roughLen)
				// Round the body and the way out together, once. A second pass
				// treats the already-rounded bend as a corner and balloons it.
				const full = this._dedupe([...body, ...route.pts])
				state.dense = this._densify(full, this.hexSize * 0.55)
				state.cum = this._cum(state.dense)
				state.laneY = lane.y
				const startDist = this._closestDistFrom(
					state.dense,
					state.cum,
					job.from,
					Math.max(0, roughLen * 0.5),
					roughLen + this.hexSize * 2,
				)
				state.bodyLen = Math.max(this.hexSize * 0.45, startDist)
				const stopDist = state.cum[state.cum.length - 1] || startDist
				state.waveFrom = startDist
				state.waveTo = stopDist
				paint(startDist)
				if (stopDist > startDist + 1) await this._slither(paint, startDist, stopDist)
				paint(stopDist)
				if (slitherHeld) {
					sfx.loopRemove("slither")
					slitherHeld = false
				}
				sfx.play("park")
				state.capacity = job.capacity
				state.reserved = 0
				state.arrived = 0
				state.leaving = false
				state.laneY = lane.y
				state.lane = lane
				state.root = root
				state.riderLayer = riders
				state.paint = paint
				const hit = this._armLaneHit(state)
				this._parked.push(state)
				this._notifyStateChange()
				// finish must exist before kickBoard — empty queues auto-exit immediately.
				const waitFinish = new Promise((resolve) => {
					state.finish = () => {
						if (state.leaving) return
						state.leaving = true
						hit.eventMode = "none"
						resolve()
					}
				})
				this._kickBoard()
				await waitFinish
				this._parked = this._parked.filter((s) => s !== state)
				sfx.play("snakeComplete")
				sfx.loopAdd("slither")
				slitherHeld = true
				await this._slitherOut(state, paint)
				sfx.loopRemove("slither")
				slitherHeld = false
				sfx.play("snakeLeave")
			} catch (err) {
				console.error("lane dock failed", err)
			} finally {
				if (slitherHeld) sfx.loopRemove("slither")
				for (const r of riderList) r.clip?.parent?.removeChild(r.clip)
				this._parked = this._parked.filter((s) => s !== state)
				root.parent?.removeChild(root)
				lane.occupied = false
				this._bumpBusy(-1)
				this._notifyStateChange()
				this._takeNextPending()
			}
		}
		run()
	}

	/**
	 * Place a snake already parked in a lane (used when restoring a save).
	 * @param {{ y:number, occupied:boolean, locked?:boolean }} lane
	 * @param {{ color:number, capacity:number, filled?:number }} snap
	 */
	_spawnParkedAtRest(lane, snap) {
		const capacity = Math.max(1, snap.capacity | 0)
		const filled = Math.max(0, Math.min(capacity, snap.filled | 0))
		lane.occupied = true
		this._bumpBusy(1)
		const root = new Container()
		const g = new Graphics()
		const riders = new Container()
		root.addChild(g)
		root.addChild(riders)
		let face = null
		try {
			face = this.getTube?.()?.getMovieClip?.("snakeFace")
			if (face) {
				face.eventMode = "none"
				face.scale.set((this.hexSize * 0.7) / 44)
				root.addChild(face)
			}
		} catch {
			face = null
		}
		root.isSnake = true
		root.isDockSnake = true
		root.snakeId = 1000 + this._dockSnakeSeq++
		this.snakeLayer.addChild(root)
		/** @type {{ clip: any, fromTail: number, rotOffset?: number }[]} */
		const riderList = []
		const bodyLen = Math.max(this.hexSize * 0.45, capacity * this.hexSize * 0.55)
		const y = lane.y
		const rightX = this._left + this._laneW
		const nose = { x: rightX, y }
		const tip = { x: rightX - bodyLen, y }
		const dense = this._densify([nose, tip], this.hexSize * 0.55)
		const cum = this._cum(dense)
		const stopDist = cum[cum.length - 1] || bodyLen
		const state = {
			g,
			face,
			riders: riderList,
			color: snap.color,
			thick: this._thick,
			bodyLen,
			dense,
			cum,
			headDist: stopDist,
			waveFrom: stopDist,
			waveTo: stopDist,
			wavePhase: Math.random() * Math.PI * 2,
			wiggleScale: wiggleScaleForCells(capacity),
			wiggleRate: wiggleRateForCells(capacity),
			lane,
			laneY: y,
			capacity,
			reserved: filled,
			arrived: filled,
			leaving: false,
			root,
			riderLayer: riders,
		}
		const paint = (headDist) => {
			state.headDist = headDist
			const slice = this._sliceBack(state.dense, state.cum, headDist, state.bodyLen)
			const amp = this._travelAmp(headDist, state.waveFrom, state.waveTo, state.wiggleScale)
			const wave = (this.hexSize * SLITHER_WAVE) / (state.wiggleRate || 1)
			const phase = state.wavePhase + (headDist / wave) * Math.PI * 2
			let pts = slice.pts
			let headAng = slice.headAng
			const waved = wiggleTrail(pts, amp, phase, this.hexSize, wave)
			if (waved) {
				pts = waved.pts
				headAng = waved.headAng
			}
			this._stroke(g, face, pts, headAng, state.color, state.thick)
			this._applySnakeDepth(root, pts)
			for (const r of riderList) {
				const behind = Math.max(0, state.bodyLen - r.fromTail)
				if (waved) {
					const seat = pointOnTrail(pts, behind, state.bodyLen)
					const lift = state.thick * 0.02
					r.clip.position.set(
						seat.x - Math.sin(seat.ang) * lift,
						seat.y + Math.cos(seat.ang) * lift + ANT_SEAT_DROP,
					)
					if (r.rotOffset == null) r.rotOffset = Math.PI - seat.ang
					r.clip.rotation = seat.ang + r.rotOffset
				} else {
					const d = headDist - state.bodyLen + r.fromTail
					const p = this._pointAt(state.dense, state.cum, d)
					r.clip.position.set(p.x, p.y + ANT_SEAT_DROP)
				}
				this._shadeAnt(r.clip)
			}
		}
		state.paint = paint
		paint(stopDist)

		const tube = this.getTube?.()
		for (let i = 0; i < filled; i++) {
			const clip = tube?.getMovieClip?.("ant")
			if (!clip) break
			clip.eventMode = "none"
			clip.interactiveChildren = false
			clip.scale.set(ANT_SCALE)
			clip.looping = false
			if (clip.framelabels?.idle != null) clip.setFrame?.("idle")
			else clip.setFrame?.(0)
			this._tintAnt(clip, snap.color)
			this._attachAntShadow(clip)
			riders.addChild(clip)
			const seatD = this._seatDist(state, i, capacity)
			const tailD = Math.max(0, state.headDist - state.bodyLen)
			riderList.push({
				clip,
				fromTail: seatD - tailD,
				rotOffset: Math.PI,
			})
		}
		paint(stopDist)

		const hit = this._armLaneHit(state)
		this._parked.push(state)
		// finish must exist before kickBoard — restored empty-queue snakes auto-exit here.
		const waitFinish = new Promise((resolve) => {
			state.finish = () => {
				if (state.leaving) return
				state.leaving = true
				hit.eventMode = "none"
				resolve()
			}
		})
		this._kickBoard()
		;(async () => {
			try {
				await waitFinish
				this._parked = this._parked.filter((s) => s !== state)
				sfx.play("snakeComplete")
				sfx.loopAdd("slither")
				await this._slitherOut(state, paint)
				sfx.loopRemove("slither")
				sfx.play("snakeLeave")
			} catch (err) {
				console.error("restored lane dock failed", err)
			} finally {
				sfx.loopRemove("slither")
				for (const r of riderList) r.clip?.parent?.removeChild(r.clip)
				this._parked = this._parked.filter((s) => s !== state)
				root.parent?.removeChild(root)
				lane.occupied = false
				this._bumpBusy(-1)
				this._notifyStateChange()
				this._takeNextPending()
			}
		})()
	}

	/**
	 * Shortest path around the pit to a point just left or just right of this lane,
	 * then one straight slide into the lane.
	 * From the left, the head stops on the lane's right edge.
	 * From the right, the tail stops on that edge.
	 */
	_shortestRoute(from, lane, bodyLen) {
		const box = this._pitBox()
		const y = lane.y
		const rightX = this._left + this._laneW
		const beside = Math.max(22, this.hexSize * 0.65)
		const leftMouth = { x: this._left - beside, y }
		const rightMouth = { x: rightX + beside, y }
		const leftPts = this._dedupe([
			...this._approach(from, leftMouth, box),
			{ x: rightX, y },
		])
		const rightPts = this._dedupe([
			...this._approach(from, rightMouth, box),
			{ x: rightX - Math.max(bodyLen, 1), y },
		])
		if (this._pathLength(leftPts) <= this._pathLength(rightPts)) {
			return { pts: leftPts, side: "left" }
		}
		return { pts: rightPts, side: "right" }
	}

	_pitBox() {
		const pit = this.pit
		const pad = this.hexSize * 0.85
		return {
			minX: pit.cx - pit.w / 2 - pad,
			maxX: pit.cx + pit.w / 2 + pad,
			minY: pit.cy - pit.h / 2 - pad,
			maxY: pit.cy + pit.h / 2 + pad,
		}
	}

	/** Polyline from `from` to `mouth` that stays outside the pit box. */
	_approach(from, mouth, box) {
		if (!this._segmentHitsBox(from, mouth, box)) return [from, mouth]
		const a = this._closestBoundary(from, box)
		const b = this._closestBoundary(mouth, box)
		const cw = this._dedupe([from, a, ...this._along(a, b, box, 1), mouth])
		const ccw = this._dedupe([from, a, ...this._along(a, b, box, -1), mouth])
		return this._pathLength(cw) <= this._pathLength(ccw) ? cw : ccw
	}

	_segmentHitsBox(a, b, box) {
		const dx = b.x - a.x
		const dy = b.y - a.y
		let t0 = 0
		let t1 = 1
		const ps = [-dx, dx, -dy, dy]
		const qs = [a.x - box.minX, box.maxX - a.x, a.y - box.minY, box.maxY - a.y]
		for (let i = 0; i < 4; i++) {
			if (Math.abs(ps[i]) < 1e-8) {
				if (qs[i] < 0) return false
			} else {
				const r = qs[i] / ps[i]
				if (ps[i] < 0) {
					if (r > t1) return false
					if (r > t0) t0 = r
				} else {
					if (r < t0) return false
					if (r < t1) t1 = r
				}
			}
		}
		return t0 < t1 - 1e-3 && t1 > 1e-3 && t0 < 1 - 1e-3
	}

	_closestBoundary(p, box) {
		const x = Math.min(box.maxX, Math.max(box.minX, p.x))
		const y = Math.min(box.maxY, Math.max(box.minY, p.y))
		const opts = [
			{ x: box.minX, y },
			{ x: box.maxX, y },
			{ x, y: box.minY },
			{ x, y: box.maxY },
		]
		let best = opts[0]
		let bestD = Infinity
		for (const c of opts) {
			const d = Math.hypot(c.x - p.x, c.y - p.y)
			if (d < bestD) {
				bestD = d
				best = c
			}
		}
		return best
	}

	_boundaryS(p, box) {
		const w = box.maxX - box.minX
		const h = box.maxY - box.minY
		const e = 1.5
		if (Math.abs(p.y - box.minY) <= e) return Math.min(box.maxX, Math.max(box.minX, p.x)) - box.minX
		if (Math.abs(p.x - box.maxX) <= e) return w + (Math.min(box.maxY, Math.max(box.minY, p.y)) - box.minY)
		if (Math.abs(p.y - box.maxY) <= e)
			return w + h + (box.maxX - Math.min(box.maxX, Math.max(box.minX, p.x)))
		if (Math.abs(p.x - box.minX) <= e)
			return w + h + w + (box.maxY - Math.min(box.maxY, Math.max(box.minY, p.y)))
		return 0
	}

	_pointAtS(s, box) {
		const w = box.maxX - box.minX
		const h = box.maxY - box.minY
		const per = 2 * (w + h) || 1
		s = ((s % per) + per) % per
		if (s <= w) return { x: box.minX + s, y: box.minY }
		s -= w
		if (s <= h) return { x: box.maxX, y: box.minY + s }
		s -= h
		if (s <= w) return { x: box.maxX - s, y: box.maxY }
		s -= w
		return { x: box.minX, y: box.maxY - s }
	}

	/** Corners strictly between boundary points `a` and `b`. dir +1 follows increasing perimeter. */
	_along(a, b, box, dir) {
		const w = box.maxX - box.minX
		const h = box.maxY - box.minY
		const per = 2 * (w + h) || 1
		let s0 = this._boundaryS(a, box)
		let s1 = this._boundaryS(b, box)
		if (dir > 0) {
			if (s1 <= s0) s1 += per
		} else if (s1 >= s0) s1 -= per
		/** @type {number[]} */
		const hits = []
		for (let k = -1; k <= 2; k++) {
			for (const base of [0, w, w + h, 2 * w + h]) {
				const m = base + k * per
				if (dir > 0 && m > s0 + 0.5 && m < s1 - 0.5) hits.push(m)
				if (dir < 0 && m < s0 - 0.5 && m > s1 + 0.5) hits.push(m)
			}
		}
		hits.sort((u, v) => (dir > 0 ? u - v : v - u))
		return hits.map((m) => this._pointAtS(m, box))
	}

	_dedupe(pts) {
		/** @type {{x:number,y:number}[]} */
		const out = []
		for (const p of pts) {
			const prev = out[out.length - 1]
			if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.75) out.push({ x: p.x, y: p.y })
		}
		return out
	}

	_pathLength(pts) {
		let len = 0
		for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
		return len
	}

	_densify(pts, cornerRadius) {
		if (pts.length <= 2) return pts.map((p) => ({ x: p.x, y: p.y }))
		/** @type {{x:number,y:number}[]} */
		const out = [{ x: pts[0].x, y: pts[0].y }]
		const pushLine = (ax, ay, bx, by, segs = 4) => {
			for (let i = 1; i <= segs; i++) {
				const t = i / segs
				out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t })
			}
		}
		const pushQuad = (ax, ay, cx, cy, bx, by, segs = 8) => {
			for (let i = 1; i <= segs; i++) {
				const t = i / segs
				const u = 1 - t
				out.push({
					x: u * u * ax + 2 * u * t * cx + t * t * bx,
					y: u * u * ay + 2 * u * t * cy + t * t * by,
				})
			}
		}
		for (let i = 1; i < pts.length - 1; i++) {
			const prev = pts[i - 1]
			const curr = pts[i]
			const next = pts[i + 1]
			const dIn = Math.hypot(curr.x - prev.x, curr.y - prev.y)
			const dOut = Math.hypot(next.x - curr.x, next.y - curr.y)
			const r = Math.min(cornerRadius, dIn * 0.45, dOut * 0.45)
			const a1 = Math.atan2(curr.y - prev.y, curr.x - prev.x)
			const a2 = Math.atan2(next.y - curr.y, next.x - curr.x)
			const p1x = curr.x - Math.cos(a1) * r
			const p1y = curr.y - Math.sin(a1) * r
			const p2x = curr.x + Math.cos(a2) * r
			const p2y = curr.y + Math.sin(a2) * r
			const last = out[out.length - 1]
			pushLine(last.x, last.y, p1x, p1y, 3)
			pushQuad(p1x, p1y, curr.x, curr.y, p2x, p2y, 8)
		}
		const last = out[out.length - 1]
		const tip = pts[pts.length - 1]
		pushLine(last.x, last.y, tip.x, tip.y, 3)
		return out
	}

	_cum(pts) {
		const cum = [0]
		for (let i = 1; i < pts.length; i++) {
			cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
		}
		return cum
	}

	_pointAt(pts, cum, dist) {
		const total = cum[cum.length - 1] || 0
		const d = Math.max(0, Math.min(dist, total))
		if (!pts.length) return { x: 0, y: 0, ang: 0 }
		if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, ang: 0 }
		let i = 1
		while (i < cum.length && cum[i] < d) i++
		const i1 = Math.max(1, Math.min(i, pts.length - 1))
		const i0 = i1 - 1
		const span = cum[i1] - cum[i0] || 1
		const t = (d - cum[i0]) / span
		const ax = pts[i0].x
		const ay = pts[i0].y
		const bx = pts[i1].x
		const by = pts[i1].y
		return {
			x: ax + (bx - ax) * t,
			y: ay + (by - ay) * t,
			ang: Math.atan2(by - ay, bx - ax),
		}
	}

	_closestDist(pts, cum, target) {
		const total = cum[cum.length - 1] || 0
		return this._closestDistFrom(pts, cum, target, 0, total)
	}

	_closestDistFrom(pts, cum, target, minD, maxD) {
		let best = minD
		let bestD = Infinity
		const total = cum[cum.length - 1] || 0
		const hi = Math.min(total, maxD)
		const lo = Math.max(0, Math.min(minD, hi))
		for (let d = lo; d <= hi; d += 3) {
			const p = this._pointAt(pts, cum, d)
			const dist = Math.hypot(p.x - target.x, p.y - target.y)
			if (dist < bestD) {
				bestD = dist
				best = d
			}
		}
		return best
	}

	/** Head at `headDist`, body trailing backward. pts[0] is the head. */
	_sliceBack(pts, cum, headDist, bodyLen) {
		const total = cum[cum.length - 1] || 0
		const headD = Math.max(0, Math.min(headDist, total))
		const tailD = Math.max(0, headD - bodyLen)
		const head = this._pointAt(pts, cum, headD)
		const tail = this._pointAt(pts, cum, tailD)
		/** @type {{x:number,y:number}[]} */
		const out = [{ x: head.x, y: head.y }]
		for (let i = pts.length - 1; i >= 0; i--) {
			if (cum[i] < headD - 0.5 && cum[i] > tailD + 0.5) out.push({ x: pts[i].x, y: pts[i].y })
		}
		out.push({ x: tail.x, y: tail.y })
		const aheadD = Math.min(total, headD + 5)
		let headAng
		if (aheadD > headD + 0.4) {
			const ahead = this._pointAt(pts, cum, aheadD)
			headAng = Math.atan2(ahead.y - head.y, ahead.x - head.x)
		} else {
			const behind = this._pointAt(pts, cum, Math.max(0, headD - 5))
			headAng = Math.atan2(head.y - behind.y, head.x - behind.x)
		}
		return { pts: out, headAng }
	}

	_stroke(g, face, pathPts, headAng, color, thickness) {
		g.clear()
		if (!pathPts.length) {
			if (face) face.visible = false
			return
		}
		paintSnakeBody(g, pathPts, { color, thickness, alpha: 1 })
		if (face) {
			face.visible = true
			const head = pathPts[0]
			face.position.set(head.x, head.y)
			face.rotation = headAng
		}
	}

	/** Southernmost body Y, same convention as pit snakes vs rim grass. */
	_applySnakeDepth(root, pathPts) {
		if (!root) return
		let maxY = -Infinity
		for (const p of pathPts || []) {
			if (p.y > maxY) maxY = p.y
		}
		if (!Number.isFinite(maxY)) maxY = 0
		root.zIndex = maxY + (root.snakeId ?? 0) * 0.01
		root._bodyPts = pathPts
	}

	_slither(paint, fromDist, toDist) {
		const travel = Math.abs(toDist - fromDist)
		const speed = (this.hexSize * Math.sqrt(3)) / (0.11 * this.pace)
		const dur = Math.max(0.25 * this.pace, travel / speed)
		return new Promise((resolve) => {
			const proxy = { d: fromDist }
			newTween(proxy, { d: toDist }, dur)
				.ease(Easing.linear)
				.onUpdate(() => paint(proxy.d))
				.onDone(() => {
					paint(toDist)
					resolve()
				})
		})
	}

	_armLaneHit(state) {
		const head = this._pointAt(state.dense, state.cum, state.headDist)
		const tail = this._pointAt(state.dense, state.cum, Math.max(0, state.headDist - state.bodyLen))
		const minX = Math.min(head.x, tail.x, this._left) - 16
		const maxX = Math.max(head.x, tail.x, this._left + this._laneW) + 16
		const hit = new Container()
		hit.eventMode = "static"
		hit.cursor = "pointer"
		hit.hitArea = new Rectangle(minX, state.laneY - LANE_H / 2, Math.max(24, maxX - minX), LANE_H)
		hit.on("pointertap", (e) => {
			e.stopPropagation()
			this.onInteract?.()
			state.finish?.()
		})
		state.root.addChild(hit)
		return hit
	}

	/** Front ant reserves a free matching seat, walks, and 0.1s later the next ant checks. */
	_kickBoard() {
		if (this._boarding) return
		this._boarding = true
		this._boardLoop().finally(() => {
			this._boarding = false
		})
	}

	async _boardLoop() {
		while (!this._eating && this.ants.length && this._parked.some((s) => !s.leaving && s.reserved < s.capacity)) {
			const front = this.ants[0]
			if (front.dying) {
				await this._delay(0.05 * this.pace)
				continue
			}
			const snake = this._parked.find(
				(s) => !s.leaving && s.color === front.color && s.reserved < s.capacity,
			)
			if (!snake) {
				await this._delay(0.1 * this.pace)
				continue
			}
			this.ants.shift()
			const seatIndex = snake.reserved
			snake.reserved++
			this._sendAnt(front, snake, seatIndex)
			this._advanceQueue()
			await this._delay(0.1 * this.pace)
		}
		this._maybeAutoExitParked()
	}

	/** Once every ant has left the queue (and finished walking on), flush leftover lane snakes. */
	_maybeAutoExitParked() {
		if (this._eating || this.ants.length || this._inflightBoard > 0) return
		for (const s of [...this._parked]) {
			if (!s.leaving) s.finish?.()
		}
	}

	_sendAnt(ant, state, seatIndex) {
		const clip = ant.clip
		if (ant.crawl) {
			ant.crawl.stop?.()
			ant.crawl = null
			this._endAntStep(ant)
		}
		// Riders are not clickable. The queue handler would otherwise still
		// squish whichever ant is now at the front.
		clip.removeAllListeners?.("pointertap")
		clip.eventMode = "none"
		clip.cursor = null
		clip.hitArea = null
		// Ride with the snake in the ground layer so grass can cover both.
		state.riderLayer?.addChild(clip)
		const seatD = this._seatDist(state, seatIndex, state.capacity)
		const spot = this._pointAt(state.dense, state.cum, seatD)
		const seat = { x: spot.x, y: state.laneY + ANT_SEAT_DROP }
		this._inflightBoard++
		const run = async () => {
			this._beginAntStep(ant)
			try {
				this._playWalk(clip)
				await this._walkForwardDownLeft(clip, seat, state.laneY)
				this._stopWalk(clip)
				if (!state.root?.parent) {
					clip.parent?.removeChild(clip)
					return
				}
				const tailD = Math.max(0, state.headDist - state.bodyLen)
				const parked = this._pointAt(state.dense, state.cum, seatD)
				state.riders.push({
					clip,
					fromTail: seatD - tailD,
					// Trail samples point head→tail. Ants keep the facing they sat down with.
					rotOffset: clip.rotation - (parked.ang + Math.PI),
				})
				state.arrived++
				sfx.play("antSit")
				state.paint?.(state.headDist)
				this._notifyStateChange()
				if (!state.leaving && state.arrived >= state.capacity) state.finish?.()
			} catch (err) {
				console.error("ant walk failed", err)
			} finally {
				this._endAntStep(ant)
				this._inflightBoard = Math.max(0, this._inflightBoard - 1)
				this._maybeAutoExitParked()
			}
		}
		run()
	}

	/** Remaining ants crawl one step toward the front of the queue (to the right). */
	_advanceQueue() {
		const gap = this._antGap || 0
		if (!gap || !this.ants.length) return
		sfx.play("antScuttle")
		for (let i = 0; i < this.ants.length; i++) {
			const ant = this.ants[i]
			const x = this._antRight - i * gap
			if (ant.crawl) {
				ant.crawl.stop?.()
				ant.crawl = null
				this._endAntStep(ant)
			}
			ant.clip.rotation = 0
			this._shadeAnt(ant.clip)
			this._beginAntStep(ant)
			this._playWalk(ant.clip)
			ant.crawl = newTween(ant.clip, { x, y: this._antY }, 0.045 * this.pace)
				.ease(Easing.linear)
				.onDone(() => {
					ant.crawl = null
					if (this.ants.includes(ant)) this._stopWalk(ant.clip)
					this._endAntStep(ant)
				})
		}
		this._armFrontClick()
	}

	/** Only the queue's front ant (index 0, on the right) can be clicked. */
	_armFrontClick() {
		for (const ant of this.ants) {
			ant.clip.removeAllListeners?.("pointertap")
			ant.clip.eventMode = "none"
			ant.clip.cursor = null
		}
		const front = this.ants[0]
		if (!front || front.dying) return
		const clip = front.clip
		clip.eventMode = "static"
		clip.cursor = "pointer"
		const b = clip.getLocalBounds()
		if (b.width > 2 && b.height > 2) {
			clip.hitArea = new Rectangle(b.x - 8, b.y - 8, b.width + 16, b.height + 16)
		}
		clip.on("pointertap", (e) => {
			e.stopPropagation()
			this._killFrontAnt()
		})
	}

	/** Play the dead sequence, fade out, then the queue steps up. */
	_killFrontAnt() {
		const ant = this.ants[0]
		if (!ant || ant.dying || this._eating) return
		this.onInteract?.()
		ant.dying = true
		if (ant.crawl) {
			ant.crawl.stop?.()
			ant.crawl = null
			this._endAntStep(ant)
		}
		sfx.play("squash")
		const clip = ant.clip
		clip.eventMode = "none"
		clip.cursor = null
		clip.removeAllListeners?.("pointertap")
		const fatal = this.onAntDied?.() === true
		this._playDead(clip, ant.color).finally(() => {
			const i = this.ants.indexOf(ant)
			if (i >= 0) this.ants.splice(i, 1)
			clip.parent?.removeChild(clip)
			if (fatal) {
				this.onAntGameOver?.()
				return
			}
			this._advanceQueue()
			this._armFrontClick()
			this._kickBoard()
		})
	}

	_playDead(clip, color) {
		return new Promise((resolve) => {
			clip.looping = false
			const fadeOut = () => {
				this._tintAnt(clip, color)
				newTween(clip, { alpha: 0 }, 0.3).ease(Easing.inQuad).onDone(resolve)
			}
			if (clip.framelabels?.dead != null) {
				clip.playLabel("dead", fadeOut)
				this._tintAnt(clip, color)
			} else {
				clip.stop?.()
				clip.setFrame?.(Math.max(0, (clip.data?.length ?? 1) - 1))
				fadeOut()
			}
		})
	}

	_seatDist(state, index, capacity) {
		const head = this._pointAt(state.dense, state.cum, state.headDist)
		const tail = this._pointAt(state.dense, state.cum, Math.max(0, state.headDist - state.bodyLen))
		const gap = state.bodyLen / Math.max(capacity, 1)
		// Fill left → right on screen: first ant sits farthest left, last nearest the
		// right-hand entry so later ants never walk over already-seated ones.
		const alongFromLeft = Math.min(state.bodyLen * 0.92, (index + 0.45) * gap)
		if (head.x <= tail.x) {
			// Head is on the left — leftmost seats are near the head.
			return state.headDist - alongFromLeft
		}
		// Tail is on the left — leftmost seats are near the tail.
		return Math.max(0, state.headDist - state.bodyLen) + alongFromLeft
	}

	/** A short step forward, then down until level with the lane, then left onto the seat. */
	async _walkForwardDownLeft(clip, seat, laneY) {
		const speed = (this.hexSize * 8) / this.pace
		const fwd = Math.max(16, this.hexSize * 0.5)
		clip.rotation = 0
		this._shadeAnt(clip)
		await this._tweenPos(clip, clip.x + fwd, clip.y, Math.max(0.04 * this.pace, fwd / speed))
		clip.rotation = Math.PI / 2
		this._shadeAnt(clip)
		const drop = Math.abs(laneY - clip.y)
		await this._tweenPos(clip, clip.x, laneY, Math.max(0.05 * this.pace, drop / speed))
		clip.rotation = Math.PI
		this._shadeAnt(clip)
		const span = Math.hypot(seat.x - clip.x, seat.y - clip.y)
		await this._tweenPos(clip, seat.x, seat.y, Math.max(0.05 * this.pace, span / speed))
	}

	_tweenPos(node, x, y, dur) {
		return new Promise((resolve) => {
			newTween(node, { x, y }, dur).ease(Easing.linear).onDone(resolve)
		})
	}

	_delay(sec) {
		return new Promise((resolve) => {
			const proxy = { t: 0 }
			newTween(proxy, { t: 1 }, sec).onDone(resolve)
		})
	}

	async _slitherOut(state, paint) {
		const head = this._pointAt(state.dense, state.cum, state.headDist)
		const ang = head.ang
		const tailD = Math.max(0, state.headDist - state.bodyLen)
		const bodyNow = this._sliceForward(state.dense, state.cum, tailD, state.headDist)
		const dirx = Math.cos(ang)
		const diry = Math.sin(ang)
		let rear = this._pointAt(state.dense, state.cum, tailD)
		let rearProj = rear.x * dirx + rear.y * diry
		for (const p of bodyNow) {
			const proj = p.x * dirx + p.y * diry
			if (proj < rearProj) {
				rear = p
				rearProj = proj
			}
		}
		const extra = this._distanceUntilOffscreen(rear, ang)
		const end = { x: head.x + Math.cos(ang) * extra, y: head.y + Math.sin(ang) * extra }
		const pts = this._dedupe([...bodyNow, end])
		const oldLen = state.bodyLen
		state.dense = this._densify(pts, this.hexSize * 0.45)
		state.cum = this._cum(state.dense)
		const start = this._closestDist(state.dense, state.cum, head)
		state.bodyLen = Math.max(this.hexSize * 0.4, start)
		if (oldLen > 0) {
			const scale = state.bodyLen / oldLen
			for (const r of state.riders) r.fromTail *= scale
		}
		const stop = state.cum[state.cum.length - 1] || start
		state.waveFrom = start
		state.waveTo = stop
		await this._slither(paint, start, stop)
	}

	/** Sideways sway while travelling; zero at the start and end of a path so parked snakes sit straight. */
	_travelAmp(headDist, from, to, scale = 1) {
		const full = this.hexSize * SLITHER_AMP * scale
		const span = Math.abs(to - from)
		if (span < 1) return 0
		const fade = Math.min(this.hexSize * 2.4, span * 0.45)
		const inn = Math.min(1, Math.abs(headDist - from) / fade)
		const out = Math.min(1, Math.abs(to - headDist) / fade)
		return full * inn * out
	}

	/**
	 * How far `origin` must travel along `ang` before the stroke around it
	 * is outside the canvas. Screen size is in renderer pixels, the same
	 * space as toGlobal / toLocal (stage scale included).
	 */
	_distanceUntilOffscreen(origin, ang) {
		const box = this._screenLocalBounds()
		const margin = this._thick * 0.5 + 32
		const minX = box.minX - margin
		const maxX = box.maxX + margin
		const minY = box.minY - margin
		const maxY = box.maxY + margin
		const ox = origin.x
		const oy = origin.y
		if (ox < minX || ox > maxX || oy < minY || oy > maxY) return 0
		const dirx = Math.cos(ang)
		const diry = Math.sin(ang)
		let t = Infinity
		if (dirx > 1e-4) t = Math.min(t, (maxX - ox) / dirx)
		else if (dirx < -1e-4) t = Math.min(t, (minX - ox) / dirx)
		if (diry > 1e-4) t = Math.min(t, (maxY - oy) / diry)
		else if (diry < -1e-4) t = Math.min(t, (minY - oy) / diry)
		if (!Number.isFinite(t) || t < 0) return this.hexSize * 40
		return t
	}

	/** Canvas rectangle in this container's local space. */
	_screenLocalBounds() {
		const w = window.getRenderWidth?.(true) || window.getRenderWidth?.() || 800
		const h = window.getRenderHeight?.(true) || window.getRenderHeight?.() || 600
		const corners = [
			this.toLocal({ x: 0, y: 0 }),
			this.toLocal({ x: w, y: 0 }),
			this.toLocal({ x: 0, y: h }),
			this.toLocal({ x: w, y: h }),
		]
		let minX = Infinity
		let maxX = -Infinity
		let minY = Infinity
		let maxY = -Infinity
		for (const p of corners) {
			minX = Math.min(minX, p.x)
			maxX = Math.max(maxX, p.x)
			minY = Math.min(minY, p.y)
			maxY = Math.max(maxY, p.y)
		}
		if (!Number.isFinite(minX) || maxX - minX < 1 || maxY - minY < 1) {
			return { minX: -4000, maxX: 4000, minY: -4000, maxY: 4000 }
		}
		return { minX, maxX, minY, maxY }
	}

	_sliceForward(pts, cum, a, b) {
		const start = this._pointAt(pts, cum, a)
		const end = this._pointAt(pts, cum, b)
		/** @type {{x:number,y:number}[]} */
		const out = [{ x: start.x, y: start.y }]
		for (let i = 0; i < pts.length; i++) {
			if (cum[i] > a + 0.5 && cum[i] < b - 0.5) out.push({ x: pts[i].x, y: pts[i].y })
		}
		out.push({ x: end.x, y: end.y })
		return out
	}

	_tweenTo(node, x, y, rotation, dur) {
		return new Promise((resolve) => {
			newTween(node, { x, y, rotation }, dur).ease(Easing.inOutQuad).onDone(resolve)
		})
	}

	_beginAntStep(ant) {
		if (ant._stepSnd) return
		ant._stepSnd = true
		sfx.loopAdd("antWalk")
	}

	_endAntStep(ant) {
		if (!ant._stepSnd) return
		ant._stepSnd = false
		sfx.loopRemove("antWalk")
	}

	_playWalk(clip) {
		clip.looping = true
		clip.framerate = 28 / this.pace
		if (clip.framelabels?.walk != null) clip.playLabel("walk")
		else if (clip.data?.length > 1) clip.playRange(1, clip.data.length - 1)
	}

	_stopWalk(clip) {
		clip.looping = false
		if (clip.framelabels?.idle != null) clip.setFrame("idle")
		else clip.setFrame?.(0)
	}

	/** Ants still standing in the queue after every snake has left. */
	hasLeftoverAnts() {
		return !this._eating && this.ants.length > 0
	}

	/**
	 * Walk in from the right, dip to eat leftover ants into refAntMouth, exit left.
	 * Does nothing when the queue is empty.
	 * @param {import('pixi.js').Container} layer screen-space parent (HUD)
	 */
	async playAnteater(layer) {
		if (this._eating || !this.ants.length) return
		this._eating = true
		const leftovers = this.ants.splice(0)
		for (const ant of leftovers) {
			if (ant.crawl) {
				ant.crawl.stop?.()
				ant.crawl = null
				this._endAntStep(ant)
			}
		}
		let clip = null
		let anteaterWalking = false
		const startAnteaterWalk = () => {
			if (anteaterWalking) return
			anteaterWalking = true
			sfx.loopAdd("anteaterWalk")
		}
		const stopAnteaterWalk = () => {
			if (!anteaterWalking) return
			anteaterWalking = false
			sfx.loopRemove("anteaterWalk")
		}
		sfx.play("snuffle")
		try {
			clip = this.getTube?.()?.getMovieClip?.("anteater")
			if (!clip || !layer) {
				this._dropAnts(leftovers)
				return
			}
			clip.eventMode = "none"
			clip.interactiveChildren = false
			clip.alpha = 1
			clip.interpolate = true
			const scale = 1.35
			clip.scale.set(scale)
			const w = window.getRenderWidth?.() ?? 1024
			const h = window.getRenderHeight?.() ?? 768
			const y = h * 0.48
			const off = w + 280
			clip.position.set(off, y)
			layer.addChildAt(clip, 0)
			this._anteaterClip = clip
			this._playAnteaterWalk(clip)
			startAnteaterWalk()
			await this._tweenPos(clip, w * 0.5, y, 1.15 * this.pace)
			if (!clip.parent) return
			stopAnteaterWalk()

			// Dip down to eat pose.
			await this._playClipLabel(clip, "goeat", { framerate: 24 / this.pace })
			if (!clip.parent) return

			await this._eatAntsWithHead(clip, layer, leftovers)
			if (!clip.parent) return

			sfx.play("gulp")
			// Stand back up from the eat pose, then walk off left (art faces left — no flip).
			const goeatEnd = clip.framelabels?.goeat?.e
			if (goeatEnd != null) await this._playClipToFrame(clip, goeatEnd)
			if (!clip.parent) return
			await this._playClipLabel(clip, "goeat", { reverse: true, framerate: 24 / this.pace })
			if (!clip.parent) return
			this._playAnteaterWalk(clip)
			startAnteaterWalk()
			await this._tweenPos(clip, -off, y, 1.05 * this.pace)
		} catch (err) {
			console.error("anteater failed", err)
			this._dropAnts(leftovers)
		} finally {
			stopAnteaterWalk()
			clip?.stop?.()
			clip?.parent?.removeChild(clip)
			if (this._anteaterClip === clip) this._anteaterClip = null
			this._dropAnts(leftovers)
			this._eating = false
		}
	}

	_playAnteaterWalk(clip) {
		clip.looping = true
		clip.framerate = 56 / this.pace
		clip.interpolate = true
		if (clip.framelabels?.walk != null) clip.playLabel("walk")
		else if (clip.data?.length > 1) clip.playRange(1, clip.data.length - 1)
	}

	/**
	 * @param {any} clip
	 * @param {string} label
	 * @param {{ reverse?: boolean, framerate?: number }} [opts]
	 */
	_playClipLabel(clip, label, opts = {}) {
		return new Promise((resolve) => {
			if (clip.framelabels?.[label] == null) {
				resolve()
				return
			}
			clip.looping = false
			if (opts.framerate != null) clip.framerate = opts.framerate
			clip.playLabel(label, resolve, !!opts.reverse)
		})
	}

	/** Animate the clip timeline to an absolute frame index. */
	_playClipToFrame(clip, target) {
		return new Promise((resolve) => {
			const cur = clip.curframe | 0
			const dest = target | 0
			if (cur === dest) {
				clip.setFrame?.(dest)
				resolve()
				return
			}
			clip.looping = false
			clip.playRange(cur, dest, resolve, dest < cur)
		})
	}

	_eatLabelRange(clip) {
		const fl = clip.framelabels?.eat
		if (!fl) return null
		const s = fl.s | 0
		const e = fl.e | 0
		if (e < s) return null
		return { s, e }
	}

	_randomEatFrame(clip, avoid = -1) {
		const range = this._eatLabelRange(clip)
		if (!range) return clip.curframe | 0
		const count = range.e - range.s + 1
		if (count <= 1) return range.s
		let frame = range.s + Math.floor(Math.random() * count)
		if (frame === avoid && count > 1) {
			frame = range.s + ((frame - range.s + 1) % count)
		}
		return frame
	}

	/** Mouth tip in `layer` local space (tracks the current anteater pose). */
	_mouthLocal(clip, layer) {
		const mouth = clip.getRefPoint?.("refAntMouth")
		if (!mouth) {
			return { x: clip.x - Math.abs(clip.scale.x) * 200, y: clip.y }
		}
		const g = mouth.toGlobal({ x: 0, y: 0 })
		return layer.toLocal(g)
	}

	/**
	 * Pose head on random eat frames; suck ants into the mouth in small staggered batches.
	 * @param {any} clip
	 * @param {import('pixi.js').Container} layer
	 * @param {{ clip: any }[]} ants
	 */
	async _eatAntsWithHead(clip, layer, ants) {
		const queue = ants.slice()
		const total = queue.length
		if (!total) return
		clip.framerate = 18 / this.pace
		let fatal = false
		let lastFrame = -1
		while (queue.length && clip.parent) {
			const maxBatch = Math.min(queue.length, Math.max(1, Math.ceil(total / 3)))
			const batchSize = 1 + Math.floor(Math.random() * maxBatch)
			const batch = queue.splice(0, batchSize)
			const pose = this._randomEatFrame(clip, lastFrame)
			lastFrame = pose
			await this._playClipToFrame(clip, pose)
			if (!clip.parent) break
			await Promise.all(
				batch.map((ant, i) =>
					this._delay(i * 0.06 * this.pace).then(async () => {
						if (this.onAntDied?.() === true) fatal = true
						await this._flyAntToMouth(ant, clip, layer)
					}),
				),
			)
		}
		if (fatal) this.onAntGameOver?.()
	}

	/**
	 * Reparent the ant into HUD space and tween it into refAntMouth.
	 * @param {{ clip: any }} ant
	 * @param {any} anteater
	 * @param {import('pixi.js').Container} layer
	 */
	_flyAntToMouth(ant, anteater, layer) {
		const aClip = ant.clip
		if (!aClip?.parent) return Promise.resolve()
		this._stopWalk(aClip)
		const global = aClip.parent.toGlobal(aClip.position)
		const start = layer.toLocal(global)
		layer.addChild(aClip)
		aClip.position.set(start.x, start.y)
		aClip.eventMode = "none"
		sfx.play("chomp")
		const fromX = start.x
		const fromY = start.y
		const fromSx = aClip.scale.x || ANT_SCALE
		const fromSy = aClip.scale.y || ANT_SCALE
		const dur = 0.28 * this.pace
		/** Shrink/fade only in the last portion of the flight. */
		const swallowFrom = 0.72
		return new Promise((resolve) => {
			const proxy = { t: 0 }
			newTween(proxy, { t: 1 }, dur)
				.ease(Easing.inQuad)
				.onUpdate(() => {
					const mouth = this._mouthLocal(anteater, layer)
					const t = proxy.t
					aClip.position.set(fromX + (mouth.x - fromX) * t, fromY + (mouth.y - fromY) * t)
					const swallow =
						t <= swallowFrom ? 0 : (t - swallowFrom) / Math.max(0.001, 1 - swallowFrom)
					const s = 1 - swallow * 0.85
					aClip.scale.set(fromSx * s, fromSy * s)
					aClip.alpha = 1 - swallow * 0.85
					aClip.rotation += 0.35
				})
				.onDone(() => {
					aClip.parent?.removeChild(aClip)
					resolve()
				})
		})
	}

	_dropAnts(ants) {
		for (const ant of ants) {
			ant.crawl?.stop?.()
			ant.clip?.parent?.removeChild(ant.clip)
		}
	}
}
