export class DisplayHTML {
    constructor() {
        this.container = null;
        this.isVisible = false;
    }

	async show(url, rebase) {
        if (this.isVisible) return;
        
        try {
			// Fetch the remote/local HTML content
			console.log('DisplayHTML: Fetching URL:', url, 'rebase:', rebase);
			const response = await fetch(url);
			if (!response.ok) {
				console.error('DisplayHTML: Failed to fetch HTML', { url, status: response.status, statusText: response.statusText });
				return;
			}
			const text = await response.text();
			console.log('DisplayHTML: Fetched', text.length, 'characters from', url);
            
            // Extract body content from full HTML document
            // Create a temporary DOM parser to extract just the body content
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const bodyContent = doc.body || doc.documentElement;
            
            // Get the innerHTML of the body (or document if body doesn't exist)
            let htmlContent = bodyContent.innerHTML;
            
            // If we got the full document, try to get just body
            if (!htmlContent || htmlContent.trim().length === 0) {
                console.warn('DisplayHTML: No body content found, using full text');
                htmlContent = text; // Fallback to full text
            }
            
            console.log('DisplayHTML: Extracted', htmlContent.length, 'characters of content');
            
            // Create container
            this.container = document.createElement('div');
            this.container.style.position = 'absolute';
            this.container.style.top = '0';
            this.container.style.left = '0';
            this.container.style.width = '100%';
            this.container.style.height = '100%';
            this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.container.style.display = 'flex';
            this.container.style.justifyContent = 'center';
            this.container.style.alignItems = 'center';
            this.container.style.zIndex = '9999';
            this.container.style.pointerEvents = 'auto';
            this.container.setAttribute('data-html-dialog', 'true'); // Mark for exclusion from preventDefault

            // Create content box
            const contentBox = document.createElement('div');
            contentBox.style.backgroundColor = '#ffffff';
            contentBox.style.borderRadius = '10px';
            contentBox.style.padding = '20px';
            contentBox.style.width = '80%';
            contentBox.style.maxWidth = '600px';
            contentBox.style.maxHeight = '80vh';
            contentBox.style.position = 'relative';
            contentBox.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
            contentBox.style.pointerEvents = 'auto';
            contentBox.setAttribute('data-html-dialog', 'true');

            // Create close button
            const closeButton = document.createElement('button');
            closeButton.textContent = '×';
            closeButton.style.position = 'absolute';
            closeButton.style.right = '10px';
            closeButton.style.top = '10px';
            closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
            closeButton.style.border = '2px solid #333';
            closeButton.style.borderRadius = '50%';
            closeButton.style.color = '#333';
            closeButton.style.fontSize = '28px';
            closeButton.style.fontWeight = 'bold';
            closeButton.style.cursor = 'pointer';
            closeButton.style.padding = '0';
            closeButton.style.width = '36px';
            closeButton.style.height = '36px';
            closeButton.style.display = 'flex';
            closeButton.style.alignItems = 'center';
            closeButton.style.justifyContent = 'center';
            closeButton.style.zIndex = '10000';
            closeButton.style.lineHeight = '1';
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
            
            // Also close on backdrop click (but not on content box)
            this.container.onclick = (e) => {
                if (e.target === this.container) {
                    this.hide();
                }
            };
            // Prevent content box clicks from closing
            contentBox.onclick = (e) => {
                e.stopPropagation();
            };

            // Create scrollable content area
            const content = document.createElement('div');
            content.style.overflowY = 'auto';
            content.style.maxHeight = 'calc(80vh - 60px)';
            content.style.padding = '10px';
            content.style.color = '#333';
            content.style.fontFamily = 'Arial, sans-serif';
            content.style.lineHeight = '1.5';
            // Ensure content is visible even without external CSS
            content.style.width = '100%';
            content.style.boxSizing = 'border-box';

			// Display the HTML content and rewrite relative resource URLs to absolute
			content.innerHTML = htmlContent;
			
			// Add basic styles to make content visible even without external CSS
			// Style common elements that might be invisible
			console.log('DisplayHTML: Rewriting relative URLs based on', url)
			const style = document.createElement('style');
			style.textContent = `
				/* Ensure content is visible */
				.container { max-width: 100% !important; margin: 0 auto !important; padding: 0 20px !important; }
				.row { margin: 0 !important; }
				.column { float: none !important; width: 100% !important; }
				img { max-width: 100% !important; height: auto !important; display: block !important; }
				h1, h2, h3, h4, h5, h6 { color: #333 !important; margin: 1em 0 !important; }
				p { color: #333 !important; margin: 1em 0 !important; }
				a { color: #0066cc !important; text-decoration: underline !important; touch-action: manipulation !important; -webkit-tap-highlight-color: transparent !important; }
				button, input[type="button"], input[type="submit"] { touch-action: manipulation !important; -webkit-tap-highlight-color: transparent !important; }
				* { color: #333 !important; }
			`;
			content.appendChild(style);
			
			// Mark all interactive elements inside the content for exclusion from preventDefault
			content.querySelectorAll('a, button, input, select, textarea').forEach(el => {
				el.setAttribute('data-html-dialog-button', 'true');
			});
            
            // Always rebase relative URLs to work correctly when HTML is inserted into DOM
            // This ensures relative paths in the HTML are resolved relative to the HTML file's location,
            // not the current page's location
            try
            {
                // Resolve the base URL for the HTML file (works for both remote and local)
                const baseUrl = new URL(url, (typeof location !== 'undefined' ? location.href : ''));
                
                const rewriteAttr = (el, attr) => {
                    const val = el.getAttribute(attr);
                    if (!val) return;
                    // Skip absolute URLs, data URLs, and anchors
                    if (/^(https?:|data:|mailto:|tel:|#)/i.test(val)) return;
                    
                    // Special handling for images: if path starts with ./images/ or images/, rewrite to /images/
                    // This is because images are shared at root /images/ on the server, not in subdirectories
                    if (attr === 'src' && el.tagName === 'IMG' && rebase) {
                        const isImagePath = /^\.?\/?images\//.test(val);
                        if (isImagePath) {
                            // Extract just the filename from the path
                            const filename = val.replace(/^\.?\/?images\//, '');
                            const rootImagePath = `/images/${filename}`;
                            try {
                                // Resolve to full URL
                                const abs = new URL(rootImagePath, baseUrl.origin).href;
                                el.setAttribute(attr, abs);
                                return;
                            } catch (e) {
                                console.warn('Failed to rewrite image path:', val, e);
                            }
                        }
                    }
                    
                    // Resolve relative URLs against the HTML file's base URL
                    try {
                        const abs = new URL(val, baseUrl.href).href;
                        el.setAttribute(attr, abs);
                    } catch (e) {
                        // If URL resolution fails, keep original
                        console.warn('Failed to resolve URL:', val, e);
                    }
                };
                // Images, anchors, stylesheets, scripts
                content.querySelectorAll('img').forEach(img => rewriteAttr(img, 'src'));
                content.querySelectorAll('a').forEach(a => rewriteAttr(a, 'href'));
                content.querySelectorAll('link').forEach(l => rewriteAttr(l, 'href'));
                content.querySelectorAll('script').forEach(s => rewriteAttr(s, 'src'));
            }
            catch(_e){
                console.warn('Error rebasing URLs:', _e);
            }

            // Assemble the dialog
            contentBox.appendChild(closeButton);
            contentBox.appendChild(content);
            this.container.appendChild(contentBox);
            document.body.appendChild(this.container);
			console.log('DisplayHTML: Dialog shown with URL', url)
            this.isVisible = true;
        } catch (error) {
            console.error('DisplayHTML: Error loading HTML dialog', error);
        }
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