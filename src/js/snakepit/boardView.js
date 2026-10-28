import { Container, Graphics, Sprite, Texture } from "pixi.js"
import {
	HEX_DIR_ANGLE,
	hexEq,
	hexHeight,
	hexKey,
	hexToPixel,
	hexWidth,
	neighbor,
} from "./hex.js"
import { Easing, newTween } from "../dome/Tween.js"

const TILE_SIZE = 36 // center → vertex in px

/**
 * Pixi view: hex board chrome + continuous snake strokes.
 */
export class BoardView extends Container {
	/**
	 * @param {{
	 *   getTube?: () => any,
	 *   onSnakeClick?: (snakeId: number) => void,
	 * }} hooks
	 */
	constructor(hooks = {}) {
		super()
		this.hooks = hooks
		this.hexSize = TILE_SIZE
		this.boardRadius = 4
		/** @type {{ q: number, r: number }[]} */
		this.boardCells = []
		/** @type {Set<string>} */
		this._boardKeys = new Set()
		this.boardLayer = new Container()
		this.decorLayer = new Container()
		this.rockLayer = new Container()
		this.snakeLayer = new Container()
		this.fxLayer = new Container()
		this.addChild(this.boardLayer)
		this.addChild(this.decorLayer)
		this.addChild(this.rockLayer)
		this.addChild(this.snakeLayer)
		this.addChild(this.fxLayer)

		/** @type {Map<number, { root: Container, g: Graphics, face: any, snake: any }>} */
		this.snakeGfx = new Map()
		/** @type {Set<number>} */
		this.animatingIds = new Set()
		this.eventMode = "static"
		this.on("pointertap", (e) => this._onTap(e))
	}

	isAnimating(snakeId) {
		return this.animatingIds.has(snakeId)
	}

	anyAnimating() {
		return this.animatingIds.size > 0
	}

	/** @deprecated use anyAnimating / isAnimating */
	get animating() {
		return this.animatingIds.size > 0
	}

	removeSnakeGfx(snakeId) {
		const entry = this.snakeGfx.get(snakeId)
		if (!entry) return
		entry.root.parent?.removeChild(entry.root)
		this.snakeGfx.delete(snakeId)
	}

	/** AABB of playable pit cells only (rim decor ignored for zoom). */
	boardPixelSize() {
		const cells = this.boardCells.length
			? this.boardCells
			: [{ q: 0, r: 0 }]
		let minX = Infinity
		let maxX = -Infinity
		let minY = Infinity
		let maxY = -Infinity
		const pad = this.hexSize
		for (const c of cells) {
			const p = hexToPixel(c, this.hexSize)
			minX = Math.min(minX, p.x)
			maxX = Math.max(maxX, p.x)
			minY = Math.min(minY, p.y)
			maxY = Math.max(maxY, p.y)
		}
		return {
			w: maxX - minX + hexWidth(this.hexSize) + pad * 0.25,
			h: maxY - minY + hexHeight(this.hexSize) + pad * 0.25,
			cx: (minX + maxX) / 2,
			cy: (minY + maxY) / 2,
		}
	}

	/**
	 * @param {import('./level.js').LevelSession} session
	 */
	setSession(session) {
		this.session = session
		this.boardRadius = session.boardRadius
		this.boardCells = session.boardCells || session.board?.cells || []
		this._boardKeys = new Set(this.boardCells.map(hexKey))
		this._rebuildBoard()
		this._rebuildDecor()
		this._rebuildRocks()
		this.redrawSnakes()
	}

	_rebuildBoard() {
		this.boardLayer.removeChildren()
		const cells = this.boardCells

		let tileTex = null
		try {
			tileTex = Texture.from("tiles_hex_tile_green.png")
			if (!tileTex?.source && !tileTex?.baseTexture) tileTex = null
		} catch {
			tileTex = null
		}

		for (const c of cells) {
			const p = hexToPixel(c, this.hexSize)
			let cell
			if (tileTex && tileTex.width > 1) {
				const spr = new Sprite(tileTex)
				spr.anchor.set(0.5)
				spr.scale.set(hexWidth(this.hexSize) / tileTex.width)
				spr.eventMode = "none"
				cell = spr
			} else {
				cell = this._drawHexCell(0x2a4a3a, 0x1a2e24)
			}
			cell.position.set(p.x, p.y)
			cell.alpha = 0.5
			this.boardLayer.addChild(cell)
		}

		this.hitArea = {
			contains: (x, y) => this.pixelToHex({ x, y }) != null,
		}
	}

