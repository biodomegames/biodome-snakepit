//import '../../style.css'

import { Application, Container } from 'pixi.js';
import { GameShell } from './gameShell.js';
import { OptionsMenu } from './dome/optionsmenu.js';
import { Preloader} from './dome/preloader.js'
import { BioData } from './dome/biodata.js';
import { Config } from './config.js';
import { DebugConsole } from './dome/debugconsole.js';
import { adManager } from './system/ads.js';
import { Analytics } from './system/analytics.js';
import { ConsentDialog } from './consentdialog.js';
import { crashLogger } from './crashlogger.js';
import { crashLogViewer } from './crashlogviewer.js';
import { tubeManager } from './dome/flashtubemanager.js';

import { isIOSDevice } from './cordovahelpers.js';
import { ensureAdMobPluginLoaded } from './cordovahelpers.js';
import { shouldUseIOSViewportFixes } from './cordovahelpers.js';
import { isCordova } from './cordovahelpers.js';
import { detectPlatform } from './cordovahelpers.js';

import { mainApp } from './mainpixi.js';
import { mainPixi } from './mainpixi.js';
//<premium>
import { Premium } from './premium.js';
//</premium>

export var optionsMenu = undefined

export class MainClass {
	isCordova = false
	isPaused = false
	isUserPaused = false

	constructor(mainPixi, onInitialized) {
		//<debug>
		console.log('MainClass ', mainPixi);
		//</debug>
		this.onInitialized = onInitialized
		window.dome = {}
		this.admobPluginReady = false
		this._admobPluginPromise = null
		Analytics.platform = detectPlatform();
		// Initialize crash logger early to catch any startup errors
		try {
			this.crashLogger = crashLogger;
			this.crashLogViewer = crashLogViewer;
			
			// Log app startup
			this.crashLogger.logEvent('app_startup', {
				platform: detectPlatform(),
				cordova: this.isCordova,
				userAgent: navigator.userAgent
			});
			
			// Check for previous session errors and show dialog if needed
			// Only run if enabled in Config to avoid bothering users who opt out
			var stored = localStorage.getItem("biodata")
			let bdata = JSON.parse(stored)
			
			if (bdata && (bdata.crashalert || Config.showCrashNoticeOnStartup)) 
			{// , Config.showCrashNoticeOnStartup)) {
				// Delay slightly to ensure UI is ready
				setTimeout(() => {
					try {
						this.crashLogger.checkAndShowPreviousSessionErrors();
					} catch (error) {
						console.error('Failed to check previous session errors:', error);
					}
				}, 2000); // Wait 2 seconds after startup
			}
		} catch (error) {
			console.error('Failed to initialize crash logger:', error);
			// Continue without crash logger if it fails
		}
		
		// Add global keyboard shortcut for crash log viewer (Ctrl+Shift+C)
		//<debug>
		document.addEventListener('keydown', (e) => {
			if (e.ctrlKey && e.shiftKey && e.key === 'C') {
				e.preventDefault();
				try {
					if (this.crashLogViewer) {
						this.crashLogViewer.toggle();
					}
				} catch (error) {
					console.error('Failed to open crash log viewer:', error);
				}
			}
		});
		//</debug>
		// prematurely load the savedata to figure out iw we need the debugConsole
		var stored = localStorage.getItem("biodata")
		if (stored)
		{
			var bdata = JSON.parse(stored)
			if (bdata.debugConsole)
			{
				this.debugConsole = new DebugConsole();
				console.log('Debug console initialized');
			}
		}
		
		// Load fullscreen preference
		this.isFullscreen = localStorage.getItem('isFullscreen') === 'true';
		
		// Check if we're in a Cordova environment
		console.log("window.cordova:" + window.cordova)
		this.isCordova = isCordova();
		
		console.log('Initial environment check:', {
			documentURL: document.URL,
			isCordova: this.isCordova,
			windowCordova: typeof window.cordova,
			userAgent: navigator.userAgent
		});
		
		if (this.isCordova) {
			console.log('Waiting for deviceready event...');
			// In Cordova, wait for deviceready
			this.platform = detectPlatform();
			window.dome.platform = this.platform

			document.addEventListener('deviceready', async () => {
				console.log('Device ready event received');
				console.log('Cordova check after deviceready:', {
					windowCordova: typeof window.cordova,
					StatusBar: typeof window.StatusBar,
					AndroidFullScreen: typeof window.AndroidFullScreen,
					platform: detectPlatform()
				});
				
				//<premium>
				Premium.initialize();
				//</premium>

				// Initialize AdMob
				try {
					const hasAdmob = await ensureAdMobPluginLoaded(this)
					if (hasAdmob) {
						await adManager.initialize()
					} else {
						console.error('AdMob plugin not found after waiting for readiness')
					}
				} catch (error) {
					console.error('Failed to initialize AdMob:', error)
				}

				// Check for analytics consent before initializing
				this.checkAndInitializeAnalytics(() => {
					this.onDeviceReady();
				});
			}, false);
		} else {
			adManager.initialize()
			//<debug>
			console.log('Not in Cordova environment, initializing immediately');
			//</debug>
			this.platform = detectPlatform();
			window.dome.platform = this.platform
			// Check for analytics consent before initializing (non-Cordova path)
			this.checkAndInitializeAnalytics(() => {
				// Not in Cordova, initialize immediately
				this.initialize(()=>{
					this.applyIOSViewportFixesIfNeeded();
					onInitialized(this)	
				});
			});

			//<premium>
			Premium.initialize();
			//</premium>
		}
	}
	
