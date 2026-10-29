import { Container, Graphics, Rectangle } from "pixi.js"
import { Easing, newTween } from "../dome/Tween.js"
import { makeRng } from "./generator.js"

const STICK_H = 7
const LANE_H = 46
const ANT_SCALE = 0.42

/**
 * Lane stack + ant queue in pit/world space (BoardView local pixels).
 * Sticks separate horizontal lanes. Escaped snakes path around the pit
 * into the topmost free lane; matching ants board the back; a full snake leaves.
 */
export class AntDock extends Container {
	constructor({ getTube } = {}) {
		super()
		this.getTube = getTube
		this.eventMode = "passive"
		this.interactiveChildren = true

		this.stickLayer = new Container()
		this.antLayer = new Container()
		this.antLayer.eventMode = "none"
		this.snakeLayer = new Container()
		this.addChild(this.stickLayer)
		this.addChild(this.snakeLayer)
		this.addChild(this.antLayer)

		/** @type {{ clip: any, color: number, boarding?: boolean }[]} */
		this.ants = []
		/** @type {{ y: number, occupied: boolean }[]} */
		this.lanes = []
		/** @type {any[]} */
		this.pending = []
		this._busy = 0
		this._boarding = false
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
	}

	isIdle() {
		return this._busy === 0 && this.pending.length === 0 && this.lanes.every((l) => !l.occupied)
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
		this.stickLayer.removeChildren()
		this.snakeLayer.removeChildren()
		this.antLayer.removeChildren()
		this.layoutBox = null
		this._busy = 0
		this._boarding = false
		this._eating = false
		this._parked = []
		this._anteaterClip?.parent?.removeChild(this._anteaterClip)
		this._anteaterClip = null
		this._flushIdle()
	}

	/**
	 * @param {{ snakes: { color: number, cells: unknown[] }[], seed?: number }} session
	 * @param {{ cx:number, cy:number, w:number, h:number }} pit
	 * @param {number} hexSize
	 */
	setup(session, pit, hexSize = 36) {
		this.clear()
		if (!session?.snakes?.length || !pit) return
		this.pit = pit
		this.hexSize = hexSize
		this._thick = hexSize * 0.72
		this._laneW = Math.max(140, pit.w)
		this._left = pit.cx - this._laneW / 2

		const snakes = session.snakes
		const laneCount = Math.max(1, Math.floor(snakes.length / 2))
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
			this.lanes.push({ y, occupied: false })
		}

