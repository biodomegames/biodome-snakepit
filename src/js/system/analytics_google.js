import { Config } from "../config.js"
import { ConsentManager } from "./consentmanager.js"
import { detectPlatform } from './cordovahelpers.js';
import { AnalyticsBase } from "./analytics_base.js"
let verbose = true
//<debug>
verbose = true
//</debug>
var ga = null
var isInitialized = false
var platformType = null // 'cordova' or 'web'
var gtagLoaded = false

/**
 * Check if we're running the local dev server (npm run dev)
 * This is true ONLY when running the Vite dev server on localhost with a port
 * This is false for all builds (including debug/test builds) and Cordova apps
 * @returns {boolean} true if running local dev server
 */
function isLocalDevServer() {
	// If we're in Cordova, it's definitely a build, not dev server
	if (typeof window !== 'undefined' && typeof window.cordova !== 'undefined') {
		return false;
	}
	
	// Check if we're running on localhost (dev server)
	if (typeof window !== 'undefined' && window.location) {
		const hostname = window.location.hostname;
		const port = window.location.port;
		
		// Dev server runs on localhost/127.0.0.1 with an explicit port number
		// Deployed sites typically don't have a port in the URL (or use implicit 80/443)
		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
			// If there's a port number (and it's not empty), it's likely the dev server
			// Vite dev server always runs on a port (default 5173, but configurable)
			if (port && port !== '' && port !== '80' && port !== '443') {
				return true;
			}
		}
	}
	
	return false;
}

export class AnalyticsGoogle extends AnalyticsBase
{
	constructor() {
		super()
	}


	
	/**
	 * Check if Google Analytics is available on this platform
	 * Analytics works on iOS/Android in Cordova context, or in web browsers
	 * Disabled ONLY when running `npm run dev` (local dev server on localhost)
	 * Enabled in all builds (including test/dev builds) and deployed versions
	 * @returns {boolean} true if analytics is available
	 */
	isAvailable() {
		// Disable analytics ONLY when running local dev server (npm run dev on localhost)
		// All builds (npm run build, npm run build:ios, etc.) will have analytics enabled
		if (isLocalDevServer()) {
			if (verbose) {
				console.log("Analytics: Disabled - running on local dev server (npm run dev)");
			}
			return false;
		}

		const platform = detectPlatform();
		
		// Check if we're in Cordova environment
		if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.firebase && cordova.plugins.firebase.analytics) {
			// Cordova with Firebase Analytics plugin available
			// Works on iOS and Android
			if (verbose) {
				console.log("Analytics: Available on Cordova platform:", platform);
			}
			return true;
		}

		// Check if we're in a web browser
		if (platform === 'browser') {
			if (verbose) {
				console.log("Analytics: Available on web browser");
			}
			return true;
		}

