import { Howler } from "howler"
import { Container } from "pixi.js"
import { Game } from "./game.js"
import { UI } from "./dome/ui.js"
import { DialogDefinitions } from "./data_ui_dialogs.js"
import { UIComponentDefinitions } from "./data_ui_components.js"
//<debug>
import { UIDebug } from "./dome/uidebug.js"
import { captureConfiguredScreenshots } from "./utils/screenshot.js"
import { showDialogDebug } from "./dome/ui_debuglist.js"
//</debug>
import { Config } from "./config.js"
import { DEBUG } from "./debug.js"
import { FPSDisplay } from "./dome/fpsdisplay.js"
import { DebugConsole } from "./dome/debugconsole.js"
import { Changelog } from "./system/changelog.js"
import { optionsMenu } from "./mainclass.js"
import { NewVersion } from "./system/newversion.js"
import { MusicManager, getMusicAssetsForPreload } from "./music.js"
import { setSfxMuted } from "./soundlibrary.js"
import { adManager } from "./system/ads.js"

const productionmode = import.meta.env.MODE

/**
 * Stage root: UI, audio, options, and the experiment in {@link Game}.
 */
export class GameShell extends Container {
	app = undefined
	ui = undefined
	bdata = undefined
	gameplay = undefined
	musman = undefined
	hasCompletedLoad = false

	constructor(app, uiContainer, uiContainerBg, uiContainerFG, uiContainerBehindDefault, main) {
		super()
		this.bdata = window.bdata
		this.main = main
		this.app = app

		this.ui = new UI(this.app, DialogDefinitions, UIComponentDefinitions, uiContainer, uiContainerBg, uiContainerFG, uiContainerBehindDefault)
		this._stubInventory()
		this.ui.inventoryInquiryFunction = (itemid) => this.inventory.getItem(itemid)
		this.ui.inventorySaveFunction = () => {}
		this.ui.tilePositionInquiryFunction = () => ({ x: 0, y: 0 })

		this.gameplay = new Game(app, {
			getUi: () => this.ui,
			getMusman: () => this.musman,
			getShell: () => this,
		})
		this.addChild(this.gameplay)

		//<debug>
		this.uiDebug = new UIDebug(this, this.ui)
		//</debug>
		this.changeLog = new Changelog()
		this.newversion = new NewVersion()

		//<debug>
		if (!this._screenshotHotkeyBound) {
			this._screenshotHotkeyBound = true
			window.addEventListener("keydown", (ev) => {
				if (window.inputInFocus) return
				if ((ev.key === "S" || ev.key === "s") && ev.shiftKey) {
					captureConfiguredScreenshots(this.app, this.app.stage, this, this.main)
						.then(() => console.log("Batch screenshots saved"))
						.catch((e) => console.error("Batch screenshots failed", e))
				} else if (ev.key == "d") {
					showDialogDebug(this)
				} else if (ev.key == "u" || (ev.key == "U" && ev.shiftKey)) {
					this.ui.dumpActiveDialogNames()
				} else if (ev.key == "o") {
					this.main.slowMotionToggle()
				} else if (ev.key == "p") {
					this.main.frameDelayToggle()
				}
			})
		}
		//</debug>
	}

	_stubInventory() {
		const empty = { count: 0 }
		this.inventory = {
			getItem: () => ({ ...empty }),
			getItemCount: () => 0,
			addItem: () => {},
			removeItem: () => {},
			setItemCount: () => {},
			flush: () => {},
			load: () => {},
		}
	}

	defaultMusic = false
	defaultSound = true

	refreshMuteStates() {
		setSfxMuted(!this.bdata.get("Sound", this.defaultSound))
		if (this.musman) this.musman.mute = !this.bdata.get("Music", this.defaultMusic)
	}

	_ensureMusicManager() {
		if (!Config.useMusic) return
		if (!this.musman) this.musman = new MusicManager()
		this.musman.mute = !this.bdata.get("Music", this.defaultMusic)
		if (this.bdata.get("Music", this.defaultMusic) && !this.musman.curMusic) {
			this.musman.createMusic()
		}
	}

	init() {
		const self = this
		if (typeof FRVR !== "undefined" && FRVR.lifecycle) {
			FRVR.lifecycle.onGamePause = function () {
				self.main.isUserPaused = true
			}
			FRVR.lifecycle.onSuspend = function () {
				self.main.isUserPaused = true
			}
			FRVR.lifecycle.onResume = function () {
				self.main.isUserPaused = false
			}
			FRVR.lifecycle.onAudioSuspend = function () {
				Howler.mute(true)
			}
			FRVR.lifecycle.onAudioResume = function () {
				Howler.mute(false)
				self.refreshMuteStates()
			}
		}

		this._ensureMusicManager()
		this.refreshMuteStates()
		this.gameplay?.start?.()
	}

	getAssetsForPreload() {
		const assets = this.ui.getAssetsForPreload()
		const tubes = DialogDefinitions.TubeDefinitions
		for (const key in tubes) {
			const td = tubes[key]
			if (td && td.xml && td.json && assets.indexOf(td) === -1) assets.push(td)
		}
		for (const url of getMusicAssetsForPreload()) assets.push(url)
		return assets
	}

