import { Config } from '../config.js'
import { GameEvents } from './gameevents.js'
//import { promoVideoManager } from '../promovideomanager.js'
import { AdManager } from './admanager.js'

export class AdManagerAdMob extends AdManager {
    constructor() {
		super()
		this.isInitializing = false
        this.isInitialized = false;
        this.bannerAd = null;
        this.interstitialAd = null;
        this.rewardedAd = null;
        this.isLoadingInterstitial = false;
		this.skipAllAds = false
		this.mockAdSystem = false
		this.ui = undefined
		this.rewardedLoadFailCount = 0
		this.maxRewardedLoadFailures = 2 // Switch to promo videos after 3 failed attempts
		/** Between-level interstitial flow: advance game only after close or fallback. */
		this._betweenLevelsActive = false
		/** @type {(() => void) | null} */
		this._betweenLevelsContinue = null
		this._betweenLevelsRaisedAdStart = false
		/** True after load event; false after show() consumes the placement. */
		this._interstitialReady = false
		/** Callbacks waiting for the in-flight interstitial load to finish. */
		this._interstitialLoadWaiters = []
		this._didResolveInitialized = false
		this._resolveInitialized = null
		this.whenInitialized = new Promise((resolve) => {
			this._resolveInitialized = resolve
		})
		/** Last time a fullscreen ad was finished (native interstitial dismiss, rewarded dismiss, or mock promo closed). */
		this._lastFullscreenAdAtMs = 0
    }

	_fullscreenAdCooldownMs() {
		const ms = Number(Config.fullscreenAdCooldownMs)
		if (!Number.isFinite(ms) || ms <= 0) return 0
		return ms
	}

	_isFullscreenAdCooldownActive() {
		const ms = this._fullscreenAdCooldownMs()
		if (ms <= 0) return false
		if (!this._lastFullscreenAdAtMs) return false
		return performance.now() - this._lastFullscreenAdAtMs < ms
	}

	_recordFullscreenAdShown() {
		this._lastFullscreenAdAtMs = performance.now()
	}

	_signalInitialized() {
		if (this._didResolveInitialized) return
		this._didResolveInitialized = true
		if (this._resolveInitialized) {
			this._resolveInitialized()
			this._resolveInitialized = null
		}
	}

	/** Warm-cache the next interstitial so test / between-level show is fast. */
	prefetchInterstitialQuiet() {
		if (this.skipAllAds || this.mockAdSystem || !window.admob || !this.isInitialized) return
		if (!this.interstitialId) return
		this.loadInterstitial(() => {})
	}

    async initialize(ui) {
		await super.initialize(ui)
		this.ui = ui
		if (this.isInitializing) {
			await this.whenInitialized
			return
		}

		this.isInitializing = true

        if (this.isInitialized) {
			this._signalInitialized()
			return
		}
		this.mockAdSystem = Config.useMockAdSystem
		if (!window.admob)
		{
			//<debug>
			console.log("AD: admob not existing")
			//</debug>
			// set up mock ad system with promotional videos
			this.mockAdSystem = true
			// Initialize promo video manager
			
			this.isInitialized = true
			this.isInitializing = false
			this._signalInitialized()
			return
		}
		else
		{
			console.log("AD: admob existing")
		}
		//promoVideoManager.initialize(ui)

		var prefix = ""
		console.log("AD: initialize platform ", dome.platform)
		if (dome.platform == "ios")
		{
			prefix = "IOS_"
		}
		else
		{
			prefix = "ANDROID_"
		}
		if (Config.admobUseTestIds)
		{
			prefix += "test_"
		}
		

		this.interstitialId = Config[prefix + "admobInterstitialId"]
		this.rewardedId = Config[prefix + "admobRewardVideoId"]
		this.bannerId = Config[prefix + "admobBannerId"]
		if (!this.interstitialId) {
			console.warn("AD: Missing Config." + prefix + "admobInterstitialId — interstitial loads will fail.")
		}
		
		console.log("AD: initialize interstitialId ", this.interstitialId)
		console.log("AD: initialize rewardedId ", this.rewardedId)
		console.log("AD: initialize bannerId ", this.bannerId)

		//console.log("AD: initialize AdMob ", window.dome.platform)

        try {
            // Initialize AdMob
            await window.admob.start();
            this.isInitialized = true;
			this.isInitializing = false
            console.log('AD: AdMob initialized successfully');

			// Set up global event listeners
			document.addEventListener('admob.ad.dismiss', () => {
				console.log("AD: ad dismissed")
				this.adDismissed()
			})
			this.loadRewarded()
			this.prefetchInterstitialQuiet()
			this._signalInitialized()
			
        } catch (error) {
            console.error('AD:Failed to initialize admob:', error);
            this.isInitializing = false
			this._signalInitialized()
        }
    }

