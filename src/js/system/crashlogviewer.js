import { crashLogger } from './crashlogger.js'

export class CrashLogViewer {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.init();
    }

    init() {
        this.createUI();
        this.setupEventListeners();
    }

    createUI() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'crash-log-viewer';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
            flex-direction: column;
        `;
        this.container.setAttribute('data-html-dialog', 'true');

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            background: #333;
            padding: 10px;
            padding-top: 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #555;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Crash Log Viewer';
        title.style.margin = '0';

        const closeBtn = this.createMobileButton('✕', {
            background: '#ff4444',
            color: 'white'
        }, () => this.hide());

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Create controls
        const controls = document.createElement('div');
        controls.style.cssText = `
            background: #444;
            padding: 10px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        `;

        // Filter dropdown
        const filterLabel = document.createElement('label');
        filterLabel.textContent = 'Filter:';
        filterLabel.style.color = '#ccc';

        const filterSelect = document.createElement('select');
        filterSelect.id = 'crash-filter';
        filterSelect.style.cssText = `
            background: #555;
            color: white;
            border: 1px solid #777;
            padding: 3px;
        `;
        filterSelect.innerHTML = `
            <option value="all">All Logs</option>
            <option value="JavaScript Error">JavaScript Errors</option>
            <option value="Unhandled Promise Rejection">Promise Rejections</option>
            <option value="Resource Loading Error">Resource Errors</option>
            <option value="Console Error">Console Errors</option>
            <option value="Console Warning">Console Warnings</option>
            <option value="Manual Crash Report">Manual Reports</option>
        `;

        // Sort dropdown
        const sortLabel = document.createElement('label');
        sortLabel.textContent = 'Sort:';
        sortLabel.style.color = '#ccc';

        const sortSelect = document.createElement('select');
        sortSelect.id = 'crash-sort';
        sortSelect.style.cssText = `
            background: #555;
            color: white;
            border: 1px solid #777;
            padding: 3px;
        `;
        sortSelect.innerHTML = `
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="type">By Type</option>
        `;

        // Action buttons
        const refreshBtn = this.createMobileButton('Refresh', {
            background: '#4CAF50',
            color: 'white'
        }, () => this.refresh());

        const exportBtn = this.createMobileButton('Export', {
            background: '#2196F3',
            color: 'white'
        }, () => this.exportLogs());

        const clearBtn = this.createMobileButton('Clear All', {
            background: '#ff4444',
            color: 'white'
        }, () => this.clearLogs());

        const testBtn = this.createMobileButton('Test', {
            background: '#ff9800',
            color: 'white'
        }, () => this.testLogger());

        controls.appendChild(filterLabel);
        controls.appendChild(filterSelect);
        controls.appendChild(sortLabel);
        controls.appendChild(sortSelect);
        controls.appendChild(refreshBtn);
        controls.appendChild(exportBtn);
        controls.appendChild(clearBtn);
        controls.appendChild(testBtn);

        // Create stats bar
        const statsBar = document.createElement('div');
        statsBar.id = 'crash-stats';
        statsBar.style.cssText = `
            background: #222;
            padding: 5px 10px;
            font-size: 11px;
            color: #ccc;
            border-bottom: 1px solid #555;
        `;

        // Create log list
        const logList = document.createElement('div');
        logList.id = 'crash-log-list';
        logList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        `;

        // Create log detail panel
        const detailPanel = document.createElement('div');
        detailPanel.id = 'crash-log-detail';
        detailPanel.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #333;
            padding: 10px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            z-index: 10001;
            display: none;
            flex-direction: column;
        `;
        detailPanel.setAttribute('data-html-dialog', 'true');

        this.container.appendChild(header);
        this.container.appendChild(controls);
        this.container.appendChild(statsBar);
        this.container.appendChild(logList);
        this.container.appendChild(detailPanel);

        document.body.appendChild(this.container);
    }

    createMobileButton(text, styleOverrides, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        
        // Base styles
        const baseStyles = {
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
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

    setupEventListeners() {
        // Filter change
        const filterSelect = document.getElementById('crash-filter');
        filterSelect.setAttribute('data-html-dialog-button', 'true');
        filterSelect.style.setProperty('-webkit-tap-highlight-color', 'transparent');
        filterSelect.style.touchAction = 'manipulation';
        filterSelect.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.refresh();
        });

        // Sort change
        const sortSelect = document.getElementById('crash-sort');
        sortSelect.setAttribute('data-html-dialog-button', 'true');
        sortSelect.style.setProperty('-webkit-tap-highlight-color', 'transparent');
        sortSelect.style.touchAction = 'manipulation';
        sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.refresh();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    show() {
        this.container.style.display = 'flex';
        this.isVisible = true;
        this.refresh();
    }

    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    refresh() {
        this.updateStats();
        this.updateLogList();
    }

    updateStats() {
        const stats = crashLogger.getCrashStats();
        const statsBar = document.getElementById('crash-stats');
        
        let statsText = `Total Logs: ${stats.totalLogs} | Crash Count: ${stats.crashCount} | Recent (24h): ${stats.recentCount}`;
        
        if (Object.keys(stats.byType).length > 0) {
            const typeStats = Object.entries(stats.byType)
                .map(([type, count]) => `${type}: ${count}`)
                .join(' | ');
            statsText += ` | ${typeStats}`;
        }
        
        statsBar.textContent = statsText;
    }

    updateLogList() {
        const logList = document.getElementById('crash-log-list');
        logList.innerHTML = '';

        let logs = crashLogger.getAllCrashLogs();

        // Apply filter
        if (this.currentFilter !== 'all') {
            logs = logs.filter(log => log.type === this.currentFilter);
        }

        // Apply sort
        switch (this.currentSort) {
            case 'newest':
                logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                break;
            case 'oldest':
                logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                break;
            case 'type':
                logs.sort((a, b) => a.type.localeCompare(b.type));
                break;
        }

        // Create log entries
        logs.forEach(log => {
            const logEntry = this.createLogEntry(log);
            logList.appendChild(logEntry);
        });

        if (logs.length === 0) {
            const noLogs = document.createElement('div');
            noLogs.textContent = 'No crash logs found';
            noLogs.style.cssText = `
                text-align: center;
                color: #888;
                padding: 20px;
            `;
            logList.appendChild(noLogs);
        }
    }

    createLogEntry(log) {
        const entry = document.createElement('div');
        entry.style.cssText = `
            background: #333;
            border: 1px solid #555;
            margin: 5px 0;
            padding: 10px;
            cursor: pointer;
            border-radius: 3px;
            transition: background 0.2s;
            touch-action: pan-y;
        `;
        entry.setAttribute('data-html-dialog-button', 'true');

        entry.onmouseover = () => {
            entry.style.background = '#444';
        };
        entry.onmouseout = () => {
            entry.style.background = '#333';
        };

        // Mobile touch handling for log entries
        let touchStartX = 0;
        let touchStartY = 0;
        let hasMoved = false;

        entry.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            hasMoved = false;
            entry.style.background = '#444';
        }, { passive: true });

        entry.addEventListener('touchmove', (e) => {
            if (Math.abs(e.touches[0].clientX - touchStartX) > 5 || 
                Math.abs(e.touches[0].clientY - touchStartY) > 5) {
                hasMoved = true;
            }
        }, { passive: true });

        entry.addEventListener('touchend', (e) => {
            if (!hasMoved) {
                e.preventDefault();
                e.stopPropagation();
                this.showLogDetail(log);
            }
            entry.style.background = '#333';
        }, { passive: false });

        entry.onclick = () => {
            this.showLogDetail(log);
        };

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        `;

        const typeBadge = document.createElement('span');
        typeBadge.textContent = log.type;
        typeBadge.style.cssText = `
            background: ${this.getTypeColor(log.type)};
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
        `;

        const timestamp = document.createElement('span');
        timestamp.textContent = new Date(log.timestamp).toLocaleString();
        timestamp.style.cssText = `
            color: #ccc;
            font-size: 10px;
        `;

        header.appendChild(typeBadge);
        header.appendChild(timestamp);

        // Create message
        const message = document.createElement('div');
        message.textContent = this.getLogMessage(log);
        message.style.cssText = `
            color: #fff;
            font-size: 11px;
            margin-bottom: 5px;
            word-break: break-word;
        `;

        // Create metadata
        const metadata = document.createElement('div');
        metadata.style.cssText = `
            color: #888;
            font-size: 10px;
        `;

        const metadataText = [
            `ID: ${log.id}`,
            `Count: ${log.count || 1}`,
            log.platform ? `Platform: ${log.platform}` : null,
            log.memory ? `Memory: ${log.memory.used}` : null
        ].filter(Boolean).join(' | ');

        metadata.textContent = metadataText;

        entry.appendChild(header);
        entry.appendChild(message);
        entry.appendChild(metadata);

        return entry;
    }

    getTypeColor(type) {
        const colors = {
            'JavaScript Error': '#ff4444',
            'Unhandled Promise Rejection': '#ff8800',
            'Resource Loading Error': '#ffaa00',
            'Console Error': '#ff6600',
            'Console Warning': '#ffaa00',
            'Manual Crash Report': '#aa44ff',
            'Event': '#44aaff'
        };
        return colors[type] || '#666';
    }

    getLogMessage(log) {
        if (log.data && log.data.message) {
            return log.data.message;
        }
        if (log.eventName) {
            return `Event: ${log.eventName}`;
        }
        return `${log.type} occurred`;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    cleanStackTrace(stack) {
        if (!stack) return '';
        // Remove URL prefixes from stack trace lines
        // Matches: http://, https://, file://, app://, etc. up to /src
        // Also handles Cordova file:// URLs
        return stack.split('\n').map(line => {
            // Remove URLs from the beginning up to and including /src
            // Pattern matches: http://host:port/path/to/src or file:///path/to/src
            // Replaces with just /src
            // Examples:
            //   http://192.168.2.15:5173/src/js/file.js -> /src/js/file.js
            //   file:///android_asset/www/src/js/file.js -> /src/js/file.js
            return line.replace(/(https?:\/\/[^\/\s]+|file:\/\/\/?[^\/\s]*|app:\/\/[^\/\s]+)(\/[^\/\s]*)*\/src/g, '/src');
        }).join('\n');
    }
    
    formatLogData(data) {
        if (!data) return '';
        // Create a copy without stack to avoid duplication
        const dataCopy = { ...data };
        delete dataCopy.stack;
        
        // Format the remaining data as JSON
        const jsonStr = JSON.stringify(dataCopy, null, 2);
        // Replace escaped newlines with actual newlines for better display
        return this.escapeHtml(jsonStr.replace(/\\n/g, '\n'));
    }

    showLogDetail(log) {
        const detailPanel = document.getElementById('crash-log-detail');
        detailPanel.style.display = 'flex';
        
        // Format stack trace and data before inserting into template
        const stackTrace = log.data && log.data.stack ? this.escapeHtml(this.cleanStackTrace(log.data.stack)) : '';
        const formattedData = this.formatLogData(log.data);
        
        // Create inner content container for better centering and padding
        const detailContent = document.createElement('div');
        detailContent.style.cssText = `
            max-width: 100%;
            width: 100%;
            margin: 0 auto;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        detailContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; color: #fff;">Log Details</h4>
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #4CAF50;">Type:</strong> ${log.type}<br>
                <strong style="color: #4CAF50;">Timestamp:</strong> ${new Date(log.timestamp).toLocaleString()}<br>
                <strong style="color: #4CAF50;">ID:</strong> ${log.id}<br>
                <strong style="color: #4CAF50;">Count:</strong> ${log.count || 1}<br>
                <strong style="color: #4CAF50;">Platform:</strong> ${log.platform || 'Unknown'}<br>
                <strong style="color: #4CAF50;">Cordova:</strong> ${log.cordova ? 'Yes' : 'No'}
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #4CAF50;">Data:</strong>
                ${stackTrace ? `
                    <div style="margin-top: 10px;">
                        <strong style="color: #4CAF50;">Stack Trace:</strong>
                        <pre style="background: #222; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 10px; color: #ccc; white-space: pre-wrap; word-wrap: break-word;">${stackTrace}</pre>
                    </div>
                ` : ''}
                <pre style="background: #222; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 10px; color: #ccc; white-space: pre-wrap;">${formattedData}</pre>
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #4CAF50;">Context:</strong>
                <pre style="background: #222; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 10px; color: #ccc;">${JSON.stringify(log.context, null, 2)}</pre>
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #4CAF50;">Device Info:</strong>
                <pre style="background: #222; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 10px; color: #ccc;">${JSON.stringify(log.context?.device, null, 2)}</pre>
            </div>
            <div>
                <strong style="color: #4CAF50;">Full Log:</strong>
                <pre style="background: #222; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 10px; color: #ccc;">${JSON.stringify(log, null, 2)}</pre>
            </div>
        `;
        
        // Create close button with mobile handling and append after innerHTML
        const closeBtn = this.createMobileButton('✕ Close', {
            background: '#ff4444',
            color: 'white',
            position: 'fixed',
            top: '50px',
            right: '10px',
            zIndex: '10002'
        }, () => {
            detailPanel.style.display = 'none';
        });
        
        detailPanel.appendChild(detailContent);
        detailPanel.appendChild(closeBtn);
    }

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
                    console.log('Cordova share failed, falling back to file save:', e);
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
                    console.log('Share failed, falling back to file save:', e);
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

    async exportLogs() {
        try {
            const exportData = crashLogger.exportCrashLogs();
            if (exportData) {
                const blob = new Blob([exportData], { type: 'application/json' });
                const filename = `crash-logs-${new Date().toISOString().split('T')[0]}.json`;
                const result = await this.saveBlob(blob, filename);
                
                // Only show alert if file was saved (not if it was shared, as share sheet handles that)
                if (result !== 'shared') {
                    const isCordova = typeof window !== 'undefined' && window.cordova;
                    if (isCordova) {
                        alert('Crash logs saved! Check Files app under "On My iPhone" > "Wordy Snaps"');
                    } else {
                        alert('Crash logs exported successfully!');
                    }
                }
            } else {
                alert('No crash logs to export');
            }
        } catch (error) {
            console.error('Failed to export crash logs:', error);
            alert('Failed to export crash logs: ' + (error.message || error));
        }
    }

    clearLogs() {
        if (confirm('Are you sure you want to clear all crash logs? This action cannot be undone.')) {
            crashLogger.clearCrashLogs();
            this.refresh();
            alert('Crash logs cleared');
        }
    }

    testLogger() {
        crashLogger.testCrashLogger();
        setTimeout(() => {
            this.refresh();
            alert('Test crash log created');
        }, 1000);
    }
}

// Create global instance
export const crashLogViewer = new CrashLogViewer();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
    window.crashLogViewer = crashLogViewer;
}