	_makeRockSprite(scale = 1) {
		const tube = this.hooks.getTube?.()
		if (tube?.getMovieClip) {
			try {
				const mc = tube.getMovieClip("rock")
				if (mc) {
					mc.eventMode = "none"
					mc.interactiveChildren = false
					mc.scale.set((this.hexSize * 0.95 * scale) / 56)
					return mc
				}
			} catch {
				/* fall through */
			}
		}
		try {
			const tex = Texture.from("tiles_rock_art.png")
			if (tex?.width > 1) {
				const spr = new Sprite(tex)
				spr.anchor.set(0.5)
				spr.scale.set((this.hexSize * 1.15 * scale) / tex.width)
				spr.eventMode = "none"
				return spr
			}
		} catch {
			/* fall through */
		}
		const g = new Graphics()
		g.circle(0, 4, this.hexSize * 0.28 * scale)
		g.fill({ color: 0x3a322c, alpha: 0.45 })
		g.ellipse(-2, -2, this.hexSize * 0.32 * scale, this.hexSize * 0.26 * scale)
		g.fill({ color: 0x8a7e6e })
		g.ellipse(8, -8, this.hexSize * 0.2 * scale, this.hexSize * 0.16 * scale)
		g.fill({ color: 0xa69888 })
		g.eventMode = "none"
		return g
	}

	_makeGrassSprite(variant = 0, scale = 1) {
		const clipName = variant === 1 ? "grassB" : "grass"
		const texName = variant === 1 ? "tiles_grass_art_b.png" : "tiles_grass_art.png"
		const tube = this.hooks.getTube?.()
		if (tube?.getMovieClip) {
			try {
				const mc = tube.getMovieClip(clipName)
				if (mc) {
					mc.eventMode = "none"
					mc.interactiveChildren = false
					mc.scale.set((this.hexSize * 0.85 * scale) / 40)
					return mc
				}
			} catch {
				/* fall through */
			}
		}
		try {
			const tex = Texture.from(texName)
			if (tex?.width > 1) {
				const spr = new Sprite(tex)
				spr.anchor.set(0.5, 0.85)
				spr.scale.set((this.hexSize * 1.05 * scale) / tex.width)
				spr.eventMode = "none"
				return spr
			}
		} catch {
			/* fall through */
		}
		const g = new Graphics()
		const h = this.hexSize * 0.45 * scale
		g.moveTo(0, 4)
		g.lineTo(-6, -h)
		g.moveTo(0, 4)
		g.lineTo(2, -h * 1.1)
		g.moveTo(0, 4)
		g.lineTo(8, -h * 0.85)
		g.stroke({ width: 3 * scale, color: 0x4a9a48, cap: "round" })
		g.eventMode = "none"
		return g
	}

	_rebuildDecor() {
		this.decorLayer.removeChildren()
		if (!this.session) return
		for (const c of this.session.rimGrass || []) {
			const scale = 0.75 + ((c.q * 11 + c.r * 19) & 7) * 0.04
			const grass = this._makeGrassSprite(c.variant ?? 0, scale)
			const p = hexToPixel(c, this.hexSize)
			const jitter = ((c.q * 3 + c.r * 5) % 5) - 2
			grass.position.set(p.x + jitter, p.y + 4)
			grass.rotation = ((((c.q + c.r) % 5) - 2) * Math.PI) / 36
			grass.alpha = 0.9
			this.decorLayer.addChild(grass)
		}
	}

	_rebuildRocks() {
		this.rockLayer.removeChildren()
		if (!this.session) return
		const interior = this.session.rocks || []
		const rim = this.session.rimRocks || []
		for (const c of interior) {
			const rock = this._makeRockSprite(1)
			const p = hexToPixel(c, this.hexSize)
			rock.position.set(p.x, p.y)
			this.rockLayer.addChild(rock)
		}
		for (const c of rim) {
			const rock = this._makeRockSprite(0.85 + ((c.q * 17 + c.r * 13) & 7) * 0.03)
			const p = hexToPixel(c, this.hexSize)
			rock.position.set(p.x, p.y)
			rock.alpha = 0.92
			this.rockLayer.addChild(rock)
		}
	}

