const TAU = Math.PI * 2

/** Peak sideways sway, as a fraction of hex size. */
export const SLITHER_AMP = 0.42

/** Distance along the path for one full side-to-side cycle, as a fraction of hex size. */
export const SLITHER_WAVE = 5.5

function waveLen(hexSize) {
	return Math.max(24, hexSize * SLITHER_WAVE)
}

/**
 * Bend a head→tail polyline into the sine the head is drawing.
 * A point `d` behind the head uses the sideways offset the head had
 * when it was that far back, so the body rides the head's curve.
 * @param {{x:number,y:number}[]} pts
 * @param {number} amp
 * @param {number} headPhase radians; advances as the head travels
 * @param {number} hexSize
 * @returns {{ pts: {x:number,y:number}[], headAng: number } | null}
 */
export function wiggleTrail(pts, amp, headPhase, hexSize) {
	if (!pts || pts.length < 2 || !(amp > 0.5)) return null
	const wave = waveLen(hexSize)
	const maxSeg = wave / 10
	/** @type {{x:number,y:number}[]} */
	const dense = [pts[0]]
	for (let i = 1; i < pts.length; i++) {
		const a = pts[i - 1]
		const b = pts[i]
		const len = Math.hypot(b.x - a.x, b.y - a.y)
		const n = Math.max(1, Math.ceil(len / maxSeg))
		for (let s = 1; s <= n; s++) {
			const t = s / n
			dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
		}
	}

	const out = new Array(dense.length)
	let dist = 0
	for (let i = 0; i < dense.length; i++) {
		if (i > 0) {
			dist += Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y)
		}
		const i0 = i === 0 ? 0 : i - 1
		const i1 = i === 0 ? 1 : i
		const ang = Math.atan2(dense[i1].y - dense[i0].y, dense[i1].x - dense[i0].x)
		const off = amp * Math.sin(headPhase - (dist / wave) * TAU)
		out[i] = {
			x: dense[i].x - Math.sin(ang) * off,
			y: dense[i].y + Math.cos(ang) * off,
		}
	}
	const head = out[0]
	const neck = out[Math.min(out.length - 1, 3)]
	return {
		pts: out,
		headAng: Math.atan2(head.y - neck.y, head.x - neck.x),
	}
}

/**
 * Point on a head→tail trail. `distFromHead` is along the un-wiggled body;
 * it is mapped by fraction so a longer wiggled curve keeps the same seat.
 * `ang` points from the head toward the tail.
 */
export function pointOnTrail(pts, distFromHead, bodyLen) {
	if (!pts?.length) return { x: 0, y: 0, ang: 0 }
	let total = 0
	for (let i = 1; i < pts.length; i++) {
		total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
	}
	const span = bodyLen > 0.001 ? bodyLen : total || 1
	const dist = total * (Math.max(0, Math.min(span, distFromHead)) / span)
	let acc = 0
	for (let i = 1; i < pts.length; i++) {
		const ax = pts[i - 1].x
		const ay = pts[i - 1].y
		const bx = pts[i].x
		const by = pts[i].y
		const seg = Math.hypot(bx - ax, by - ay)
		if (acc + seg >= dist || i === pts.length - 1) {
			const t = seg > 1e-4 ? Math.min(1, Math.max(0, (dist - acc) / seg)) : 0
			return {
				x: ax + (bx - ax) * t,
				y: ay + (by - ay) * t,
				ang: Math.atan2(by - ay, bx - ax),
			}
		}
		acc += seg
	}
	const last = pts[pts.length - 1]
	return { x: last.x, y: last.y, ang: 0 }
}
