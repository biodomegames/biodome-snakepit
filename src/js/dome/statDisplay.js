


import { BitmapText, Graphics } from 'pixi.js';

export class StatDisplay {
    constructor(app) {
        this.app = app;
        this.sz = 2
       

        this.topPos = 100 * this.sz
        window.statDisplay = this
        /*
        // Position in top-right corner
        this.fpsText.x = getRenderWidth() - 110;
        this.fpsText.y = 10;
        
        // Create container for the graph
        this.graphContainer = new Graphics();
        this.graphContainer.x = getRenderWidth() - 110;
        this.graphContainer.y = 40;
        
        app.stage.addChild(this.fpsText);
        app.stage.addChild(this.graphContainer);
        */
        // Initialize FPS calculation variables
        this.frames = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        
        // Graph settings
        this.maxFPS = 100
        
        ;
        this.graphWidth = 100;
        this.graphHeight = 50;
        this.fpsHistory = new Array(100).fill(0); // Store last 100 FPS values
        this.historyIndex = 0;
        
        this.stats = {}

        
        
        // Start the FPS update loop
        //app.ticker.add(this.update.bind(this));
    }

    addStat(name, value, useMax = true)
    {
        if (!this.stats[name])
        {
            this.stats[name] = {value: value, max: value}

        }
        var stat = this.stats[name]
        stat.value = value
        stat.useMax = useMax
        if (stat.max < value)
        {
            stat.max = value
        }
    }
    
    
    update() {
        this.frames++;
        var self = this
        const currentTime = performance.now();
        for (var s in this.stats)
        {
            var stat = this.stats[s]
            if (!stat.text)
            {
                stat.text = getTextObj()
                app.stage.addChild(stat.text)
                stat.text.x = getRenderWidth() - 100 * self.sz - 10
                stat.text.y =  this.topPos
                
                this.topPos += 20 * self.sz
                if (stat.useMax)
                {
                    stat.text2 = getTextObj()
                    app.stage.addChild(stat.text2)
                    stat.text2.x = getRenderWidth() - 100 * self.sz - 10
                    stat.text2.y =  this.topPos
                    this.topPos += 20 * self.sz
    
                }
            }
            stat.text.text = (s + ": " + stat.value)
            if (stat.useMax)
            {
                stat.text2.text = ("max:" + stat.max)
            }
        }
        

        function getTextObj()
        {
            let txt = new BitmapText({
                text: '',
                style: {
                    fontFamily: 'soilfont',
                    fontSize: 14 * self.sz,
                    fill: 0xffffff,
                   // stroke: 0x000000,
                   // strokeThickness: 4,
                }
            });
            return txt
        }
    }
    

    destroy() {
        for (var s in this.stats)
        {
            var stat = this.stats[s]
            this.app.stage.removeChild(stat.text)
            this.app.stage.removeChild(stat.text2)
            stat.text.destroy()
            if (stat.text2) stat.text2.destroy()
        }
        this.stats = {}
        //this.app.stage.removeChild(this.fpsText);
        //this.app.stage.removeChild(this.graphContainer);
        //this.fpsText.destroy();
        //this.graphContainer.destroy();
    }
} 