	_drawHexCell(fill, stroke) {
		const g = new Graphics()
		const s = this.hexSize * 0.92
		const pts = []
		for (let i = 0; i < 6; i++) {
			const a = (Math.PI / 180) * (60 * i)
			pts.push(s * Math.cos(a), s * Math.sin(a))
		}
		g.poly(pts)
		g.fill({ color: fill })
		g.stroke({ width: 2, color: stroke, alpha: 0.8 })
		return g
	}

	_makeFace() {
		const tube = this.hooks.getTube?.()
		if (!tube?.getMovieClip) return null
		try {
			const face = tube.getMovieClip("snakeFace")
			if (!face) return null
			face.eventMode = "none"
			face.interactiveChildren = false
			// Art faces +x; ~44px tall eyes. Fit to head thickness.
			const target = this.hexSize * 0.7
			face.scale.set(target / 44)
			return face
		} catch {
			return null
		}
	}

	redrawSnakes() {
		// Keep graphics that are mid-animation; rebuild the rest.
		const keep = new Set(this.animatingIds)
		for (const [id, entry] of [...this.snakeGfx]) {
			if (keep.has(id)) continue
			entry.root.parent?.removeChild(entry.root)
			this.snakeGfx.delete(id)
		}
		if (!this.session) return
		for (const snake of this.session.snakes) {
			if (snake.escaped || !snake.cells.length) continue
			if (this.snakeGfx.has(snake.id)) continue
			const root = new Container()
			const g = new Graphics()
			root.addChild(g)
			const face = this._makeFace()
			if (face) root.addChild(face)
			this._paintSnake(g, face, snake.cells, snake.dir, snake.color, 1)
			root.eventMode = "static"
			root.cursor = "pointer"
			root.on("pointertap", (e) => {
				e.stopPropagation()
				if (!this.isAnimating(snake.id)) this.hooks.onSnakeClick?.(snake.id)
			})
			this.snakeGfx.set(snake.id, { root, g, face, snake })
			this.snakeLayer.addChild(root)
		}
	}

	/** Head sits on the facing hex edge (not cell center). */
	_headPos(cellCenter, dir) {
		const ang = HEX_DIR_ANGLE[((dir % 6) + 6) % 6]
		// Flat-top: center → shared edge with neighbor ≈ √3/2 * size
		const edge = this.hexSize * Math.sqrt(3) * 0.5 * 0.7
		return {
			x: cellCenter.x + Math.cos(ang) * edge,
			y: cellCenter.y + Math.sin(ang) * edge,
			ang,
		}
	}

	/** Tip→tail anchors: facing edge → head center → body centers. */
	_anchorsForCells(cells, dir) {
		if (!cells.length) return []
		const centers = cells.map((c) => hexToPixel(c, this.hexSize))
		const head = this._headPos(centers[0], dir)
		return [head, ...centers]
	}

	_cornerRadius() {
		return this.hexSize * 0.55
	}

	/**
	 * Densify a tip→tail polyline with the same rounded corners used for strokes,
	 * so sliding samples stay on the organic path through tiles/edges.
	 * @param {{x:number,y:number}[]} pts
	 * @param {number} cornerRadius
	 */
	_densifyRounded(pts, cornerRadius) {
		if (pts.length === 0) return []
		if (pts.length === 1) return [{ x: pts[0].x, y: pts[0].y }]
		if (pts.length === 2) return [pts[0], pts[1]].map((p) => ({ x: p.x, y: p.y }))

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
			const r = Math.min(cornerRadius, dIn * 0.48, dOut * 0.48)
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

	_cumLengths(pts) {
		const cum = [0]
		for (let i = 1; i < pts.length; i++) {
			cum.push(
				cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y),
			)
		}
		return cum
	}

	/** Point + tangent angle at arc distance `dist` along densified path. */
	_pointAtArc(pts, cum, dist) {
		const total = cum[cum.length - 1] || 0
		const d = Math.max(0, Math.min(dist, total))
		if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, ang: 0 }
		let i = 1
		while (i < cum.length && cum[i] < d) i++
		const i1 = Math.max(1, i)
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

