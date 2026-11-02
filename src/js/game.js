import { Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js"
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
import { createTitleLogo } from "./snakepit/titleLogo.js"
import { FlowerFountain } from "./snakepit/flowerFountain.js"
import * as sfx from "./snakepit/sfx.js"

/** After game over, resume around this pit (or level 1 if not there yet). */
const RESTART_LEVEL = 3

/**
 * How much neighboring floor-grass tiles cover each other.
 * 0 is edge to edge. 0.25 overlaps by a quarter of the tile.
 */
const FLOOR_GRASS_OVERLAP = 0.22

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
		this.floorGrass = new Container()
		this.floorGrass.eventMode = "none"
		this.floorGrass.interactiveChildren = false
		this.addChild(this.floorGrass)

		this.boardRoot = new Container()
		this.world = new Container()
		this.boardRoot.addChild(this.world)
		this.addChild(this.boardRoot)

		this.flowers = new FlowerFountain(() => window.alltubes?.tiles)
		this.addChild(this.flowers.layer)

		this.hud = new Container()
		this.addChild(this.hud)

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

	showSettingsButton() {
		if (this.settingsBtn) return
		const ui = this.hooks.getUi?.()
		if (!ui) return
		this.settingsBtn = ui.displayDialog("digSettingsBtn", {}, (res) => {
			if (res === "settings") this.toggleSettings()
		})
	}

	toggleSettings() {
		const ui = this.hooks.getUi?.()
		if (!ui) return
		if (this.settingsDialog) {
			const open = this.settingsDialog
			this.settingsDialog = undefined
			ui.closeDialog(open)
			return
		}
		const shell = this.hooks.getShell?.()
		this.settingsDialog = ui.displayDialog("digSettings", {}, (_res, dialog) => {
			if (dialog?.isClosing || dialog?.isClosed) this.settingsDialog = undefined
		})
		this.settingsDialog?.controller?.setGameObjects({
			game: this,
			musman: shell?.musman,
			defaultSound: shell?.defaultSound ?? true,
			defaultMusic: shell?.defaultMusic ?? false,
		})
	}

	closeSettings() {
		const ui = this.hooks.getUi?.()
		if (!this.settingsDialog || !ui) return
		const open = this.settingsDialog
		this.settingsDialog = undefined
		ui.closeDialog(open)
	}

	/** Settings panel reset. Sound and music choices stay. */
	resetGame() {
		if (!window.confirm("Reset your progress? Sound and music stay as they are.")) return
		this.closeSettings()
		this.resetProgressAndRestart()
	}

	start() {
		const prog = loadProgress()
		this.levelIndex = prog.level
		this.gameOver = false
		this._clearGameOverUi()
		this._clearWorld()
		this._ensureLogo()
		this._spawnPit(this.levelIndex, prog.seed || undefined, 0)
		this._focusActivePit(false)
		this.resize()
		this._playLogoIntro()
		this.showSettingsButton()
	}

	resetProgressAndRestart() {
		const prog = resetProgress()
		this.levelIndex = prog.level
		this.gameOver = false
		this._clearGameOverUi()
		this._clearWorld()
		this._ensureLogo()
		this._spawnPit(this.levelIndex, prog.seed, 0)
		this._focusActivePit(false)
		this.resize()
		this._playLogoIntro()
	}

	_ensureLogo() {
		if (this.logo) return this.logo
		// Snake wordmark stays in titleLogo.js. The tube clip is the one on screen.
		const showSnakeTitle = false
		if (showSnakeTitle) {
			const logo = createTitleLogo(() => window.alltubes?.tiles)
			logo.isSnakeTitle = true
			this.hud.addChildAt(logo, 0)
			this.logo = logo
			return logo
		}
		const tube = window.alltubes?.tiles
		const mc = tube?.getMovieClip?.("logo")
		if (!mc) return null
		mc.eventMode = "none"
		mc.interactiveChildren = false
		if (mc.framelabels?.idle != null) mc.setFrame("idle")
		mc.stop?.()
		const bounds = mc.getLocalBounds?.()
		const width = Math.max(1, bounds?.width || 335)
		const height = Math.max(1, bounds?.height || 51)
		mc.layoutWidth = width
		mc.layoutHeight = height
		if (bounds) mc.pivot.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
		this.hud.addChildAt(mc, 0)
		this.logo = mc
		return mc
	}

	/** Width of the settled wordmark. Leaves the upper-right settings cog clear. */
	_logoTargetWidth(w, settled) {
		if (settled) return Math.min(Math.max(160, w - 112), 520)
		return Math.min(w * 0.94, 660)
	}

	_logoScale(w, settled) {
		const naturalW = Math.max(1, this.logo?.layoutWidth || 640)
		return this._logoTargetWidth(w, settled) / naturalW
	}

	/** Center the logo, shifting left when the cog would cover the last letter. */
	_logoX(w, halfWidth) {
		const gear = 104
		let x = w / 2
		if (x + halfWidth > w - gear) x = w - gear - halfWidth - 4
		if (x - halfWidth < 6) x = halfWidth + 6
		return x
	}

	_logoLayout(settled) {
		const { w, h } = this._layoutMetrics()
		const naturalW = Math.max(1, this.logo?.layoutWidth || 640)
		const naturalH = Math.max(1, this.logo?.layoutHeight || 150)
		const scale = this._logoScale(w, settled)
		const halfW = (naturalW * scale) / 2
		if (settled) {
			const height = naturalH * scale
			const topPad = 14
			return {
				x: this._logoX(w, halfW),
				y: topPad + height / 2,
				scale,
				bottom: topPad + height + 6,
			}
		}
		const y = Math.min(h * 0.22, 150)
		return {
			x: w / 2,
			y,
			scale,
			bottom: y + (naturalH * scale) / 2 + 8,
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
		sfx.play("logo")
		if (!logo) return
		const from = this._logoLayout(false)
		const to = this._logoLayout(true)
		this.logoSettled = false
		this.logoIntroPlaying = true
		logo.alpha = 1
		logo.position.set(from.x, from.y)
		logo.scale.set(from.scale)
		const proxy = { t: 0 }
		newTween(proxy, { t: 1 }, 0.95)
			.ease(Easing.outCubic)
			.onUpdate(() => {
				const t = proxy.t
				logo.scale.set(from.scale + (to.scale - from.scale) * t)
				logo.x = from.x + (to.x - from.x) * t
				logo.y = from.y + (to.y - from.y) * t
			})
			.onDone(() => {
				logo.scale.set(to.scale)
				logo.position.set(to.x, to.y)
				this.logoSettled = true
				this.logoIntroPlaying = false
			})
	}

	_clearWorld() {
		for (const pit of this.pitStack) {
			pit.view.parent?.removeChild(pit.view)
		}
		this.pitStack = []
		this.activePit = null
		this.world.removeChildren()
		this.flowers?.clear()
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
		let top = topHud
		const logoW = this.logo?.layoutWidth || 0
		const logoH = this.logo?.layoutHeight || 0
		if (logoW > 0 && logoH > 0) {
			const scale = Math.min(Math.max(160, w - 112), 520) / logoW
			const logoBottom = 14 + logoH * scale + 6
			top = Math.max(topHud, logoBottom + 16)
		}
		const availW = Math.max(1, w - padX * 2)
		const availH = Math.max(1, h - top - botHud - padY * 2)
		return { w, h, topHud: top, botHud, padX, padY, availW, availH }
	}

	_cameraForPit(pit) {
		const { availW, availH, w, h, topHud, padY } = this._layoutMetrics()
		const field = pit.view.playfieldPixelSize()
		const pitBox = pit.view.boardPixelSize()
		const fit = Math.min(availW / Math.max(field.w, 1), availH / Math.max(field.h, 1))
		// Small pits would otherwise grow until they fill the screen. On a narrow
		// phone the same cap leaves the first levels looking far away, so allow
		// a little more zoom there. Later levels are already limited by fit.
		const narrow = h > w * (768 / 1024)
		const maxTileScreen = narrow ? 90 : 72
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
			sfx.play("lane")
			sfx.play("snakeStart")
			sfx.loopAdd("slither")
			let handedOff = false
			try {
				await view.playSteps(result.snake, rimSteps, { bump: false, handoff: true })
				const from = view.escapeHandoffLocal(rimSteps, dir)
				const bodyPts = view.escapeBodyPoints(rimSteps, dir)
				view.removeSnakeGfx(snakeId)
				view.dock.enqueueEscapedSnake({
					color,
					capacity,
					from,
					bodyPts,
					lane,
				})
				handedOff = true
			} finally {
				if (!handedOff) sfx.loopRemove("slither")
			}
			session.endMove(snakeId)
			// Wait until every in-flight escape on this pit finishes — otherwise
			// parallel clears can advance multiple levels at once.
			await this._maybeAdvanceAfterClear(pit)
			return
		}

		session.beginMove(snakeId)
		sfx.play("snakeStart")
		// A snake blocked on the first hex only nudges and bonks. No slither.
		const travels = (result.steps?.length ?? 0) > 1
		if (travels) sfx.loopAdd("slither")
		try {
			await view.playSteps(result.snake, result.steps, { bump: true })
		} finally {
			if (travels) sfx.loopRemove("slither")
		}
		session.endMove(snakeId)
	}

	/** @returns {boolean} true when this death reaches 10% of the level's ants */
	_onAntDied() {
		if (this.gameOver) return false
		this.deadAnts++
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
		sfx.play("gameOver")
		this.gameOver = true
		this.transitioning = true
		pit.view.eventMode = "none"
		pit.view.interactiveChildren = false

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
						sfx.play("signThud")
						resolve()
					})
			})
		} else {
			sfx.play("signThud")
		}

		this._showRestartButton()
		this.transitioning = false
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
		sfx.play("restart")
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
		sfx.play("pitCleared")
		try {
			await pit.view.dock.waitUntilIdle()
			if (this.activePit !== pit || this.transitioning || this.gameOver) return
			if (pit.view.dock.hasLeftoverAnts()) {
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
		const pitBox = prev.view.boardPixelSize()
		const global = prev.view.toGlobal({
			x: pitBox.cx,
			y: pitBox.cy + pitBox.h * 0.48,
		})
		const local = this.toLocal(global)
		const climb = Math.min(pitBox.h * (this.cam.scale || 1) * 1.15, 520)
		this.flowers.burst(local.x, local.y, climb)
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

		sfx.play("climb")
		await this._focusActivePit(true)
		if (this.pitStack.length > 2) {
			const old = this.pitStack.shift()
			old?.view.parent?.removeChild(old.view)
		}
		next.view.eventMode = "static"
		next.view.interactiveChildren = true
		this.transitioning = false
	}

	tick(dt) {
		this.flowers?.tick(dt)
		if (this.logo?.isSnakeTitle) this.logo.tick(dt)
		if (this.gameOver) return
		if (this._critterIn == null) this._critterIn = 8
		this._critterIn -= dt
		if (this._critterIn > 0) return
		sfx.play("critter")
		this._critterIn = 14 + Math.random() * 18
	}

	/** Tile floorgrass across the screen. Each tile shows a random frame of the clip. */
	_layoutFloorGrass() {
		const tube = window.alltubes?.tiles
		if (!tube?.getMovieClip) return
		const { w, h } = this._layoutMetrics()
		let sample = this.floorGrass.children[0]
		if (!sample) {
			sample = tube.getMovieClip("floorgrass")
			if (!sample) return
			sample.eventMode = "none"
			sample.interactiveChildren = false
			const frames = Math.max(1, sample.data?.length || 1)
			sample.setFrame(Math.floor(Math.random() * frames))
			sample.stop?.()
			this.floorGrass.addChild(sample)
		}
		const bounds = sample.getLocalBounds()
		const tileW = Math.max(8, bounds.width)
		const tileH = Math.max(8, bounds.height)
		const frames = Math.max(1, sample.data?.length || 1)
		const stepX = tileW * (1 - FLOOR_GRASS_OVERLAP)
		const stepY = tileH * (1 - FLOOR_GRASS_OVERLAP)
		const cols = Math.ceil((w + stepX) / stepX) + 1
		const rows = Math.ceil((h + stepY) / stepY) + 1
		const need = cols * rows

		while (this.floorGrass.children.length > need) {
			const extra = this.floorGrass.children.pop()
			extra?.stop?.()
			extra?.destroy({ children: true })
		}
		while (this.floorGrass.children.length < need) {
			const mc = tube.getMovieClip("floorgrass")
			if (!mc) break
			mc.eventMode = "none"
			mc.interactiveChildren = false
			mc.setFrame(Math.floor(Math.random() * frames))
			mc.stop?.()
			this.floorGrass.addChild(mc)
		}

		let i = 0
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				const mc = this.floorGrass.children[i++]
				if (!mc) return
				mc.position.set(col * stepX - stepX * 0.5, row * stepY - stepY * 0.5)
			}
		}
		this._layoutBgTint()
	}

	/** Full-screen shade sitting directly above the floor grass. */
	_layoutBgTint() {
		const { w, h } = this._layoutMetrics()
		if (!this.bgTint) {
			let tex = null
			try {
				tex = Texture.from("tiles_bgtint.png")
				if (!tex || tex.width <= 1) return
			} catch {
				return
			}
			const spr = new Sprite(tex)
			spr.eventMode = "none"
			spr.anchor.set(0, 0)
			spr.alpha = 0.5
			const grassIndex = this.getChildIndex(this.floorGrass)
			this.addChildAt(spr, grassIndex + 1)
			this.bgTint = spr
		}
		this.bgTint.width = w
		this.bgTint.height = h
	}

	resize() {
		this._layoutFloorGrass()
		this._layoutBgTint()
		if (this.activePit && !this.transitioning && !this.gameOver) this._focusActivePit(false)
		if (this.logo && !this.logoIntroPlaying) {
			this._applyLogoLayout(this.logoSettled)
		}
		this._layoutRestartButton()
	}
}
