import { Container, Graphics, Text, TextStyle } from "pixi.js"
import { BoardView } from "./snakepit/boardView.js"
import { LevelSession } from "./snakepit/level.js"
import {
	loadProgress,
	nextLevelIndex,
	resetProgress,
	saveProgress,
} from "./snakepit/progress.js"
import { Easing, newTween } from "./dome/Tween.js"

const MAX_BONKS = 3
/** After game over, resume around this pit (or level 1 if not there yet). */
const RESTART_LEVEL = 3

/**
 * Snakepit play session: hex snake-escape board + HUD + pit progression.
 */
export class Game extends Container {
	/**
	 * @param {import('pixi.js').Application} app
	 * @param {{
	 *   getUi?: () => import('./dome/ui.js').UI | undefined
	 *   getMusman?: () => import('./music.js').MusicManager | undefined
	 *   getShell?: () => import('./gameShell.js').GameShell | undefined
	 * }} hooks
	 */
	constructor(app, hooks) {
		super()
		this.app = app
		this.hooks = hooks
		this.boardRoot = new Container()
		this.world = new Container()
		this.boardRoot.addChild(this.world)
		this.addChild(this.boardRoot)

		this.hud = new Container()
		this.addChild(this.hud)

		this.statusText = new Text({
			text: "",
			style: new TextStyle({
				fontFamily: "Arial",
				fontSize: 28,
				fill: 0xffffff,
				align: "center",
				dropShadow: {
					color: 0x000000,
					blur: 4,
					distance: 2,
				},
			}),
		})
		this.statusText.anchor.set(0.5, 0)
		this.hud.addChild(this.statusText)

		this.hintText = new Text({
			text: "Tap a snake to send it forward. Clear the path to escape.",
			style: new TextStyle({
				fontFamily: "Arial",
				fontSize: 18,
				fill: 0xc8d8cc,
				align: "center",
				wordWrap: true,
				wordWrapWidth: 520,
			}),
		})
		this.hintText.anchor.set(0.5, 0)
		this.hud.addChild(this.hintText)

		/** @type {import('./dome/movieclip.js').MovieClip | null} */
		this.logo = null
		this.logoSettled = false
		this.logoIntroPlaying = false

		/** @type {{ view: BoardView, session: LevelSession, level: number } | null} */
		this.activePit = null
		/** @type {{ view: BoardView, session: LevelSession, level: number }[]} */
		this.pitStack = []
		this.transitioning = false
		this.gameOver = false
		this.bonkCount = 0
		/** @type {import('./dome/movieclip.js').MovieClip | null} */
		this.gameOverSign = null
		/** @type {Container | null} */
		this.restartBtn = null
		this.cam = { x: 0, y: 0, scale: 1 }
		this.levelIndex = 1
	}

	get session() {
		return this.activePit?.session ?? null
	}

	get boardView() {
		return this.activePit?.view ?? null
	}

	start() {
		const prog = loadProgress()
		this.levelIndex = prog.level
		this.bonkCount = 0
		this.gameOver = false
		this._clearGameOverUi()
		this._clearWorld()
		this._spawnPit(this.levelIndex, prog.seed || undefined, 0)
		this._focusActivePit(false)
		this._refreshHud()
		this.resize()
		this._playLogoIntro()
	}

	resetProgressAndRestart() {
		const prog = resetProgress()
		this.levelIndex = prog.level
		this.bonkCount = 0
		this.gameOver = false
		this._clearGameOverUi()
		this._clearWorld()
		this._spawnPit(this.levelIndex, prog.seed, 0)
		this._focusActivePit(false)
		this._refreshHud()
		this.resize()
		this._playLogoIntro()
	}

	_ensureLogo() {
		if (this.logo) return this.logo
		const tube = window.alltubes?.tiles
		if (!tube) return null
		const mc = tube.getMovieClip("logo")
		if (!mc) return null
		mc.eventMode = "none"
		mc.interactiveChildren = false
		this.hud.addChildAt(mc, 0)
		this.logo = mc
		return mc
	}