	onDeviceReady() {
		console.log('onDeviceReady called');
		// Initialize Cordova-specific features
		if (window.StatusBar) {
			console.log('StatusBar available, configuring...');
			window.StatusBar.overlaysWebView(true);
			window.StatusBar.styleDefault();
			//window.StatusBar.hide();
		}
		
		if (window.AndroidFullScreen) {
			console.log('AndroidFullScreen available, configuring...');
			// Apply saved fullscreen preference
			if (this.isFullscreen) {
				window.AndroidFullScreen.isImmersiveModeSupported((supported) => {
					if (supported) {
						window.AndroidFullScreen.immersiveMode(() => {
							console.log('Successfully entered immersive mode');
						}, (error) => {
							console.error('Failed to enter immersive mode:', error);
							window.AndroidFullScreen.leanMode(() => {
								console.log('Successfully entered lean mode');
							}, (error) => {
								console.error('Failed to enter lean mode:', error);
							});
						});
					} else {
						window.AndroidFullScreen.leanMode(() => {
							console.log('Successfully entered lean mode');
						}, (error) => {
							console.error('Failed to enter lean mode:', error);
						});
					}
				});
			} else {
				window.AndroidFullScreen.showSystemUI(() => {
					console.log('Successfully exited fullscreen mode');
				}, (error) => {
					console.error('Failed to exit fullscreen mode:', error);
				});
			}
		}
		
		// delay actual initialize a bit
		setTimeout(() => {
			this.initialize(()=>{
				if (this.onInitialized) this.onInitialized(this)
				this.applyIOSViewportFixesIfNeeded();		
			});
		}, 100);
		
	}

	/**
	 * Check for analytics consent and initialize analytics if consented
	 * Shows consent dialog on first launch if needed
	 * @param {Function} onDone - Callback when consent check is complete
	 */
	checkAndInitializeAnalytics(onDone) {
		//<debug>
		console.error('checkAndInitializeAnalytics called');
		//</debug>
		// First check if analytics is available - if not, skip everything
		if (!Analytics.isAvailable()) {
			//console.log("Call onDone X");
			if (onDone) {
				onDone();
			}
			return;
		}

		// Initialize consent dialog
		if (!this.consentDialog) {
			this.consentDialog = new ConsentDialog();
		}

		// Show consent dialog if needed
		const wasShown = this.consentDialog.showIfNeeded((consented) => {
			// User has made a choice (or was already asked)
			if (consented) {
				// User consented, initialize analytics
				Analytics.start();
			} else {
				// User declined, analytics will not be initialized
				console.log('Analytics consent declined by user');
			}
			
			// Call the done callback
			//console.log("call onDone A");
			if (onDone) 
			{
				onDone();
			}
			return
		});
	}
	
