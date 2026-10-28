import { DisplayHTML } from "./utils/displayhtml.js"
import { DialogController } from "./dome/dialogcontroller"
import { setSfxMuted } from "./soundlibrary.js"

export class DialogSettings extends DialogController {
	displayHTML = null

	constructor(dialog) {
		super(dialog)
		this.dialog = dialog
		// Apply initial visuals after dialog items exist (constructor runs post-init).
		this.refreshDialogState()
	}

	setGameObjects(objects) {
		super.setGameObjects(objects)
		this.game = objects.game
		if (objects.musman) this.musman = objects.musman
		if (objects.defaultSound != null) this.defaultSound = objects.defaultSound
		if (objects.defaultMusic != null) this.defaultMusic = objects.defaultMusic
		this.refreshDialogState()
	}

	refreshDialogState() {
		const soundOn = window.bdata.get("Sound", this.defaultSound ?? true)
		const musicOn = window.bdata.get("Music", this.defaultMusic ?? false)
		if (this.dialog.checkboxSound) this.dialog.checkboxSound.checked = soundOn
		if (this.dialog.checkboxMusic) this.dialog.checkboxMusic.checked = musicOn
		// Legacy image checkboxes (settingsLegacy)
		if (this.dialog.checkbox1) this.dialog.checkbox1.checked = soundOn
		if (this.dialog.checkbox2) this.dialog.checkbox2.checked = musicOn
		if (this.dialog.checkbox3) this.dialog.checkbox3.checked = window.bdata.get("Hint", true)
	}

	buttonPress(result, button) {
		const mus = this.musman ?? this.game?.musman
		switch (result) {
			case "soundon":
				window.bdata.set("Sound", true)
				setSfxMuted(false)
				break
			case "musicon":
				window.bdata.set("Music", true)
				if (mus) {
					if (!mus.curMusic) mus.createMusic()
					mus.mute = false
				}
				break
			case "hinton":
				window.bdata.set("Hint", true)
				break
			case "soundoff":
				window.bdata.set("Sound", false)
				setSfxMuted(true)
				break
			case "musicoff":
				window.bdata.set("Music", false)
				if (mus) mus.mute = true
				break
			case "hintoff":
				window.bdata.set("Hint", false)
				break
			case "terms":
				this.doDisplayHTML(
					"https://biodomegames.com/privacypolicy/",
					"web/privacy/index.html"
				)
				break
			case "info":
				this.doDisplayHTML(
					"https://biodomegames.com/wordysnaps/index2.html",
					"web/moreinfo/index.html"
				)
				break
		}
		return result
	}

	onClose() {
		super.onClose()
	}

	doDisplayHTML(liveurl, fallbackurl) {
		const tryShow = async () => {
			console.log("DialogSettings.doDisplayHTML start", {
				liveurl,
				fallbackurl,
				online: typeof navigator !== "undefined" ? navigator.onLine : "unknown",
			})
			let useUrl = fallbackurl
			let rebase = false

			const isOnline = typeof navigator !== "undefined" ? !!navigator.onLine : true
			if (isOnline) {
				try {
					console.log("DialogSettings.doDisplayHTML trying live fetch", liveurl)
					const controller =
						typeof AbortController !== "undefined" ? new AbortController() : null
					const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null
					const response = await fetch(liveurl, {
						method: "GET",
						cache: "no-cache",
						signal: controller ? controller.signal : undefined,
					})
					if (timeoutId) clearTimeout(timeoutId)
					if (response && response.ok) {
						console.log("DialogSettings.doDisplayHTML live fetch OK", {
							status: response.status,
						})
						useUrl = liveurl
						rebase = true
					} else {
						console.error(
							"DialogSettings.doDisplayHTML live fetch NOT OK - using fallback",
							{
								status: response && response.status,
								statusText: response && response.statusText,
							}
						)
					}
				} catch (e) {
					const isCordova =
						(typeof window !== "undefined" && window.cordova) ||
						(typeof location !== "undefined" &&
							(location.protocol === "app:" || location.protocol === "file:"))
					const isCORSError =
						e.message &&
						(e.message.includes("CORS") ||
							e.message.includes("Access-Control") ||
							e.message.includes("Load failed"))

					if (isCORSError && isCordova) {
						console.warn(
							"DialogSettings.doDisplayHTML CORS blocked in Cordova (expected) - using local fallback",
							{
								error: e.message,
								origin: typeof location !== "undefined" ? location.origin : "unknown",
							}
						)
					} else {
						console.error(
							"DialogSettings.doDisplayHTML live URL fetch FAILED - using fallback",
							e
						)
					}
					rebase = false
				}
			} else {
				console.warn("DialogSettings.doDisplayHTML offline - using fallback", {
					fallbackurl,
				})
			}

			console.log("DialogSettings.doDisplayHTML showing", {
				useUrl,
				rebase,
				envHost: typeof location !== "undefined" ? location.hostname : "unknown",
			})
			this.displayHTML = new DisplayHTML()
			this.displayHTML.show(useUrl, rebase)
		}
		tryShow()
	}
}