	/** Sample tip→tail window [startDist, startDist+bodyLen] on densified path. */
	_sliceArc(pts, cum, startDist, bodyLen) {
		const total = cum[cum.length - 1] || 0
		const len = Math.max(0.001, Math.min(bodyLen, total))
		const start = Math.max(0, Math.min(startDist, Math.max(0, total - len)))
		const end = start + len
		/** @type {{x:number,y:number}[]} */
		const out = []
		const head = this._pointAtArc(pts, cum, start)
		out.push({ x: head.x, y: head.y })
		for (let i = 0; i < pts.length; i++) {
			if (cum[i] <= start || cum[i] >= end) continue
			out.push({ x: pts[i].x, y: pts[i].y })
		}
		const tail = this._pointAtArc(pts, cum, end)
		out.push({ x: tail.x, y: tail.y })
		// Path is tip→tail; face points the other way (travel / exit).
		const ahead = this._pointAtArc(pts, cum, Math.min(start + Math.min(2, len * 0.25), end))
		const headAng = Math.atan2(head.y - ahead.y, head.x - ahead.x)
		return { pts: out, headAng }
	}

	/** True when `front` is one forward slide from `rear` along `dir`. */
	_isForwardStep(rear, front, dir) {
		if (!rear.length || !front.length) return true
		return hexEq(neighbor(rear[0], dir), front[0])
	}

	/**
	 * Track covering a one-step slide from rear→front (tip = front head).
	 * Body always rides through tile centers / edges.
	 */
	_slideTrack(rearCells, frontCells, dir) {
		if (!frontCells.length) return this._anchorsForCells(rearCells, dir)
		if (!rearCells.length) return this._anchorsForCells(frontCells, dir)
		const track = this._anchorsForCells(frontCells, dir)
		const lastRear = rearCells[rearCells.length - 1]
		const lastFront = frontCells[frontCells.length - 1]
		if (!hexEq(lastRear, lastFront)) {
			track.push(hexToPixel(lastRear, this.hexSize))
		}
		return track
	}

	_paintPolyline(g, face, pathPts, headAng, color, alpha) {
		g.clear()
		if (!pathPts.length) {
			if (face) face.visible = false
			return
		}
		const thickness = this.hexSize * 0.72
		const head = pathPts[0]

		if (pathPts.length === 1) {
			g.circle(head.x, head.y, thickness * 0.48)
			g.fill({ color, alpha })
		} else {
			g.moveTo(pathPts[0].x, pathPts[0].y)
			for (let i = 1; i < pathPts.length; i++) g.lineTo(pathPts[i].x, pathPts[i].y)
			g.stroke({
				width: thickness,
				color,
				alpha,
				cap: "round",
				join: "round",
			})
			g.circle(head.x, head.y, thickness * 0.48)
			g.fill({ color, alpha })
		}

		if (face) {
			face.visible = true
			face.alpha = alpha
			face.position.set(head.x, head.y)
			face.rotation = headAng
		}
	}

	_paintSnake(g, face, cells, dir, color, alpha) {
		if (!cells.length) {
			g.clear()
			if (face) face.visible = false
			return
		}
		const anchors = this._anchorsForCells(cells, dir)
		const dense = this._densifyRounded(anchors, this._cornerRadius())
		const ang = this._headPos(hexToPixel(cells[0], this.hexSize), dir).ang
		this._paintPolyline(g, face, dense, ang, color, alpha)
	}

	/**
	 * Draw snake as a fixed-length window sliding along the from→to track.
	 * t=0 at `from` pose, t=1 at `to` pose (works forward and backward).
	 */
	_paintSlide(g, face, fromCells, toCells, dir, color, t, alpha = 1) {
		const cornerR = this._cornerRadius()
		const forward = this._isForwardStep(fromCells, toCells, dir)
		const rear = forward ? fromCells : toCells
		const front = forward ? toCells : fromCells

		const rearDense = this._densifyRounded(this._anchorsForCells(rear, dir), cornerR)
		const rearCum = this._cumLengths(rearDense)
		const bodyLen = rearCum[rearCum.length - 1] || 0

		const track = this._slideTrack(rear, front, dir)
		const trackDense = this._densifyRounded(track, cornerR)
		const trackCum = this._cumLengths(trackDense)
		const trackLen = trackCum[trackCum.length - 1] || 0
		const travel = Math.max(0, trackLen - bodyLen)
		// Tip of track = front head. Rear pose sits at startDist=travel.
		const startDist = forward ? (1 - t) * travel : t * travel
		const slice = this._sliceArc(trackDense, trackCum, startDist, bodyLen || trackLen)
		this._paintPolyline(g, face, slice.pts, slice.headAng, color, alpha)
	}