	initialize(onDone) {
		console.error('Starting game initialization...');
		//const app = mainApp
		//const app = new Application();
		//console.log('PIXI Application created');
		//window.app = app
		Config.optionsMenuAvailable = true
		//throw new Error('API failed');
		this.bdata = new BioData("biodata", false, 
			(bdata) => {
				this.bdata = window.bdata = bdata
				console.log("---------- Biodata arrived")
				onDone()
			},
			(data) => {
				console.log("Updated Biodata arrived: ", data)
				this.game && this.game.onBiodataArrived(data)
			},
			(discardedData, newData) => {
				console.log("Discarded Biodata: ", discardedData)
				this.game && this.game.onBiodataDiscarded(discardedData, newData)
			}
		)
		window.bdata = this.bdata
			
		scaleConfiguration.aspect = scaleConfiguration.gameWidth / scaleConfiguration.gameHeight
		

		//this.startGame();
	}

	applyIOSViewportFixesIfNeeded() {
		if (shouldUseIOSViewportFixes()) {
			setupIOSViewportStabilizers();
			stabilizeViewportSequence();
		}
	}

	createGame(onDone)
	{
		var uicontainer = new Container()
		var uicontainerbehinddefault = new Container()
		var uicontainerbg = new Container()
		var uicontainerfg = new Container()
		let didGameInit = false
		//console.log("--------------- loaded the DATA")
		console.log("---------- creating game")
		
		var game = new GameShell(mainApp, uicontainer, uicontainerbg, uicontainerfg, uicontainerbehinddefault, this)
		this.game = game
		
		if (Config.optionsMenuAvailable)
		{
			optionsMenu = new OptionsMenu(this)
			preloader.addAssetsForPreloading(optionsMenu.getAssetsForPreload(), () => {
				//console.log("Options menu assets are loaded")
				if (didGameInit)
					mainApp.stage.addChild(optionsMenu)
				var showSideMenu = false
				//<debug>
				showSideMenu = true
				//</debug>
				if (showSideMenu) optionsMenu.showSideMenuButton()
				game.initOptionsMenu()
			})	
		}
		

		
		console.log("---------- adding game assets for preloading")
		preloader.addAssetsForPreloading(game.getAssetsForPreload(), () => { 
			console.log("---------- Game assets are loaded")
			mainApp.stage.addChild(uicontainerbg)
			mainApp.stage.addChild(game)
			mainApp.stage.addChild(uicontainerbehinddefault)
			mainApp.stage.addChild(uicontainer)
			mainApp.stage.addChild(uicontainerfg)
			if (optionsMenu) mainApp.stage.addChild(optionsMenu)
			window.game = game
			console.log("---------- initializing game")
			game.init()
			didGameInit = true
			console.log("---------- game initialized")
			// Match first paint to container + stage scale (same as window resize). Without this,
			// _layoutGamefg can run before renderer.resize / stage.scale are final and the board stays tiny until a resize.
			this.resize()
			requestAnimationFrame(() => this.resize())
			onDone()
		})

		
			

		return game
	}

