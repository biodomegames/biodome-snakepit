import { GameEvents } from "./gameevents.js"

/**
 * Debug-only stand-in for real ads: shows a centered "INTERSTITIAL" / "REWARDED AD"
 * dialog with an OK button wherever an ad would be shown, and continues when OK is pressed.
 * Installed from ads.js inside a //<debug> block, so production builds never include it.
 */
export function installDebugAdStandIn(manager) {
	const show = (label, onOk, onCancel) => {
		GameEvents.raise(GameEvents.events.AD_STARTED, { standIn: label })
		showStandInDialog(
			label,
			() => {
				GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: true, standIn: label })
				onOk()
			},
			onCancel &&
				(() => {
					GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: false, standIn: label })
					onCancel()
				}),
		)
	}

	// skipAllAds: options-menu toggle. suppressAds: set while the video recorder is armed.
	const skip = () => manager.skipAllAds || manager.suppressAds

	manager.loadRewarded = (onDone) => onDone && onDone(true)
	manager.loadInterstitial = (onDone) => onDone && onDone(true)

	manager.showRewarded = (onDone) => {
		if (skip()) return onDone && onDone(true)
		// Cancel = player closed the ad before the reward, like a real rewarded ad.
		show(
			"REWARDED AD",
			() => onDone && onDone(true),
			() => onDone && onDone(false),
		)
	}

	manager.showInterstitial = (onDone) => {
		if (skip()) return onDone && onDone(true)
		show("INTERSTITIAL", () => onDone && onDone(true))
	}

	manager.showInterstitialBetweenLevels = async (onContinue) => {
		await manager.whenInitialized
		if (!onContinue) return
		if (skip()) return onContinue()
		show("INTERSTITIAL", onContinue)
	}
}

function showStandInDialog(label, onOk, onCancel) {
	const backdrop = document.createElement("div")
	backdrop.style.cssText = [
		"position:fixed",
		"inset:0",
		"z-index:100000",
		"display:flex",
		"align-items:center",
		"justify-content:center",
		"background:rgba(0,0,0,0.6)",
		"touch-action:none",
	].join(";")

	const panel = document.createElement("div")
	panel.style.cssText = [
		"min-width:220px",
		"max-width:calc(100vw - 32px)",
		"padding:24px 28px",
		"border-radius:12px",
		"background:#1f252d",
		"border:2px solid #4a5563",
		"color:#fff",
		"font:bold 22px/1.3 system-ui,-apple-system,sans-serif",
		"text-align:center",
		"box-shadow:0 8px 32px rgba(0,0,0,0.5)",
	].join(";")

	const title = document.createElement("div")
	title.textContent = label
	title.style.cssText = "letter-spacing:1px;margin-bottom:6px"

	const note = document.createElement("div")
	note.textContent = "debug stand-in"
	note.style.cssText = "font-size:13px;font-weight:normal;opacity:0.6;margin-bottom:20px"

	const ok = document.createElement("button")
	ok.type = "button"
	ok.textContent = "OK"
	ok.style.cssText = [
		"min-width:120px",
		"padding:10px 20px",
		"border:0",
		"border-radius:8px",
		"background:#ffc56b",
		"color:#1a1e24",
		"font:bold 18px system-ui,-apple-system,sans-serif",
		"cursor:pointer",
	].join(";")

	// Keep presses from reaching the game canvas underneath.
	const swallow = (e) => e.stopPropagation()
	for (const type of ["pointerdown", "pointerup", "pointermove", "touchstart", "touchend", "click"]) {
		backdrop.addEventListener(type, swallow)
	}

	let closed = false
	const finish = (cb) => {
		if (closed) return
		closed = true
		backdrop.remove()
		cb()
	}
	ok.addEventListener("click", () => finish(onOk))

	panel.append(title, note, ok)
	if (onCancel) {
		const cancel = document.createElement("button")
		cancel.type = "button"
		cancel.textContent = "Cancel"
		cancel.style.cssText = ok.style.cssText + ";margin-left:12px;background:#4a5563;color:#fff"
		cancel.addEventListener("click", () => finish(onCancel))
		panel.append(cancel)
	}
	backdrop.append(panel)
	document.body.append(backdrop)
	ok.focus()
}
