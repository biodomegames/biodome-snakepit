const IOS_DEVICE_REGEX = /iphone|ipad|ipod/i;

export function isIOSDevice() {
	return typeof navigator !== 'undefined' && IOS_DEVICE_REGEX.test(navigator.userAgent);
}

export function isCordova() {
	return typeof window.cordova !== 'undefined' || 
	document.URL.indexOf('http://') === -1 && 
	document.URL.indexOf('https://') === -1;
}

function isStandaloneDisplayMode() {
	if (typeof window === 'undefined') return false;

	try {
		if (window.matchMedia && typeof window.matchMedia === 'function') {
			const mq = window.matchMedia('(display-mode: standalone)');
			if (mq && mq.matches) {
				return true;
			}
		}
	} catch (err) {
		// matchMedia might throw in old browsers; ignore
	}

	return typeof navigator !== 'undefined' && navigator.standalone === true;
}

function isCordovaIOS() {
	return typeof window !== 'undefined' && typeof window.cordova !== 'undefined' && isIOSDevice();
}

export function shouldUseIOSViewportFixes() {
	return isIOSDevice() && (isCordovaIOS() || isStandaloneDisplayMode());
}

function attachAdMobPluginFromCordova() {
	if (typeof window === 'undefined') {
		return false;
	}

	if (window.admob) {
		return true;
	}

	try {
		if (window.cordova && typeof window.cordova.require === 'function') {
			const plugin = window.cordova.require('admob-plus-cordova.AdMob');
			if (plugin) {
				window.admob = plugin;
				return true;
			}
		}
	} catch (error) {
		console.warn('Unable to load AdMob plugin via cordova.require:', error);
	}

	return false;
}

export async function ensureAdMobPluginLoaded(self, timeoutMs = 8000) {
	if (!self.isCordova || typeof window === 'undefined') {
		return false
	}

	if (self.admobPluginReady && window.admob) {
		return true
	}

	if (attachAdMobPluginFromCordova()) {
		self.admobPluginReady = true
		return true
	}

	if (self._admobPluginPromise) {
		return this._admobPluginPromise
	}

	self._admobPluginPromise = new Promise((resolve) => {
		let completed = false
		let pollId = null
		let timeoutId = null

		const cleanup = () => {
			document.removeEventListener('admob.ready', onPossibleReady)
			if (pollId) {
				window.clearInterval(pollId)
				pollId = null
			}
			if (timeoutId) {
				window.clearTimeout(timeoutId)
				timeoutId = null
			}
		}

		const finish = (result) => {
			if (completed) {
				return
			}
			completed = true
			if (result) {
				self.admobPluginReady = true
			}
			cleanup()
			resolve(result)
		}

		const onPossibleReady = () => {
			if (attachAdMobPluginFromCordova()) {
				finish(true)
			}
		}

		document.addEventListener('admob.ready', onPossibleReady, { once: true })
		pollId = window.setInterval(onPossibleReady, 200)
		timeoutId = window.setTimeout(() => {
			console.warn('Timed out waiting for AdMob plugin readiness')
			finish(false)
		}, timeoutMs)
	}).finally(() => {
		self._admobPluginPromise = null
	})

	return this._admobPluginPromise
}

export function detectPlatform() {
	//<frvr>
	if (FRVR)
		return 'frvr';
	//</frvr>
	
	if (!isCordova()) return 'browser';
	
	if (window.device) {
		return window.device.platform.toLowerCase();
	}
	
	// Fallback detection based on user agent
	const ua = navigator.userAgent.toLowerCase();
	console.log("platform detect: ", ua)
	
	// Check for explicit iOS device names
	if (ua.indexOf('iphone') !== -1 || ua.indexOf('ipad') !== -1) {
		return 'ios';
	}
	
	// Modern iOS (15+) may report macOS user agent, but includes "mobile/" version identifier
	// Pattern: "mobile/15e148" or similar indicates iOS
	if (ua.indexOf('mobile/') !== -1 && ua.indexOf('macintosh') !== -1) {
		// This is iOS Safari reporting as macOS
		return 'ios';
	}
	
	// Additional iOS detection: check for iOS-specific features
	// iOS devices have navigator.standalone (PWA) or touch support
	if (typeof navigator !== 'undefined') {
		// Check for iOS-specific standalone mode (PWA)
		if (navigator.standalone === true) {
			return 'ios';
		}
		
		// Check for touch support combined with macOS-like UA (likely iOS)
		if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
			// If it looks like macOS but has touch, it's likely iOS
			if (ua.indexOf('macintosh') !== -1 && ua.indexOf('applewebkit') !== -1) {
				return 'ios';
			}
		}
	}
	
	if (ua.indexOf('android') !== -1) {
		return 'android';
	}
	
	return 'unknown';
}