	mainTick(deltaTime, now)
	{
		let game = this.game
		if (this.isUserPaused)
		{
			if (game) game.tick(deltaTime* this.timeScale, true)
			tweenManager.update(deltaTime * this.timeScale)
			return
		}

		if (now == undefined)
		{
			now = performance.now()
		}
		
		if (deltaTime > 0.1) // realluy slow
		{
			console.log("Slow frame: ", deltaTime)
			deltaTime = 0.1
		}
		if (game && game.fpsDisplay) game.fpsDisplay.startTickTime()
		if (game) game.tick(deltaTime* this.timeScale)

		if (game && game.fpsDisplay) game.fpsDisplay.startTubeManagerTickTime()
		if (tubeManager) tubeManager.tick(deltaTime * this.timeScale)
		if (game && game.fpsDisplay) game.fpsDisplay.endTubeManagerTickTime()
		
		if (optionsMenu) optionsMenu.tick(deltaTime * this.timeScale)
		if (game && game.fpsDisplay) game.fpsDisplay.startTweenTickTime()
		tweenManager.update(deltaTime * this.timeScale)
		if (game && game.fpsDisplay) game.fpsDisplay.endTweenTickTime(tweenManager.dbgTimeUsedInCallbacks)
		if (game && game.fpsDisplay) game.fpsDisplay.setTweenCount(tweenManager.numActiveTweens)
		if (game && game.fpsDisplay) game.fpsDisplay.endTickTime()
		var now1 = performance.now()
		
		var ticktime = Math.floor((now1 - now) * 100) / 100
		if (window.statDisplay) window.statDisplay.addStat("tt: ", ticktime)
	}
	
	setSpeedUp(speedUp)
	{
		this.speedUp = speedUp
	}

	timeScale = 1
	frameDelay = 0
	tickMultiplier = 1
	targetFPS = 0  // Target frames per second (0 = unlimited)
	lastFrameTime = 0  // Last frame timestamp for FPS limiting
	isPaused = false  // Pause when app is backgrounded
	slowMotionToggle()
	{
		
		if (this.timeScale == 1)
		{
			this.timeScale = 0.5
		}
		else if (this.timeScale == 0.5)
		{
			this.timeScale = .1
		}
		else
		{
			this.timeScale = 1
		}
		console.log("Slow motion toggle ", this.timeScale)
		//app.ticker.speed = this.timeScale
	}
	frameDelayToggle()
	{
		if (this.frameDelay == 0)
		{
			this.frameDelay = .1
		}
		else if (this.frameDelay == .1)
		{
			this.frameDelay = .3
		}
		else if (this.tickMultiplier ==1)
		{
			this.frameDelay = .3
			this.tickMultiplier = 3
		}
	
		
		else
		{
			this.frameDelay = 0
			this.tickMultiplier = 1
		}

		console.log("Frame delay toggle ", this.frameDelay)
	}

	/*toggleFullscreen() {
		if (!window.AndroidFullScreen) {
			console.log('AndroidFullScreen not available');
			return;
		}

		if (this.isFullscreen) {
			// Exit fullscreen
			window.AndroidFullScreen.showSystemUI(() => {
				console.log('Successfully exited fullscreen mode');
				this.isFullscreen = false;
				localStorage.setItem('isFullscreen', 'false');
			}, (error) => {
				console.error('Failed to exit fullscreen mode:', error);
			});
		} else {
			// Enter fullscreen
			window.AndroidFullScreen.isImmersiveModeSupported((supported) => {
				if (supported) {
					window.AndroidFullScreen.immersiveMode(() => {
						console.log('Successfully entered immersive mode');
						this.isFullscreen = true;
						localStorage.setItem('isFullscreen', 'true');
					}, (error) => {
						console.error('Failed to enter immersive mode:', error);
						window.AndroidFullScreen.leanMode(() => {
							console.log('Successfully entered lean mode');
							this.isFullscreen = true;
							localStorage.setItem('isFullscreen', 'true');
						}, (error) => {
							console.error('Failed to enter lean mode:', error);
						});
					});
				} else {
					window.AndroidFullScreen.leanMode(() => {
						console.log('Successfully entered lean mode');
						this.isFullscreen = true;
						localStorage.setItem('isFullscreen', 'true');
					}, (error) => {
						console.error('Failed to enter lean mode:', error);
					});
				}
			});
		}
	}

	*/
	
