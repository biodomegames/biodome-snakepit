

import { Container } from 'pixi.js';
import { ComponentTypes } from './ui_componenttypes.js';
import { Button } from '@pixi/ui';
import { Graphics } from 'pixi.js';
import { Howl } from 'howler';
import { Sprite } from 'pixi.js';
import { Texture } from 'pixi.js';
import { Assets } from 'pixi.js';

export class UIButton extends Container
{
	dialog = undefined
	def = undefined

	listgup = []
	listgdown = []
	listghover = []
	isEnabled = true

	destroy(options	)
	{
		this.isDestroyed = true
		this.dialog = undefined
		this.def = undefined
		this.compDef = undefined
		this.listgup = []
		this.listgdown = []
		this.listghover = []
		super.destroy({children: true})
	}
	setWidthAndHeightOfLayers(layerlist, defwidth, defheight)
	{
		for (var layer of layerlist) { 
			if (layer.width == undefined) layer.width = defwidth; 
			if (layer.height == undefined) layer.height = defheight
		}
	}

	setState(state, updateLayers)
	{
		if (this.state == state) return
		
		var cd = this.compDef
		if (!cd.buttonStates)
		{
			console.error("Button has no states")

			return
		}
			
		if (!cd.buttonStates[state])
			console.error("Button has no state with name ", state)
		this.state = state
		var bs = cd.buttonStates[state].source
		for (var x in bs)
		{
			//console.log("Setting ", x)
			cd[x] = bs[x]
		}
		if (updateLayers || updateLayers == undefined)
		{
			if (cd.type == ComponentTypes.BUTTON9SLICE)
			{
				for (var i = 0; i < this.listgup.length; i++) this.removeChild(this.listgup[i])
				for (var i = 0; i < this.listgdown.length; i++) this.removeChild(this.listgdown[i])
				for (var i = 0; i < this.listghover.length; i++) this.removeChild(this.listghover[i])
				this.listgup = []
				this.listgdown = []
				this.listghover = []
				let def = this.def
				if (def.width == undefined) def.width = cd.defaultwidth != undefined ? cd.defaultwidth : 100
				if (def.height == undefined) def.height = cd.defaultheight != undefined ? cd.defaultheight : 40
				this.dialog.createSliceSpriteLayers(cd.up, def.width, def.height, this.listgup, this)
				this.dialog.createSliceSpriteLayers(cd.down, def.width, def.height, this.listgdown, this)
				this.dialog.createSliceSpriteLayers(cd.hover, def.width, def.height, this.listghover, this)
				if (this.image && this.image.parent)
					this.image.parent.addChild(this.image)
				if (this.text && this.text.parent)
					this.text.parent.addChild(this.text)
			}
			else
			{
				console.error("Unsupported button type graphics state")
			}

			if (cd.disabled)
			{
				//console.log("Button disabled")
				this.isEnabled = false
				this.button.enabled = false
			}
			else
			{
				//console.log("Button enabled")
				this.isEnabled = true
				this.button.enabled = true
			}
			for (var c of this.itemsOnTop)
			{
				if (c.parent)
					c.parent.addChild(c)
			}
		}
	}

	nextState()
	{
		var cd = this.compDef
		if (!cd.buttonStates)
		{
			//console.error("Button has no states")
			return
		}
			
		var keys = Object.keys(cd.buttonStates)
		var state = this.state
		var idx = keys.indexOf(state)
		if (idx == -1)
		{
			//<debug>
			console.error("Button state not found: ", state)
			//</debug>
			return
		}
		idx++
		let foundNextState = false
		var safe = 0
		while (!foundNextState)
		{
			if (safe > 10)
			{
				//<debug>
				console.error("Button state not found: ", state)
				//</debug>
				return
			}
			safe++
			if (idx >= keys.length)
			{
				idx = 0
			}
			if (cd.buttonStates[keys[idx]].useinautotoggle == undefined || cd.buttonStates[keys[idx]].useinautotoggle)
			{
				foundNextState = true
			}
			else
			{
				idx++
			}
		}

		
		this.setState(keys[idx])
		
	}
	resetState()
	{
		this.setState(Object.keys(this.compDef.buttonStates)[0])
	}

