import { Config } from "../config.js"

export class Changelog {
    constructor() {
        this.container = null;
        this.isVisible = false;
    }

    async show(overrideLastShown = false, onDone = undefined) {
        //console.log("-------- show changelog", overrideLastShown, onDone)
        if (this.isVisible) 
        {
            if (onDone) onDone()
            return
        }
        this.onDone = onDone
        
        try {
            // Fetch the changelog content with cache buster
            //console.log("-------- fetch changelog.txt?v=${Config.build}")
            const response = await fetch(`changelog.txt?v=${Config.build}`);
            //console.log("-------- response", response)
            var showChangelog = overrideLastShown
            //<debug>
            showChangelog = true // Only show in debugging dev mode. Not in production mode.
            //</debug>
            if (!showChangelog)
            {
                if (onDone) onDone()
               // console.log("-------- returning early")
                return
            }


            const text = await response.text();
            
            // Get the first line (version line)
            const firstLine = text.split('\n')[0];
            
            // Check if we've shown this version before
            const lastShownVersion = localStorage.getItem('lastShownChangelogVersion');
            if (!overrideLastShown && lastShownVersion === firstLine) {
                console.log('Changelog already shown for this version');
                if (onDone) onDone()
                return
            }
            
            // Store the new version
            localStorage.setItem('lastShownChangelogVersion', firstLine);
            
            // Create container
            this.container = document.createElement('div');
            this.container.style.position = 'absolute';
            this.container.style.top = '0';
            this.container.style.left = '0';
            this.container.style.width = '100%';
            this.container.style.height = '100%';
            this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            this.container.style.display = 'flex';
            this.container.style.justifyContent = 'center';
            this.container.style.alignItems = 'center';
            this.container.style.zIndex = '9999';
            this.container.style.pointerEvents = 'auto';
            this.container.setAttribute('data-html-dialog', 'true'); // Mark for exclusion from preventDefault

            // Create content box
            const contentBox = document.createElement('div');
            contentBox.style.backgroundColor = '#2a2a2a';
            contentBox.style.borderRadius = '10px';
            contentBox.style.padding = '20px';
            contentBox.style.width = '80%';
            contentBox.style.maxWidth = '600px';
            contentBox.style.maxHeight = '80vh';
            contentBox.style.position = 'relative';
            contentBox.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
            contentBox.style.pointerEvents = 'auto';
            contentBox.setAttribute('data-html-dialog', 'true');

            // Create close button
            const closeButton = document.createElement('button');
            closeButton.textContent = '×';
            closeButton.style.position = 'absolute';
            closeButton.style.right = '0px';
            closeButton.style.top = '0px';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.color = '#fff';
            closeButton.style.fontSize = '54px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.padding = '5px 10px';
            closeButton.style.touchAction = 'manipulation';
            closeButton.style.setProperty('-webkit-tap-highlight-color', 'transparent');
            closeButton.style.userSelect = 'none';
            closeButton.style.transition = 'opacity 0.1s, transform 0.1s';
            closeButton.setAttribute('data-html-dialog-button', 'true');
            
            // Handle both click and touch events for mobile compatibility
            const handleClose = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                closeButton.style.opacity = '1';
                closeButton.style.transform = 'scale(1)';
                this.hide();
            };
            closeButton.onclick = handleClose;
            closeButton.addEventListener('touchend', handleClose, { passive: false, capture: true });
            
            // Add visual feedback on touch
            closeButton.addEventListener('touchstart', () => {
                closeButton.style.opacity = '0.8';
                closeButton.style.transform = 'scale(0.9)';
            }, { passive: true });

            // Create headline
            const headline = document.createElement('h2');
            headline.textContent = 'Changelog';
            headline.style.color = '#fff';
            headline.style.fontFamily = 'Arial, sans-serif';
            headline.style.margin = '0 0 15px 0';
            headline.style.padding = '0';
            headline.style.fontSize = '24px';

            // Create scrollable content area
            const content = document.createElement('div');
            content.style.overflowY = 'auto';
            content.style.maxHeight = 'calc(80vh - 60px)';
            content.style.padding = '10px';
            content.style.color = '#fff';
            content.style.fontFamily = 'Arial, sans-serif';
            content.style.lineHeight = '1.5';

            // Display the changelog content
            content.innerHTML = text.replace(/\n/g, '<br>');

            // Assemble the dialog
            contentBox.appendChild(closeButton);
            contentBox.appendChild(headline);
            contentBox.appendChild(content);
            this.container.appendChild(contentBox);
            document.body.appendChild(this.container);
            this.isVisible = true;
        } catch (error) {
            console.error('Error loading changelog:', error);
        }
    }

    hide() {
        if (!this.isVisible) return;
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.isVisible = false;
        if (this.onDone) this.onDone()
    }
} 