	setupPauseOnBackground() {
		// Pause when app is backgrounded for energy efficiency
		document.addEventListener('visibilitychange', () => {
			this.isPaused = document.hidden;
			if (this.isPaused) {
				console.log('App backgrounded - pausing animation');
			} else {
				console.log('App foregrounded - resuming animation');
				// Reset time to avoid huge delta when resuming
				this.lastTime = performance.now();
				this.lastFrameTime = performance.now();
			}
		});
		
		// Also pause on Cordova pause event
		if (this.isCordova) {
			document.addEventListener('pause', () => {
				this.isPaused = true;
				console.log('Cordova pause event - pausing animation');
			}, false);
			document.addEventListener('resume', () => {
				this.isPaused = false;
				console.log('Cordova resume event - resuming animation');
				// Reset time to avoid huge delta when resuming
				this.lastTime = performance.now();
				this.lastFrameTime = performance.now();
			}, false);
		}
	}
	
	
	resize() {
		// Guard: Make sure app and renderer are initialized
		const app = mainApp
		if (!app || !app.renderer) {
			console.warn('refreshGameSize called before app is ready');
			return;
		}
	
		//console.log("refreshGameSize")
		let width = window.innerWidth;
		let height = window.innerHeight;

		const container = document.getElementById('gameContainer');
		const preferIOSViewport = shouldUseIOSViewportFixes();
	
		// Prefer the measured container bounds unless we know iOS standalone/cordova lies about them
		if (container && !preferIOSViewport) {
			const rect = container.getBoundingClientRect();
			if (rect && rect.width && rect.height) {
				width = Math.round(rect.width);
				height = Math.round(rect.height);
			}
		}
	
		if (preferIOSViewport) {
			// For iOS, use the ACTUAL measured viewport size, not the expected full screen size
			// This way the game will scale to fit whatever viewport iOS gives us
			// (which fixes itself after resume, but we'll work with what we have on launch)
			if (container) {
				// Force a reflow to ensure CSS has been applied
				void container.offsetHeight;
				
				// Read the ACTUAL container size - use whatever iOS gives us
				const containerRect = container.getBoundingClientRect();
				const measuredWidth = containerRect.width;
				const measuredHeight = containerRect.height;
				
				// Use the actual measured size - don't try to force it to be larger
				// This ensures the game scales to fit the available viewport
				if (measuredWidth > 200 && measuredHeight > 400) {
					width = Math.round(measuredWidth);
					height = Math.round(measuredHeight);
					//console.log('iOS - Using ACTUAL measured viewport size: ' + width + 'x' + height + ' (game will scale to fit)');
				} else {
					// Fallback: use window dimensions
					width = Math.round(window.innerWidth || 375);
					height = Math.round(window.innerHeight || 667);
					//console.log('iOS - Container too small, using window size: ' + width + 'x' + height);
				}
			}
		}
	
		// Scroll to reset offsets caused by the address bar
		window.scrollTo(0, 0);
	
		// Resize Pixi renderer
		// Note: With autoDensity: true, PixiJS will automatically handle devicePixelRatio
		// We pass the logical size (width x height), and PixiJS will create the canvas at the correct resolution
		//console.log("Resize to: ", width, height, window.devicePixelRatio, window.innerWidth , window.innerHeight, "vis" , window.visualViewport?.width, window.visualViewport?.height)
		//console.log("window.visualViewport ", window.visualViewport)
		
		// Get the actual device pixel ratio
		const dpr = window.devicePixelRatio || 1;
		//console.log('Resizing renderer - logical size: ' + width + 'x' + height + ', DPR: ' + dpr);
		
		app.renderer.resize(width, height);
		
		// Verify the renderer actually resized correctly
		// With autoDensity, the renderer's screen width/height should match the logical size
		// but the canvas element should be at DPR resolution
		//console.log('After resize - renderer screen width: ' + app.renderer.screen.width + ', screen height: ' + app.renderer.screen.height);
		//console.log('After resize - renderer width: ' + app.renderer.width + ', height: ' + app.renderer.height);
	
		// Style the canvas to fill the container exactly
		app.view.style.position = "absolute";
		app.view.style.left = "0px";
		app.view.style.top = "0px";
		app.view.style.right = "0px";
		app.view.style.bottom = "0px";
		app.view.style.width = `${width}px`;
		app.view.style.height = `${height}px`;
		app.view.style.minWidth = `${width}px`;
		app.view.style.minHeight = `${height}px`;
		app.view.style.maxWidth = `${width}px`;
		app.view.style.maxHeight = `${height}px`;
		app.view.style.display = "block";
		app.view.style.margin = "0";
		app.view.style.padding = "0";
		app.view.style.boxSizing = "border-box";
		app.view.style.overflow = "visible";
		// Ensure no transforms that might affect sizing
		app.view.style.transform = "none";
		app.view.style.webkitTransform = "none";
		
		// Note: PixiJS's renderer.resize() already sets the canvas element's width/height attributes
		// We don't need to set them manually as that could conflict with PixiJS's internal management
		// The CSS width/height we set above will control the display size
		/*
		// Log canvas dimensions for debugging
		console.log('Canvas styled - CSS width: ' + app.view.style.width + ', CSS height: ' + app.view.style.height);
		console.log('Canvas element - actual width: ' + app.view.width + ', actual height: ' + app.view.height);
		console.log('Renderer size - width: ' + app.renderer.width + ', height: ' + app.renderer.height);
		console.log('Renderer screen - width: ' + app.renderer.screen.width + ', height: ' + app.renderer.screen.height);
		console.log('Container size - width: ' + (container?.offsetWidth || 'N/A') + ', height: ' + (container?.offsetHeight || 'N/A'));
		*/
		// Check if canvas element size matches expected DPR size
		const expectedCanvasWidth = width * dpr;
		const expectedCanvasHeight = height * dpr;
		//console.log('Expected canvas size (width*DPR x height*DPR): ' + expectedCanvasWidth + 'x' + expectedCanvasHeight);
		if (app.view.width !== expectedCanvasWidth || app.view.height !== expectedCanvasHeight) {
			//console.warn('Canvas element size mismatch! Expected: ' + expectedCanvasWidth + 'x' + expectedCanvasHeight + ', Actual: ' + app.view.width + 'x' + app.view.height);
		}
		
		// With autoDensity, the renderer should be rendering at the canvas element's resolution
		// Check if the renderer's actual rendering viewport matches
		const rendererResolution = app.renderer.resolution || 1;
		//console.log('Renderer resolution: ' + rendererResolution);
		//console.log('Renderer actual rendering size should be: ' + (app.renderer.width * rendererResolution) + 'x' + (app.renderer.height * rendererResolution));
		
		// Verify the canvas fills the container
		const canvasRect = app.view.getBoundingClientRect();
		const containerRect = container?.getBoundingClientRect();
		//console.log('Canvas getBoundingClientRect - width: ' + canvasRect.width + ', height: ' + canvasRect.height + ', top: ' + canvasRect.top + ', bottom: ' + canvasRect.bottom);
		//console.log('Container getBoundingClientRect - width: ' + (containerRect?.width || 'N/A') + ', height: ' + (containerRect?.height || 'N/A') + ', top: ' + (containerRect?.top || 'N/A') + ', bottom: ' + (containerRect?.bottom || 'N/A'));
		//console.log('Body getBoundingClientRect - width: ' + document.body.getBoundingClientRect().width + ', height: ' + document.body.getBoundingClientRect().height);
		//console.log('HTML getBoundingClientRect - width: ' + document.documentElement.getBoundingClientRect().width + ', height: ' + document.documentElement.getBoundingClientRect().height);
		
		// Check if canvas is being clipped
		if (containerRect && canvasRect.height < containerRect.height) {
			console.warn('Canvas height is smaller than container! Canvas: ' + canvasRect.height + ', Container: ' + containerRect.height);
		}
	
		//console.log('Current rendering width:', app.renderer.width);
		//console.log('Current rendering height:', app.renderer.height);
	
		var aspect = app.renderer.width / app.renderer.height
		var desiredScale = 1
		if (aspect>scaleConfiguration.aspect)   // wider than the game
		{
			desiredScale = app.renderer.height / scaleConfiguration.gameHeight
		}
		else
		{
			desiredScale = app.renderer.width / scaleConfiguration.gameWidth
		}
	
		app.stage.scale.set(desiredScale)
		//console.log("Game scaling - Viewport: " + app.renderer.width + "x" + app.renderer.height + ", Game base: " + scaleConfiguration.gameWidth + "x" + scaleConfiguration.gameHeight + ", Scale: " + desiredScale.toFixed(3))
		if (window.game)
			window.game && window.game.resize();
		if (window.preloader)
			window.preloader && window.preloader.resize();
	};

}