	_logoLayout(settled) {
		const { w, h } = this._layoutMetrics()
		const logo = this.logo
		const bounds = logo?.getLocalBounds?.()
		const naturalW = Math.max(1, bounds?.width || 335)
		const naturalH = Math.max(1, bounds?.height || 51)
		if (settled) {
			const targetW = Math.min(w * 0.5, 240)
			const scale = targetW / naturalW
			return {
				x: w / 2,
				y: 8 + (naturalH * scale) / 2,
				scale,
				bottom: 8 + naturalH * scale + 6,
			}
		}
		const targetW = Math.min(w * 0.86, 400)
		const scale = targetW / naturalW
		return {
			x: w / 2,
			y: Math.min(h * 0.22, 140),
			scale,
			bottom: Math.min(h * 0.22, 140) + (naturalH * scale) / 2 + 8,
		}
	}

	_applyLogoLayout(settled) {
		const logo = this._ensureLogo()
		if (!logo) return
		const layout = this._logoLayout(settled)
		logo.position.set(layout.x, layout.y)
		logo.scale.set(layout.scale)
	}

	_playLogoIntro() {
		const logo = this._ensureLogo()
		if (!logo) return
		const from = this._logoLayout(false)
		const to = this._logoLayout(true)
		this.logoSettled = false
		this.logoIntroPlaying = true
		logo.alpha = 1
		logo.position.set(from.x, from.y)
		logo.scale.set(from.scale)
		this._layoutHudText(from.bottom)
		const proxy = { t: 0 }
		newTween(proxy, { t: 1 }, 0.95)
			.ease(Easing.outCubic)
			.onUpdate(() => {
				const t = proxy.t
				logo.scale.set(from.scale + (to.scale - from.scale) * t)
				logo.x = from.x + (to.x - from.x) * t
				logo.y = from.y + (to.y - from.y) * t
				const bottom =
					from.bottom + (to.bottom - from.bottom) * t
				this._layoutHudText(bottom)
			})
			.onDone(() => {
				logo.scale.set(to.scale)
				logo.position.set(to.x, to.y)
				this.logoSettled = true
				this.logoIntroPlaying = false
				this._layoutHudText(to.bottom)
			})
	}

	_layoutHudText(logoBottom) {
		const { w } = this._layoutMetrics()
		const top = Math.max(36, logoBottom ?? 36)
		this.statusText.position.set(w / 2, top)
		this.hintText.position.set(w / 2, top + 32)
		this.hintText.style.wordWrapWidth = Math.min(560, w - 24)
	}

	_clearWorld() {
		for (const pit of this.pitStack) {
			pit.view.parent?.removeChild(pit.view)
		}
		this.pitStack = []
		this.activePit = null
		this.world.removeChildren()
	}

	_spawnPit(level, seed, worldY) {
		const session = new LevelSession({ level, seed })
		session.onChange = () => this._refreshHud()
		const view = new BoardView({
			getTube: () => window.alltubes?.tiles,
			onSnakeClick: (id) => this._onSnakeClick(id),
		})
		view.setSession(session)
		const bounds = view.boardPixelSize()
		view.position.set(-bounds.cx, worldY - bounds.cy)
		this.world.addChild(view)
		const pit = { view, session, level, worldY }
		this.pitStack.push(pit)
		this.activePit = pit
		saveProgress(level, session.seed)
		return pit
	}

	_layoutMetrics() {
		const w = window.getRenderWidth?.() ?? this.app?.screen?.width ?? 800
		const h = window.getRenderHeight?.() ?? this.app?.screen?.height ?? 600
		// Room for settled logo + status/hint strip above the pit.
		const topHud = 112
		const botHud = 36
		const padX = Math.max(8, Math.min(18, w * 0.03))
		const padY = 8
		const availW = Math.max(1, w - padX * 2)
		const availH = Math.max(1, h - topHud - botHud - padY * 2)
		return { w, h, topHud, botHud, padX, padY, availW, availH }
	}

	_cameraForPit(pit) {
		const { availW, availH, w, topHud, padY } = this._layoutMetrics()
		const bounds = pit.view.boardPixelSize()
		const fit = Math.min(availW / Math.max(bounds.w, 1), availH / Math.max(bounds.h, 1))
		// Don't zoom in past this: keeps small pits from filling the phone with huge tiles.
		const maxTileScreen = 72 // max center→vertex size in screen px
		const maxScale = maxTileScreen / Math.max(pit.view.hexSize || 36, 1)
		const scale = Math.min(fit, maxScale)
		const focusX = 0
		const focusY = pit.worldY
		return {
			scale,
			x: w / 2 - focusX * scale,
			y: topHud + availH / 2 + padY - focusY * scale,
		}
	}