    cleanupInterstitial() 
	{
       
    }

	createInterstitial()
	{
		if (this.mockAdSystem)
		{
			console.log("AD: createInterstitial mockAdSystem")
			return
		}
		console.log("AD: createInterstitial")
		if (!window.admob)
		{
			//<debug>
			console.log("AD: admob not existing")
			//</debug>
			return
		}
		if (this.interstitial)
		{
			console.log("AD: interstitial already created")
			return
		}
		this.interstitial = new window.admob.InterstitialAd({
			adUnitId: this.interstitialId //

		})
		
		const eventHandlers = {
			load: (evt) => {
				console.log("AD: Interstitial loaded")
				this.isLoadingInterstitial = false
				this._interstitialReady = true
				const waiters = this._interstitialLoadWaiters.splice(0)
				for (const fn of waiters) {
					try {
						fn && fn()
					} catch (e) {
						console.error(e)
					}
				}
				if (this.onLoadDone) {
					try {
						this.onLoadDone()
					} catch (e) {
						console.error(e)
					}
				}
				this.onLoadDone = undefined
			},
			dismiss: (evt) => {
				console.log("AD: Interstitial dismiss")
				this._recordFullscreenAdShown()
				if (this._betweenLevelsActive) {
					this._finishBetweenLevelsAd()
				}
				this._interstitialReady = false
				this.cleanupInterstitial()
				this.prefetchInterstitialQuiet()
			},
			show: (evt) => {
				console.log("AD: Interstitial show")
			},
			showfail: (evt) => {
				console.log("AD: Interstitial showfail")
				if (this._betweenLevelsActive) {
					if (this._betweenLevelsRaisedAdStart) {
						GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: false })
						this._betweenLevelsRaisedAdStart = false
					}
					const cb = this._betweenLevelsContinue
					this._betweenLevelsContinue = null
					this._betweenLevelsActive = false
					cb && cb()
				}
				this._interstitialReady = false
				this.cleanupInterstitial()
				this.prefetchInterstitialQuiet()
			},
			impression: (evt) => {
				console.log("AD: Interstitial impression")
			},
			loadfail: (evt) => {
				console.log("AD: Interstitial loadfail", evt)
				this.isLoadingInterstitial = false
				this._interstitialReady = false
				if (this._betweenLevelsActive) {
					this._interstitialLoadWaiters.length = 0
					this.onLoadDone = undefined
					const cb = this._betweenLevelsContinue
					this._betweenLevelsContinue = null
					this._betweenLevelsActive = false
					cb && cb()
					this.prefetchInterstitialQuiet()
					return
				}
				const retryCb = this.onLoadDone
				this.onLoadDone = undefined
				this.cleanupInterstitial()
				// Retry after a short delay
				setTimeout(() => {
					this.loadInterstitial(retryCb)
				}, 1000)
			}
		}

		// Add event listeners
		Object.entries(eventHandlers).forEach(([event, handler]) => {
			this.interstitial.on(event, handler)
		})
	}

    loadInterstitial(onDone) 
	{
		if (this.skipAllAds) {
			onDone && onDone()
			return
		}
		if (this.mockAdSystem)
		{
			console.log("AD: loadInterstitial mockAdSystem")
			onDone && onDone()
			return
		}
		console.log("AD: loadInterstitial")
		if (!window.admob)
		{
			onDone && onDone()
			return
		}
		if (!this.interstitial)
		{
			this.createInterstitial()
		}
		if (!this.interstitial) {
			console.warn("AD: loadInterstitial — no InterstitialAd (create failed?)")
			onDone && onDone()
			return
		}

		if (this._interstitialReady) {
			onDone && onDone()
			return
		}
		if (this.isLoadingInterstitial) {
			if (onDone) this._interstitialLoadWaiters.push(onDone)
			return
		}

		this.isLoadingInterstitial = true
		// Clean up any existing interstitial
		this.cleanupInterstitial();
		this.onLoadDone = onDone;
		this.interstitial.load()
    }

    showInterstitial(onDone) {
		if (this.skipAllAds) {
			onDone && onDone()
			return
		}
		if (this._isFullscreenAdCooldownActive()) {
			console.log("AD: showInterstitial skipped — fullscreen ad cooldown")
			onDone && onDone()
			return
		}
		if (this.mockAdSystem)
		{
			console.log("AD: showInterstitial mockAdSystem")
			this.showMockInterstitial(onDone)
			return
		}
		if (!this.interstitial) {
			console.log("AD: interstitial not loaded")
			return
		}

		try {
			this._interstitialReady = false
			this.interstitial.show()
			onDone && onDone()
		} catch (error) {
			console.error("Failed to show interstitial:", error)
			this.cleanupInterstitial()
			this.prefetchInterstitialQuiet()
		}
    }

	/**
	 * Full-screen interstitial after level completion; invokes `onContinue` when the ad is dismissed
	 * or when it cannot be loaded/shown (so the next level always loads).
	 */
	async showInterstitialBetweenLevels(onContinue) {
		await this.whenInitialized
		if (!onContinue) return
		if (this.skipAllAds) {
			onContinue()
			return
		}
		if (this._isFullscreenAdCooldownActive()) {
			console.log("AD: between-level interstitial skipped — fullscreen ad cooldown")
			onContinue()
			return
		}
		if (this.mockAdSystem) {
			GameEvents.raise(GameEvents.events.AD_STARTED, {})
			this.showMockInterstitial(() => {
				GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: true })
				onContinue()
			})
			return
		}
		if (!window.admob || !this.isInitialized) {
			onContinue()
			return
		}

		this._betweenLevelsActive = true
		this._betweenLevelsContinue = onContinue

		this.loadInterstitial(() => {
			if (!this._betweenLevelsContinue) return
			if (!this.interstitial) {
				const cb = this._betweenLevelsContinue
				this._betweenLevelsContinue = null
				this._betweenLevelsActive = false
				cb()
				return
			}
			try {
				GameEvents.raise(GameEvents.events.AD_STARTED, {})
				this._betweenLevelsRaisedAdStart = true
				this._interstitialReady = false
				this.interstitial.show()
			} catch (error) {
				console.error("Failed to show interstitial:", error)
				if (this._betweenLevelsRaisedAdStart) {
					GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: false })
					this._betweenLevelsRaisedAdStart = false
				}
				this.cleanupInterstitial()
				const cb = this._betweenLevelsContinue
				this._betweenLevelsContinue = null
				this._betweenLevelsActive = false
				cb && cb()
				this.prefetchInterstitialQuiet()
			}
		})
	}

	_finishBetweenLevelsAd() {
		const cb = this._betweenLevelsContinue
		if (!cb && !this._betweenLevelsActive && !this._betweenLevelsRaisedAdStart) return
		if (this._betweenLevelsRaisedAdStart) {
			GameEvents.raise(GameEvents.events.AD_COMPLETED, { success: true })
			this._betweenLevelsRaisedAdStart = false
		}
		this._betweenLevelsContinue = null
		this._betweenLevelsActive = false
		cb && cb()
	}

	adDismissed() {
		console.log("AD: adDismissed")
		if (this.isPlayingRewarded) {
			this._recordFullscreenAdShown()
		}
		if (this._betweenLevelsActive) {
			this._finishBetweenLevelsAd()
		}
		this.cleanupInterstitial()
		if (this.isPlayingRewarded)
		{
			this.rewardedLoaded = false
			this.isPlayingRewarded = false
			this.loadRewarded() // load the next
		}
	}

	createRewarded()
	{
		if (this.mockAdSystem)
		{
			console.log("AD: createRewarded mockAdSystem")
			return
		}
		console.log("AD: createRewarded")
		if (!window.admob)
		{
			//<debug>
			console.log("AD: admob not existing")
			//</debug>
			return
		}
		if (this.rewarded)
		{
			console.log("AD: rewarded already created")
			return
		}

		this.rewarded = new window.admob.RewardedAd({
			adUnitId: this.rewardedId
		})
		this.rewardedLoaded = false
		const eventHandlers = {
			load: (evt) => {
				console.log("AD: Rewarded loaded")
				this.isLoadingRewarded = false
				this.rewardedLoaded = true
				// Reset failure counter on successful load
				this.rewardedLoadFailCount = 0
				this.onRewardedLoadDone && this.onRewardedLoadDone()
			},
			show: (evt) => {
				console.log("AD: Rewarded show")
			},
			showfail: (evt) => {
				console.log("AD: Rewarded showfail")
				this.onRewarded && this.onRewarded(false)
				GameEvents.raise(GameEvents.events.AD_COMPLETED, {success: false})
				this.cleanupRewarded()
			},
			impression: (evt) => {
				console.log("AD: Rewarded impression")
			},
			loadfail: (evt) => {
				console.log("AD: Rewarded loadfail ", evt)
				for (var key in evt	)
				{
					console.log("         - ", key, " value ", evt[key])
				}
				this.isLoadingRewarded = false
				this.cleanupRewarded()
				
				// Increment failure counter
				this.rewardedLoadFailCount++
				console.log(`AD: Rewarded ad load failed (${this.rewardedLoadFailCount}/${this.maxRewardedLoadFailures})`)
				
				// If we've exceeded max failures, switch to promo video system
				if (this.rewardedLoadFailCount >= this.maxRewardedLoadFailures) {
					console.log("AD: Max rewarded ad load failures reached. Switching to promotional video system.")
					this.switchToPromoVideoSystem()
					// Still call the callback if there was one waiting
					if (this.onRewardedLoadDone) {
						this.onRewardedLoadDone()
					}
					return
				}
				
				// Retry after a short delay (1.5 seconds)
				setTimeout(() => {
					this.loadRewarded(this.onRewardedLoadDone)
				}, 1500)
			},
			reward: (evt) => {
				console.log("AD: Rewarded reward")

				this.onRewarded && this.onRewarded(true)
				GameEvents.raise(GameEvents.events.AD_COMPLETED, {success: true})
			},
		}
		
		// Add event listeners
		Object.entries(eventHandlers).forEach(([event, handler]) => {
			this.rewarded.on(event, handler)
		})
	}

    loadRewarded(onDone) {
		
		if (this.skipAllAds)
		{
			console.log("AD: loadRewarded skipAllAds")
			onDone && onDone()
			return
		}
		if (this.mockAdSystem)
		{
			console.log("AD: loadRewarded mockAdSystem")
			onDone && onDone()
			return
		}
		if (! window.admob)
		{
			console.log("AD: loadRewarded no admob. In browser?")
			onDone && onDone()
			return
		}
        if (!this.isInitialized) return
		if (this.rewardedLoaded)
		{
			console.log("AD: rewarded already loaded")
			onDone && onDone()
			return
		}
		if (!this.rewarded)
		{
			this.createRewarded()
		}	
		
		if (this.isLoadingRewarded)
		{
			console.log("AD: Already loading rewarded")
			if (onDone) this.onRewardedLoadDone = onDone	
			return
		}

		this.isLoadingRewarded = true
		this.cleanupRewarded()
		this.onRewardedLoadDone = onDone
		this.rewarded.load()
		
		
		
		
		
		
		

    }
	cleanupRewarded()
	{
		if (this.rewarded)
		{
		//	this.rewarded.removeAllListeners()
		}
	}

    showRewarded(onRewarded) {
		GameEvents.raise(GameEvents.events.AD_STARTED, {})

		if (this.skipAllAds)
		{
			console.log("AD: showRewarded skipAllAds")
			onRewarded && onRewarded(true)
			GameEvents.raise(GameEvents.events.AD_COMPLETED, {success: false})
			return
		}
		if (this._isFullscreenAdCooldownActive()) {
			console.log("AD: showRewarded skipped — fullscreen ad cooldown")
			onRewarded && onRewarded(false)
			GameEvents.raise(GameEvents.events.AD_COMPLETED, {success: false})
			return
		}
		if (this.mockAdSystem)
		{
			this.showMockRewarded(onRewarded)
			return
		}
		if (! window.admob)
		{
			console.log("AD: showRewarded no admob. In browser?")
			onRewarded && onRewarded()
			GameEvents.raise(GameEvents.events.AD_COMPLETED, {success: false})
			return
		}
		console.log("AD: showRewarded")
		if (this.rewarded && this.rewardedLoaded) {
			console.log("AD: showRewarded rewarded exists and loaded")
			this.isPlayingRewarded = true
			this.rewarded.show()
			this.onRewarded = onRewarded
		}
		else
		{
			console.log("AD: rewarded not loaded - falling back to promo video")
			// If rewarded ad isn't loaded and we've switched to promo videos, use that
			if (this.mockAdSystem) {
				this.showMockRewarded(onRewarded)
			} else {
				// Try to switch to promo videos as fallback
				this.switchToPromoVideoSystem()
				this.showMockRewarded(onRewarded)
			}
		}
    }

	showMockInterstitial(onDone)
	{
		console.log("AD: showMockInterstitial - using promotional video")
		onDone && onDone(true)
		// Show a random promotional video as stand-in for interstitial ad
		/*promoVideoManager.showPromoVideo((success) => {
			console.log("AD: Promo video completed:", success)
			this._recordFullscreenAdShown()
			onDone && onDone(success)
		})*/
	}

	showMockRewarded(onRewarded)
	{
		console.log("AD: showMockRewarded - using promotional video")
		onRewarded && onRewarded(true)
		// Show a random promotional video as stand-in for rewarded ad
		// User gets reward if they watch the video to completion
		/*promoVideoManager.showPromoVideo((success) => {
			console.log("AD: Promo video completed:", success)
			this._recordFullscreenAdShown()
			// If video was watched to completion, user gets reward
			onRewarded && onRewarded(success)
		})*/
	}

	/**
	 * Switch to promotional video system as fallback when AdMob fails
	 */
	switchToPromoVideoSystem() {
		if (this.mockAdSystem) {
			// Already switched
			return
		}
		
		console.log("AD: Switching to promotional video system as fallback")
		this.mockAdSystem = true
		
		// Initialize promo video manager if not already initialized
		/*if (this.ui && !promoVideoManager.isInitialized) {
			promoVideoManager.initialize(this.ui)
		}*/
	}
}