	pixelToHex(local) {
		const size = this.hexSize
		const q = ((2 / 3) * local.x) / size
		const r = ((-1 / 3) * local.x + (Math.sqrt(3) / 3) * local.y) / size
		const rounded = cubeRound(q, r)
		if (!this._boardKeys?.has(hexKey(rounded))) return null
		return rounded
	}

	_onTap(e) {
		if (!this.session) return
		const local = this.toLocal(e.global)
		const hex = this.pixelToHex(local)
		if (!hex) return
		const snake = this.session.snakeAt(hex)
		if (snake && !this.isAnimating(snake.id)) this.hooks.onSnakeClick?.(snake.id)
	}

	_delay(sec) {
		return new Promise((resolve) => {
			const proxy = { t: 0 }
			newTween(proxy, { t: 1 }, Math.max(0.001, sec)).onDone(resolve)
		})
	}

	/** Face blink frames — numeric indices survive Anima re-exports that drop labels. */
	static FACE_FRAMES = {
		idle: 0,
		blinkBoth: 1,
		blinkTop: 2,
		blinkBot: 3,
		blinkHalf: 4,
	}

	_setFaceFrame(face, name) {
		if (!face) return
		if (face.framelabels?.[name] != null) face.setFrame(name)
		else face.setFrame(BoardView.FACE_FRAMES[name] ?? 0)
	}

	/**
	 * Blink face frames + rising Anima stars at the snake head (bonk reaction).
	 * @param {number} snakeId
	 */
	async playBonkFx(snakeId) {
		const entry = this.snakeGfx.get(snakeId)
		if (!entry?.face) return
		const { face } = entry
		const hx = face.x
		const hy = face.y
		const blinkSeq = [
			{ name: "blinkBoth", hold: 0.12 },
			{ name: "idle", hold: 0.05 },
			{ name: "blinkTop", hold: 0.1 },
			{ name: "idle", hold: 0.04 },
			{ name: "blinkHalf", hold: 0.1 },
			{ name: "idle", hold: 0.04 },
			{ name: "blinkBot", hold: 0.1 },
			{ name: "idle", hold: 0.05 },
			{ name: "blinkBoth", hold: 0.14 },
			{ name: "idle", hold: 0.05 },
		]
		const blinkTask = (async () => {
			for (const step of blinkSeq) {
				this._setFaceFrame(face, step.name)
				await this._delay(step.hold)
			}
			this._setFaceFrame(face, "idle")
		})()

		const tube = this.hooks.getTube?.()
		const starTasks = []
		if (tube?.getMovieClip) {
			const offsets = [
				{ x: 10, y: -8 },
				{ x: -8, y: -14 },
				{ x: 16, y: 0 },
				{ x: -4, y: -20 },
			]
			for (const off of offsets) {
				let star
				try {
					star = tube.getMovieClip("bonkStar")
				} catch {
					star = null
				}
				if (!star) continue
				star.eventMode = "none"
				star.interpolate = true
				// ~13 frames @ 26fps ≈ 0.5s — readable float, not a flash.
				star.framerate = 26
				const s0 = 0.65 + Math.random() * 0.3
				star.scale.set(s0)
				star.alpha = 1
				star.position.set(hx + off.x, hy + off.y)
				star.rotation = (Math.random() - 0.5) * 0.8
				this.fxLayer.addChild(star)
				const driftX = off.x * 1.6 + (Math.random() - 0.5) * 18
				const driftY = -70 - Math.random() * 30
				starTasks.push(
					new Promise((done) => {
						let finished = false
						const finish = () => {
							if (finished) return
							finished = true
							star.parent?.removeChild(star)
							done()
						}
						const last = Math.max(0, (star.data?.length ?? 1) - 1)
						if (star.framelabels?.rise != null) star.playLabel("rise", finish)
						else star.playRange(0, last, finish)
						newTween(star, { x: star.x + driftX, y: star.y + driftY, alpha: 0 }, 0.55)
							.ease(Easing.outQuad)
							.onDone(finish)
					}),
				)
			}
		}
		await Promise.all([blinkTask, ...starTasks])
	}