var scaleConfiguration = {
	gameWidth: 1024,// * 2 / window.devicePixelRatio,
	gameHeight: 768// * 2 / window.devicePixelRatio,  
}



// Debounced resize helper and iOS stabilizers
let iosResizeTimer;
function debouncedRefresh(delay = 50) {
	clearTimeout(iosResizeTimer);
	iosResizeTimer = setTimeout(() => refreshGameSize(), delay);
}

function setupIOSViewportStabilizers() {
	const vv = window.visualViewport;
	if (vv) {
		vv.addEventListener('resize', () => debouncedRefresh(250));
		vv.addEventListener('scroll', () => debouncedRefresh(250));
	}
	window.addEventListener('orientationchange', () => {
		console.log("WINDOW Orientation change")
		stabilizeViewportSequence();
	});
	window.addEventListener('visibilitychange', () => {
		console.log("WINDOW Visibility change")
		if (!document.hidden) {
			console.log("App became visible - forcing viewport fix");
			stabilizeViewportSequence();
		}
	});
	window.addEventListener('focus', () => {
		console.log("WINDOW Focus - forcing viewport fix");
		stabilizeViewportSequence();
	});
	window.addEventListener('blur', () => debouncedRefresh(250));
	
	// CRITICAL: Listen for Cordova resume event (when app comes back from background)
	// This is when iOS recalculates the viewport correctly - the same behavior that fixes the bug
	if (typeof document !== 'undefined') {
		document.addEventListener('resume', () => {
			console.log("CORDOVA Resume event - forcing viewport fix (this is what fixes the bug!)");
			// Force multiple resizes to ensure viewport is recalculated
			stabilizeViewportSequence();
			setTimeout(() => stabilizeViewportSequence(), 100);
			setTimeout(() => stabilizeViewportSequence(), 300);
		}, false);
	}
}

