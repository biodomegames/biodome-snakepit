


export class AdManager {
	constructor() {
		/** Resolves when {@link #initialize} has finished (success or failure). Subclasses may replace. */
		this.whenInitialized = Promise.resolve()
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



