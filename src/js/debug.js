import { Graphics } from 'pixi.js'
import { Text, TextStyle } from 'pixi.js'

export const DEBUG = {
	showFobEvaluation: false,
	showReservedTiles: false,
	showFobMatchesBlinkingInTurn:  false,
	showMatchCreation: false,
	showFobActiveTile: false,
	showAllActiveFobs: false,
	showFobActivation: false,
	showFobDetonating: false,
	showFobStates: 		false,
	showUIContainers: 	false,
	showFobGoingStatic: false,
	showTileCoords: 	false,
	showExcavationFlags: false,
	showModifiedTiles: false,
	showLightValues: false,
	showFobUniqueIds: false,
	showTraversalIds: false,
	fobVeryVerbose: false,
	showUserExcavatedTiles: false,
	showSaveFlashTiles: false,
	showTileShowCalls: false,
	showTileClickAreas: false, 
	showDoubleFobMarkers: false,
	fixDoubleFobMarkers: false,
	showPickupTierDetermination: false,
	xuseAutoFlow: "autoFlowClaim",
	showLightShadeTestSprites: false,
	particleSystemDumpStats: false,
	minePickupsEverywhere: false,
	showDiggableAreaSeek: false,
	displayFobStates: false, // use showFobStates instead.. this works but is obsolete and was implemented before i saw i aldready had this feature
	displayEntityTiles: true,

	// gameflow debug strings
	autoFlowClaim: '{"flowpoint":"start"},{"flowpoint":"mainMenu"},{"dialog":"homebottombar","result":"levelstart"},{"flowpoint":"showLevelStart"},{"dialog":"levelstart","result":"play"},{"flowpoint":"showIngame"},{"flowpoint":"ingame"},{"event":11,"data":{"context":"alltargetsreached","event":11}},{"flowpoint":"gamewon"}]',

	setWorld: function(world)
	{
		if (!world && DEBUG._world)
		{
			DEBUG._world.removeChild(DEBUG.dbgGraphics)
		}
			
		DEBUG._world = world
		if (DEBUG.dbgGraphics == undefined)
		{
			DEBUG.dbgGraphics = new Graphics()
			DEBUG.dbgGraphics.visible = true
			DEBUG.dbgGraphics.name = "dbgGraphics"

			//..dbgGraphics = new PIXI.Graphics()
			//world.addChild(dbgGraphics)
		}
		if (world)
		{
			DEBUG._world.addChild(DEBUG.dbgGraphics)
		}
	},
	tick: function(deltatime)
	{
		//console.log("DEBUG tick")
		if (DEBUG.debuggerUsed)
			DEBUG.dbgGraphics.clear()
		while (DEBUG.activeTexts.length > 0)
		{
			var t = DEBUG.activeTexts.pop()
			DEBUG.textCache.push(t)
			t.parent?.removeChild(t)
			//DEBUG._world.removeChild(t)
		}

		if (DEBUG.debugTexts.length > 0)
		{
			for (var tx = DEBUG.debugTexts.length-1 ; tx >= 0; tx--)
			{
				var t = DEBUG.debugTexts[tx]
				if (t.screenspace)
				{
					DEBUG.drawDebugTextScreenSpace(t.x, t.y, t.text, t.color)
				}
				else
				{
					DEBUG.drawDebugText(t.xt, t.yt, t.text, t.color)
				}
				t.duration -= deltatime
				if (t.duration <= 0)
				{
					DEBUG.debugTexts.splice(tx, 1)
				}
			}
		}

		// draw the duration debug tiles
		if (DEBUG.debugTileDrawList.length > 0)
		{
			for (var tx = DEBUG.debugTileDrawList.length-1 ; tx >= 0; tx--)
			{
				var t = DEBUG.debugTileDrawList[tx]
				DEBUG.drawDebugTile(t.xt, t.yt, t.color, t.tilescale, t.linewidth)
				t.duration -= deltatime
				if (t.duration <= 0)
				{
					DEBUG.debugTileDrawList.splice(tx, 1)
				}
			}
			
		}
		if (DEBUG.debugLineDrawList.length > 0)
		{
			for (var tx = DEBUG.debugLineDrawList.length-1 ; tx >= 0; tx--)
			{
				var t = DEBUG.debugLineDrawList[tx]
				DEBUG.drawDebugLine(t.xt, t.yt, t.xt2, t.yt2, t.color, t.linewidth)
				t.duration -= deltatime
				if (t.duration <= 0)
				{
					DEBUG.debugLineDrawList.splice(tx, 1)
				}
			}
		}
	},

	drawBezierInTileSpace: function(bezier, color, linewidth, duration)
	{
		var d = DEBUG
		d.debuggerUsed = true
		//drawDebugLine: function(xt,yt, xt2, yt2, color, linewidth, duration)
		var pp = bezier.getPoints(0)
		var step = 0.05
		for (var i = step; i < 1; i+= step	)
		{
			var p = bezier.getPoint(i)
			if (i>0)
				d.drawDebugLine(p.x, p.y, pp.x, pp.y, color, linewidth, duration	)
			pp = p
		}
	},

	drawDebugPoint: function (xt,yt, pixelsize, color, linewidth, duration)
	{
		var d = DEBUG
		//console.log("drawDebugPoint", xt, yt, pixelsize, color, linewidth)
		if (color == undefined) color = 0xffffff
		if (linewidth == undefined) linewidth = 2
		d.debuggerUsed = true
		if (!d._world) return
		var mts = d._world.mapTileSize
		d.drawDebugLine(xt -  pixelsize/mts/2, yt -  pixelsize/mts/2, xt +  pixelsize/mts/2, yt - pixelsize/mts/2, color, linewidth, duration)
		d.drawDebugLine(xt +  pixelsize/mts/2, yt -  pixelsize/mts/2, xt +  pixelsize/mts/2, yt +  pixelsize/mts/2, color, linewidth, duration)
		d.drawDebugLine(xt +  pixelsize/mts/2, yt +  pixelsize/mts/2, xt -  pixelsize/mts/2, yt +  pixelsize/mts/2, color, linewidth, duration)
		d.drawDebugLine(xt -  pixelsize/mts/2, yt +  pixelsize/mts/2, xt -  pixelsize/mts/2, yt -  pixelsize/mts/2, color, linewidth, duration)
	},

	

	drawDebugTile: function(xt,yt, color, tilescale, linewidth, duration, delay)
	{
		if (delay > 0)
		{
			newTween(this, {}, delay).onDone(()=>{
				this.drawDebugTile(xt, yt, color, tilescale, linewidth, duration)
			})
			return
		}
		if (duration > 0)
		{
			var dbt = {xt:xt, yt:yt, color:color, tilescale: tilescale, linewidth:linewidth, duration:duration}
			DEBUG.debugTileDrawList.push(dbt)
			return
		}
		
		DEBUG.drawDebugPoint((xt), (yt), DEBUG._world.mapTileSize * tilescale, color, linewidth)
	},
	drawDebugLine: function(xt,yt, xt2, yt2, color, linewidth, duration)
	{
		if (duration > 0)
		{
			var dbl = {xt:xt, yt:yt, xt2:xt2, yt2:yt2, color:color, linewidth:linewidth, duration:duration}
			DEBUG.debugLineDrawList.push(dbl)
			return
		}
		var d = DEBUG
		if (color == undefined) color = 0xffffff
		if (linewidth == undefined) linewidth = 2
		d.debuggerUsed = true
		var mts = this._world.mapTileSize
		d.dbgGraphics.moveTo(xt * mts, yt * mts)
		.lineTo(xt2 * mts, yt2 * mts)
		.stroke({color:color, width:linewidth})
	},
	drawDebugText: function(xt,yt,text,color,duration)
	{
		if (duration > 0)
		{
			var dbt = {xt:xt, yt:yt, text:text, color:color, duration:duration}
			DEBUG.debugTexts.push(dbt)
			return
		}

		var d = DEBUG
		d.debuggerUsed = true
		var mts = this._world.mapTileSize
		var txt = DEBUG.getTextItem()
		txt.text = text
		txt.x = xt * mts
		txt.y = yt * mts
		txt.style.fill = color
		d._world.addChild(txt)
		d.activeTexts.push(txt)
		
	},
	drawDebugTextScreenSpace: function(x,y,text,color,duration)
	{
		if (duration > 0)
		{
			var dbt = {screenspace: true, x:x, y:y, text:text, color:color, duration:duration}
			DEBUG.debugTexts.push(dbt)
			return
		}
		var d = DEBUG
		d.debuggerUsed = true

		var txt = DEBUG.getTextItem()
		txt.text = text
		txt.x = x - this._world.x / this._world.scale.x;
		txt.y = y - this._world.y / this._world.scale.y;
		txt.scale.set(2 / this._world.scale.x, 2 / this._world.scale.y);
		txt.style.fill = color
		d._world.addChild(txt)
		d.activeTexts.push(txt)
	},

	getTextItem: function()
	{
		if (DEBUG.textCache.length > 0)
		{
			return DEBUG.textCache.pop()
		}
		var s = new TextStyle({
					align: 'center',
			//		fontFamily: 'Helvetica, Arial, sans',
					fontFamily: 'Courier, sans',
					fontSize: 32,
					fontWeight: 400,
					fill: 0xffffff ,
					stroke: { color: '#000000', width: 3, join: 'round' },
					wordWrap: true,
					wordWrapWidth: 600,
				
				})
		var txt = new Text("", s)
		txt.anchor.set(.5)
		txt.scale.set(3)
		//console.log("Create text ", txt)
		return txt
	},

	debugTileDrawList: [],
	debugLineDrawList: [],
	debugTexts: [],
	activeTexts: [],
	textCache: [],

	logSceneGraph: function(container, depth = 0) 
	{
		const indent = ' '.repeat(depth * 2); // Indentation for readability
		console.log(`${indent}${container.constructor.name}: ${container.name || '(unnamed)'}`);
	  
		if (container.children) {
		  container.children.forEach((child) => {this.logSceneGraph(child, depth + 1)});
		}
	}
}

window.DEBUG = DEBUG