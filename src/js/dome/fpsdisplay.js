import { BitmapText, Graphics } from 'pixi.js';
import { getRenderWidth } from '../mainpixi.js'

// Color constants for all graphs
const COLORS = {
    FPS: 0x00ff00,           // Green
    FRAME_TIME: 0xff8800,    // Orange
    TICK_TIME: 0xffffff,     // Light Blue
    PARTICLE_TICK: 0x9999ff, // 
    TWEEN_TICK: 0xffaa00,    // 
    TUBE_MANAGER_TICK: 0xff0000, // Red
    PARTICLE_COUNT: 0x9999ff, //
    TWEEN_COUNT: 0xffaa00,   // Cyan
    DRAW_CALLS: 0xffff44,    // Yellow
    MEMORY_USED: 0xff0088,   // Magenta/Pink
    MEMORY_TOTAL: 0x0088ff,  // Cyan/Blue
    BACKGROUND: 0x000000     // Black
};

export class FPSDisplay {
    constructor(app) {
        this.app = app;
        this.extendedMode = false; // Set to true to show all graphs, false for FPS only
        var sz = 2

        this.fpsText = new BitmapText({
            text: 'FPS: 0',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xffffff,
               // stroke: 0x000000,
               // strokeThickness: 4,
            }
        });
        
