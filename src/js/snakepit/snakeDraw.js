import { shadesFor } from "./generator.js"

/** Light arrives from the upper left. Screen +y is down. */
const LIGHT_X = -0.543
const LIGHT_Y = -0.84
const RIM = 3
const BLACK = 1
const SHADOW_ALPHA = 0.22

function lerpColor(a, b, t) {
	const ar = (a >> 16) & 255
	const ag = (a >> 8) & 255
	const ab = a & 255
	const br = (b >> 16) & 255
	const bg = (b >> 8) & 255
	const bb = b & 255
	const r = Math.round(ar + (br - ar) * t)
	const g = Math.round(ag + (bg - ag) * t)
	const bl = Math.round(ab + (bb - ab) * t)
	return (r << 16) | (g << 8) | bl
}

/** Outline color from the outward normal in world space. Does not mix in the body color. */
function rimColor(nx, ny, shades) {
	const facing = nx * LIGHT_X + ny * LIGHT_Y
	const t = Math.max(0, Math.min(1, facing * 0.5 + 0.5))
	return lerpColor(shades.dark, shades.light, t)
}

/**
 * Light and dark colors for a surface whose normal points (nx, ny) in world space.
 * `light` is the color for the side that faces this normal; `dark` is the opposite side.
 */
export function shadeForNormal(nx, ny, color) {
	const shades = shadesFor(color)
	const facing = nx * LIGHT_X + ny * LIGHT_Y
	const t = Math.max(0, Math.min(1, facing * 0.5 + 0.5))
	return {
		light: lerpColor(shades.dark, shades.light, t),
		dark: lerpColor(shades.light, shades.dark, t),
	}
}

function frameOf(pts) {
	const seg = []
	for (let i = 0; i < pts.length - 1; i++) {
		let dx = pts[i + 1].x - pts[i].x
		let dy = pts[i + 1].y - pts[i].y
		const len = Math.hypot(dx, dy)
		if (len < 1e-4) seg.push(null)
		else seg.push({ nx: -dy / len, ny: dx / len })
	}
	const normals = []
	for (let i = 0; i < pts.length; i++) {
		const a = i > 0 ? seg[i - 1] : null
		const b = i < pts.length - 1 ? seg[i] : null
		let nx = 0
		let ny = 0
		if (a) {
			nx += a.nx
			ny += a.ny
		}
		if (b) {
			nx += b.nx
			ny += b.ny
		}
		const len = Math.hypot(nx, ny)
		if (len < 1e-4) {
			nx = 0
			ny = -1
		} else {
			nx /= len
			ny /= len
		}
		normals.push({ x: nx, y: ny })
	}
	return { seg, normals }
}

function strokeCenter(g, pts, ox, oy, width, color, alpha) {
	g.moveTo(pts[0].x + ox, pts[0].y + oy)
	for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x + ox, pts[i].y + oy)
	g.stroke({ width, color, alpha, cap: "round", join: "round" })
}

function fillQuad(g, ax, ay, bx, by, cx, cy, dx, dy, color, alpha) {
	g.poly([ax, ay, bx, by, cx, cy, dx, dy])
	g.fill({ color, alpha })
}

/** Shortest signed sweep from angle a to b, in (-PI, PI]. */
function sweep(a, b) {
	let d = b - a
	while (d > Math.PI) d -= Math.PI * 2
	while (d < -Math.PI) d += Math.PI * 2
	return d
}

/**
 * Rim along both sides. Each piece is a round stroke so bends don't miter,
 * and a fan fills the body's round corner between the two segment normals.
 */