	_applyCam() {
		this.boardRoot.scale.set(this.cam.scale)
		this.boardRoot.position.set(this.cam.x, this.cam.y)
	}

	_focusActivePit(animate) {
		if (!this.activePit) return Promise.resolve()
		const target = this._cameraForPit(this.activePit)
		if (!animate) {
			this.cam = { ...target }
			this._applyCam()
			return Promise.resolve()
		}
		return new Promise((resolve) => {
			const from = { ...this.cam }
			const proxy = { t: 0 }
			newTween(proxy, { t: 1 }, 0.85)
				.ease(Easing.inOutCubic)
				.onUpdate(() => {
					const t = proxy.t
					this.cam.scale = from.scale + (target.scale - from.scale) * t
					this.cam.x = from.x + (target.x - from.x) * t
					this.cam.y = from.y + (target.y - from.y) * t
					this._applyCam()
				})
				.onDone(() => {
					this.cam = { ...target }
					this._applyCam()
					resolve()
				})
		})
	}

	async _onSnakeClick(snakeId) {
		if (!this.activePit || this.transitioning || this.gameOver) return
		const pit = this.activePit
		const { session, view } = pit
		if (session.isMoving(snakeId) || view.isAnimating(snakeId)) return
		const snake = session.snakes.find((s) => s.id === snakeId)
		if (!snake || snake.escaped) return

		const result = session.tryEscape(snakeId)
		if (!result) return

		if (result.kind === "escaped") {
			session.beginMove(snakeId)
			session.commitEscape(snakeId)
			this._refreshHud()
			await view.playSteps(result.snake, result.steps, { bump: false })
			view.removeSnakeGfx(snakeId)
			session.endMove(snakeId)
			this._refreshHud()
			// Wait until every in-flight escape on this pit finishes — otherwise
			// parallel clears can advance multiple levels at once.
			await this._maybeAdvanceAfterClear(pit)
			return
		}

		session.beginMove(snakeId)
		this.bonkCount++
		this._refreshHud()
		await view.playSteps(result.snake, result.steps, { bump: true })
		session.endMove(snakeId)
		this._refreshHud()
		if (this.bonkCount >= MAX_BONKS && !this.gameOver) {
			await this._triggerGameOver(pit)
		}
	}

	_clearGameOverUi() {
		if (this.gameOverSign) {
			this.gameOverSign.parent?.removeChild(this.gameOverSign)
			this.gameOverSign = null
		}
		if (this.restartBtn) {
			this.restartBtn.parent?.removeChild(this.restartBtn)
			this.restartBtn = null
		}
	}

	async _triggerGameOver(pit) {
		if (this.gameOver) return
		this.gameOver = true
		this.transitioning = true
		pit.view.eventMode = "none"
		pit.view.interactiveChildren = false
		this.hintText.text = "Too many bonks — game over!"

		const tube = window.alltubes?.tiles
		const sign = tube?.getMovieClip?.("gameOver")
		if (sign) {
			const b = pit.view.boardPixelSize()
			sign.eventMode = "none"
			sign.scale.set(1.15)
			sign.alpha = 1
			sign.position.set(b.cx, b.cy - b.h * 0.85)
			pit.view.fxLayer.addChild(sign)
			this.gameOverSign = sign
			await new Promise((resolve) => {
				const fromY = sign.y
				const toY = b.cy
				const proxy = { t: 0 }
				newTween(proxy, { t: 1 }, 0.7)
					.ease(Easing.outBounce)
					.onUpdate(() => {
						sign.y = fromY + (toY - fromY) * proxy.t
					})
					.onDone(() => {
						sign.y = toY
						resolve()
					})
			})
		}

		this._showRestartButton()
		this.transitioning = false
		this._refreshHud()
	}

