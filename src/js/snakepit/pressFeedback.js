/**
 * Hover / press "pop" for a Pixi button.
 *
 * `hit` receives pointer events; `pop` is the node that scales (usually a
 * child holding the icon, centred on its own origin, so the hit area and any
 * layout scale on `hit` stay untouched).
 *
 * Runs on requestAnimationFrame only while easing, so it doesn't depend on
 * the game tick (which may be paused while an ad is up).
 */
export function attachPressFeedback(hit, pop, { hover = 1.15, press = 0.9 } = {}) {
	let over = false
	let down = false
	let cur = 1
	let raf = 0

	const target = () => (down ? press : over ? hover : 1)
	const step = () => {
		raf = 0
		if (pop.destroyed) return
		const t = target()
		cur += (t - cur) * 0.35
		if (Math.abs(t - cur) < 0.002) cur = t
		pop.scale.set(cur)
		if (cur !== t) raf = requestAnimationFrame(step)
	}
	const kick = () => {
		if (!raf) raf = requestAnimationFrame(step)
	}

	hit.on("pointerover", () => ((over = true), kick()))
	hit.on("pointerout", () => ((over = false), (down = false), kick()))
	hit.on("pointerdown", () => ((down = true), kick()))
	hit.on("pointerup", () => ((down = false), kick()))
	hit.on("pointerupoutside", () => ((down = false), (over = false), kick()))

	/** Back to rest, e.g. after the ad closes (no pointerout arrives on touch). */
	return function reset() {
		over = false
		down = false
		kick()
	}
}