function paintRim(g, pts, seg, normals, half, alpha, colorAt) {
	const mid = half - RIM / 2
	if (mid <= 0 || RIM <= 0) return
	const inner = Math.max(0, half - RIM)
	for (const sign of [1, -1]) {
		for (let i = 0; i < seg.length; i++) {
			if (!seg[i]) continue
			const n0 = normals[i]
			const n1 = normals[i + 1]
			const p = pts[i]
			const q = pts[i + 1]
			let ox = (n0.x + n1.x) * sign
			let oy = (n0.y + n1.y) * sign
			const len = Math.hypot(ox, oy) || 1
			g.moveTo(p.x + n0.x * sign * mid, p.y + n0.y * sign * mid)
			g.lineTo(q.x + n1.x * sign * mid, q.y + n1.y * sign * mid)
			g.stroke({
				width: RIM,
				color: colorAt(ox / len, oy / len),
				alpha,
				cap: "round",
				join: "round",
			})
		}
		for (let i = 1; i < pts.length - 1; i++) {
			const prev = seg[i - 1]
			const next = seg[i]
			if (!prev || !next) continue
			const a0 = Math.atan2(prev.ny * sign, prev.nx * sign)
			const a1 = a0 + sweep(a0, Math.atan2(next.ny * sign, next.nx * sign))
			if (Math.abs(a1 - a0) < 0.08) continue
			paintArc(g, pts[i], a0, a1, inner, half, alpha, colorAt)
		}
	}
}

/** Annulus wedge around an end so the rim meets the round cap. */
function paintArc(g, point, angle0, angle1, inner, outer, alpha, colorAt) {
	const steps = 8
	for (let i = 0; i < steps; i++) {
		const a0 = angle0 + ((angle1 - angle0) * i) / steps
		const a1 = angle0 + ((angle1 - angle0) * (i + 1)) / steps
		const mid = (a0 + a1) * 0.5
		const c0 = Math.cos(a0)
		const s0 = Math.sin(a0)
		const c1 = Math.cos(a1)
		const s1 = Math.sin(a1)
		fillQuad(
			g,
			point.x + c0 * inner,
			point.y + s0 * inner,
			point.x + c0 * outer,
			point.y + s0 * outer,
			point.x + c1 * outer,
			point.y + s1 * outer,
			point.x + c1 * inner,
			point.y + s1 * inner,
			colorAt(Math.cos(mid), Math.sin(mid)),
			alpha,
		)
	}
}

/**
 * Flat body, a rim inside the edge colored by world angle, then a thin black outline.
 * Does not clear `g` and does not place the face.
 * @param {import('pixi.js').Graphics} g
 * @param {{x:number,y:number}[]} pts head first
 */
export function paintSnakeBody(g, pts, { color, thickness, alpha = 1 }) {
	if (!pts?.length || thickness <= 0 || alpha <= 0) return
	const body = color >>> 0
	const shades = shadesFor(body)
	const half = thickness * 0.5
	const rimInner = Math.max(0, half - RIM)
	const colorAt = (nx, ny) => rimColor(nx, ny, shades)

	if (pts.length === 1) {
		const head = pts[0]
		g.circle(head.x + thickness * 0.08, head.y + thickness * 0.28, half)
		g.fill({ color: 0x000000, alpha: SHADOW_ALPHA * alpha })
		g.circle(head.x, head.y, half + BLACK)
		g.fill({ color: 0x000000, alpha })
		g.circle(head.x, head.y, half)
		g.fill({ color: body, alpha })
		paintArc(g, head, 0, Math.PI * 2, rimInner, half, alpha, colorAt)
		return
	}

	const { seg, normals } = frameOf(pts)
	strokeCenter(g, pts, thickness * 0.08, thickness * 0.28, thickness, 0x000000, SHADOW_ALPHA * alpha)
	// Round black stroke under the body, so corners follow the same curve as the fill.
	strokeCenter(g, pts, 0, 0, thickness + BLACK * 2, 0x000000, alpha)
	strokeCenter(g, pts, 0, 0, thickness, body, alpha)
	paintRim(g, pts, seg, normals, half, alpha, colorAt)

	const headAng = Math.atan2(pts[0].y - pts[1].y, pts[0].x - pts[1].x)
	paintArc(g, pts[0], headAng - Math.PI / 2, headAng + Math.PI / 2, rimInner, half, alpha, colorAt)

	const tail = pts.length - 1
	const tailAng = Math.atan2(pts[tail].y - pts[tail - 1].y, pts[tail].x - pts[tail - 1].x)
	paintArc(g, pts[tail], tailAng - Math.PI / 2, tailAng + Math.PI / 2, rimInner, half, alpha, colorAt)
}
