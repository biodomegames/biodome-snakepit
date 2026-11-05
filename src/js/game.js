import { Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from "pixi.js"
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
import { durationScaleForLevel } from "./snakepit/pace.js"
import { FlowerFountain } from "./snakepit/flowerFountain.js"
import { canEscape } from "./snakepit/snake.js"
import {
	livesRefillAmount,
	shouldShowLivesRefill,
} from "./snakepit/difficulty.js"
import { adManager } from "./system/ads.js"
import watchAdIcon from "../g/icon-watchad.svg"
import * as sfx from "./snakepit/sfx.js"

/** After game over, resume around this pit (or level 1 if not there yet). */
const RESTART_LEVEL = 3

/**
 * How much neighboring floor-grass tiles cover each other.
 * 0 is edge to edge. 0.25 overlaps by a quarter of the tile.
 */
const FLOOR_GRASS_OVERLAP = 0.22

/** Ant lives shown under the logo. Squash or anteater eats cost one each. */
const ANT_LIVES = 5
const LIFE_SPRITE = "tiles_antLifeSprite.png"
const LIFE_LOST_ALPHA = 0.22

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
		this.antLives = ANT_LIVES
		/** @type {import('pixi.js').Sprite[]} */
		this.lifeSprites = []
		/** @type {import('pixi.js').Container | null} */
		this.lifeIcons = null
		/** @type {import('./dome/movieclip.js').MovieClip | null} */
		this.gameOverSign = null
		/** @type {Container | null} */
		this.restartBtn = null
		this.cam = { x: 0, y: 0, scale: 1 }
		this.levelIndex = 1
		/** Level-1 finger hint: at most two snakes. */
		/** @type {number[]} */
		this._ftueHintedIds = []
		/** @type {number | null} */
		this._ftueTargetId = null
		/** @type {any} */
		this._ftueFinger = null
		/** @type {import('pixi.js').Text | null} */
		this.levelLabel = null
		/** @type {import('pixi.js').Container | null} */
		this.livesRefillBtn = null
		/** @type {any} */
		this._livesRefillDialog = null
		this._livesRefillBusy = false
		this._persistBound = false
		this._onVisibilityPersist = () => {
			if (document.visibilityState === "hidden") this._persistRun()
		}
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
		this._ensureLifeIcons()
		this._ensureLevelLabel()
		this.antLives = prog.lives != null ? prog.lives : ANT_LIVES
		this._refreshLifeIcons()
		this._spawnPit(this.levelIndex, prog.seed || undefined, 0, prog)
		this._focusActivePit(false)
		this.resize()
		this._playLogoIntro()
		this.showSettingsButton()
		this._bindPersistOnHide()
	}

	resetProgressAndRestart() {
		const prog = resetProgress()
		this.levelIndex = prog.level
		this.gameOver = false
		this._clearGameOverUi()
		this._clearWorld()
		this._ensureLogo()
		this._ensureLifeIcons()
		this._ensureLevelLabel()
		this.antLives = ANT_LIVES
		this._refreshLifeIcons()
		this._spawnPit(this.levelIndex, prog.seed, 0, null)
		this._focusActivePit(false)
		this.resize()
		this._playLogoIntro()
	}

	_bindPersistOnHide() {
		if (this._persistBound) return
		this._persistBound = true
		document.addEventListener("visibilitychange", this._onVisibilityPersist)
		window.addEventListener("pagehide", this._onVisibilityPersist)
	}

	_persistRun() {
		const pit = this.activePit
		if (!pit?.session || this.gameOver) return
		// Never snapshot mid-slither — a reload would drop the moving snake.
		if (pit.session.anyMoving()) return
		if (pit.view.anyAnimating?.()) return
		if (!pit.view.dock.isStableForSave()) return
		saveProgress(this.levelIndex, pit.session.seed, {
			lives: this.antLives,
			snakes: pit.session.serializeSnakes(),
			antColors: pit.view.dock.getAntColors(),
			unlockedLanes: pit.view.dock.getUnlockedLaneCount(),
			parked: pit.view.dock.getParkedSnapshot(),
		})
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
		this._layoutLifeIcons()
	}

	_ensureLifeIcons() {
		if (this.lifeIcons) return this.lifeIcons
		const row = new Container()
		row.eventMode = "none"
		row.interactiveChildren = false
		/** @type {Sprite[]} */
		const sprites = []
		for (let i = 0; i < ANT_LIVES; i++) {
			const spr = new Sprite(Texture.from(LIFE_SPRITE))
			spr.anchor.set(0.5)
			spr.eventMode = "none"
			row.addChild(spr)
			sprites.push(spr)
		}
		this.hud.addChild(row)
		this.lifeIcons = row
		this.lifeSprites = sprites
		this._refreshLifeIcons()
		return row
	}

	_resetAntLives() {
		this.antLives = ANT_LIVES
		this._refreshLifeIcons()
		this._persistRun()
	}

	_refreshLifeIcons() {
		const left = Math.max(0, this.antLives | 0)
		for (let i = 0; i < this.lifeSprites.length; i++) {
			this.lifeSprites[i].alpha = i < left ? 1 : LIFE_LOST_ALPHA
		}
		this._refreshLivesRefillBtn()
	}

	_ensureLivesRefillBtn() {
		if (this.livesRefillBtn) return this.livesRefillBtn
		const btn = new Container()
		btn.eventMode = "static"
		btn.cursor = "pointer"
		btn.visible = false
		const icon = new Sprite(Texture.from(watchAdIcon))
		icon.anchor.set(0.5)
		icon.eventMode = "none"
		btn.addChild(icon)
		btn._icon = icon
		btn.on("pointertap", (e) => {
			e.stopPropagation()
			this._openLivesRefillDialog()
		})
		this.hud.addChild(btn)
		this.livesRefillBtn = btn
		return btn
	}

	_refreshLivesRefillBtn() {
		const btn = this._ensureLivesRefillBtn()
		const show = !this.gameOver && shouldShowLivesRefill(this.antLives)
		btn.visible = show
		if (show) adManager.loadRewarded?.(() => {})
		this._layoutLifeIcons()
	}

	_openLivesRefillDialog() {
		if (this.gameOver || this._livesRefillBusy || this._livesRefillDialog) return
		if (!shouldShowLivesRefill(this.antLives)) return
		this.closeSettings()
		const ui = this.hooks.getUi?.()
		if (!ui?.displayDialog) {
			this._playLivesRefillAd()
			return
		}
		this._livesRefillDialog = ui.displayDialog("refillLives", {}, (res, dialog) => {
			if (dialog?.isClosing || dialog?.isClosed) {
				if (this._livesRefillDialog === dialog) this._livesRefillDialog = null
			}
			if (res === "watchad") this._playLivesRefillAd()
		})
	}

	_playLivesRefillAd() {
		if (this.gameOver || this._livesRefillBusy) return
		if (!shouldShowLivesRefill(this.antLives)) return
		this._livesRefillBusy = true
		adManager.showRewarded((ok) => {
			this._livesRefillBusy = false
			if (!ok) return
			this.antLives = Math.min(ANT_LIVES, (this.antLives | 0) + livesRefillAmount())
			this._refreshLifeIcons()
			this._persistRun()
		})
	}

	_layoutLifeIcons() {
		this._ensureLifeIcons()
		const logo = this.logo
		const spr = this.lifeSprites[0]
		if (!spr) return
		const naturalW = Math.max(1, spr.texture?.width || 33)
		const naturalH = Math.max(1, spr.texture?.height || 29)
		const scale = Math.min(1.35, Math.max(0.85, (this._layoutMetrics().w / 520) * 1.1))
		const gap = naturalW * scale + 8
		const n = this.lifeSprites.length
		const livesLeft = Math.max(0, this.antLives | 0)
		const showRefill = !this.gameOver && shouldShowLivesRefill(this.antLives)
		const btn = this._ensureLivesRefillBtn()
		btn.visible = showRefill
		const totalW = (n - 1) * gap
		const cx = logo?.x ?? this._layoutMetrics().w / 2
		const logoBottom = logo
			? logo.y + ((logo.layoutHeight || 150) * (logo.scale?.y || 1)) / 2
			: this._logoLayout(true).bottom
		const y = logoBottom + 10 + (naturalH * scale) / 2
		const left = cx - totalW / 2
		for (let i = 0; i < n; i++) {
			const s = this.lifeSprites[i]
			s.scale.set(scale)
			s.position.set(left + i * gap, y)
		}
		if (showRefill) {
			// Sit over the first ghosted life — keep the SVG square (no stretch).
			const firstGhost = Math.min(livesLeft, n - 1)
			const coverH = naturalH * scale * 1.15
			const iconTexW = Math.max(1, btn._icon?.texture?.width || 200)
			const iconTexH = Math.max(1, btn._icon?.texture?.height || 200)
			const iconScale = coverH / iconTexH
			btn._icon.scale.set(iconScale)
			const iconW = iconTexW * iconScale
			const iconH = iconTexH * iconScale
			// Sit above the ghosted lives so they stay visible underneath.
			btn.position.set(left + firstGhost * gap, y - iconH * 0.55)
			const hitPad = 6
			btn.hitArea = new Rectangle(
				-iconW / 2 - hitPad,
				-iconH / 2 - hitPad,
				iconW + hitPad * 2,
				iconH + hitPad * 2,
			)
		}
	}

	_playLogoIntro() {
		const logo = this._ensureLogo()
		sfx.play("logo")
		this._ensureLifeIcons()
		if (!logo) {
			this._layoutLifeIcons()
			return
		}
		const from = this._logoLayout(false)
		const to = this._logoLayout(true)
		this.logoSettled = false
		this.logoIntroPlaying = true
		logo.alpha = 1
		logo.position.set(from.x, from.y)
		logo.scale.set(from.scale)
		this._layoutLifeIcons()
		const proxy = { t: 0 }
		newTween(proxy, { t: 1 }, 0.95)
			.ease(Easing.outCubic)
			.onUpdate(() => {
				const t = proxy.t
				logo.scale.set(from.scale + (to.scale - from.scale) * t)
				logo.x = from.x + (to.x - from.x) * t
				logo.y = from.y + (to.y - from.y) * t
				this._layoutLifeIcons()
			})
			.onDone(() => {
				logo.scale.set(to.scale)
				logo.position.set(to.x, to.y)
				this.logoSettled = true
				this.logoIntroPlaying = false
				this._layoutLifeIcons()
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

	_spawnPit(level, seed, worldY, saved = null) {
		const session = new LevelSession({ level, seed })
		if (saved?.snakes) session.applySnakeState(saved.snakes)
		const view = new BoardView({
			getTube: () => window.alltubes?.tiles,
			getUi: () => this.hooks.getUi?.(),
			level,
			onSnakeClick: (id) => this._onSnakeClick(id),
			onAntDied: () => this._onAntDied(),
			onAntGameOver: () => this._triggerGameOver(this.activePit),
			onDockStateChange: () => this._persistRun(),
			onInteract: () => this.closeSettings(),
		})
		view.setSession(session, saved)
		const bounds = view.boardPixelSize()
		view.position.set(-bounds.cx, worldY - bounds.cy)
		this.world.addChild(view)
		const pit = { view, session, level, worldY }
		this.pitStack.push(pit)
		this.activePit = pit
		this._updateLevelLabel()
		this.resize()
		this._persistRun()
		// Restored clears (board empty, leftover lane snakes) never went through
		// escape → advance; kick that path so auto-exit can finish the level.
		if (session.isWon()) void this._maybeAdvanceAfterClear(pit)
		if (level === 1) this._beginFtue()
		else this._clearFtue()
		return pit
	}

	_ensureLevelLabel() {
		if (this.levelLabel) return this.levelLabel
		const label = new Text({
			text: String(this.levelIndex || 1),
			style: new TextStyle({
				fontFamily: "Chewy, Helvetica, Arial, sans",
				fontSize: 64,
				fontWeight: "800",
				fill: 0xf2ffe0,
				stroke: { color: "#336633", width: 7, join: "round" },
			}),
		})
		label.anchor.set(0, 0)
		label.eventMode = "none"
		this.hud.addChild(label)
		this.levelLabel = label
		this._layoutLevelLabel()
		return label
	}

	_updateLevelLabel() {
		const label = this._ensureLevelLabel()
		label.text = String(this.levelIndex || 1)
		this._layoutLevelLabel()
	}

	_layoutLevelLabel() {
		const label = this.levelLabel
		if (!label) return
		label.position.set(22, 18)
	}

	_clearFtue() {
		const finger = this._ftueFinger
		this._ftueFinger = null
		this._ftueTargetId = null
		finger?.stop?.()
		finger?.parent?.removeChild(finger)
	}

	_beginFtue() {
		this._clearFtue()
		this._ftueHintedIds = []
		this._showFtueFinger()
	}

	/** Snakes that can exit now, in solution order (latest-placed / highest id first). */
	_ftueCandidates() {
		const session = this.activePit?.session
		const live = session?.snakes
		if (!live?.length) return []
		const hinted = new Set(this._ftueHintedIds)
		const snakes = live.map((s) =>
			hinted.has(s.id) || s.escaped
				? { ...s, escaped: true, cells: [] }
				: s,
		)
		return snakes
			.filter(
				(s) =>
					!s.escaped &&
					s.cells?.length &&
					canEscape(s, snakes, session.board, session.rocks),
			)
			.sort((a, b) => b.id - a.id)
	}

	_showFtueFinger() {
		if (this.levelIndex !== 1 || this.gameOver) {
			this._clearFtue()
			return
		}
		if (this._ftueHintedIds.length >= 2) {
			this._clearFtue()
			return
		}
		const view = this.activePit?.view
		const target = this._ftueCandidates()[0]
		if (!view || !target) {
			this._clearFtue()
			return
		}
		const tube = window.alltubes?.tiles
		let finger = this._ftueFinger
		if (!finger || finger.parent !== view.fxLayer) {
			finger?.parent?.removeChild(finger)
			finger = tube?.getMovieClip?.("ftuefingertapmc")
			if (!finger) return
			finger.eventMode = "none"
			finger.interactiveChildren = false
			finger.scale.set(0.9)
			view.fxLayer.addChild(finger)
			this._ftueFinger = finger
		}
		this._ftueTargetId = target.id
		finger.visible = true
		finger.alpha = 1
		finger.looping = true
		if (finger.framelabels?.loop != null) finger.playLabel("loop")
		else finger.play?.()
		this._layoutFtueFinger()
	}

	_layoutFtueFinger() {
		const finger = this._ftueFinger
		const id = this._ftueTargetId
		const view = this.activePit?.view
		if (!finger || id == null || !view) return
		const head = view.snakeHeadLocal(id)
		if (!head) {
			finger.visible = false
			return
		}
		finger.visible = true
		finger.position.set(head.x, head.y)
	}

	_onFtueSnakeTapped(snakeId) {
		if (this._ftueTargetId == null || snakeId !== this._ftueTargetId) return
		this._ftueHintedIds.push(snakeId)
		if (this._ftueHintedIds.length >= 2) {
			this._clearFtue()
			return
		}
		this._showFtueFinger()
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
			const livesH = 40
			top = Math.max(topHud, logoBottom + livesH + 12)
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
			newTween(proxy, { t: 1 }, 0.85 * durationScaleForLevel(this.levelIndex))
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
		this.closeSettings()
		this._onFtueSnakeTapped(snakeId)

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
			// Save only after dock parks (onDockStateChange); skip mid-slither.
			this._persistRun()
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
		this._persistRun()
	}

	/** @returns {boolean} true when the last ant life is spent */
	_onAntDied() {
		if (this.gameOver) return false
		if (this.antLives <= 0) return true
		this.antLives--
		this._refreshLifeIcons()
		this._persistRun()
		return this.antLives <= 0
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
		saveProgress(this.levelIndex, pit?.session?.seed, null)
		if (this._livesRefillDialog) {
			const ui = this.hooks.getUi?.()
			const open = this._livesRefillDialog
			this._livesRefillDialog = null
			ui?.closeDialog?.(open)
		}
		this._refreshLivesRefillBtn()
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
		this.antLives = ANT_LIVES
		this._refreshLifeIcons()
		this._clearGameOverUi()
		this._clearWorld()
		saveProgress(restartLevel, seed, null)
		this._spawnPit(restartLevel, seed, 0, null)
		this._focusActivePit(false)
		this.resize()
	}

	/** Debug: force the anteater to eat every ant currently in the queue. */
	debugTriggerAnteater() {
		const dock = this.activePit?.view?.dock
		if (!dock || this.gameOver) return
		if (!dock.hasLeftoverAnts()) {
			console.log("Anteater: no ants in queue")
			return
		}
		void dock.playAnteater(this.hud)
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
		for (const pit of this.pitStack) pit.view?.tickGrass?.()
		this._layoutFtueFinger()
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
		} else {
			this._layoutLifeIcons()
		}
		this._layoutRestartButton()
		this._layoutLevelLabel()
	}
}
