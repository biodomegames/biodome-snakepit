import { Container, Graphics } from "pixi.js"
import { SNAKE_COLORS } from "./generator.js"
import { paintSnakeBody } from "./snakeDraw.js"

const THICK = 20
/** Gap between letter bounds, after the stroke and the face. */
const GAP = 10
const FACE_H = 44
const BLINKS = ["blinkBoth", "blinkTop", "blinkBot", "blinkHalf"]

const [GREEN, RED, BLUE, GOLD, PURPLE] = SNAKE_COLORS

function cubic(p0, p1, p2, p3, n) {
	const pts = []
	for (let i = 0; i <= n; i++) {
		const t = i / n
		const u = 1 - t
		pts.push({
			x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
			y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
		})
	}
	return pts
}

function chain(parts) {
	const out = []
	for (const part of parts) {
		for (const p of part) {
			const last = out[out.length - 1]
			if (last && Math.hypot(last.x - p.x, last.y - p.y) < 0.35) continue
			out.push(p)
		}
	}
	return out
}

/** Round sharp corners so a letter stroke reads as one snake. */
function roundPolyline(pts, radius) {
	if (pts.length < 3 || radius <= 0) return pts.map((p) => ({ ...p }))
	const out = [{ ...pts[0] }]
	for (let i = 1; i < pts.length - 1; i++) {
		const prev = pts[i - 1]
		const cur = pts[i]
		const next = pts[i + 1]
		let d1x = cur.x - prev.x
		let d1y = cur.y - prev.y
		let d2x = next.x - cur.x
		let d2y = next.y - cur.y
		const l1 = Math.hypot(d1x, d1y) || 1
		const l2 = Math.hypot(d2x, d2y) || 1
		const cut = Math.min(radius, l1 * 0.45, l2 * 0.45)
		const a = { x: cur.x - (d1x / l1) * cut, y: cur.y - (d1y / l1) * cut }
		const b = { x: cur.x + (d2x / l2) * cut, y: cur.y + (d2y / l2) * cut }
		out.push(a)
		const steps = 4
		for (let s = 1; s < steps; s++) {
			const t = s / steps
			const u = 1 - t
			out.push({
				x: u * u * a.x + 2 * u * t * cur.x + t * t * b.x,
				y: u * u * a.y + 2 * u * t * cur.y + t * t * b.y,
			})
		}
		out.push(b)
	}
	out.push({ ...pts[pts.length - 1] })
	return out
}

function headAngle(pts) {
	return Math.atan2(pts[0].y - pts[1].y, pts[0].x - pts[1].x)
}

/**
 * Letter strokes in local space. Feet sit on `baseline`.
 * The first point of a faced stroke is the head; it faces back along that segment.
 */
