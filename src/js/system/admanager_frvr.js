import { AdManager } from "./admanager.js";
import { GameEvents } from "./gameevents.js";

export class AdManagerFRVR extends AdManager {
	skipAllAds = false
	
	constructor() {
		super()
	}

	showRewarded(onDone) {
		if (this.skipAllAds) {
			onDone(true)
			return
		}
		GameEvents.raise(GameEvents.events.AD_STARTED, {})
		FRVR.ads.show(FRVR.ads.AdType.REWARD).then(
			function(result) {
				const completed = result === FRVR.ads.AdShowResult.COMPLETED
				GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: completed })
				if (result === FRVR.ads.AdShowResult.COMPLETED) {
					onDone(true)
				} else if (result === FRVR.ads.AdShowResult.SKIPPED) {
					onDone(false)
				} else if (result === FRVR.ads.AdShowResult.NOT_DISPLAYED) {
					onDone(false)
				}
			},
		).catch(function () {
			GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: false })
			onDone(false)
		})
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
			onDone(true)
			return
		}

		GameEvents.raise(GameEvents.events.AD_STARTED, {})
		FRVR.ads.show(FRVR.ads.AdType.INTERSTITIAL).then(
			function (result) {
				const completed = result === FRVR.ads.AdShowResult.COMPLETED
				GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: completed })
				if (result === FRVR.ads.AdShowResult.COMPLETED) {
					onDone(true)
				} else if (result === FRVR.ads.AdShowResult.SKIPPED) {
					onDone(false)
				} else if (result === FRVR.ads.AdShowResult.NOT_DISPLAYED) {
					onDone(false)
				}
			},
		).catch(function () {
			GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: false })
			onDone(false)
		})
	}

}