		/** @type {number[]} */
		const colors = []
		for (const sn of snakes) {
			const cap = Math.max(1, sn.cells?.length ?? 1)
			for (let i = 0; i < cap; i++) colors.push(sn.color)
		}
		const rng = makeRng(((session.seed ?? 1) >>> 0) ^ 0xa71d0c)
		for (let i = colors.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1))
			;[colors[i], colors[j]] = [colors[j], colors[i]]
		}

		const tube = this.getTube?.()
		const antY = stackTop - 16
		const right = this._left + this._laneW - 8
		const antGap = colors.length <= 1 ? 0 : Math.min(26, Math.max(16, (this._laneW - 20) / (colors.length - 1)))
		this._antGap = antGap
		this._antRight = right
		this._antY = antY
		for (let i = 0; i < colors.length; i++) {
			const clip = tube?.getMovieClip?.("ant")
			if (!clip) break
			clip.eventMode = "none"
			clip.interactiveChildren = false
			clip.scale.set(ANT_SCALE)
			clip.tint = colors[i]
			try {
				clip.tintInstance?.("body", colors[i])
			} catch {
				/* ignore */
			}
			clip.looping = false
			if (clip.framelabels?.idle != null) clip.setFrame?.("idle")
			else clip.setFrame?.(0)
			// Queue front is index 0, standing at the right. The rest extend left.
			clip.position.set(right - i * antGap, antY)
			this.antLayer.addChild(clip)
			this.ants.push({ clip, color: colors[i] })
		}

		const pad = 8
		this.layoutBox = {
			minX: this._left - pad,
			maxX: this._left + this._laneW + pad,
			minY: antY - 18,
			maxY: stackBottom + pad,
		}
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
		return this.lanes.find((l) => !l.occupied) ?? null
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
			}
			const paint = (headDist) => {
				state.headDist = headDist
				const slice = this._sliceBack(state.dense, state.cum, headDist, state.bodyLen)
				this._stroke(g, face, slice.pts, slice.headAng, state.color, state.thick)
				for (const r of riderList) {
					const d = headDist - state.bodyLen + r.fromTail
					const p = this._pointAt(state.dense, state.cum, d)
					r.clip.position.set(p.x, p.y - state.thick * 0.2)
				}
			}
			try {
				const bodyPts = job.bodyPts?.length
					? job.bodyPts.map((p) => ({ x: p.x, y: p.y }))
					: [job.from, job.from]
				const prefix = this._densify(this._dedupe(bodyPts), this.hexSize * 0.45)
				const bodyLen = Math.max(this._pathLength(prefix), this.hexSize * 0.45)
				const route = this._shortestRoute(job.from, lane, bodyLen)
				const full = this._dedupe([...prefix, ...route.pts])
				state.dense = this._densify(full, this.hexSize * 0.5)
				state.cum = this._cum(state.dense)
				state.bodyLen = bodyLen
				state.laneY = lane.y
				const startDist = this._closestDistFrom(
					state.dense,
					state.cum,
					job.from,
					Math.max(0, bodyLen * 0.5),
					bodyLen + this.hexSize * 2,
				)
				const stopDist = state.cum[state.cum.length - 1] || startDist
				paint(startDist)
				if (stopDist > startDist + 1) await this._slither(paint, startDist, stopDist)
				paint(stopDist)
				state.capacity = job.capacity
				state.reserved = 0
				state.arrived = 0
				state.leaving = false
				state.laneY = lane.y
				state.root = root
				state.riderLayer = riders
				state.paint = paint
				const hit = this._armLaneHit(state)
				this._parked.push(state)
				this._kickBoard()
				await new Promise((resolve) => {
					state.finish = () => {
						if (state.leaving) return
						state.leaving = true
						hit.eventMode = "none"
						resolve()
					}
				})
				this._parked = this._parked.filter((s) => s !== state)
				await this._slitherOut(state, paint)
			} catch (err) {
				console.error("lane dock failed", err)
			} finally {
				for (const r of riderList) r.clip?.parent?.removeChild(r.clip)
				this._parked = this._parked.filter((s) => s !== state)
				root.parent?.removeChild(root)
				lane.occupied = false
				this._bumpBusy(-1)
				this._takeNextPending()
			}
		}
		run()
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
		const head = pathPts[0]
		if (pathPts.length > 1) {
			g.moveTo(pathPts[0].x, pathPts[0].y)
			for (let i = 1; i < pathPts.length; i++) g.lineTo(pathPts[i].x, pathPts[i].y)
			g.stroke({ width: thickness, color, cap: "round", join: "round" })
		}
		g.circle(head.x, head.y, thickness * 0.48)
		g.fill({ color })
		if (face) {
			face.visible = true
			face.position.set(head.x, head.y)
			face.rotation = headAng
		}
	}

	_slither(paint, fromDist, toDist) {
		const travel = Math.abs(toDist - fromDist)
		const speed = (this.hexSize * Math.sqrt(3)) / 0.11
		const dur = Math.max(0.25, travel / speed)
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
			const snake = this._parked.find(
				(s) => !s.leaving && s.color === front.color && s.reserved < s.capacity,
			)
			if (!snake) {
				await this._delay(0.1)
				continue
			}
			this.ants.shift()
			const seatIndex = snake.reserved
			snake.reserved++
			this._sendAnt(front, snake, seatIndex)
			this._advanceQueue()
			await this._delay(0.1)
		}
	}

	_sendAnt(ant, state, seatIndex) {
		const clip = ant.clip
		ant.crawl?.stop?.()
		ant.crawl = null
		const seatD = this._seatDist(state, seatIndex, state.capacity)
		const spot = this._pointAt(state.dense, state.cum, seatD)
		const seat = { x: spot.x, y: state.laneY - state.thick * 0.12 }
		const run = async () => {
			try {
				this._playWalk(clip)
				await this._walkForwardDownLeft(clip, seat, state.laneY)
				this._stopWalk(clip)
				if (!state.root?.parent) {
					clip.parent?.removeChild(clip)
					return
				}
				const tailD = Math.max(0, state.headDist - state.bodyLen)
				state.riders.push({ clip, fromTail: seatD - tailD })
				state.arrived++
				state.paint?.(state.headDist)
				if (!state.leaving && state.arrived >= state.capacity) state.finish?.()
			} catch (err) {
				console.error("ant walk failed", err)
			}
		}
		run()
	}

	/** Remaining ants crawl one step toward the front of the queue (to the right). */
	_advanceQueue() {
		const gap = this._antGap || 0
		if (!gap || !this.ants.length) return
		for (let i = 0; i < this.ants.length; i++) {
			const ant = this.ants[i]
			const x = this._antRight - i * gap
			ant.crawl?.stop?.()
			ant.clip.rotation = 0
			this._playWalk(ant.clip)
			ant.crawl = newTween(ant.clip, { x, y: this._antY }, 0.12)
				.ease(Easing.linear)
				.onDone(() => {
					ant.crawl = null
					if (this.ants.includes(ant)) this._stopWalk(ant.clip)
				})
		}
	}

	_seatDist(state, index, capacity) {
		const head = this._pointAt(state.dense, state.cum, state.headDist)
		const tail = this._pointAt(state.dense, state.cum, Math.max(0, state.headDist - state.bodyLen))
		const gap = state.bodyLen / Math.max(capacity, 1)
		const along = Math.min(state.bodyLen * 0.92, (index + 0.45) * gap)
		// Ants enter from the right edge and walk left, so seats run from that edge inward.
		if (head.x >= tail.x) return state.headDist - along
		return Math.max(0, state.headDist - state.bodyLen) + along
	}

	/** A short step forward, then down until level with the lane, then left onto the seat. */
	async _walkForwardDownLeft(clip, seat, laneY) {
		const speed = this.hexSize * 2.4
		const fwd = Math.max(16, this.hexSize * 0.5)
		clip.rotation = 0
		await this._tweenPos(clip, clip.x + fwd, clip.y, Math.max(0.12, fwd / speed))
		clip.rotation = Math.PI / 2
		const drop = Math.abs(laneY - clip.y)
		await this._tweenPos(clip, clip.x, laneY, Math.max(0.16, drop / speed))
		clip.rotation = Math.PI
		const span = Math.hypot(seat.x - clip.x, seat.y - clip.y)
		await this._tweenPos(clip, seat.x, seat.y, Math.max(0.16, span / speed))
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
		const tail = {
			x: head.x - Math.cos(ang) * state.bodyLen,
			y: head.y - Math.sin(ang) * state.bodyLen,
		}
		const extra = this._distanceUntilOffscreen(tail, ang) + this._thick + 16
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
		await this._slither(paint, start, stop)
	}

	/** How far `origin` must travel along `ang` before it is outside the screen. */
	_distanceUntilOffscreen(origin, ang) {
		const w = window.getRenderWidth?.() ?? 800
		const h = window.getRenderHeight?.() ?? 600
		const pad = 36
		const dirx = Math.cos(ang)
		const diry = Math.sin(ang)
		const step = Math.max(8, this.hexSize * 0.35)
		let dist = 0
		for (let i = 0; i < 120; i++) {
			const g = this.toGlobal({
				x: origin.x + dirx * dist,
				y: origin.y + diry * dist,
			})
			if (g.x < -pad || g.y < -pad || g.x > w + pad || g.y > h + pad) return dist
			dist += step
		}
		return dist
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

	_playWalk(clip) {
		clip.looping = true
		clip.framerate = 12
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
	 * Walk in from the right, eat leftover ants, leave to the right.
	 * Does nothing when the queue is empty.
	 * @param {import('pixi.js').Container} layer screen-space parent (HUD)
	 */
	async playAnteater(layer) {
		if (this._eating || !this.ants.length) return
		this._eating = true
		const leftovers = this.ants.splice(0)
		for (const ant of leftovers) ant.crawl?.stop?.()
		let clip = null
		try {
			clip = this.getTube?.()?.getMovieClip?.("anteater")
			if (!clip || !layer) {
				this._dropAnts(leftovers)
				return
			}
			clip.eventMode = "none"
			clip.interactiveChildren = false
			clip.alpha = 1
			const scale = 2.7
			clip.scale.set(scale)
			const w = window.getRenderWidth?.() ?? 1024
			const h = window.getRenderHeight?.() ?? 768
			const y = h * 0.48
			const off = w + 280
			clip.position.set(off, y)
			layer.addChildAt(clip, 0)
			this._anteaterClip = clip
			this._playWalk(clip)
			await this._tweenPos(clip, w * 0.5, y, 1.15)
			if (!clip.parent) return
			this._playEat(clip)
			await Promise.all([this._vanishAnts(leftovers), this._delay(0.75)])
			if (!clip.parent) return
			clip.scale.x = -Math.abs(clip.scale.x)
			this._playWalk(clip)
			await this._tweenPos(clip, off, y, 1.05)
		} catch (err) {
			console.error("anteater failed", err)
			this._dropAnts(leftovers)
		} finally {
			clip?.stop?.()
			clip?.parent?.removeChild(clip)
			if (this._anteaterClip === clip) this._anteaterClip = null
			this._dropAnts(leftovers)
			this._eating = false
		}
	}

	_playEat(clip) {
		clip.looping = true
		clip.framerate = 8
		if (clip.framelabels?.eat != null) clip.playLabel("eat")
		else clip.playRange?.(Math.max(0, (clip.data?.length ?? 1) - 4), (clip.data?.length ?? 1) - 1)
	}

	_dropAnts(ants) {
		for (const ant of ants) {
			ant.crawl?.stop?.()
			ant.clip?.parent?.removeChild(ant.clip)
		}
	}

	async _vanishAnts(ants) {
		await Promise.all(
			ants.map((ant, i) =>
				this._delay(i * 0.07).then(
					() =>
						new Promise((resolve) => {
							const clip = ant.clip
							if (!clip?.parent) {
								resolve()
								return
							}
							this._stopWalk(clip)
							newTween(clip, { alpha: 0 }, 0.16).onDone(() => {
								clip.parent?.removeChild(clip)
								resolve()
							})
						}),
				),
			),
		)
	}
}