	initOptionsMenu() {
		if (!Config.optionsMenuAvailable || !optionsMenu) return

		optionsMenu.addLabelToOptionsMenu("Game version: " + Config.getVersionString())
		optionsMenu.addLabelToOptionsMenu("Platform: " + this.main.platform)
		let pmode = productionmode
		//<debug>
		pmode = "DEV"
		//</debug>
		optionsMenu.addLabelToOptionsMenu("Build: " + pmode)

		optionsMenu.addButtonToOptionsMenu("Changelog", () => {
			this.changeLog.show(true)
		})
		optionsMenu.addButtonToOptionsMenu("New version", () => {
			this.newversion.show(true)
		})
		optionsMenu.addButtonToOptionsMenu("Device info", () => {
			this.showDeviceInfo()
		})
		optionsMenu.addButtonToOptionsMenu("Test interstitial", () => {
			adManager.loadInterstitial(() => {
				adManager.showInterstitial(() => {})
			})
		})

		adManager.skipAllAds = this.bdata.get("skipAllAds", false)
		optionsMenu.addToggleToOptionsMenu("Skip all ads (debug)", this.bdata.get("skipAllAds", false), (res) => {
			adManager.skipAllAds = res
			this.bdata.set("skipAllAds", res)
		}, () => this.bdata.get("skipAllAds", false))

		optionsMenu.addToggleToOptionsMenu("Sound", this.bdata.get("Sound", this.defaultSound), (res) => {
			this.bdata.set("Sound", res)
			setSfxMuted(!res)
		}, () => this.bdata.get("Sound", this.defaultSound))

		optionsMenu.addToggleToOptionsMenu("Music", this.bdata.get("Music", this.defaultMusic), (res) => {
			this.bdata.set("Music", res)
			if (this.musman) {
				if (res && !this.musman.curMusic) this.musman.createMusic()
				this.musman.mute = !res
			}
		}, () => this.bdata.get("Music", this.defaultMusic))

		optionsMenu.addToggleToOptionsMenu("FPS", this.bdata.get("FPS", false), (res) => {
			if (res) {
				this.fpsDisplay = new FPSDisplay(this.app)
				this.fpsDisplay.extendedMode = this.bdata.get("fpsextended", false)
				this.fpsDisplay.updateExtendedModeVisibility()
			} else if (this.fpsDisplay) {
				this.fpsDisplay.destroy()
				this.fpsDisplay = undefined
			}
			this.bdata.set("FPS", res)
		}, () => this.bdata.get("FPS", false))

		optionsMenu.addToggleToOptionsMenu("Debug Console", this.bdata.get("debugConsole", false), (res) => {
			if (res) {
				if (!this.main.debugConsole) this.main.debugConsole = new DebugConsole()
			} else if (this.main.debugConsole) {
				this.main.debugConsole.destroy()
				this.main.debugConsole = undefined
			}
			this.bdata.set("debugConsole", res)
		}, () => this.bdata.get("debugConsole", false))

		optionsMenu.addButtonToOptionsMenu("Reset progress", () => {
			if (this.gameplay?.resetProgressAndRestart) {
				this.gameplay.resetProgressAndRestart()
			}
		})

		optionsMenu.addButtonToOptionsMenu("Hide options menu", () => {
			optionsMenu.hideSideMenuButton()
		})
	}

	onBiodataDiscarded() {}

	onBiodataArrived() {
		this.refreshMuteStates()
		adManager.skipAllAds = this.bdata.get("skipAllAds", false)
	}

	showDeviceInfo() {
		if (this.deviceinfo == undefined) {
			this.deviceinfo = this.ui.displayDialog("deviceInfo", {}, () => {
				this.deviceinfo = undefined
			})
		}
		const dpi = 120
		this.deviceinfo.dpr0.text = "Guessed dpi: " + dpi
		this.deviceinfo.dpr1.text = "Device Pixel Ratio: " + window.devicePixelRatio + " res:" + this.app.renderer.resolution
		this.deviceinfo.dpr2.text = "Screen " + window.screen.width + " x " + window.screen.height
		const w = Math.floor((window.screen.width / dpi) * 2.54 * 10) / 10
		const h = Math.floor((window.screen.height / dpi) * 2.54 * 10) / 10
		this.deviceinfo.dpr3.text = w + "cm x " + h + " cm"
		this.deviceinfo.dpr4.text = "App: " + this.app.renderer.width + " x " + this.app.renderer.height
		const container = document.getElementById("gameContainer")
		this.deviceinfo.dpr5.text = "Container: " + (container ? container.clientWidth : 0) + " x " + (container ? container.clientHeight : 0)
		const rect = container ? container.getBoundingClientRect() : { width: 0, height: 0 }
		this.deviceinfo.dpr6.text = "Bounding: " + rect.width + " x " + rect.height
		this.deviceinfo.dpr7.text = "cordova: " + window.cordova
	}

	tick(deltatime, isPaused) {
		if (isPaused) {
			this.ui.tick(deltatime, true)
			return
		}
		DEBUG.tick(deltatime)
		this.ui.tick(deltatime)
		if (this.gameplay) this.gameplay.tick(deltatime)
		if (this.fpsDisplay) this.fpsDisplay.update()
	}

	resize() {
		this.ui.resize()
		if (this.gameplay) this.gameplay.resize()
		if (this.deviceinfo != undefined) this.showDeviceInfo()
	}
}