function refreshGameSize()
{
	mainPixi.refreshGameSize()
}

function stabilizeViewportSequence() {
	// Run a set of refreshes over time as iOS settles its chrome/layout
	refreshGameSize();
	setTimeout(refreshGameSize, 100);
	//setTimeout(refreshGameSize, 300);
	//setTimeout(refreshGameSize, 600);
	////setTimeout(refreshGameSize, 1000);
	//setTimeout(refreshGameSize, 2000);
	
	// Also check on animation frames to catch viewport changes
	/*requestAnimationFrame(() => {
		refreshGameSize();
		requestAnimationFrame(() => {
			refreshGameSize();
		});
	});*/
}

var maintainScaleDuration = 0

const scaleMaintainer = (delta) => {
	const dt = delta.deltaTime / 60; // Normalize delta
	maintainScaleDuration -= dt;
	
	//console.log("Maintain scale duration: ", maintainScaleDuration)
	if (maintainScaleDuration <= 0) {
	  //console.log("Removing ticker...");
	  mainApp.ticker.remove(scaleMaintainer); // Pass the function reference 
	}
	refreshGameSize();
  };

function maintainActiveResizing(duration) {
	if (maintainScaleDuration <= 0)
	{
		mainApp.ticker.add(scaleMaintainer)	
		
	}
	maintainScaleDuration = duration
}
/*
export function getRenderWidth(actual)
{
	if (actual)
		return window.app.renderer.width
	return window.app.renderer.width / app.stage.scale.x
}

export function getRenderHeight(actual)
{
	if (actual)
	{
		return window.app.renderer.height
	}
	return window.app.renderer.height / app.stage.scale.y
	const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
	return height  / window.app.stage.scale.x
}
*/

window.maintainActiveResizing = maintainActiveResizing