        this.renderTimeText = new BitmapText({
            text: 'Frame: 0ms',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xffffff,
               // stroke: 0x000000,
               // strokeThickness: 4,
            }
        });
        
        this.tickTimeText = new BitmapText({
            text: 'Tick: 0ms',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xffffff,
               // stroke: 0x000000,
               // strokeThickness: 4,
            }
        });
        
        this.particleTickTimeText = new BitmapText({
            text: 'P-Tick: 0ms',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xffffff,
               // stroke: 0x000000,
               // strokeThickness: 4,
            }
        });
        
        this.tweenTickTimeText = new BitmapText({
            text: 'T-Tick: 0ms',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xffffff,
               // stroke: 0x000000,
               // strokeThickness: 4,
            }
        });
        
        this.tubeManagerTickTimeText = new BitmapText({
            text: 'Tube-Tick: 0ms',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xffffff,
               // stroke: 0x000000,
               // strokeThickness: 4,
            }
        });
        
        this.particleCountText = new BitmapText({
            text: 'Particles: 0',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xffffff,
               // stroke: 0x000000,
               // strokeThickness: 4,
            }
        });
        
        this.tweenCountText = new BitmapText({
            text: 'Tweens: 0',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xffffff,
               // stroke: 0x000000,
               // strokeThickness: 4,
            }
        });

        this.drawCallText = new BitmapText({
            text: 'Draw: 0',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xffffff,
            }
        });

        this.memoryText = new BitmapText({
            text: 'Mem: 0MB / 0MB',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xffffff,
            }
        });

        this.memoryMinMaxText = new BitmapText({
            text: 'Min 0.0MB / max 0.0MB',
            style: {
                fontFamily: 'soilfont',
                fontSize: 10 * sz,
                fill: 0xff0088, // Pink/magenta to match the used memory line
            }
        });
        
        
        var w = 100 * sz

        var ypos = 10;
        // Position in top-right corner
        this.fpsText.x = getRenderWidth() - w - 10;
        this.fpsText.y = ypos;
        
       
        
        // Create container for the FPS graph
        this.graphContainer = new Graphics();
        this.graphContainer.x = getRenderWidth() - w - 10;
        ypos += 40
        this.graphContainer.y = ypos//4 + 10 * sz;
        
        this.renderTimeText.x = getRenderWidth() - w - 10;
        ypos += 100
        this.renderTimeText.y = ypos ;

        // Create container for the render time graph
        this.renderGraphContainer = new Graphics();
        this.renderGraphContainer.x = getRenderWidth() - w - 10;
        ypos += 40
        this.renderGraphContainer.y = ypos
        
        this.tickTimeText.x = getRenderWidth() - w - 10;
        ypos += 100
        this.tickTimeText.y = ypos;

        this.particleTickTimeText.x = getRenderWidth() - w - 10;
        this.particleTickTimeText.y = ypos += 15; // Position slightly below tick time text

        this.tweenTickTimeText.x = getRenderWidth() - w - 10;
        this.tweenTickTimeText.y = ypos += 15; // Position below particle tick time text

        this.tubeManagerTickTimeText.x = getRenderWidth() - w - 10;
        this.tubeManagerTickTimeText.y = ypos += 15; // Position below tween tick time text

        // Create container for the tick time graph
        this.tickGraphContainer = new Graphics();
        this.tickGraphContainer.x = getRenderWidth() - w - 10;
        ypos += 40
        this.tickGraphContainer.y = ypos
        
        this.particleCountText.x = getRenderWidth() - w - 10;
        ypos += 100
        this.particleCountText.y = ypos;

        // Create container for the particle count graph
        this.particleGraphContainer = new Graphics();
        this.particleGraphContainer.x = getRenderWidth() - w - 10;
        ypos += 40
        this.particleGraphContainer.y = ypos
        
        this.tweenCountText.x = getRenderWidth() - w - 10;
        ypos += 100
        this.tweenCountText.y = ypos;

        // Create container for the tween count graph
        this.tweenGraphContainer = new Graphics();
        this.tweenGraphContainer.x = getRenderWidth() - w - 10;
        ypos += 40
        this.tweenGraphContainer.y = ypos

        this.drawCallText.x = getRenderWidth() - w - 10;
        ypos += 100
        this.drawCallText.y = ypos;

        this.drawGraphContainer = new Graphics();
        this.drawGraphContainer.x = getRenderWidth() - w - 10;
        ypos += 40
        this.drawGraphContainer.y = ypos

        this.memoryText.x = getRenderWidth() - w - 10;
        ypos += 100
        this.memoryText.y = ypos;

        this.memoryMinMaxText.x = getRenderWidth() - w - 10;
        this.memoryMinMaxText.y = ypos += 15; // Position just below memory text

        this.memoryGraphContainer = new Graphics();
        this.memoryGraphContainer.x = getRenderWidth() - w - 10;
        ypos += 40
        this.memoryGraphContainer.y = ypos

        
        
        app.stage.addChild(this.fpsText);
        app.stage.addChild(this.renderTimeText);
        app.stage.addChild(this.tickTimeText);
        app.stage.addChild(this.particleTickTimeText);
        app.stage.addChild(this.tweenTickTimeText);
        app.stage.addChild(this.tubeManagerTickTimeText);
        app.stage.addChild(this.particleCountText);
        app.stage.addChild(this.tweenCountText);
        app.stage.addChild(this.graphContainer);
        app.stage.addChild(this.renderGraphContainer);
        app.stage.addChild(this.tickGraphContainer);
        app.stage.addChild(this.particleGraphContainer);
        app.stage.addChild(this.tweenGraphContainer);
        app.stage.addChild(this.drawGraphContainer);
        app.stage.addChild(this.drawCallText);
        app.stage.addChild(this.memoryText);
        app.stage.addChild(this.memoryMinMaxText);
        app.stage.addChild(this.memoryGraphContainer);
        
        // Set initial visibility based on extended mode
        this.updateExtendedModeVisibility();

        
        
        // Initialize FPS calculation variables
        this.frames = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.fpsSamples = []; // Store FPS samples for averaging
        this.fpsUpdateCounter = 0; // Counter for updating text every 5 frames
        this.displayedFPS = 0; // The averaged FPS value displayed in text
        
        // Initialize render time calculation variables
        this.renderTime = 0;
        this.renderStartTime = 0;
        
        // Initialize tick time calculation variables
        this.tickTime = 0;
        this.tickStartTime = 0;
        this.maxTickTimeRecorded = 0;
        
        // Initialize particle tick time calculation variables
        this.particleTickTime = 0;
        this.particleTickStartTime = 0;
        this.maxParticleTickTimeRecorded = 0;
        
        // Initialize tween tick time calculation variables
        this.tweenTickTime = 0;
        this.tweenTickStartTime = 0;
        this.maxTweenTickTimeRecorded = 0;
        
        // Initialize tube manager tick time calculation variables
        this.tubeManagerTickTime = 0;
        this.tubeManagerTickStartTime = 0;
        this.maxTubeManagerTickTimeRecorded = 0;
        
        // Initialize particle count variables
        this.particleCount = 0;
        this.maxParticleCountRecorded = 0;
        
        // Initialize tween count variables
        this.tweenCount = 0;
        this.maxTweenCountRecorded = 0;

        // Initialize draw call variables
        this.drawCallCount = 0;
        this.maxDrawCallCountRecorded = 0;
        
        // Initialize memory variables
        this.memoryUsed = 0; // in MB
        this.memoryTotal = 0; // in MB
        this.maxMemoryUsed = 0;
        this.minMemoryUsed = Number.MAX_VALUE; // Start with a very large number
        this.maxMemoryTotal = 0;
        this.memoryUpdateCounter = 0; // Counter for updating every 10th frame
        this.memoryHistoryUpdateCounter = 0; // Counter for updating history less frequently
        
        // Graph settings
        this.maxFPS = 100;
        this.maxRenderTime = 50; // Maximum render time in ms for graph scaling
        this.maxTickTime = 50; // Maximum tick time in ms for graph scaling
        this.maxParticleCount = 1000; // Maximum particle count for graph scaling
        this.maxTweenCount = 100; // Maximum tween count for graph scaling
        this.maxDrawCallCount = 20; // Maximum draw call count for graph scaling (auto-scales)
        
        this.graphWidth = w;
        this.graphHeight = w/2;
        this.fpsHistory = new Array(100).fill(0); // Store last 100 FPS values
        this.renderTimeHistory = new Array(100).fill(0); // Store last 100 render time values
        this.tickTimeHistory = new Array(100).fill(0); // Store last 100 tick time values
        this.particleTickTimeHistory = new Array(100).fill(0); // Store last 100 particle tick time values
        this.tweenTickTimeHistory = new Array(100).fill(0); // Store last 100 tween tick time values
        this.tubeManagerTickTimeHistory = new Array(100).fill(0); // Store last 100 tube manager tick time values
        this.particleCountHistory = new Array(100).fill(0); // Store last 100 particle count values
        this.tweenCountHistory = new Array(100).fill(0); // Store last 100 tween count values
        this.drawCallHistory = new Array(100).fill(0); // Store last 100 draw call values
        this.memoryUsedHistory = new Array(100).fill(0); // Store last 100 memory used values (in MB)
        this.memoryTotalHistory = new Array(100).fill(0); // Store last 100 memory total values (in MB)
        this.historyIndex = 0;
        
        
        // Start the FPS update loop
        //app.ticker.add(this.update.bind(this));
    }
    
    startRenderTime() {
        this.renderStartTime = performance.now();
    }
    
    endRenderTime() {
        this.renderTime = performance.now() - this.renderStartTime;
    }
    
    startTickTime() {
        this.tickStartTime = performance.now();
    }
    
    endTickTime() {
        this.tickTime = performance.now() - this.tickStartTime;
    }
    
    startParticleTickTime() {
        this.particleTickStartTime = performance.now();
    }
    
    endParticleTickTime() {
        this.particleTickTime = performance.now() - this.particleTickStartTime;
    }
    
    startTweenTickTime() {
        this.tweenTickStartTime = performance.now();
    }
    
    endTweenTickTime(timeUsedInCallbacks) {
        this.tweenTickTime = performance.now() - this.tweenTickStartTime - timeUsedInCallbacks;
    }
    
    startTubeManagerTickTime() {
        this.tubeManagerTickStartTime = performance.now();
    }
    
    endTubeManagerTickTime() {
        this.tubeManagerTickTime = performance.now() - this.tubeManagerTickStartTime;
    }
    
    setParticleCount(count) {
        this.accumParticleCount += count;
        this.particleCount =  this.accumParticleCount;
        if (count > this.maxParticleCountRecorded) {
            this.maxParticleCountRecorded = count;
        }
    }
    
    setTweenCount(count) {
        this.tweenCount = count;
        if (count > this.maxTweenCountRecorded) {
            this.maxTweenCountRecorded = count;
        }
    }
    
    updateExtendedModeVisibility() {
        // FPS text is always visible
        this.fpsText.visible = true;
        this.graphContainer.visible = true;
        if (this.extendedMode) {
            // Show all elements
            this.renderTimeText.visible = true;
            this.tickTimeText.visible = true;
            this.particleTickTimeText.visible = true;
            this.tweenTickTimeText.visible = true;
            this.tubeManagerTickTimeText.visible = true;
            this.particleCountText.visible = true;
            this.tweenCountText.visible = true;
            this.drawCallText.visible = true;
            this.memoryText.visible = true;
            this.memoryMinMaxText.visible = true;
            
            this.renderGraphContainer.visible = true;
            this.tickGraphContainer.visible = true;
            this.particleGraphContainer.visible = true;
            this.tweenGraphContainer.visible = true;
            this.drawGraphContainer.visible = true;
            this.memoryGraphContainer.visible = true;
        } else {
            // Hide all extended elements
            this.renderTimeText.visible = false;
            this.tickTimeText.visible = false;
            this.particleTickTimeText.visible = false;
            this.tweenTickTimeText.visible = false;
            this.tubeManagerTickTimeText.visible = false;
            this.particleCountText.visible = false;
            this.tweenCountText.visible = false;
            this.drawCallText.visible = false;
            this.memoryText.visible = false;
            this.memoryMinMaxText.visible = false;
            //this.graphContainer.visible = false;
            this.renderGraphContainer.visible = false;
            this.tickGraphContainer.visible = false;
            this.particleGraphContainer.visible = false;
            this.tweenGraphContainer.visible = false;
            this.drawGraphContainer.visible = false;
            this.memoryGraphContainer.visible = false;
        }
    }
    
    update() {
        this.frames++;
        this.memoryUpdateCounter++;
        const currentTime = performance.now();
        this.accumParticleCount = 0
        
        // Update memory every 10th frame (if performance.memory is available)
        if (this.memoryUpdateCounter >= 3) {
            this.memoryUpdateCounter = 0;
            // @ts-ignore - performance.memory is Chrome-specific
            if (performance.memory) {
                // @ts-ignore
                const mem = performance.memory;
                this.memoryUsed = mem.usedJSHeapSize / 1048576; // Convert to MB
                this.memoryTotal = mem.totalJSHeapSize / 1048576; // Convert to MB
                
                // Track max and min values
                if (this.memoryUsed > this.maxMemoryUsed) {
                    this.maxMemoryUsed = this.memoryUsed;
                }
                if (this.memoryUsed < this.minMemoryUsed) {
                    this.minMemoryUsed = this.memoryUsed;
                }
                if (this.memoryTotal > this.maxMemoryTotal) {
                    this.maxMemoryTotal = this.memoryTotal;
                }
            }
        }
        
        // Update FPS every second
        if (currentTime - this.lastTime >= 50) {
            this.fps = Math.round((this.frames * 1000) / (currentTime - this.lastTime));
            
            // Add to samples array for averaging
            this.fpsSamples.push(this.fps);
            
            // Update displayed FPS every 5 FPS calculations with average
            this.fpsUpdateCounter++;
            if (this.fpsUpdateCounter >= 5) {
                // Calculate average of collected samples (should be 5, but handle fewer)
                if (this.fpsSamples.length > 0) {
                    const sum = this.fpsSamples.reduce((a, b) => a + b, 0);
                    this.displayedFPS = Math.round(sum / this.fpsSamples.length);
                    this.fpsText.text = `FPS: ${this.displayedFPS}`;
                }
                
                // Reset counter and clear samples
                this.fpsUpdateCounter = 0;
                this.fpsSamples = [];
            } else if (this.fpsUpdateCounter === 1) {
                // Show first value immediately so text appears right away
                this.fpsText.text = `FPS: ${this.fps}`;
            }
            
            this.drawGraph();
            this.fpsHistory.shift()
            this.fpsHistory.push(this.fps)

            if (this.extendedMode) {
                // Prefer global GL draw-call hook if available; fallback to 0
                const drawCalls = Number(globalThis['__pixiDrawCalls'] || 0);
                this.drawCallCount = drawCalls;
                if (drawCalls > this.maxDrawCallCountRecorded) {
                    this.maxDrawCallCountRecorded = drawCalls;
                }
                // push to history and auto-scale max
                this.drawCallHistory.shift();
                this.drawCallHistory.push(this.drawCallCount);
                this.renderTimeText.text = `Render: ${this.renderTime.toFixed(1)}ms`;
                this.tickTimeText.text = `Tick: ${this.tickTime.toFixed(1)}ms (mx: ${this.maxTickTimeRecorded.toFixed(1)})`;
                this.particleTickTimeText.text = `P-Tick: ${this.particleTickTime.toFixed(1)}ms (mx: ${this.maxParticleTickTimeRecorded.toFixed(1)})`;
                this.tweenTickTimeText.text = `T-Tick: ${this.tweenTickTime.toFixed(1)}ms (mx: ${this.maxTweenTickTimeRecorded.toFixed(1)})`;
                this.tubeManagerTickTimeText.text = `Tube-Tick: ${this.tubeManagerTickTime.toFixed(1)}ms (mx: ${this.maxTubeManagerTickTimeRecorded.toFixed(1)})`;
                this.particleCountText.text = `Parts: ${this.particleCount} (mx: ${this.maxParticleCountRecorded})`;
                this.tweenCountText.text = `Tweens: ${this.tweenCount} (mx: ${this.maxTweenCountRecorded})`;
                this.drawCallText.text = `Draw: ${this.drawCallCount} (mx: ${this.maxDrawCallCountRecorded})`;
                this.memoryText.text = `Mem: ${this.memoryUsed.toFixed(1)}MB / ${this.memoryTotal.toFixed(1)}MB`;
                // Min/max will be updated in drawMemoryGraph() based on visible segment
                
                // Update FPS history
                // remove first value
                
                // Update render time history
                this.renderTimeHistory.shift()
                this.renderTimeHistory.push(this.renderTime)
                
                // Update tick time history
                this.tickTimeHistory.shift()
                this.tickTimeHistory.push(this.tickTime)
                
                // Update particle tick time history
                this.particleTickTimeHistory.shift()
                this.particleTickTimeHistory.push(this.particleTickTime)
                
                // Update tween tick time history
                this.tweenTickTimeHistory.shift()
                this.tweenTickTimeHistory.push(this.tweenTickTime)
                
                // Update tube manager tick time history
                this.tubeManagerTickTimeHistory.shift()
                this.tubeManagerTickTimeHistory.push(this.tubeManagerTickTime)
                
                // Update particle count history
                this.particleCountHistory.shift()
                this.particleCountHistory.push(this.particleCount)
                
                // Update tween count history
                this.tweenCountHistory.shift()
                this.tweenCountHistory.push(this.tweenCount)
                
                //this.fpsHistory[this.historyIndex] = this.fps;
                //this.historyIndex = (this.historyIndex + 1) % this.fpsHistory.length;
                
                // Redraw graphs
               
                this.drawRenderGraph();
                this.drawTickGraph();
                this.drawParticleGraph();
                this.drawTweenGraph();
                this.drawDrawGraph();
                this.drawMemoryGraph();
            }
            
            // Update memory history less frequently (every 10th FPS update cycle = ~500ms)
            // This makes the graph scroll slower than other graphs
            this.memoryHistoryUpdateCounter++;
            if (this.memoryHistoryUpdateCounter >= 3) {
                this.memoryHistoryUpdateCounter = 0;
                this.memoryUsedHistory.shift();
                this.memoryUsedHistory.push(this.memoryUsed);
                this.memoryTotalHistory.shift();
                this.memoryTotalHistory.push(this.memoryTotal);
            }
            
            this.frames = 0;
            this.lastTime = currentTime;
        }
    }
    
    drawGraph() {
        this.graphContainer.clear();
        
        // Draw background
        this.graphContainer.rect(0, 0, this.graphWidth, this.graphHeight)
            .fill({ color: COLORS.BACKGROUND, alpha: 0.5 });
        
        // Draw FPS line
        this.graphContainer.moveTo(0, this.graphHeight - (this.fpsHistory[0] / this.maxFPS) * this.graphHeight);
        
        for (let i = 1; i < this.fpsHistory.length; i++) {
            const x = (i / this.fpsHistory.length) * this.graphWidth;
            const y = this.graphHeight - (this.fpsHistory[i] / this.maxFPS) * this.graphHeight;
            this.graphContainer.lineTo(x, y);
        }
        
        this.graphContainer.stroke({ width: 2, color: COLORS.FPS });
    }
    
    drawRenderGraph() {
        this.renderGraphContainer.clear();
        
        // Draw background
        this.renderGraphContainer.rect(0, 0, this.graphWidth, this.graphHeight)
            .fill({ color: COLORS.BACKGROUND, alpha: 0.5 });
        
        // Draw render time line
        this.renderGraphContainer.moveTo(0, this.graphHeight - (this.renderTimeHistory[0] / this.maxRenderTime) * this.graphHeight);
        
        for (let i = 1; i < this.renderTimeHistory.length; i++) {
            const x = (i / this.renderTimeHistory.length) * this.graphWidth;
            const y = this.graphHeight - (this.renderTimeHistory[i] / this.maxRenderTime) * this.graphHeight;
            this.renderGraphContainer.lineTo(x, y);
        }
        
        this.renderGraphContainer.stroke({ width: 2, color: COLORS.FRAME_TIME });
    }
    
    drawTickGraph() {
        this.tickGraphContainer.clear();
        
        // Draw background
        this.tickGraphContainer.rect(0, 0, this.graphWidth, this.graphHeight)
            .fill({ color: COLORS.BACKGROUND, alpha: 0.5 });
        
        // Draw stacked bars for each data point
        const barWidth = this.graphWidth / this.tickTimeHistory.length;
        
        // Reset max values for this graph drawing
        this.maxTickTimeRecorded = 0;
        this.maxParticleTickTimeRecorded = 0;
        this.maxTweenTickTimeRecorded = 0;
        this.maxTubeManagerTickTimeRecorded = 0;
        
        for (let i = 0; i < this.tickTimeHistory.length; i++) {
            const x = i * barWidth;
            const totalTickTime = this.tickTimeHistory[i];
            const particleTickTime = this.particleTickTimeHistory[i];
            const tweenTickTime = this.tweenTickTimeHistory[i];
            const tubeManagerTickTime = this.tubeManagerTickTimeHistory[i];
            
            // Track max values for visible portion
            if (totalTickTime > this.maxTickTimeRecorded) {
                this.maxTickTimeRecorded = totalTickTime;
            }
            if (particleTickTime > this.maxParticleTickTimeRecorded) {
                this.maxParticleTickTimeRecorded = particleTickTime;
            }
            if (tweenTickTime > this.maxTweenTickTimeRecorded) {
                this.maxTweenTickTimeRecorded = tweenTickTime;
            }
            if (tubeManagerTickTime > this.maxTubeManagerTickTimeRecorded) {
                this.maxTubeManagerTickTimeRecorded = tubeManagerTickTime;
            }
            
            // Calculate remaining tick time (total - particle - tween - tube manager)
            const remainingTickTime = Math.max(0, totalTickTime - particleTickTime - tweenTickTime - tubeManagerTickTime);
            
            // Calculate heights as percentages of max tick time
            const totalHeight = (totalTickTime / this.maxTickTime) * this.graphHeight;
            const particleHeight = (particleTickTime / this.maxTickTime) * this.graphHeight;
            const tweenHeight = (tweenTickTime / this.maxTickTime) * this.graphHeight;
            const tubeManagerHeight = (tubeManagerTickTime / this.maxTickTime) * this.graphHeight;
            const remainingHeight = (remainingTickTime / this.maxTickTime) * this.graphHeight;
            
            // Draw bars from bottom to top
            let currentY = this.graphHeight;
            
            // Bottom layer: Tween tick time (orange - matches tween count graph)
            if (tweenHeight > 0) {
                this.tickGraphContainer.rect(x, currentY - tweenHeight, barWidth , tweenHeight)
                    .fill({ color: COLORS.TWEEN_TICK, alpha: 0.8 });
                currentY -= tweenHeight;
            }
            
            // Second layer: Particle tick time (magenta - matches particle count graph)
            if (particleHeight > 0) {
                this.tickGraphContainer.rect(x, currentY - particleHeight, barWidth , particleHeight)
                    .fill({ color: COLORS.PARTICLE_TICK, alpha: 0.8 });
                currentY -= particleHeight;
            }
            
            // Third layer: Tube manager tick time (red)
            if (tubeManagerHeight > 0) {
                this.tickGraphContainer.rect(x, currentY - tubeManagerHeight, barWidth , tubeManagerHeight)
                    .fill({ color: COLORS.TUBE_MANAGER_TICK, alpha: 0.8 });
                currentY -= tubeManagerHeight;
            }
            
            // Top layer: Remaining tick time (white)
            if (remainingHeight > 0) {
                this.tickGraphContainer.rect(x, currentY - remainingHeight, barWidth , remainingHeight)
                    .fill({ color: COLORS.TICK_TIME, alpha: 0.8 });
            }
        }
    }
    
    drawParticleGraph() {
        this.particleGraphContainer.clear();
        
        // Draw background
        this.particleGraphContainer.rect(0, 0, this.graphWidth, this.graphHeight)
            .fill({ color: COLORS.BACKGROUND, alpha: 0.5 });
        
        // Draw particle count line
        var yscalemax = Math.max(this.maxParticleCount, this.maxParticleCountRecorded)
        this.particleGraphContainer.moveTo(0, this.graphHeight - (this.particleCountHistory[0] / yscalemax) * this.graphHeight);
        
        this.maxParticleCountRecorded = 0
        for (let i = 1; i < this.particleCountHistory.length; i++) {
            const x = (i / this.particleCountHistory.length) * this.graphWidth;
            const y = this.graphHeight - (this.particleCountHistory[i] / yscalemax) * this.graphHeight;
            this.particleGraphContainer.lineTo(x, y);
            if (this.particleCountHistory[i] > this.maxParticleCountRecorded) {
                this.maxParticleCountRecorded = this.particleCountHistory[i];
            }
        }
        
        this.particleGraphContainer.stroke({ width: 2, color: COLORS.PARTICLE_COUNT });
    }
    
    drawTweenGraph() {
        this.tweenGraphContainer.clear();
        
        // Draw background
        this.tweenGraphContainer.rect(0, 0, this.graphWidth, this.graphHeight)
            .fill({ color: COLORS.BACKGROUND, alpha: 0.5 });
        
        // Draw tween count line
        var yscalemax = Math.max(this.maxTweenCount, this.maxTweenCountRecorded)
        this.tweenGraphContainer.moveTo(0, this.graphHeight - (this.tweenCountHistory[0] / yscalemax) * this.graphHeight);
        
        this.maxTweenCountRecorded = 0
        for (let i = 1; i < this.tweenCountHistory.length; i++) {
            const x = (i / this.tweenCountHistory.length) * this.graphWidth;
            const y = this.graphHeight - (this.tweenCountHistory[i] / yscalemax) * this.graphHeight;
            this.tweenGraphContainer.lineTo(x, y);
            if (this.tweenCountHistory[i] > this.maxTweenCountRecorded) {
                this.maxTweenCountRecorded = this.tweenCountHistory[i];
            }
        }
        
        this.tweenGraphContainer.stroke({ width: 2, color: COLORS.TWEEN_COUNT });
    }
    
    drawDrawGraph() {
        this.drawGraphContainer.clear();
        
        // Draw background
        this.drawGraphContainer.rect(0, 0, this.graphWidth, this.graphHeight)
            .fill({ color: COLORS.BACKGROUND, alpha: 0.5 });
        
        // Auto-scale like particle graph: default max 20, grows with recorded max
        var yscalemax = Math.max(this.maxDrawCallCount, this.maxDrawCallCountRecorded)
        this.drawGraphContainer.moveTo(0, this.graphHeight - (this.drawCallHistory[0] / yscalemax) * this.graphHeight);
        
        this.maxDrawCallCountRecorded = 0
        for (let i = 1; i < this.drawCallHistory.length; i++) {
            const x = (i / this.drawCallHistory.length) * this.graphWidth;
            const y = this.graphHeight - (this.drawCallHistory[i] / yscalemax) * this.graphHeight;
            this.drawGraphContainer.lineTo(x, y);
            if (this.drawCallHistory[i] > this.maxDrawCallCountRecorded) {
                this.maxDrawCallCountRecorded = this.drawCallHistory[i];
            }
        }
        
        this.drawGraphContainer.stroke({ width: 2, color: COLORS.DRAW_CALLS });
    }
    
    drawMemoryGraph() {
        this.memoryGraphContainer.clear();
        
        // Draw background
        this.memoryGraphContainer.rect(0, 0, this.graphWidth, this.graphHeight)
            .fill({ color: COLORS.BACKGROUND, alpha: 0.5 });
        
        // Calculate min and max from the visible graph segment (memoryUsedHistory array)
        var visibleMin = Number.MAX_VALUE;
        var visibleMax = 0;
        for (let i = 0; i < this.memoryUsedHistory.length; i++) {
            const value = this.memoryUsedHistory[i];
            if (value > 0) { // Only consider valid (non-zero) values
                if (value < visibleMin) {
                    visibleMin = value;
                }
                if (value > visibleMax) {
                    visibleMax = value;
                }
            }
        }
        
        // Update the min/max text with values from the visible segment
        if (visibleMin !== Number.MAX_VALUE && visibleMax > 0) {
            this.memoryMinMaxText.text = `Min ${visibleMin.toFixed(1)} Max ${visibleMax.toFixed(1)}`;
        } else {
            this.memoryMinMaxText.text = `Min 0.0 Max 0.0`;
        }
        
        // Auto-scale based on max memory total (use current max if available, otherwise use recorded max)
        var yscalemax = Math.max(this.maxMemoryTotal, 100); // Default to 100MB minimum
        // Find the actual max from history to scale properly
        for (let i = 0; i < this.memoryTotalHistory.length; i++) {
            if (this.memoryTotalHistory[i] > yscalemax) {
                yscalemax = this.memoryTotalHistory[i];
            }
        }
        
        // Draw total memory line (blue/cyan)
        this.memoryGraphContainer.moveTo(0, this.graphHeight - (this.memoryTotalHistory[0] / yscalemax) * this.graphHeight);
        
        for (let i = 1; i < this.memoryTotalHistory.length; i++) {
            const x = (i / this.memoryTotalHistory.length) * this.graphWidth;
            const y = this.graphHeight - (this.memoryTotalHistory[i] / yscalemax) * this.graphHeight;
            this.memoryGraphContainer.lineTo(x, y);
        }
        
        this.memoryGraphContainer.stroke({ width: 2, color: COLORS.MEMORY_TOTAL });
        
        // Draw used memory line (magenta/pink) - overlay on top
        this.memoryGraphContainer.moveTo(0, this.graphHeight - (this.memoryUsedHistory[0] / yscalemax) * this.graphHeight);
        
        for (let i = 1; i < this.memoryUsedHistory.length; i++) {
            const x = (i / this.memoryUsedHistory.length) * this.graphWidth;
            const y = this.graphHeight - (this.memoryUsedHistory[i] / yscalemax) * this.graphHeight;
            this.memoryGraphContainer.lineTo(x, y);
        }
        
        this.memoryGraphContainer.stroke({ width: 2, color: COLORS.MEMORY_USED });
    }
    
    destroy() {
        this.app.stage.removeChild(this.fpsText);
        this.app.stage.removeChild(this.renderTimeText);
        this.app.stage.removeChild(this.tickTimeText);
        this.app.stage.removeChild(this.particleTickTimeText);
        this.app.stage.removeChild(this.tweenTickTimeText);
        this.app.stage.removeChild(this.tubeManagerTickTimeText);
        this.app.stage.removeChild(this.particleCountText);
        this.app.stage.removeChild(this.tweenCountText);
        this.app.stage.removeChild(this.drawCallText);
        this.app.stage.removeChild(this.memoryText);
        this.app.stage.removeChild(this.memoryMinMaxText);
        this.app.stage.removeChild(this.graphContainer);
        this.app.stage.removeChild(this.renderGraphContainer);
        this.app.stage.removeChild(this.tickGraphContainer);
        this.app.stage.removeChild(this.particleGraphContainer);
        this.app.stage.removeChild(this.tweenGraphContainer);
        this.app.stage.removeChild(this.drawGraphContainer);
        this.app.stage.removeChild(this.memoryGraphContainer);
        this.fpsText.destroy();
        this.renderTimeText.destroy();
        this.tickTimeText.destroy();
        this.particleTickTimeText.destroy();
        this.tweenTickTimeText.destroy();
        this.tubeManagerTickTimeText.destroy();
        this.particleCountText.destroy();
        this.tweenCountText.destroy();
        this.drawCallText.destroy();
        this.memoryText.destroy();
        this.memoryMinMaxText.destroy();
        this.graphContainer.destroy();
        this.renderGraphContainer.destroy();
        this.tickGraphContainer.destroy();
        this.particleGraphContainer.destroy();
        this.tweenGraphContainer.destroy();
        this.drawGraphContainer.destroy();
        this.memoryGraphContainer.destroy();
    }
} 