	dubiousLodImageCheck = 0
	loadImage(source)
	{
		//console.warn("button load image ", this.dialog, this.def)
		if (this.image) this.removeChild(this.image)
		let img = new Sprite()
		//this.numImagesToLoad++

		this.dubiousLodImageCheck++
		var myCheck = this.dubiousLodImageCheck

		let texture = Texture.from(source)
		//Assets.load(source).then((texture) => {
			//this.numImagesLoaded++
			if (this.isDestroyed) return
			if (!texture) {
				console.warn("IMAGE not loaded correct ", source)
				return
			}
			//console.log("IMAGE loaded correctly ", source)
			if (myCheck != this.dubiousLodImageCheck) return // we have been called again, so we ignore this
			img.texture = texture
			this.addChild(img)
			img.anchor.set(0.5)
			
			this.image = img
			if (!img || !this.text) return
			try {
				var totWidth = img.width 
				totWidth += this.text.width
				
			} catch (error) {
				console.error("Error calculating total width: ", error, this.def, this.dialog)
				return
			}
			
			
			img.x = -totWidth/2 + img.width/2
			this.text.x = totWidth/2 - this.text.width/2
			this.refreshTextAndImagePos(this.compDef.textoffset?.hover, this.compDef.textoffset?.hover?.scale, this.def.image?.align, this.def.image?.scale)
			
			//console.log("Image loaded: ", texture)
			//img.texture = texture
			//if (this.numImagesLoaded == this.numImagesToLoad)
			//{
			//	this.resize()
			//}
		//})	

	}