		if (verbose) {
			console.log("Analytics: Analytics not available - platform:", platform);
		}
		return false;
	}

	
	

	/**
	 * Load gtag.js script for web analytics
	 * @returns {Promise} Promise that resolves when gtag is loaded
	 */
	loadGtagScript() {
		return new Promise((resolve, reject) => {
			if (gtagLoaded && window.gtag) {
				resolve();
				return;
			}

			// Check if script is already being loaded
			if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
				// Script tag exists, wait for gtag to be available
				const checkInterval = setInterval(() => {
					if (window.gtag) {
						clearInterval(checkInterval);
						gtagLoaded = true;
						resolve();
					}
				}, 50);

				// Timeout after 5 seconds
				setTimeout(() => {
					clearInterval(checkInterval);
					if (!window.gtag) {
						reject(new Error('gtag.js failed to load'));
					}
				}, 5000);
				return;
			}

			// Initialize dataLayer and gtag function first (before loading script)
			if (!window.dataLayer) {
				window.dataLayer = [];
			}
			
			// Create gtag function that queues commands until script loads
			window.gtag = function() {
				window.dataLayer.push(arguments);
			};
			
			// Set up gtag configuration (will be processed when script loads)
			window.gtag('js', new Date());
			
			const measurementId = 'G-' + Config.googleAnalyticsId;
			if (verbose) {
				console.log("Analytics: Loading gtag.js with Measurement ID:", measurementId);
			}
			
			window.gtag('config', measurementId, {
				anonymize_ip: true,
				allow_google_signals: false,
				allow_ad_personalization_signals: false
			});

			// Create and load gtag.js script
			const script1 = document.createElement('script');
			script1.async = true;
			script1.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
			script1.onload = () => {
				// Verify gtag is actually available
				if (typeof window.gtag === 'function') {
					gtagLoaded = true;
					if (verbose) {
						console.log("Analytics: gtag.js loaded successfully. Measurement ID:", measurementId);
						console.log("Analytics: dataLayer length:", window.dataLayer.length);
					}
					resolve();
				} else {
					reject(new Error('gtag function not available after script load'));
				}
			};
			script1.onerror = (error) => {
				if (verbose) {
					console.error("Analytics: Failed to load gtag.js script from:", script1.src);
				}
				reject(new Error('Failed to load gtag.js script: ' + error));
			};
			document.head.appendChild(script1);
		});
	}

	/**
	 * Initialize analytics only if user has given consent
	 * This should be called after checking consent status
	 */
	async start()
	{
		// Check if user has consented
		const hasConsent = ConsentManager.hasConsent();
		if (hasConsent !== true) {
			if (verbose) {
				console.log("Analytics: Analytics not started - user has not consented");
			}
			return;
		}

		// Prevent double initialization
		if (isInitialized) {
			if (verbose) {
				console.log("Analytics: Analytics already initialized");
			}
			return;
		}

		if (verbose)
		{
			console.log("Analytics: Analytics start")
		}

		// Check if analytics is available before initializing
		if (!this.isAvailable()) {
			if (verbose) {
				console.log("Analytics: Analytics not available on this platform");
			}
			return;
		}

		const platform = detectPlatform();

		// Initialize based on platform
		if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.firebase && cordova.plugins.firebase.analytics) {
			// Cordova: Use Firebase Analytics
			platformType = 'cordova';
			ga = cordova.plugins.firebase.analytics;
			isInitialized = true;
			if (verbose) {
				console.log("Analytics initialized successfully (Cordova/Firebase)", ga);
			}
		} else if (platform === 'browser') {
			// Web: Use gtag.js
			platformType = 'web';
			try {
				await this.loadGtagScript();
				
				// Verify gtag is working
				if (typeof window.gtag === 'function' && window.dataLayer) {
					ga = 'web'; // Mark as initialized for web
					isInitialized = true;
					if (verbose) {
						console.log("Analytics initialized successfully (Web/gtag.js)");
						console.log("Analytics: Measurement ID: G-" + Config.googleAnalyticsId);
						// Send a test page_view to verify it's working
						window.gtag('event', 'page_view', {
							page_title: document.title,
							page_location: window.location.href
						});
					}
				} else {
					throw new Error('gtag not properly initialized');
				}
			} catch (error) {
				if (verbose) {
					console.error("Analytics: Failed to initialize gtag.js:", error);
					console.error("Analytics: Error details:", error.message, error.stack);
				}
				isInitialized = false;
				ga = null;
				platformType = null;
				return;
			}
		}
	}

	/**
	 * Re-initialize analytics (call this when user changes consent)
	 */
	async reinitialize() {
		const previousPlatformType = platformType;
		const hasConsent = ConsentManager.hasConsent();
		
		isInitialized = false;
		ga = null;
		platformType = null;
		gtagLoaded = false;
		
		// If user revoked consent and we were on web, we should disable gtag
		if (!hasConsent && previousPlatformType === 'web' && window.gtag) {
			// Disable analytics collection
			try {
				window.gtag('consent', 'update', {
					'analytics_storage': 'denied'
				});
			} catch (error) {
				if (verbose) {
					console.error("Analytics: Error updating consent:", error);
				}
			}
		}
		
		await this.start();
	}

	async trackView(viewName)
	{
		if (!ga || !isInitialized)
		{
			if (verbose)
			{
				//<debug>
				console.error("Analytics: Analytics not initialized: (trackView viewName: " + viewName + ")")
				//</debug>
			}
			return
		}
		if (verbose)
		{
			console.log("Analytics: Analytics trackView", viewName)
		}

		if (platformType === 'cordova') {
			// Cordova: Use Firebase Analytics
			ga.setCurrentScreen(viewName).then((arg)=>
			{
				if (verbose)
				{
					console.log("Analytics: done trackview", arg)
				}
			}).catch((error) => {
				if (verbose)
				{
					console.error("Analytics: Analytics trackView error:", error)
				}
			});
		} else if (platformType === 'web' && window.gtag) {
			// Web: Use gtag.js
			try {
				window.gtag('event', 'page_view', {
					page_title: viewName,
					page_location: window.location.href,
					page_path: '/' + viewName
				});
				// Also set the screen name for consistency
				window.gtag('config', 'G-' + Config.googleAnalyticsId, {
					page_title: viewName,
					page_location: window.location.href,
					page_path: '/' + viewName
				});
				if (verbose) {
					console.log("Analytics: done trackview (web)");
				}
			} catch (error) {
				if (verbose) {
					console.error("Analytics: trackView error (web):", error);
				}
			}
		}
	}

	async logEvent(eventName, eventData)
	{
		if (!ga || !isInitialized)
		{
			if (verbose)
			{
				//<debug>
				console.error("Analytics: Analytics not initialized (logEvent eventName: " + eventName + ", eventData: " + JSON.stringify(eventData) + ")")
				//</debug>
			}
			return
		}
		if (verbose)
		{
			console.log("Analytics: logEvent", eventName, eventData)
		}

		if (platformType === 'cordova') {
			// Cordova: Use Firebase Analytics
			ga.logEvent(eventName, eventData).then((arg)=>
			{
				if (verbose)
				{
					console.log("Analytics: done logEvent", arg)
				}
			}).catch((error) => {
				if (verbose)
				{
					console.error("Analytics: logEvent error:", error)
				}
			});
		} else if (platformType === 'web' && window.gtag) {
			// Web: Use gtag.js
			try {
				// Convert eventData to gtag format
				const gtagParams = {};
				if (eventData) {
					// gtag expects parameter names in snake_case, but Firebase uses camelCase
					// We'll pass them as-is and let GA4 handle the conversion
					Object.keys(eventData).forEach(key => {
						gtagParams[key] = eventData[key];
					});
				}
				window.gtag('event', eventName, gtagParams);
				if (verbose) {
					console.log("Analytics: done logEvent (web)");
				}
			} catch (error) {
				if (verbose) {
					console.error("Analytics: logEvent error (web):", error);
				}
			}
		}
	}

	/**
	 * Track when a level starts
	 * Uses Firebase standard event: level_start
	 * @param {number|string} levelNumber - The level number/index
	 * @param {string} [levelName] - Optional level name/identifier
	 */
	async levelStart(levelNumber, levelName)
	{
		const eventData = {
			level: levelNumber
		}
		if (levelName)
		{
			eventData.level_name = levelName
		}
		await this.logEvent("level_start", eventData)
	}

	/**
	 * Track when a level ends (completed or failed)
	 * Uses Firebase standard event: level_end
	 * @param {number|string} levelNumber - The level number/index
	 * @param {boolean} success - Whether the level was completed successfully
	 * @param {string} [levelName] - Optional level name/identifier
	 * @param {number} [score] - Optional score achieved
	 */
	async levelEnd(levelNumber, success, levelName, score)
	{
		const eventData = {
			level: levelNumber,
			success: success ? 1 : 0
		}
		if (levelName)
		{
			eventData.level_name = levelName
		}
		if (score !== undefined)
		{
			eventData.score = score
		}
		await this.logEvent("level_end", eventData)
	}

	async ftue(step, name)
	{
		await this.logEvent("ftue", {
			step: step,
			name: name
		})
	}
	async ftueUnordered(step, name)
	{
		await this.logEvent("ftue_unordered", {
			step: step,
			name: name
		})
	}
	
	/**
	 * Track when player advances to next level
	 * Uses Firebase standard event: level_up
	 * @param {number|string} levelNumber - The new level number/index
	 * @param {string} [levelName] - Optional level name/identifier
	 */
	async levelUp(levelNumber, levelName)
	{
		const eventData = {
			level: levelNumber
		}
		if (levelName)
		{
			eventData.level_name = levelName
		}
		await this.logEvent("level_up", eventData)
	}

	/**
	 * Diagnostic function to check analytics status
	 * Call this in the browser console to debug analytics issues
	 * @returns {object} Status information
	 */
	getDiagnostics() {
		const platform = detectPlatform();
		const hasConsent = ConsentManager.hasConsent();
		const available = this.isAvailable();
		
		// Get actual Measurement ID from gtag config if available
		let actualMeasurementId = 'G-' + Config.googleAnalyticsId;
		if (window.dataLayer && window.dataLayer.length > 0) {
			// Try to find the config call in dataLayer
			for (let i = 0; i < window.dataLayer.length; i++) {
				const item = window.dataLayer[i];
				if (Array.isArray(item) && item[0] === 'config' && item[1]) {
					actualMeasurementId = item[1];
					break;
				}
			}
		}
		
		return {
			platform: platform,
			isLocalDevServer: isLocalDevServer(),
			hostname: typeof window !== 'undefined' && window.location ? window.location.hostname : 'unknown',
			port: typeof window !== 'undefined' && window.location ? window.location.port : 'unknown',
			hasConsent: hasConsent,
			isAvailable: available,
			isInitialized: isInitialized,
			platformType: platformType,
			gtagLoaded: gtagLoaded,
			hasGtag: typeof window.gtag === 'function',
			hasDataLayer: typeof window.dataLayer !== 'undefined',
			dataLayerLength: window.dataLayer ? window.dataLayer.length : 0,
			measurementId: actualMeasurementId,
			configMeasurementId: 'G-' + Config.googleAnalyticsId,
			verbose: verbose,
			// Check if gtag script is loaded
			gtagScriptLoaded: !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]'),
			// Recent dataLayer entries for debugging
			recentDataLayerEntries: window.dataLayer ? window.dataLayer.slice(-5) : []
		};
	}
}

/*
from setup::
Google services use CocoaPods to install and manage dependencies. Open a terminal window and navigate to the location of the Xcode project for your app.

Create a Podfile if you don't have one:
pod init
Open the file named 'Podfile' and add the following line to the list of pods for your project:
pod 'Firebase/Analytics'
# or pod 'Firebase/AnalyticsWithoutAdIdSupport'
# for Analytics without IDFA collection capability
Save the file and run:
pod install
This creates an .xcworkspace file for your app. Use this file for all future development on your application. Close your Xcode project, and open the .xcworkspace file that was generated for you in the previous step.


*/