	/**
	 * Animate discrete hex steps by sliding along the tile/edge path (not lerping joints).
	 * @param {import('./snake.js').Snake} snake
	 * @param {import('./hex.js').Hex[][]} steps
	 * @param {{ bump?: boolean }} opts
	 */
	playSteps(snake, steps, opts = {}) {
		return new Promise((resolve) => {
			const entry = this.snakeGfx.get(snake.id)
			// Escape needs ≥2 poses; bump can be a single pose + contact nudge.
			if (!entry || !steps.length || (!opts.bump && steps.length < 2)) {
				resolve()
				return
			}
			this.animatingIds.add(snake.id)
			const { root, g, face } = entry
			const stepDur = opts.bump ? 0.09 : 0.1

			const showCells = (cells) => {
				this._paintSnake(g, face, cells, snake.dir, snake.color, 1)
			}

			const paintAt = (u) => {
				// u in [0, steps.length-1]: integer boundaries are exact poses.
				const maxU = steps.length - 1
				const clamped = Math.max(0, Math.min(u, maxU))
				const i = Math.min(Math.floor(clamped), steps.length - 2)
				const f = clamped - i
				this._paintSlide(g, face, steps[i], steps[i + 1], snake.dir, snake.color, f)
			}

			const tweenSlide = (from, to, dur, t0 = 0, t1 = 1, ease = Easing.inOutQuad) =>
				new Promise((done) => {
					const proxy = { t: t0 }
					newTween(proxy, { t: t1 }, dur)
						.ease(ease)
						.onUpdate(() =>
							this._paintSlide(g, face, from, to, snake.dir, snake.color, proxy.t),
						)
						.onDone(() => {
							this._paintSlide(g, face, from, to, snake.dir, snake.color, t1)
							done()
						})
				})

			const tweenProgress = (u0, u1, dur, ease) =>
				new Promise((done) => {
					const proxy = { u: u0 }
					newTween(proxy, { u: u1 }, dur)
						.ease(ease)
						.onUpdate(() => paintAt(proxy.u))
						.onDone(() => {
							paintAt(u1)
							done()
						})
				})

			const finish = () => {
				this.animatingIds.delete(snake.id)
				resolve()
			}

			const run = async () => {
				showCells(steps[0])
				if (opts.bump) {
					for (let i = 0; i < steps.length - 1; i++) {
						await tweenSlide(steps[i], steps[i + 1], stepDur)
					}
					const tip = steps[steps.length - 1]
					if (tip.length) {
						const hit = neighbor(tip[0], snake.dir)
						const into = [hit, ...tip.slice(0, -1)]
						const peak = 0.42
						await tweenSlide(tip, into, stepDur * 0.75, 0, peak)
						// Bonk reaction at impact peak.
						const bonkFx = this.playBonkFx(snake.id)
						await tweenSlide(tip, into, stepDur * 0.75, peak, 0)
						await bonkFx
					}
					for (let i = steps.length - 1; i > 0; i--) {
						await tweenSlide(steps[i], steps[i - 1], stepDur * 0.9)
					}
					showCells(steps[0])
					finish()
					return
				}

				const endU = steps.length - 1
				// First hex: ease out into motion.
				await tweenProgress(0, Math.min(1, endU), stepDur * 1.15, Easing.outQuad)
				// Remainder: constant speed (no per-step ease), feels continuous.
				if (endU > 1) {
					const cruiseDur = stepDur * (endU - 1)
					await tweenProgress(1, endU, cruiseDur, Easing.linear)
				}
				root.visible = false
				finish()
			}

			run()
		})
	}
}

function cubeRound(q, r) {
	const s = -q - r
	let rq = Math.round(q)
	let rr = Math.round(r)
	let rs = Math.round(s)
	const qDiff = Math.abs(rq - q)
	const rDiff = Math.abs(rr - r)
	const sDiff = Math.abs(rs - s)
	if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs
	else if (rDiff > sDiff) rr = -rq - rs
	return { q: rq, r: rr }
}

export { TILE_SIZE, hexKey }
