import { Container } from "pixi.js"

const BURST_COUNT = 36
const BURST_SPREAD = 0.5

/**
 * Pooled `flowers` movieclips. Each clip is parked on one frame, so the
 * four drawings stay four different flowers and are handed out again.
 */
export class FlowerFountain {
	/**
	 * @param {() => any} getTube
	 */
	constructor(getTube) {
		this.getTube = getTube
		this.layer = new Container()
		this.layer.eventMode = "none"
		this.layer.interactiveChildren = false
		/** @type {any[]} */
		this.free = []
		/** @type {{ clip: any, x: number, y: number, vx: number, vy: number, g: number, spin: number, flutter: number, flutterFreq: number, phase: number, age: number, life: number, floor: number }[]} */
		this.live = []
		/** @type {{ x: number, y: number, at: number, reach: number }[]} */
		this.queue = []
		this.time = 0
	}

	/**
	 * Shoot a fountain up from a world-space point under the cleared pit.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} reach how high the tallest flowers should climb, in px
	 */
	burst(x, y, reach) {
		const height = Math.max(140, reach || 220)
		const count = BURST_COUNT
		for (let i = 0; i < count; i++) {
			this.queue.push({
				x: x + (Math.random() - 0.5) * height * 0.55,
				y: y + Math.random() * 16,
				at: this.time + (i / count) * BURST_SPREAD,
				// Squared so most stay low and a few climb much higher.
				reach: height * (0.16 + Math.random() ** 2 * 1.2),
			})
		}
	}

	/** Park every live flower and drop anything still waiting to launch. */
	clear() {
		this.queue.length = 0
		for (let i = this.live.length - 1; i >= 0; i--) this._release(i)
	}

	/**
	 * @param {number} dt seconds
	 */
	tick(dt) {
		if (dt <= 0) return
		this.time += dt
		this._spawnDue()
		for (let i = this.live.length - 1; i >= 0; i--) {
			const f = this.live[i]
			f.age += dt
			f.vy += f.g * dt
			f.vx *= Math.exp(-0.4 * dt)
			f.x += f.vx * dt
			f.y += f.vy * dt
			const hang = 1 - Math.min(1, Math.abs(f.vy) / (f.g * 1.6))
			const sway = Math.sin(f.age * f.flutterFreq + f.phase) * f.flutter * (0.35 + hang)
			f.clip.position.set(f.x + sway, f.y)
			f.clip.rotation += f.spin * dt
			const fade = f.life - f.age
			if (fade < 0.22) f.clip.alpha = Math.max(0, fade / 0.22)
			const settled = f.vy > 0 && f.y > f.floor
			if (f.age >= f.life || settled) this._release(i)
		}
	}

	_spawnDue() {
		let i = 0
		while (i < this.queue.length) {
			const job = this.queue[i]
			if (job.at > this.time) {
				i++
				continue
			}
			this.queue.splice(i, 1)
			this._launch(job)
		}
	}

	/**
	 * @param {{ x: number, y: number, reach: number }} job
	 */
	_launch(job) {
		const clip = this._take()
		if (!clip) return
		const frames = Math.max(1, clip.data?.length || 1)
		clip.setFrame(Math.floor(Math.random() * frames))
		clip.stop?.()
		const scale = 0.62 + Math.random() * 0.28
		clip.scale.set((Math.random() < 0.5 ? -1 : 1) * scale, scale)
		clip.alpha = 1
		clip.rotation = (Math.random() - 0.5) * 0.6
		clip.visible = true
		// Same arc, much snappier. About half a second up, then straight back down.
		const g = Math.max(420, job.reach * 7.5)
		const speed = Math.sqrt(2 * g * job.reach)
		const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.95
		const f = {
			clip,
			x: job.x,
			y: job.y,
			vx: Math.cos(ang) * speed,
			vy: Math.sin(ang) * speed,
			g,
			spin: (Math.random() - 0.5) * 5,
			flutter: 8 + Math.random() * 12,
			flutterFreq: 6 + Math.random() * 5,
			phase: Math.random() * Math.PI * 2,
			age: 0,
			life: 1.05 + Math.random() * 0.35,
			floor: job.y + 70 + Math.random() * 50,
		}
		clip.position.set(f.x, f.y)
		this.layer.addChild(clip)
		this.live.push(f)
	}

	_take() {
		const parked = this.free.pop()
		if (parked) return parked
		const tube = this.getTube?.()
		const clip = tube?.getMovieClip?.("flowers")
		if (!clip) return null
		clip.eventMode = "none"
		clip.interactiveChildren = false
		clip.stop?.()
		return clip
	}

	/**
	 * @param {number} index
	 */
	_release(index) {
		const f = this.live[index]
		const last = this.live.pop()
		if (index < this.live.length && last) this.live[index] = last
		f.clip.parent?.removeChild(f.clip)
		f.clip.visible = false
		this.free.push(f.clip)
	}
}
