
import { Config } from "../config.js"

export class AdManager {
	constructor() {
		/** Resolves when {@link #initialize} has finished (success or failure). Subclasses may replace. */
		this.whenInitialized = Promise.resolve()
		/**
		 * Levels cleared since the last rewarded completion or between-level interstitial attempt.
		 * Used by {@link #maybeInterstitialOnNewPit}.
		 */
		this.levelsSinceFullscreenAd = 0
	}

	/** Rewarded finished successfully — skip the next interstitial streak. */
	noteRewardedCompleted() {
		this.levelsSinceFullscreenAd = 0
	}

	/**
	 * Call when the player arrives at a new pit after clearing one.
	 * Shows an interstitial every {@link Config.interstitialAfterEveryNthLevel} clears
	 * unless a rewarded ad reset the counter sooner.
	 */
	async maybeInterstitialOnNewPit(onContinue) {
		const n = Number(Config.interstitialAfterEveryNthLevel)
		const every = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
		this.levelsSinceFullscreenAd++
		if (!every || this.levelsSinceFullscreenAd < every) {
			onContinue && onContinue()
			return
		}
		await this.showInterstitialBetweenLevels(() => {
			this.levelsSinceFullscreenAd = 0
			onContinue && onContinue()
		})
	}
	setUI(ui) {
		this.ui = ui
	}
	async initialize(onDone) {
		//<debug>
		console.log("Initializing ad manager")
		//</debug>
		onDone && onDone()
	}
	loadRewarded(onDone) {
		if (this.skipAllAds) {
			onDone && onDone()
			return
		}
		console.log("Loading rewarded ad")
		onDone(true)
	}
	showRewarded(onDone) {
		if (this.skipAllAds) {
			onDone && onDone(true)
			return
		}
		console.log("Showing rewarded ad")
		onDone(true)
	}
	loadInterstitial(onDone) {
		if (this.skipAllAds) {
			onDone && onDone()
			return
		}
		console.log("Loading interstitial ad")
		onDone(true)
	}
	showInterstitial(onDone) {
		if (this.skipAllAds) {
			onDone && onDone()
			return
		}
		console.log("Showing interstitial ad")
		onDone(true)
	}

	/** Full-screen interstitial between levels; continues when the ad ends or cannot be shown. */
	async showInterstitialBetweenLevels(onContinue) {
		await this.whenInitialized
		if (this.skipAllAds) {
			onContinue && onContinue()
			return
		}
		onContinue && onContinue()
	}
	set skipAllAds(value) {
		this._skipAllAds = value
	}
	get skipAllAds() {
		return this._skipAllAds
	}
	set mockAdSystem(value) {
		this._mockAdSystem = value
	}
	get mockAdSystem() {
		return this._mockAdSystem
	}
}