	constructor(dialog, def, compDef)
	{
		super()
		this.dialog = dialog
		this.def = def
		//if (this.def == undefined)
		//{
			//console.error("Button definition not found: ", def)
		//}
		this.compDef = compDef
		if (compDef.buttonStates != undefined)
		{
			let state = def.state
			if (state == undefined)
				state = Object.keys(compDef.buttonStates)[0]
			if (compDef.buttonStates[state] == undefined)
			{
				console.log("Unknown button state  ", state)
				state = Object.keys(compDef.buttonStates)[0]
			}
			//console.log("Button state set to ", state)
			this.setState(state, false)
			
		}
		
		
		if (def.width == undefined) def.width = compDef.defaultwidth != undefined ? compDef.defaultwidth : 100
		if (def.height == undefined) def.height = compDef.defaultheight != undefined ? compDef.defaultheight : 40


		if (compDef.type == ComponentTypes.BUTTON9SLICE)
		{
			dialog.createSliceSpriteLayers(compDef.up, def.width, def.height, this.listgup, this)
			dialog.createSliceSpriteLayers(compDef.down, def.width, def.height, this.listgdown, this)
			dialog.createSliceSpriteLayers(compDef.hover, def.width, def.height, this.listghover, this)
		}
		else
		{
			this.gup = new Graphics()
			var scale = def.scale ? def.scale : {x:1, y:1}

			//this.setWidthAndHeightOfLayers(compDef.up, def.width, def.height)
			var dimensions = dialog.getDimensionsOfLayers(def, compDef.up, scale)

			dialog.drawLayersOntoGraphicsObject(this.gup, def, compDef.up, compDef.shapes,  dimensions, scale)
			this.gdown = new Graphics()
			
			//this.setWidthAndHeightOfLayers(compDef.down, def.width, def.height)
			dialog.drawLayersOntoGraphicsObject(this.gdown, def, compDef.down, compDef.shapes,  dimensions, scale)
			this.ghover = new Graphics()
			
			//this.setWidthAndHeightOfLayers(compDef.hover, def.width, def.height)
			dialog.drawLayersOntoGraphicsObject(this.ghover, def, compDef.hover, compDef.shapes,  dimensions, scale)
			//console.log("Button dimensions", dimensions)
			//const buttonView = new Graphics().beginFill(color).drawRoundedRect(0, 0, size, size, radius);
			//const text = new Text('🤙', { fontSize: 70 });
			
			this.addChild(this.gup)
			//let filter = new BlurFilter(5)
			//this.gup.filters = [filter]

			this.addChild(this.gdown)
			this.addChild(this.ghover)
			this.listgup.push(this.gup)
			this.listgdown.push(this.gdown)
			this.listghover.push(this.ghover)
		}

		// get the text component def
		var textDef = dialog.ui.componentDefinitions[compDef.text]
		if (textDef == undefined)
		{
			if (compDef.text != undefined)
				console.error("Creating button, Text component not found: ", compDef.text)
			
		}
		else
		{
			var text = dialog.initText( def, textDef)
			text.x = compDef.textoffset?.up?.x ?? 0;
			text.y = compDef.textoffset?.up?.y ?? 0;
			this.addChild(text)
			this.text = text
			
		}
		if (def.image)
		{
			this.loadImage(def.image.source)
		}

		for (var i = 0; i < this.listgup.length; i++) this.listgup[i].visible = true
		for (var i = 0; i < this.listgdown.length; i++) this.listgdown[i].visible = false
		for (var i = 0; i < this.listghover.length; i++) this.listghover[i].visible = false

		//this.gdown.visible = false
		//this.ghover.visible = false

		if (compDef.sound)
		{
			this.sounds = []
			for (var s in compDef.sound)
			{
				this.sounds.push(new Howl({
					src: compDef.sound[s]
				  }));
			}
		}
		if (compDef.sounddown)
		{
			this.soundsdown = []
			for (var s in compDef.sounddown)
			{
				this.soundsdown.push(new Howl({
					src: compDef.sounddown[s]
				  }));
			}
		}
		if (compDef.soundup)
		{
			this.soundsup = []
			for (var s in compDef.soundup)
			{
				this.soundsup.push(new Howl({
					src: compDef.soundup[s]
				  }));
			}
		}	
		//text.anchor.set(0.5);
		//text.x = buttonView.width / 2;
		//text.y = buttonView.height / 2;
	
		//g.addChild(text);
		var button = new Button(this);
		//this.button = button
		//if (!this.compDef.disabled)
		//{

			
		button.onDown.connect(() => {
			this.buttonActionDown()
	
		});
		button.onUp.connect(() => {
			this.buttonActionUp()
		});
		button.onHover.connect(() => {
			if (!this.isEnabled) return
			for (var i = 0; i < this.listgup.length; i++) this.listgup[i].visible = false
			for (var i = 0; i < this.listgdown.length; i++) this.listgdown[i].visible = false
			for (var i = 0; i < this.listghover.length; i++) this.listghover[i].visible = true

			//this.ghover.visible = true
			//this.gdown.visible = false
			//this.gup.visible = false
			this.refreshTextAndImagePos(compDef.textoffset?.hover, compDef.textoffset?.hover?.scale, def.image?.align, def.image?.scale)
			/*if (!text) return

			text.x = compDef.textoffset?.hover?.x ?? 0;
			text.y = compDef.textoffset?.hover?.y ?? 0;/*
			text.scale.set(compDef.textoffset?.hover?.scale ?? 1)
			*/

		});
		button.onOut.connect(() => {
			//console.log("Button out")
			if (!this.isEnabled) return
			for (var i = 0; i < this.listgup.length; i++) this.listgup[i].visible = true
			for (var i = 0; i < this.listgdown.length; i++) this.listgdown[i].visible = false
			for (var i = 0; i < this.listghover.length; i++) this.listghover[i].visible = false

			//this.ghover.visible = false
			//this.gdown.visible = false
			//this.gup.visible = true
			this.refreshTextAndImagePos(compDef.textoffset?.up, compDef.textoffset?.up?.scale, def.image?.align, def.image?.scale)
			/*if (!text) return

			text.x = compDef.textoffset?.up?.x ?? 0;
			text.y = compDef.textoffset?.up?.y ?? 0;
			text.scale.set(compDef.textoffset?.up?.scale ?? 1)
		*/

		});
		button.onUpOut.connect(() => {
			if (!this.isEnabled) return
			for (var i = 0; i < this.listgup.length; i++) this.listgup[i].visible = true
			for (var i = 0; i < this.listgdown.length; i++) this.listgdown[i].visible = false
			for (var i = 0; i < this.listghover.length; i++) this.listghover[i].visible = false
			//this.ghover.visible = false
			//this.gdown.visible = false
			//this.gup.visible = true
			this.refreshTextAndImagePos(compDef.textoffset?.up, compDef.textoffset?.up?.scale, def.image?.align, def.image?.scale)
			/*if (!text) return

			text.x = compDef.textoffset?.up?.x ?? 0;
			text.y = compDef.textoffset?.up?.y ?? 0;
			text.scale.set(compDef.textoffset?.up?.scale ?? 1)
			*/
		});
		button.onPress.connect(() => {
			this.buttonActionPress()
		});

		//}
		this.refreshTextAndImagePos(compDef.textoffset?.up, compDef.textoffset?.up?.scale, def.image?.align, def.image?.scale)
		this.button = button
	}