function letterStrokes() {
	return [
		{
			color: RED,
			baseline: 104,
			strokes: [
				{
					face: true,
					pts: chain([
						[{ x: 78, y: 22 }, { x: 62, y: 22 }],
						cubic({ x: 62, y: 22 }, { x: 40, y: 6 }, { x: 12, y: 8 }, { x: 14, y: 32 }, 8),
						cubic({ x: 14, y: 32 }, { x: 16, y: 52 }, { x: 36, y: 50 }, { x: 50, y: 56 }, 5),
						cubic({ x: 50, y: 56 }, { x: 74, y: 66 }, { x: 80, y: 90 }, { x: 58, y: 100 }, 7),
						cubic({ x: 58, y: 100 }, { x: 36, y: 112 }, { x: 8, y: 104 }, { x: 14, y: 84 }, 5),
					]),
				},
			],
		},
		{
			color: GOLD,
			baseline: 104,
			strokes: [
				{ face: true, pts: [{ x: 16, y: -6 }, { x: 16, y: 18 }, { x: 16, y: 104 }] },
				{ face: true, pts: [{ x: 68, y: -6 }, { x: 68, y: 18 }, { x: 68, y: 104 }] },
				{
					face: true,
					faceBack: 36,
					pts: [
						{ x: 68, y: 14 },
						{ x: 48, y: 42 },
						{ x: 16, y: 104 },
					],
				},
			],
		},
		{
			color: GREEN,
			baseline: 104,
			strokes: [
				{
					face: true,
					pts: roundPolyline(
						[
							{ x: 40, y: -6 },
							{ x: 40, y: 20 },
							{ x: 10, y: 104 },
						],
						12,
					),
				},
				{ face: false, pts: [{ x: 40, y: 20 }, { x: 70, y: 104 }] },
				{ face: false, pts: [{ x: 16, y: 64 }, { x: 64, y: 64 }] },
			],
		},
		{
			color: BLUE,
			baseline: 104,
			strokes: [
				{ face: true, pts: [{ x: 16, y: -6 }, { x: 16, y: 16 }, { x: 16, y: 104 }] },
				{ face: false, pts: [{ x: 8, y: 54 }, { x: 66, y: 6 }] },
				{ face: false, pts: [{ x: 8, y: 54 }, { x: 68, y: 104 }] },
			],
		},
		{
			color: PURPLE,
			baseline: 104,
			strokes: [
				{ face: true, pts: [{ x: 16, y: -6 }, { x: 16, y: 16 }, { x: 16, y: 104 }] },
				{ face: false, pts: [{ x: 8, y: 16 }, { x: 68, y: 16 }] },
				{ face: false, pts: [{ x: 8, y: 54 }, { x: 52, y: 54 }] },
				{ face: false, pts: [{ x: 8, y: 96 }, { x: 68, y: 96 }] },
			],
		},
		{
			color: RED,
			baseline: 104,
			strokes: [
				{ face: true, pts: [{ x: 18, y: -6 }, { x: 18, y: 16 }, { x: 18, y: 104 }] },
				{
					face: false,
					pts: roundPolyline(
						[
							{ x: 8, y: 16 },
							{ x: 48, y: 8 },
							{ x: 68, y: 30 },
							{ x: 48, y: 52 },
							{ x: 8, y: 50 },
						],
						12,
					),
				},
			],
		},
		{
			color: GOLD,
			baseline: 104,
			strokes: [
				{
					face: true,
					pts: [
						{ x: 28, y: -6 },
						{ x: 28, y: 20 },
						{ x: 31, y: 52 },
						{ x: 25, y: 80 },
						{ x: 28, y: 104 },
					],
				},
			],
		},
		{
			color: GREEN,
			baseline: 104,
			strokes: [
				{ face: true, pts: [{ x: 40, y: -10 }, { x: 40, y: 8 }, { x: 40, y: 104 }] },
				{ face: false, pts: [{ x: 2, y: 18 }, { x: 78, y: 18 }] },
			],
		},
	]
}

function boundsOf(strokes) {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	const pad = THICK * 0.5 + 1
	for (const stroke of strokes) {
		for (const p of stroke.pts) {
			minX = Math.min(minX, p.x - pad)
			maxX = Math.max(maxX, p.x + pad)
			minY = Math.min(minY, p.y - pad)
			maxY = Math.max(maxY, p.y + pad)
		}
		if (!stroke.face || stroke.pts.length < 2) continue
		const ang = headAngle(stroke.pts)
		const reach = THICK * 0.85
		const hx = stroke.pts[0].x + Math.cos(ang) * reach
		const hy = stroke.pts[0].y + Math.sin(ang) * reach
		const r = THICK * 0.65
		minX = Math.min(minX, hx - r)
		maxX = Math.max(maxX, hx + r)
		minY = Math.min(minY, hy - r)
		maxY = Math.max(maxY, hy + r)
	}
	return { minX, minY, maxX, maxY }
}

