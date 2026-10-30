import { Container, Graphics, Text, TextStyle } from "pixi.js"
import { boardHas } from "./snakepit/board.js"
import { BoardView } from "./snakepit/boardView.js"
import { LevelSession } from "./snakepit/level.js"
import {
	loadProgress,
	nextLevelIndex,
	resetProgress,
	saveProgress,
} from "./snakepit/progress.js"
import { Easing, newTween } from "./dome/Tween.js"

/** After game over, resume around this pit (or level 1 if not there yet). */
const RESTART_LEVEL = 3

/** Deaths that end the level: 10% of that level's ants, rounded up. */
function antDeathLimit(total) {
	if (total <= 0) return Infinity
	return Math.ceil(total / 10)
}

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
		this._awaitingDockClear = false
		this.gameOver = false
		this.deadAnts = 0
		this.antTotal = 0
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

	/**
	 * Stop the hex slide when the head first leaves the pit.
	 * The around-pit path continues from that rim pose in world space.
	 * @param {import('./snakepit/hex.js').Hex[][]} steps
	 * @param {import('./snakepit/board.js').Board} board
	 */
	_escapeStepsToRim(steps, board) {
		if (!steps?.length) return steps || []
		for (let i = 1; i < steps.length; i++) {
			const head = steps[i]?.[0]
			if (head && !boardHas(board, head)) return steps.slice(0, i + 1)
		}
		return steps.slice(0, Math.min(steps.length, 2))
	}

	_spawnPit(level, seed, worldY) {
		const session = new LevelSession({ level, seed })
		session.onChange = () => this._refreshHud()
		const view = new BoardView({
			getTube: () => window.alltubes?.tiles,
			onSnakeClick: (id) => this._onSnakeClick(id),
			onAntDied: () => this._onAntDied(),
			onAntGameOver: () => this._triggerGameOver(this.activePit),
		})
		view.setSession(session)
		this.deadAnts = 0
		this.antTotal = view.dock.ants.length
		const bounds = view.boardPixelSize()
		view.position.set(-bounds.cx, worldY - bounds.cy)
		this.world.addChild(view)
		const pit = { view, session, level, worldY }
		this.pitStack.push(pit)
		this.activePit = pit
		this.resize()
		saveProgress(level, session.seed)
		return pit
	}

	_layoutMetrics() {
		const w = window.getRenderWidth?.() ?? this.app?.screen?.width ?? 800
		const h = window.getRenderHeight?.() ?? this.app?.screen?.height ?? 600
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
		const field = pit.view.playfieldPixelSize()
		const pitBox = pit.view.boardPixelSize()
		const fit = Math.min(availW / Math.max(field.w, 1), availH / Math.max(field.h, 1))
		// Don't zoom in past this: keeps small pits from filling the phone with huge tiles.
		const maxTileScreen = 72 // max center→vertex size in screen px
		const maxScale = maxTileScreen / Math.max(pit.view.hexSize || 36, 1)
		const scale = Math.min(fit, maxScale)
		// View is placed so the pit center sits at world (0, worldY). Frame the lanes too.
		const focusX = field.cx - pitBox.cx
		const focusY = pit.worldY + (field.cy - pitBox.cy)
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
			const lane = view.dock.reserveLane()
			if (!lane) return
			const capacity = Math.max(1, result.steps?.[0]?.length ?? result.snake.cells?.length ?? 1)
			const color = result.snake.color
			const dir = result.snake.dir
			// Stop once the body has cleared the pit — dock path continues from the rim.
			const rimSteps = this._escapeStepsToRim(result.steps, session.board)
			session.beginMove(snakeId)
			session.commitEscape(snakeId)
			this._refreshHud()
			await view.playSteps(result.snake, rimSteps, { bump: false, handoff: true })
			const from = view.escapeHandoffLocal(rimSteps, dir)
			const bodyPts = view.escapeBodyPoints(rimSteps, dir)
			view.dock.enqueueEscapedSnake({
				color,
				capacity,
				from,
				bodyPts,
				lane,
			})
			view.removeSnakeGfx(snakeId)
			session.endMove(snakeId)
			this._refreshHud()
			// Wait until every in-flight escape on this pit finishes — otherwise
			// parallel clears can advance multiple levels at once.
			await this._maybeAdvanceAfterClear(pit)
			return
		}

		session.beginMove(snakeId)
		await view.playSteps(result.snake, result.steps, { bump: true })
		session.endMove(snakeId)
		this._refreshHud()
	}

	/** @returns {boolean} true when this death reaches 10% of the level's ants */
	_onAntDied() {
		if (this.gameOver) return false
		this.deadAnts++
		this._refreshHud()
		return this.deadAnts >= antDeathLimit(this.antTotal)
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
		this.hintText.text = "Too many ants died — game over!"

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
		if (this.transitioning || this._awaitingDockClear) return
		// Stale callback from an already-left pit.
		if (this.activePit !== pit) return
		this._awaitingDockClear = true
		this.hintText.text = "Pit cleared — ants boarding…"
		try {
			await pit.view.dock.waitUntilIdle()
			if (this.activePit !== pit || this.transitioning || this.gameOver) return
			if (pit.view.dock.hasLeftoverAnts()) {
				this.hintText.text = "An anteater arrives…"
				await pit.view.dock.playAnteater(this.hud)
				if (this.activePit !== pit || this.transitioning || this.gameOver) return
			}
			await this._onLevelCleared(pit)
		} finally {
			this._awaitingDockClear = false
		}
	}

	async _onLevelCleared(clearedPit) {
		const prev = clearedPit || this.activePit
		if (this.transitioning || this.gameOver || !prev) return
		if (this.activePit !== prev) return
		this.transitioning = true
		prev.view.eventMode = "none"
		prev.view.interactiveChildren = false
		this.hintText.text = "Pit cleared — climbing to the next one…"
		const nextLevel = nextLevelIndex(this.levelIndex)
		const gap = 80
		const prevField = prev.view.playfieldPixelSize()
		const prevPit = prev.view.boardPixelSize()
		const prevTop = prev.worldY + (prevField.minY - prevPit.cy)
		const approxNextH = prevField.h
		const nextY = prevTop - gap - approxNextH / 2
		this.levelIndex = nextLevel
		const next = this._spawnPit(nextLevel, undefined, nextY)
		next.view.eventMode = "none"
		next.view.interactiveChildren = false
		const nextField = next.view.playfieldPixelSize()
		const nextPit = next.view.boardPixelSize()
		const nextBottomExtent = nextField.maxY - nextPit.cy
		const preciseY = prevTop - gap - nextBottomExtent
		next.worldY = preciseY
		next.view.position.set(-nextPit.cx, preciseY - nextPit.cy)
		next.view.cullDecorOnScreen(this.cam)

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
		const limit = antDeathLimit(this.antTotal)
		const deadNote = Number.isFinite(limit) ? `${this.deadAnts}/${limit} ants dead` : ""
		if (this.gameOver) {
			this.statusText.text = `Game over  ·  Level ${this.levelIndex}`
		} else if (session.isWon()) {
			this.statusText.text = `Level ${this.levelIndex} cleared!`
		} else {
			this.statusText.text = `Level ${this.levelIndex}  ·  ${total - left}/${total} escaped  ·  ${deadNote}`
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
