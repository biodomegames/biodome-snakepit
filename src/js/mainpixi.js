import { Application, Container } from 'pixi.js';
import { isIOSDevice } from './cordovahelpers.js';
import { shouldUseIOSViewportFixes } from './cordovahelpers.js';

// singleton for creating the pixi application and 
// managing the main loop
export var mainApp = undefined

/** Ground behind the pit. Edit this hex to change the field color. */
const GROUND_COLOR = "#2f7d45"

var scaleConfiguration = {
	gameWidth: 1024,// * 2 / window.devicePixelRatio,
	gameHeight: 768// * 2 / window.devicePixelRatio,  
}


export const mainPixi = {
	isPaused: false,
	targetFPS: 0,
	
	tickMultiplier: 1,
	speedUp: 1,

	initialize: (onDone, onTick, onResize) => {
		mainPixi.onResize = onResize
		const app = new Application();
		console.log('PIXI Application created');
		globalThis.__PIXI_APP__ = app; // for the pixi debugger
		mainApp = app
		window.getRenderWidth = function(actual)
		{
			if (actual)
				return app.renderer.width
			return app.renderer.width / app.stage.scale.x
		}

		window.getRenderHeight = function(actual)
		{
			if (actual)
			{
				return app.renderer.height
			}
			return app.renderer.height / app.stage.scale.y
		}
		let initWidth = window.innerWidth || 375;
		let initHeight = window.innerHeight || 667;

		app.init({ 
            background: GROUND_COLOR, 
			
			// Let our own refreshGameSize control sizing to avoid iOS timing issues
            autoDensity: true, 
            resolution: Math.min(2, window.devicePixelRatio || 1),
            antialias: false,
            powerPreference: 'high-performance',
			useContextAlpha: false,
            //vsync: false
			// Set initial size so PixiJS starts with correct dimensions
			width: initWidth,
			height: initHeight
		}).catch((error) => {
			console.error('PixiJS initialization failed:', error);
			// Try to log to crash logger if available
			/*if (this.crashLogger) {
				this.crashLogger.handleError('PixiJS Initialization Error', {
					message: error.message,
					stack: error.stack,
					initWidth: initWidth,
					initHeight: initHeight,
					devicePixelRatio: window.devicePixelRatio,
					userAgent: navigator.userAgent
				});
			}*/
			throw error; // Re-throw to prevent continuation
		}).then(() => { //was 1099bb
			// Verify app and renderer are ready before accessing canvas
			if (!app || !app.renderer || !app.canvas) {
				console.error('App, renderer, or canvas not ready after init');
				/*if (this.crashLogger) {
					this.crashLogger.handleError('PixiJS Post-Init Error', {
						message: 'App, renderer, or canvas not ready after init',
						hasApp: !!app,
						hasRenderer: !!(app && app.renderer),
						hasCanvas: !!(app && app.canvas)
					});
				}*/
				return; // Don't continue if not ready
			}
			
			document.body.appendChild(app.canvas);
			const container = document.getElementById('gameContainer');
			if (container) {
				container.appendChild(app.canvas);
			} else {
				console.error('gameContainer not found');
			}
			
			// iOS-specific: Force multiple delayed resize checks after canvas is appended
			// This handles the case where the viewport hasn't fully settled yet
			// Note: We'll set this up after refreshGameSize is called later in the initialization

			// Install GPU draw-call counter by wrapping WebGL draw calls
			

			window.getRenderWidth = function(actual)
			{
				if (actual)
					return app.renderer.width
				return app.renderer.width / app.stage.scale.x
			}

			window.getRenderHeight = function(actual)
			{
				if (actual)
				{
					return app.renderer.height
				}
				return app.renderer.height / app.stage.scale.y
			}
			
			app.ticker.autoStart = false
			app.ticker.stop();
			lastTime = performance.now();
			var tst = 0

			installDrawCallCounter()
			//var speedUp = 1
			//var speedUp = 1
			//var lastFrameTime = performance.now();
			
			// Setup pause on background for energy efficiency
			//this.setupPauseOnBackground();
			 
			// Set target FPS to 60 for iOS devices to prevent frame rate fluctuations
			// iOS 18 Safari may run at higher refresh rates (120Hz on ProMotion displays)
			// which causes inconsistent frame timing without explicit limiting
			if (isIOSDevice() && mainPixi.targetFPS === 0) {
				mainPixi.targetFPS = 60;
				console.log('iOS device detected: Setting target FPS to 60');
			}
			var lastTime = 0
			var tickMultiplier = 1
			var speedUp = 1

			const animate = (time) => {
				// Pause when app is backgrounded (energy saver!)
				if (document.hidden || mainPixi.isPaused) {
					requestAnimationFrame(animate);
					return;
				}

				const now = performance.now();
				
				// Frame rate limiting: only render when enough time has passed
				if (time != "delay" && mainPixi.targetFPS > 0) {
					const targetFrameTime = 1000 / mainPixi.targetFPS; // ms per frame
					const elapsed = now - (lastTime || now);
					
					if (elapsed < targetFrameTime) {
						// Not enough time has passed, skip rendering but keep ticking
						// Only tick game logic, don't render
						// how much time is needed?
						const timeNeeded = targetFrameTime - elapsed;
						setTimeout(() => {
							animate("delay")
						}, timeNeeded);
						/*n ewTween(this, {}, timeNeeded/1000).onDone(() => {
							animate("delay")
						})*/
						return
					}
					
				}

				// Normal rendering path (when FPS limit allows or unlimited)
				//if (game && game.fpsDisplay) game.fpsDisplay.startRenderTime()
				// reset draw-call counter for this frame
				if (typeof globalThis['__pixiDrawCalls'] !== 'undefined') globalThis['__pixiDrawCalls'] = 0;
				
				app.renderer.render(app.stage);
				//if (game && game.fpsDisplay) game.fpsDisplay.endRenderTime()
				
				

				
				var deltaTime = (now - lastTime) / 1000; // Convert to seconds if needed
				deltaTime = deltaTime * mainPixi.tickMultiplier
				
				for (var speed = 0; speed < speedUp; speed++)
				{
					mainPixi.mainTick(deltaTime, now)
				}

				lastTime = now;


				// Continue animation loop
				requestAnimationFrame(animate);
			};
			animate(performance.now());


			// create the preloader
			//console.log("starting the DOME preloader")
			//preloader = new Preloader(app)
			//window.preloader = preloader
			//app.stage.addChild(preloader)

			mainPixi.onTick = onTick

			window.addEventListener('resize', () => {
				mainPixi.refreshGameSize();
			});
			mainPixi.refreshGameSize()
			onDone()
			
		});

		function installDrawCallCounter() {

			var app = mainApp
			try {
				const gl = app.renderer.gl;
				if (gl && !gl.__pixiDrawWrapped) {
					const origDrawElements = gl.drawElements.bind(gl);
					const origDrawArrays = gl.drawArrays.bind(gl);
					gl.__pixiDrawWrapped = true;
					globalThis['__pixiDrawCalls'] = 0;
					gl.drawElements = function() {
						globalThis['__pixiDrawCalls'] = (globalThis['__pixiDrawCalls'] || 0) + 1;
						return origDrawElements.apply(this, arguments);
					}
					gl.drawArrays = function() {
						globalThis['__pixiDrawCalls'] = (globalThis['__pixiDrawCalls'] || 0) + 1;
						return origDrawArrays.apply(this, arguments);
					}
				}
			} catch (e) {
				console.warn('Draw-call counter not installed:', e);
			}
		}
		

	},

	mainTick: (deltaTime, now) => {
		//console.log("mainTick", deltaTime, now)
		if (mainPixi.onTick) mainPixi.onTick(deltaTime, now)
	},


	refreshGameSize: () => {
		// Guard: Make sure app and renderer are initialized
		const app = mainApp;
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
		if (window.game) window.game.resize()
		if (window.preloader) window.preloader.resize()
		if (mainPixi.onResize) mainPixi.onResize()
	},
}

export function getRenderWidth(actual)
{
	if (actual)
		return mainApp.renderer.width
	return mainApp.renderer.width / mainApp.stage.scale.x
}

export function getRenderHeight(actual)
{
	if (actual)
	{
		return mainApp.renderer.height
	}
	return mainApp.renderer.height / mainApp.stage.scale.y
}

/** Stage scale for a renderer of `width`×`height` (same rule as {@link mainPixi.refreshGameSize}). */
export function computeStageScaleForSize(width, height) {
	const aspect = width / height
	if (aspect > scaleConfiguration.aspect) {
		return height / scaleConfiguration.gameHeight
	}
	return width / scaleConfiguration.gameWidth
}