	buttonActionDown()
	{
		if (!this.isEnabled) return
		for (var i = 0; i < this.listgup.length; i++) this.listgup[i].visible = false
		for (var i = 0; i < this.listgdown.length; i++) this.listgdown[i].visible = true
		for (var i = 0; i < this.listghover.length; i++) this.listghover[i].visible = false

		//this.ghover.visible = false
		//this.gdown.visible = true
		//this.gup.visible = false
		
		if (this.sounds) 
		{
			var rnd = Math.floor(Math.random() * this.sounds.length)
			this.sounds[rnd].play()
		}
		if (this.soundsdown)
		{
			var rnd = Math.floor(Math.random() * this.soundsdown.length)
			this.soundsdown[rnd].play()
		}
		var compDef = this.compDef
		var def = this.def
		this.refreshTextAndImagePos(compDef.textoffset?.down, compDef.textoffset?.down?.scale, def.image?.align, def.image?.scale)
		/*if (!text) return
		text.x = compDef.textoffset?.down?.x ?? 0;
		text.y = compDef.textoffset?.down?.y ?? 0;
		text.scale.set(compDef.textoffset?.down?.scale ?? 1)
		*/
	}
	buttonActionUp()
	{
		//c//onsole.log("Button up")
			//button.view = g
		if (!this.isEnabled) return
		if (!this.compDef)  return
		for (var i = 0; i < this.listgup.length; i++) this.listgup[i].visible = false
		for (var i = 0; i < this.listgdown.length; i++) this.listgdown[i].visible = false
		for (var i = 0; i < this.listghover.length; i++) this.listghover[i].visible = true

		var compDef = this.compDef
		var def = this.def
		this.refreshTextAndImagePos(compDef.textoffset?.hover, compDef.textoffset?.hover?.scale, def.image?.align, def.image?.scale)
		if (this.soundsup)
		{
			var rnd = Math.floor(Math.random() * this.soundsup.length)
			this.soundsup[rnd].play()
		}
		//this.ghover.visible = true
		//this.gdown.visible = false
		//this.gup.visible = false
		/*if (!text) return
		text.x = compDef.textoffset?.hover?.x ?? 0;
		text.y = compDef.textoffset?.hover?.y ?? 0;
		text.scale.set(compDef.textoffset?.hover?.scale ?? 1)
		*/
	}
	buttonActionPress()
	{
		if (!this.isEnabled) return
			//console.log("Button press")
		if (this.def.autotoggle) this.nextState()
		var def = this.def
		this.dialog.buttonPress(def.res, this)
	}

	setText(txt)
	{
		if (this.text)
		{
			this.text.text = txt
		}
	}

	itemsOnTop = []
	addItemOnTop(child)
	{
		this.itemsOnTop.push(child)
		this.addChild(child)
	}

	refreshTextAndImagePos(offset, scale, align, imagescale)
	{
		//console.log("refreshTextAndImagePos", this.text?.text, offset, scale, align, imagescale)
		if (this.image && !this.text)
		{
			this.image.x =  (offset?.x ?? 0)
			this.image.y = (offset?.y ?? 0)
			this.image.scale.set(imagescale ?? 1)
			
		}
		else if (this.image && this.text)
		{
			this.text.scale.set(scale ?? 1)
			this.image.scale.set(imagescale ?? 1)
			var totWidth = this.image.width + this.text.width
			var totHeight = this.image.height + this.text.height
			if (align == "right")
			{
				this.text.x = -totWidth/2 + this.text.width/2 + (offset?.x ?? 0)
				this.image.x = totWidth/2 - this.image.width/2 + (offset?.x ?? 0)
				this.text.y = (offset?.y ?? 0)
				this.image.y = (offset?.y ?? 0)
			}
			else if (align == "below")
			{
				this.text.x = (offset?.x ?? 0)
				this.image.x =(offset?.x ?? 0)
				this.text.y = -totHeight/2 + this.text.height/2 + (offset?.y ?? 0)
				this.image.y = totHeight/2 - this.image.height/2 + (offset?.y ?? 0)

			}
			else if (align == "above")
			{
				this.text.x = (offset?.x ?? 0)
				this.image.x =(offset?.x ?? 0)
				this.text.y = totHeight/2 - this.text.height/2 + (offset?.y ?? 0)
				this.image.y = -totHeight/2 + this.image.height/2 + (offset?.y ?? 0)
			}
			else // left
			{
				this.text.x = totWidth/2 - this.text.width/2 + (offset?.x ?? 0)
				this.image.x = -totWidth/2 + this.image.width/2 + (offset?.x ?? 0)
				this.text.y = (offset?.y ?? 0)
				this.image.y = (offset?.y ?? 0)
			}
		}
		else if (this.text)
		{
			this.text.x = (offset?.x ?? 0)
			this.text.y = (offset?.y ?? 0)
			this.text.scale.set(scale ?? 1)
		}
	}
}