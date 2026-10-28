export class DebugConsole {
    constructor() {
        this.console = document.createElement('div');
        this.console.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 200px;
            background: rgba(0,0,0,0.8);
            color: white;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            z-index: 9999;
            display: none;
            touch-action: pan-y;
        `;
        this.console.setAttribute('data-html-dialog', 'true');
        document.body.appendChild(this.console);
        
        // Add toggle button with mobile touch handling
        this.toggleButton = this.createMobileButton('Debug', {
            position: 'fixed',
            bottom: '200px',
            right: '10px',
            background: '#333',
            color: 'white'
        }, () => this.toggle());
        document.body.appendChild(this.toggleButton);
        
        // Add crash log viewer button with mobile touch handling
        this.crashLogButton = this.createMobileButton('Crash Logs', {
            position: 'fixed',
            bottom: '240px',
            right: '10px',
            background: '#ff4444',
            color: 'white'
        }, () => {
            if (window.crashLogViewer) {
                window.crashLogViewer.show();
            } else {
                console.error('Crash log viewer not available');
            }
        });
        document.body.appendChild(this.crashLogButton);
        
        // Store original console methods
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        
        // Override console methods
        console.log = (...args) => {
            this.originalConsole.log.apply(console, args);
            this.log('LOG: ' + args.join(' '));
        };
        
        console.error = (...args) => {
            this.originalConsole.error.apply(console, args);
            this.log('ERROR: ' + args.join(' '));
        };
        
        console.warn = (...args) => {
            this.originalConsole.warn.apply(console, args);
            this.log('WARN: ' + args.join(' '));
        };
        
        console.info = (...args) => {
            this.originalConsole.info.apply(console, args);
            this.log('INFO: ' + args.join(' '));
        };
        
        // Log initial message to verify console is working
        this.log('Debug console initialized');
        this.log('Environment: ' + (window.cordova ? 'Cordova' : 'Web'));
        this.log('Document URL: ' + document.URL);
    }
    
    createMobileButton(text, styleOverrides, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        
        // Base styles
        const baseStyles = {
            padding: '5px 10px',
            border: 'none',
            borderRadius: '5px',
            zIndex: '10000',
            cursor: 'pointer',
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            transition: 'opacity 0.1s, transform 0.1s',
            ...styleOverrides
        };
        
        // Apply styles
        Object.assign(button.style, baseStyles);
        button.style.setProperty('-webkit-tap-highlight-color', 'transparent');
        
        // Add data attributes for mobile touch handling
        button.setAttribute('data-html-dialog-button', 'true');
        
        // Add click handler
        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            onClick();
        };
        
        // Add touch handlers for mobile
        button.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            button.style.opacity = '0.7';
            button.style.transform = 'scale(0.95)';
        }, { passive: true });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            button.style.opacity = '1';
            button.style.transform = 'scale(1)';
            onClick();
        }, { passive: false });
        
        return button;
    }
    
    log(message) {
        const line = document.createElement('div');
        line.textContent = message;
        this.console.appendChild(line);
        this.console.scrollTop = this.console.scrollHeight;
    }
    
    toggle() {
        this.console.style.display = this.console.style.display === 'none' ? 'block' : 'none';
    }

    destroy() {
        this.console.remove();
        this.toggleButton.remove();
        if (this.crashLogButton) {
            this.crashLogButton.remove();
        }
    }
} 