function placeLetters() {
	let cursor = 0
	const placed = []
	for (const letter of letterStrokes()) {
		const box = boundsOf(letter.strokes)
		const dx = cursor - box.minX
		const dy = -letter.baseline
		placed.push({
			color: letter.color,
			strokes: letter.strokes.map((stroke) => ({
				face: stroke.face,
				pts: stroke.pts.map((p) => ({ x: p.x + dx, y: p.y + dy })),
			})),
		})
		cursor += box.maxX - box.minX + GAP
	}
	return placed
}

function makeFace(getTube, thickness) {
	const tube = getTube?.()
	if (!tube?.getMovieClip) return null
	try {
		const face = tube.getMovieClip("snakeFace")
		if (!face) return null
		face.eventMode = "none"
		face.interactiveChildren = false
		face.scale.set((thickness * 0.98) / FACE_H)
		if (face.framelabels?.idle != null) face.setFrame("idle")
		else face.setFrame(0)
		face.stop?.()
		return face
	} catch {
		return null
	}
}

/**
 * SNAKEPIT spelled by the same snakes as the pit.
 * The N is three snakes: two uprights and the diagonal.
 * Extra strokes on the other letters (the bar of an A, the bowl of a P)
 * stay part of that letter, without a second head.
 * @param {() => any} getTube
 */
export function createTitleLogo(getTube) {
	const root = new Container()
	root.eventMode = "none"
	root.interactiveChildren = false

	/** @type {{ holder: Container, restY: number, phase: number }[]} */
	const letters = []
	/** @type {{ face: any, wait: number, closing: number }[]} */
	const blinkers = []

	placeLetters().forEach((letter, i) => {
		const holder = new Container()
		holder.eventMode = "none"
		for (const stroke of letter.strokes) {
			const g = new Graphics()
			paintSnakeBody(g, stroke.pts, { color: letter.color, thickness: THICK })
			holder.addChild(g)
		}
		for (const stroke of letter.strokes) {
			if (!stroke.face || stroke.pts.length < 2) continue
			const face = makeFace(getTube, THICK)
			if (!face) continue
			const ang = headAngle(stroke.pts)
			const head = stroke.pts[0]
			const back = stroke.faceBack || 0
			face.position.set(head.x - Math.cos(ang) * back, head.y - Math.sin(ang) * back)
			face.rotation = ang
			holder.addChild(face)
			blinkers.push({
				face,
				wait: 0.4 + Math.random() * 2.8 + i * 0.15,
				closing: 0,
			})
		}
		root.addChild(holder)
		const box = holder.getLocalBounds()
		const cx = box.x + box.width / 2
		const cy = box.y + box.height / 2
		holder.pivot.set(cx, cy)
		holder.position.set(cx, cy)
		letters.push({ holder, restY: cy, phase: i * 0.85 })
	})

	const box = root.getLocalBounds()
	root.layoutWidth = Math.max(1, box.width)
	root.layoutHeight = Math.max(1, box.height)
	root.pivot.set(box.x + box.width / 2, box.y + box.height / 2)

	let time = 0
	root.tick = (dt) => {
		const step = Math.max(0, Math.min(0.05, dt || 0))
		if (step <= 0) return
		time += step
		for (const letter of letters) {
			const bob = Math.sin(time * 2.15 + letter.phase)
			letter.holder.y = letter.restY + bob * 2.4
			letter.holder.rotation = Math.sin(time * 1.55 + letter.phase) * 0.045
		}
		for (const blink of blinkers) {
			if (blink.closing > 0) {
				blink.closing -= step
				if (blink.closing <= 0) {
					blink.face.setFrame?.("idle")
					blink.closing = 0
					blink.wait = 1.6 + Math.random() * 3.4
				}
				continue
			}
			blink.wait -= step
			if (blink.wait > 0) continue
			const name = BLINKS[(Math.random() * BLINKS.length) | 0]
			if (blink.face.framelabels?.[name] != null) blink.face.setFrame(name)
			else blink.face.setFrame?.("blinkBoth")
			blink.closing = 0.12
		}
	}
	return root
}
