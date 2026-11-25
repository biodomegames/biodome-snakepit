import { AdManager } from "./admanager.js";
import { GameEvents } from "./gameevents.js";

export class AdManagerFRVR extends AdManager {
	skipAllAds = false
	
	constructor() {
		super()
	}

	showRewarded(onDone) {
		if (this.skipAllAds) {
			onDone && onDone(true)
			return
		}
		this._showFullscreen("REWARD", onDone, "rewarded")
	}

	/**
	 * Show an FRVR ad and call `onDone(ok)` exactly once, whatever happens.
	 * Only COMPLETED counts as success. SKIPPED, NOT_DISPLAYED, any other or
	 * unknown result, a rejected promise, or a throw from show() all report
	 * false, so callers can clear their busy flag and re-enable the button.
	 */
	_showFullscreen(typeKey, onDone, what) {
		let done = false
		const finish = (ok, why) => {
			if (done) return
			done = true
			//<debug>
			console.log("AD: FRVR " + what + " finished", ok, why)
			//</debug>
			GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: ok })
			onDone && onDone(ok)
		}
		GameEvents.raise(GameEvents.events.AD_STARTED, {})
		try {
			// Inside the try: a missing SDK throws here and still reports false.
			Promise.resolve(FRVR.ads.show(FRVR.ads.AdType[typeKey])).then(
				(result) => finish(result === FRVR.ads.AdShowResult?.COMPLETED, result),
				(err) => finish(false, err),
			)
		} catch (err) {
			finish(false, err)
		}
	}

	async showInterstitialBetweenLevels(onContinue) {
		await this.whenInitialized
		if (this.skipAllAds) {
			onContinue && onContinue()
			return
		}
		this.showInterstitial(() => onContinue && onContinue())
	}

	showInterstitial(onDone) {
		if (this.skipAllAds) {
			onDone && onDone(true)
			return
		}
		this._showFullscreen("INTERSTITIAL", onDone, "interstitial")
	}

}