	_showRestartButton() {
		if (this.restartBtn) return
		const btn = new Container()
		btn.eventMode = "static"
		btn.cursor = "pointer"
		const bg = new Graphics()
		bg.roundRect(-90, -28, 180, 56, 14)
		bg.fill({ color: 0x3d8f55 })
		bg.stroke({ width: 3, color: 0x1e4a2c })
		btn.addChild(bg)
		const label = new Text({
			text: "Restart",
			style: new TextStyle({
				fontFamily: "Arial",
				fontSize: 28,
				fontWeight: "bold",
				fill: 0xffffff,
			}),
		})
		label.anchor.set(0.5)
		btn.addChild(label)
		btn.on("pointertap", (e) => {
			e.stopPropagation()
			this._restartAfterGameOver()
		})
		this.hud.addChild(btn)
		this.restartBtn = btn
		this._layoutRestartButton()
	}

	_layoutRestartButton() {
		if (!this.restartBtn) return
		const { w, h } = this._layoutMetrics()
		this.restartBtn.position.set(w / 2, h - 52)
	}

	_restartAfterGameOver() {
		const restartLevel = this.levelIndex >= RESTART_LEVEL ? RESTART_LEVEL : 1
		const seed = (Math.floor(Math.random() * 0xffffffff) >>> 0)
		this.levelIndex = restartLevel
		this.bonkCount = 0
		this.gameOver = false
		this.transitioning = false
		this._clearGameOverUi()
		this._clearWorld()
		saveProgress(restartLevel, seed)
		this._spawnPit(restartLevel, seed, 0)
		this._focusActivePit(false)
		this.hintText.text = "Tap a snake to send it forward. Clear the path to escape."
		this._refreshHud()
		this.resize()
	}

	async _maybeAdvanceAfterClear(pit) {
		const { session } = pit
		if (!session.isWon()) return
		if (session.anyMoving()) return
		if (this.transitioning) return
		// Stale callback from an already-left pit.
		if (this.activePit !== pit) return
		await this._onLevelCleared(pit)
	}

	async _onLevelCleared(clearedPit) {
		const prev = clearedPit || this.activePit
		if (this.transitioning || this.gameOver || !prev) return
		if (this.activePit !== prev) return
		this.transitioning = true
		this.bonkCount = 0
		prev.view.eventMode = "none"
		prev.view.interactiveChildren = false
		this.hintText.text = "Pit cleared — climbing to the next one…"
		const nextLevel = nextLevelIndex(this.levelIndex)
		const prevBounds = prev.view.boardPixelSize()
		const gap = 80
		const approxNextH = prevBounds.h * 1.15
		const nextY = prev.worldY - (prevBounds.h / 2 + gap + approxNextH / 2)
		this.levelIndex = nextLevel
		const next = this._spawnPit(nextLevel, undefined, nextY)
		next.view.eventMode = "none"
		next.view.interactiveChildren = false
		const nb = next.view.boardPixelSize()
		const preciseY = prev.worldY - (prevBounds.h / 2 + gap + nb.h / 2)
		next.worldY = preciseY
		next.view.position.set(-nb.cx, preciseY - nb.cy)

		await this._focusActivePit(true)
		if (this.pitStack.length > 2) {
			const old = this.pitStack.shift()
			old?.view.parent?.removeChild(old.view)
		}
		next.view.eventMode = "static"
		next.view.interactiveChildren = true
		this.transitioning = false
		this.hintText.text = "Tap a snake to send it forward. Clear the path to escape."
		this._refreshHud()
	}

	_refreshHud() {
		const session = this.session
		if (!session) return
		const left = session.remaining()
		const total = session.total()
		const bonksLeft = Math.max(0, MAX_BONKS - this.bonkCount)
		if (this.gameOver) {
			this.statusText.text = `Game over  ·  Level ${this.levelIndex}`
		} else if (session.isWon()) {
			this.statusText.text = `Level ${this.levelIndex} cleared!`
		} else {
			this.statusText.text = `Level ${this.levelIndex}  ·  ${total - left}/${total} escaped  ·  ${bonksLeft} bonk${bonksLeft === 1 ? "" : "s"} left`
		}
	}

	tick() {}

	resize() {
		if (this.activePit && !this.transitioning && !this.gameOver) this._focusActivePit(false)
		if (this.logo && !this.logoIntroPlaying) {
			this._applyLogoLayout(this.logoSettled)
			const layout = this._logoLayout(this.logoSettled)
			this._layoutHudText(layout.bottom)
		} else if (!this.logo) {
			this._layoutHudText(18)
		}
		this._layoutRestartButton()
	}
}
