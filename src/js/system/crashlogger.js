export class CrashLogger {
    constructor() {
        this.storageKey = 'biodome_crash_logs';
        this.sessionKey = 'biodome_crash_logger_session';
        this.maxLogs = 150; // Keep last 50 crash logs
        this.isInitialized = false;
        this.originalConsoleError = console.error;
        this.originalConsoleWarn = console.warn;
        this.crashCount = 0;
        
        // Track current session start time
        this.currentSessionStart = Date.now();
        this.storeSessionStart();
        
        this.init();
    }
    
    storeSessionStart() {
        try {
            // First, read the existing session start time and save it as previous
            const existing = localStorage.getItem(this.sessionKey);
            let previousSessionStart = null;
            
            if (existing) {
                try {
                    const existingData = JSON.parse(existing);
                    previousSessionStart = existingData.startTime;
                } catch (e) {
                    // Ignore parse errors
                }
            }
            
            // Now store the new session data with both current and previous
            const sessionData = {
                startTime: this.currentSessionStart,
                previousSessionStart: previousSessionStart,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
            //<debug>
            console.log('[CrashLogger] Session start stored:', {
                current: this.currentSessionStart,
                    previous: previousSessionStart
                });
            //</debug>
        } catch (error) {
            console.error('Failed to store session start:', error);
        }
    }
    
    getPreviousSessionStart() {
        try {
            const stored = localStorage.getItem(this.sessionKey);
            if (stored) {
                const sessionData = JSON.parse(stored);
                return sessionData.previousSessionStart || null;
            }
        } catch (error) {
            console.error('Failed to get previous session start:', error);
        }
        return null;
    }

    init() {
        if (this.isInitialized) return;
        //<debug>
        console.log("CrashLogger init")
        //</debug>
        try {
            // Set up global error handlers
            //<debug>
            console.log('[CrashLogger] Setting up error handlers...');
            //</debug>
            this.setupGlobalErrorHandlers();
            //<debug>
            console.log('[CrashLogger] Error handlers set up');
            //</debug>
            // Override console methods to capture errors
            this.setupConsoleCapture();
            
            // Set up unhandled promise rejection handler
            this.setupPromiseRejectionHandler();
            
            this.isInitialized = true;
            //<debug>
            console.log('CrashLogger initialized');
            //</debug>
            
            // Log successful initialization (but don't call logEvent if it might cause recursion)
            setTimeout(() => {
                try {
                    this.logEvent('crash_logger_initialized', {
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        platform: window.dome?.platform || 'unknown',
                        cordova: !!window.cordova
                    });
                } catch (error) {
                    console.debug('Could not log crash logger initialization event:', error.message);
                }
            }, 100);
            
        } catch (error) {
            console.error('Failed to initialize CrashLogger:', error);
        }
    }

    setupGlobalErrorHandlers() {
        //<debug>
        console.log('[CrashLogger] Setting up global error handlers...');
        //</debug>
        
        // Capture JavaScript errors (bubbling phase for script errors)
        window.addEventListener('error', (event) => {
            // Skip resource loading errors (they have event.target as the element)
            // Script errors have event.target === window, null, or undefined, OR event.error is defined
            const isResourceError = event.target !== null && event.target !== window && event.target !== undefined && 
                                   event.target instanceof HTMLElement;
            
            if (!isResourceError) {
                // Debug logging
                this.originalConsoleError('[CrashLogger] JavaScript error handler triggered:', event.message, {
                    target: event.target,
                    error: event.error,
                    filename: event.filename,
                    lineno: event.lineno
                });
                
                this.handleError('JavaScript Error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error ? this.serializeError(event.error) : null,
                    stack: event.error?.stack || null
                });
            }
        }, false); // Bubbling phase for script errors
        
        //<debug>
        console.log('[CrashLogger] JavaScript error handler registered');
        //</debug>

        // Capture resource loading errors (capture phase)
        window.addEventListener('error', (event) => {
            // Handle resource loading errors (IMG, SCRIPT, LINK, etc.)
            if (event.target !== window && event.target !== null) {
                const target = event.target;
                if (target instanceof HTMLElement) {
                    const tagName = target.tagName;
                    if (tagName === 'IMG' || tagName === 'SCRIPT' || tagName === 'LINK' || tagName === 'IFRAME') {
                        const src = (target instanceof HTMLImageElement || target instanceof HTMLScriptElement) ? target.src : 
                                   (target instanceof HTMLLinkElement) ? target.href : null;
                        this.handleError('Resource Loading Error', {
                            type: tagName,
                            src: src,
                            message: event.message
                        });
                    }
                }
            }
        }, true); // Capture phase for resource errors

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            // Debug logging
            this.originalConsoleError('[CrashLogger] Unhandled promise rejection handler triggered:', event.reason, event);
            
            this.handleError('Unhandled Promise Rejection', {
                reason: event.reason ? this.serializeError(event.reason) : event.reason,
                promise: event.promise ? '[Promise]' : null
            });
        });
        
        //<debug>
        console.log('[CrashLogger] Promise rejection handler registered');
        //</debug>
    }

    setupConsoleCapture() {
        // Override console.error to capture errors
        /*
        console.error = (...args) => {
            this.originalConsoleError.apply(console, args);
            
            // Prevent infinite loops by checking if this is from our own error handling
            const errorMessage = args.join(' ');
            if (errorMessage.includes('CrashLogger') || errorMessage.includes('crash_logger')) {
                return;
            }
            
            // Check if this looks like an error worth logging
            if (this.isSignificantError(errorMessage)) {
                try {
                    this.handleError('Console Error', {
                        message: errorMessage,
                        args: args.map(arg => this.serializeError(arg))
                    });
                } catch (error) {
                    // Silently fail to prevent recursion
                }
            }
        };
        */
        // Override console.warn to capture warnings
        /*
        console.warn = (...args) => {
            this.originalConsoleWarn.apply(console, args);
            
            const warningMessage = args.join(' ');
            if (warningMessage.includes('CrashLogger') || warningMessage.includes('crash_logger')) {
                return;
            }
            
            if (this.isSignificantError(warningMessage)) {
                try {
                    this.handleError('Console Warning', {
                        message: warningMessage,
                        args: args.map(arg => this.serializeError(arg))
                    });
                } catch (error) {
                    // Silently fail to prevent recursion
                }
            }
        };
        */
    }

    setupPromiseRejectionHandler() {
        // Additional promise rejection handler for older browsers
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Unhandled Promise Rejection', {
                reason: event.reason ? this.serializeError(event.reason) : event.reason,
                type: typeof event.reason
            });
        });
    }

    isSignificantError(message) {
        if (!message || typeof message !== 'string') return false;
        
        // Filter out common non-critical errors
        const ignorePatterns = [
            'favicon.ico',
            'Failed to load resource',
            'net::ERR_INTERNET_DISCONNECTED',
            'net::ERR_NETWORK_CHANGED',
            'AdMob',
            'analytics'
        ];
        
        return !ignorePatterns.some(pattern => 
            message.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    handleError(type, errorData) {
        try {
            this.crashCount++;
            
            const crashLog = {
                id: this.generateCrashId(),
                type: type,
                timestamp: new Date().toISOString(),
                timestampMs: Date.now(),
                count: this.crashCount,
                data: errorData,
                context: this.getContextInfo(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                platform: window.dome?.platform || 'unknown',
                cordova: !!window.cordova,
                memory: this.getMemoryInfo(),
                screen: this.getScreenInfo(),
                sessionStart: this.currentSessionStart // Track which session this error belongs to
            };

            // Store the crash log
            this.storeCrashLog(crashLog);
            //<debug>
            console.log('[CrashLogger] Error logged:', type, 'at', crashLog.timestampMs, 'session start:', this.currentSessionStart);
            //</debug>
            
            // Send to analytics if available (don't let this cause errors)
            try {
                this.reportToAnalytics(crashLog);
            } catch (analyticsError) {
                // Silently fail - analytics is optional
            }
            
            // Log to console for debugging (but use original console to avoid recursion)
            this.originalConsoleError(`[CrashLogger] ${type}:`, crashLog);
            
        } catch (error) {
            // Use original console to avoid recursion
            this.originalConsoleError('Error in CrashLogger.handleError:', error);
        }
    }

    getContextInfo() {
        try {
            return {
                gameState: this.getGameState(),
                performance: this.getPerformanceInfo(),
                device: this.getDeviceInfo(),
                network: this.getNetworkInfo()
            };
        } catch (error) {
            return { error: 'Failed to get context info' };
        }
    }

    getGameState() {
        try {
            // Try to get current game state if available
            if (window.game && typeof window.game.getState === 'function') {
                return window.game.getState();
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    getPerformanceInfo() {
        try {
            if (performance && performance.memory) {
                return {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    getDeviceInfo() {
        try {
            const info = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            };

            // Add Cordova device info if available
            if (window.device) {
                info.device = {
                    model: window.device.model,
                    platform: window.device.platform,
                    version: window.device.version,
                    manufacturer: window.device.manufacturer,
                    isVirtual: window.device.isVirtual,
                    serial: window.device.serial
                };
            }

            return info;
        } catch (error) {
            return { error: 'Failed to get device info' };
        }
    }

    getNetworkInfo() {
        try {
            if (navigator.connection) {
                return {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt,
                    saveData: navigator.connection.saveData
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    getMemoryInfo() {
        try {
            if (performance && performance.memory) {
                return {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    getScreenInfo() {
        try {
            return {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
                orientation: screen.orientation?.type || 'unknown'
            };
        } catch (error) {
            return null;
        }
    }

    serializeError(error) {
        if (error === null || error === undefined) return error;
        
        if (typeof error === 'string') return error;
        
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        }
        
        if (typeof error === 'object') {
            try {
                return JSON.parse(JSON.stringify(error));
            } catch (e) {
                return '[Object - could not serialize]';
            }
        }
        
        return String(error);
    }

    generateCrashId() {
        return 'crash_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    storeCrashLog(crashLog) {
        try {
            const existingLogs = this.getStoredCrashLogs();
            existingLogs.push(crashLog);
            
            // Keep only the most recent logs
            if (existingLogs.length > this.maxLogs) {
                existingLogs.splice(0, existingLogs.length - this.maxLogs);
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(existingLogs));
            
        } catch (error) {
            console.error('Failed to store crash log:', error);
        }
    }

    getStoredCrashLogs() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to retrieve stored crash logs:', error);
            return [];
        }
    }

    reportToAnalytics(crashLog) {
        try {
            // Try to access Analytics if it's available globally
            if (window.Analytics && window.Analytics.trackView) {
                // Send crash event to analytics
                window.Analytics.trackView('crash_occurred');
            }
            
            // Try Firebase Analytics if available
            if (window.ga && window.ga.logEvent) {
                window.ga.logEvent('crash', {
                    crash_type: crashLog.type,
                    crash_count: crashLog.count,
                    platform: crashLog.platform
                });
            }
        } catch (error) {
            // Silently fail - analytics is optional
            console.debug('Analytics not available for crash reporting:', error.message);
        }
    }

    logEvent(eventName, data) {
        try {
            const event = {
                id: this.generateCrashId(),
                type: 'Event',
                eventName: eventName,
                timestamp: new Date().toISOString(),
                data: data,
                context: this.getContextInfo()
            };
            
            this.storeCrashLog(event);
        } catch (error) {
            console.error('Failed to log event:', error);
        }
    }

    // Public methods for retrieving crash logs
    getAllCrashLogs() {
        return this.getStoredCrashLogs();
    }

    getCrashLogsByType(type) {
        const logs = this.getStoredCrashLogs();
        return logs.filter(log => log.type === type);
    }

    getRecentCrashLogs(count = 10) {
        const logs = this.getStoredCrashLogs();
        return logs.slice(-count);
    }

    exportCrashLogs() {
        try {
            const logs = this.getAllCrashLogs();
            const exportData = {
                exportTimestamp: new Date().toISOString(),
                totalLogs: logs.length,
                crashCount: this.crashCount,
                logs: logs
            };
            
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Failed to export crash logs:', error);
            return null;
        }
    }

    clearCrashLogs() {
        try {
            localStorage.removeItem(this.storageKey);
            this.crashCount = 0;
            //<debug>
            console.log('Crash logs cleared');
            //</debug>
        } catch (error) {
            console.error('Failed to clear crash logs:', error);
        }
    }

    getCrashStats() {
        const logs = this.getAllCrashLogs();
        const stats = {
            totalLogs: logs.length,
            crashCount: this.crashCount,
            byType: {},
            recentCount: 0
        };
        
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        logs.forEach(log => {
            // Count by type
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
            
            // Count recent logs
            if (log.timestampMs > oneDayAgo) {
                stats.recentCount++;
            }
        });
        
        return stats;
    }

    // Method to manually trigger a crash log (for testing)
    logManualCrash(message, data = {}) {
        this.handleError('Manual Crash Report', {
            message: message,
            data: data
        });
    }

    // Method to test the crash logger
    testCrashLogger() {
        try {
            // Test error logging
            this.logManualCrash('Test crash log', { test: true });
            
            // Test console error capture
            console.error('Test console error for crash logger');
            
            //<debug>
            console.log('CrashLogger test completed');
            //</debug>
            return true;
        } catch (error) {
            console.error('CrashLogger test failed:', error);
            return false;
        }
    }
    
    // Trigger a test JavaScript error that will be caught by the global error handler
    // This throws an error in setTimeout so it's not caught by try-catch
    triggerTestJavaScriptError(message = 'Test JavaScript error from console') {
        setTimeout(() => {
            throw new Error(message);
        }, 0);
    }
    
    // Trigger a test promise rejection that will be caught by the unhandled rejection handler
    triggerTestPromiseRejection(message = 'Test promise rejection from console') {
        Promise.reject(new Error(message));
    }
    
    // Check for errors in the previous session
    checkPreviousSessionErrors() {
        try {
            const previousSessionStart = this.getPreviousSessionStart();
            //<debug>
            console.log('[CrashLogger] Checking previous session errors:', {
                previousSessionStart,
                currentSessionStart: this.currentSessionStart,
                hasPreviousSession: !!previousSessionStart
            });
            //</debug>
            
            if (!previousSessionStart || previousSessionStart >= this.currentSessionStart) {
                // No previous session or this is the first session
                //<debug>
                console.log('[CrashLogger] No previous session found or first session');
                //</debug>
                return { hasErrors: false, errors: [], promiseRejections: [] };
            }
            
            const allLogs = this.getAllCrashLogs();
            //<debug>
            console.log('[CrashLogger] Total logs:', allLogs.length);
            //</debug>
            
            // Get logs from previous session (between previous session start and current session start)
            const previousSessionLogs = allLogs.filter(log => {
                if (!log.timestampMs) {
                    // Try to parse timestamp if timestampMs is missing
                    if (log.timestamp) {
                        log.timestampMs = new Date(log.timestamp).getTime();
                    } else {
                        return false;
                    }
                }
                return log.timestampMs >= previousSessionStart && log.timestampMs < this.currentSessionStart;
            });
            
            //<debug>
            console.log('[CrashLogger] Previous session logs:', previousSessionLogs.length, previousSessionLogs);
            //</debug>
            
            const errors = previousSessionLogs.filter(log => 
                log.type === 'JavaScript Error' || 
                log.type === 'Resource Loading Error' ||
                log.type === 'Console Error'
            );
            
            const promiseRejections = previousSessionLogs.filter(log => 
                log.type === 'Unhandled Promise Rejection'
            );
            
            //<debug>
            console.log('[CrashLogger] Found errors:', errors.length, 'promise rejections:', promiseRejections.length);
            //</debug>
            
            return {
                hasErrors: errors.length > 0 || promiseRejections.length > 0,
                errors: errors,
                promiseRejections: promiseRejections,
                totalErrors: errors.length + promiseRejections.length
            };
        } catch (error) {
            console.error('Failed to check previous session errors:', error);
            return { hasErrors: false, errors: [], promiseRejections: [] };
        }
    }
    
    // Check and show previous session errors (public method to call on startup)
    checkAndShowPreviousSessionErrors() {
        try {
            //<debug>
            console.log('[CrashLogger] Checking and showing previous session errors...');
            //</debug>
            const result = this.checkPreviousSessionErrors();
            //<debug>
            console.log('[CrashLogger] Check result:', result);
            //</debug>
            if (result.hasErrors) {
                //<debug>
                console.log('[CrashLogger] Showing error dialog for previous session');
                //</debug>
                this.showPreviousSessionErrorDialog();
            } else {
                //<debug>
                console.log('[CrashLogger] No errors found in previous session');
                //</debug>
            }
        } catch (error) {
            console.error('Failed to check and show previous session errors:', error);
        }
    }
    
    // Show minimal UI for previous session errors
    showPreviousSessionErrorDialog() {
        const result = this.checkPreviousSessionErrors();
        if (!result.hasErrors) {
            return; // No errors, don't show dialog
        }
        
        // Create minimal UI dialog
        const dialog = document.createElement('div');
        dialog.id = 'crash-logger-error-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            font-family: Arial, sans-serif;
        `;
        dialog.setAttribute('data-html-dialog', 'true');
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: #2a2a2a;
            border-radius: 12px;
            padding: 30px;
            max-width: 90%;
            width: 400px;
            color: white;
            text-align: center;
            box-shadow: 0 0 30px rgba(0,0,0,0.7);
        `;
        
        const title = document.createElement('h3');
        title.textContent = '⚠️ Error Detected';
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #ff4444;
            font-size: 24px;
        `;
        
        const message = document.createElement('p');
        message.textContent = `An error occurred in the previous session. Would you like to export the crash log to help fix the issue?`;
        message.style.cssText = `
            margin: 0 0 25px 0;
            color: #ddd;
            line-height: 1.6;
            font-size: 16px;
        `;
        
        const errorCount = document.createElement('div');
        errorCount.textContent = `Errors: ${result.errors.length} | Promise Rejections: ${result.promiseRejections.length}`;
        errorCount.style.cssText = `
            margin: 0 0 25px 0;
            color: #aaa;
            font-size: 14px;
        `;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        `;
        
        const exportBtn = this.createMobileButton('Export Crash Log', {
            background: '#4CAF50',
            color: 'white',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold'
        }, async () => {
            await this.exportCrashLogsToFile();
            dialog.remove();
        });
        
        const dismissBtn = this.createMobileButton('Dismiss', {
            background: '#666',
            color: 'white',
            padding: '12px 24px',
            fontSize: '16px'
        }, () => {
            // Close crash log viewer if it's open
            if (window.crashLogViewer && window.crashLogViewer.isVisible) {
                window.crashLogViewer.hide();
            }
            // Remove dialog immediately to prevent any other events
            if (dialog && dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        });
        
        const viewBtn = this.createMobileButton('View Details', {
            background: '#2196F3',
            color: 'white',
            padding: '12px 24px',
            fontSize: '16px'
        }, () => {
            // Remove dialog first to prevent event conflicts
            if (dialog && dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
            // Then show crash log viewer
            if (window.crashLogViewer) {
                window.crashLogViewer.show();
            }
        });
        
        buttonContainer.appendChild(exportBtn);
        buttonContainer.appendChild(viewBtn);
        buttonContainer.appendChild(dismissBtn);
        
        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(errorCount);
        content.appendChild(buttonContainer);
        dialog.appendChild(content);
        
        document.body.appendChild(dialog);
    }
    
    // Export crash logs to a downloadable file
    async saveBlob(blob, filename) {
        const isCordova = typeof window !== 'undefined' && window.cordova;
        
        // For Cordova, save to temp directory first, then share
        if (isCordova && window.resolveLocalFileSystemURL && navigator.share) {
            try {
                // Use cache directory for temporary file (better for sharing)
                const tempDir = window.cordova.file?.cacheDirectory || 
                               window.cordova.file?.tempDirectory ||
                               window.cordova.file?.documentsDirectory;
                
                if (tempDir) {
                    // Save file first
                    await this.writeFileCordova(tempDir, filename, blob);
                    
                    // Get the file entry and create a File object for sharing
                    const filePath = tempDir + filename;
                    const fileEntry = await this.getFileEntry(filePath);
                    const file = await this.fileEntryToFile(fileEntry, filename);
                    
                    // Try to share the file
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: 'Crash Log Export',
                            text: 'Crash log export from Wordy Snaps'
                        });
                        return 'shared';
                    }
                }
            } catch (e) {
                // If sharing fails, fall through to regular save
                if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
                    //<debug>
                    console.log('Cordova share failed, falling back to file save:', e);
                    //</debug>
                }
            }
        }
        
        // Try Web Share API first (iOS/Android native share sheet) - for non-Cordova or fallback
        if (navigator.share) {
            try {
                // Create File object from blob for sharing
                const file = new File([blob], filename, { type: 'application/json' });
                
                // Check if we can share files (some browsers/platforms support this)
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Crash Log Export',
                        text: 'Crash log export from Wordy Snaps'
                    });
                    return 'shared'; // Indicate that sharing was used
                }
            } catch (e) {
                // User cancelled or share failed, fall through to file save
                if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
                    //<debug>
                    console.log('Share failed, falling back to file save:', e);
                    //</debug>
                }
                // If sharing isn't supported or user cancelled, continue to file save
            }
        }

        // Cordova (if available) - save to Documents directory
        if (isCordova && window.resolveLocalFileSystemURL) {
            try {
                const dir = window.cordova.file?.documentsDirectory || 
                           window.cordova.file?.externalDataDirectory || 
                           window.cordova.file?.dataDirectory;
                if (dir) {
                    await this.writeFileCordova(dir, filename, blob);
                    return true;
                }
            } catch (e) {
                console.error('Cordova file save failed, falling back to browser download:', e);
                // Fallback to browser download
            }
        }

        // Browser fallback: trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
        return true;
    }

    getFileEntry(filePath) {
        return new Promise((resolve, reject) => {
            window.resolveLocalFileSystemURL(filePath, resolve, reject);
        });
    }

    fileEntryToFile(fileEntry, filename) {
        return new Promise((resolve, reject) => {
            fileEntry.file((file) => {
                resolve(file);
            }, reject);
        });
    }

    writeFileCordova(dir, filename, blob) {
        return new Promise((resolve, reject) => {
            window.resolveLocalFileSystemURL(dir, (dirEntry) => {
                dirEntry.getFile(filename, { create: true, exclusive: false }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = () => resolve();
                        fileWriter.onerror = (e) => reject(e);
                        fileWriter.write(blob);
                    }, reject);
                }, reject);
            }, reject);
        });
    }

    async exportCrashLogsToFile() {
        try {
            const exportData = this.exportCrashLogs();
            if (!exportData) {
                alert('Failed to export crash logs');
                return;
            }
            
            const blob = new Blob([exportData], { type: 'application/json' });
            const filename = `crash-logs-${new Date().toISOString().split('T')[0]}.json`;
            const shared = await this.saveBlob(blob, filename);
            
            // Only show alert if file was saved (not if it was shared, as share sheet handles that)
            if (shared !== 'shared') {
                const isCordova = typeof window !== 'undefined' && window.cordova;
                if (isCordova) {
                    //<debug>
                    console.log('Crash logs saved! Check Files app under "On My iPhone" > "Wordy Snaps"');
                    //</debug>
                } else {
                    //<debug>
                    console.log('Crash logs exported successfully');
                    //</debug>
                }
            }
        } catch (error) {
            console.error('Failed to export crash logs to file:', error);
            alert('Failed to export crash logs: ' + (error.message || error));
        }
    }
    
    // Create mobile-friendly button helper
    createMobileButton(text, styleOverrides, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        
        const baseStyles = {
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            transition: 'opacity 0.1s, transform 0.1s',
            ...styleOverrides
        };
        
        Object.assign(button.style, baseStyles);
        button.style.setProperty('-webkit-tap-highlight-color', 'transparent');
        button.setAttribute('data-html-dialog-button', 'true');
        
        let hasTriggered = false;
        const handleClick = (e) => {
            if (hasTriggered) return; // Prevent double-firing
            hasTriggered = true;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            onClick();
            // Reset after a short delay
            setTimeout(() => { hasTriggered = false; }, 100);
        };
        
        button.onclick = handleClick;
        
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
            handleClick(e);
        }, { passive: false });
        
        return button;
    }
}

// Create global instance
export const crashLogger = new CrashLogger();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
    window.crashLogger = crashLogger;
}
