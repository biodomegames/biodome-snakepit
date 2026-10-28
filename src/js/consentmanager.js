// Consent Manager for GDPR/CCPA compliance
// Manages user consent for analytics and other tracking

const CONSENT_STORAGE_KEY = 'biodome_analytics_consent';
const CONSENT_VERSION = 1; // Increment this if you need to re-ask for consent

export const ConsentManager = {
	/**
	 * Check if user has given consent for analytics
	 * @returns {boolean|null} true if consented, false if declined, null if not yet asked
	 */
	hasConsent: function() {
		try {
			const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
			if (!stored) {
				return null; // Not yet asked
			}
			const consentData = JSON.parse(stored);
			
			// If consent version changed, treat as not asked
			if (consentData.version !== CONSENT_VERSION) {
				return null;
			}
			
			return consentData.consented === true;
		} catch (error) {
			console.error('Error reading consent:', error);
			return null;
		}
	},

	/**
	 * Set user consent for analytics
	 * @param {boolean} consented - Whether user consented
	 */
	setConsent: function(consented) {
		try {
			const consentData = {
				consented: consented === true,
				version: CONSENT_VERSION,
				timestamp: Date.now()
			};
			localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));
			return true;
		} catch (error) {
			console.error('Error saving consent:', error);
			return false;
		}
	},

	/**
	 * Check if consent dialog should be shown (user hasn't been asked yet)
	 * @returns {boolean}
	 */
	shouldShowConsentDialog: function() {
		return this.hasConsent() === null;
	},

	/**
	 * Get consent version (useful for re-asking if privacy policy changes)
	 * @returns {number}
	 */
	getConsentVersion: function() {
		return CONSENT_VERSION;
	},

	clear: function() {
		localStorage.removeItem(CONSENT_STORAGE_KEY);
	}
}

