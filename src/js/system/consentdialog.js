// Consent Dialog for GDPR/CCPA compliance
// Shows a privacy consent dialog on first launch

import { ConsentManager } from './consentmanager.js';
import { Analytics } from './analytics.js';

export class ConsentDialog {
    constructor() {
        this.container = null;
        this.isVisible = false;
    }

    /**
     * Show the consent dialog if user hasn't been asked yet and analytics is available
     * @param {Function} onConsent - Callback when user makes a choice (consented: boolean)
     * @returns {boolean} true if dialog was shown, false if already asked or not available
     */
    showIfNeeded(onConsent) {
        //<frvr>
        onConsent(false);
        return false;
        //</frvr>
        // First check if analytics is available - don't ask if it's not
        if (!Analytics.isAvailable()) {
            if (onConsent) {
                // Analytics not available, so no consent needed
                onConsent(false);
            }
            return false;
        }

        // Check if we need to show the dialog
        if (!ConsentManager.shouldShowConsentDialog()) {
            // User has already been asked, just call callback with their choice
            const hasConsent = ConsentManager.hasConsent();
            if (onConsent) {
                onConsent(hasConsent === true);
            }
            return false;
        }

        // Show the dialog
        this.show(onConsent);
        return true;
    }

    /**
     * Show the consent dialog
     * @param {Function} onConsent - Callback when user makes a choice (consented: boolean)
     */
    show(onConsent) {
        if (this.isVisible) return;
        
        // Create container
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.container.style.display = 'flex';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.zIndex = '10000';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.pointerEvents = 'auto';
        this.container.setAttribute('data-consent-dialog', 'true'); // Mark for exclusion from preventDefault

        // Create content box
        const contentBox = document.createElement('div');
        contentBox.style.backgroundColor = '#2a2a2a';
        contentBox.style.borderRadius = '12px';
        contentBox.style.padding = '30px';
        contentBox.style.width = '85%';
        contentBox.style.maxWidth = '500px';
        contentBox.style.maxHeight = '85vh';
        contentBox.style.position = 'relative';
        contentBox.style.boxShadow = '0 0 30px rgba(0,0,0,0.7)';
        contentBox.style.overflowY = 'auto';
        contentBox.style.pointerEvents = 'auto';
        contentBox.setAttribute('data-consent-dialog', 'true');

        // Create title
        const title = document.createElement('h2');
        title.textContent = 'Privacy & Analytics';
        title.style.color = '#fff';
        title.style.marginTop = '0';
        title.style.marginBottom = '20px';
        title.style.fontSize = '24px';
        title.style.fontWeight = 'bold';

        // Create message
        const message = document.createElement('p');
        message.innerHTML = 'We use Google Analytics to understand how players interact with our game. This helps us improve the gameplay experience.<br><br>Your data is collected anonymously and used only for analytics purposes.';
        message.style.color = '#ddd';
        message.style.lineHeight = '1.6';
        message.style.marginBottom = '30px';
        message.style.fontSize = '16px';

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '15px';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.flexWrap = 'wrap';

        // Create "Accept" button
        const acceptButton = document.createElement('button');
        acceptButton.textContent = 'Accept';
        acceptButton.style.padding = '12px 30px';
        acceptButton.style.fontSize = '16px';
        acceptButton.style.borderRadius = '6px';
        acceptButton.style.border = 'none';
        acceptButton.style.backgroundColor = '#4CAF50';
        acceptButton.style.color = '#fff';
        acceptButton.style.cursor = 'pointer';
        acceptButton.style.fontWeight = 'bold';
        acceptButton.style.flex = '1';
        acceptButton.style.minWidth = '120px';
        acceptButton.style.touchAction = 'manipulation';
        acceptButton.style.setProperty('-webkit-tap-highlight-color', 'transparent');
        acceptButton.style.userSelect = 'none';
        acceptButton.style.transition = 'opacity 0.1s, transform 0.1s, background-color 0.2s';
        acceptButton.setAttribute('data-consent-button', 'true'); // Mark for exclusion from preventDefault
        
        // Handle both click and touch events for mobile compatibility
        const handleAccept = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            acceptButton.style.opacity = '1';
            acceptButton.style.transform = 'scale(1)';
            ConsentManager.setConsent(true);
            this.hide();
            if (onConsent) {
                onConsent(true);
            }
        };
        acceptButton.onclick = handleAccept;
        acceptButton.addEventListener('touchend', handleAccept, { passive: false, capture: true });
        
        // Add visual feedback on touch
        acceptButton.addEventListener('touchstart', (e) => {
            acceptButton.style.opacity = '0.8';
            acceptButton.style.transform = 'scale(0.98)';
        }, { passive: true });
        
        // Hover effects (desktop only)
        acceptButton.onmouseover = () => acceptButton.style.backgroundColor = '#45a049';
        acceptButton.onmouseout = () => acceptButton.style.backgroundColor = '#4CAF50';

        // Create "Decline" button
        const declineButton = document.createElement('button');
        declineButton.textContent = 'Decline';
        declineButton.style.padding = '12px 30px';
        declineButton.style.fontSize = '16px';
        declineButton.style.borderRadius = '6px';
        declineButton.style.border = 'none';
        declineButton.style.backgroundColor = '#666';
        declineButton.style.color = '#fff';
        declineButton.style.cursor = 'pointer';
        declineButton.style.fontWeight = 'bold';
        declineButton.style.flex = '1';
        declineButton.style.minWidth = '120px';
        declineButton.style.touchAction = 'manipulation';
        declineButton.style.setProperty('-webkit-tap-highlight-color', 'transparent');
        declineButton.style.userSelect = 'none';
        declineButton.style.transition = 'opacity 0.1s, transform 0.1s, background-color 0.2s';
        declineButton.setAttribute('data-consent-button', 'true'); // Mark for exclusion from preventDefault
        
        // Handle both click and touch events for mobile compatibility
        const handleDecline = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            declineButton.style.opacity = '1';
            declineButton.style.transform = 'scale(1)';
            ConsentManager.setConsent(false);
            this.hide();
            if (onConsent) {
                onConsent(false);
            }
        };
        declineButton.onclick = handleDecline;
        declineButton.addEventListener('touchend', handleDecline, { passive: false, capture: true });
        
        // Add visual feedback on touch
        declineButton.addEventListener('touchstart', (e) => {
            declineButton.style.opacity = '0.8';
            declineButton.style.transform = 'scale(0.98)';
        }, { passive: true });
        
        // Hover effects (desktop only)
        declineButton.onmouseover = () => declineButton.style.backgroundColor = '#555';
        declineButton.onmouseout = () => declineButton.style.backgroundColor = '#666';

        // Assemble the dialog
        buttonContainer.appendChild(acceptButton);
        buttonContainer.appendChild(declineButton);
        contentBox.appendChild(title);
        contentBox.appendChild(message);
        contentBox.appendChild(buttonContainer);
        this.container.appendChild(contentBox);
        document.body.appendChild(this.container);
        this.isVisible = true;
    }

    hide() {
        if (!this.isVisible) return;
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.isVisible = false;
    }
}

