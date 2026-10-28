import { BlurFilter, Text } from 'pixi.js';
import { Graphics } from 'pixi.js';
import { FillGradient } from 'pixi.js';
import { Container } from 'pixi.js';
import { Sprite } from 'pixi.js';
import { Texture } from 'pixi.js';
import { Slider } from '@pixi/ui';
import { TransDef, UITransitionSounds } from './ui.js';
import { Assets } from 'pixi.js';
import { NineSliceSprite } from 'pixi.js';
import { Rectangle } from 'pixi.js';

import { ProgressBar } from '@pixi/ui';
import { CheckBox } from '@pixi/ui';

import { ComponentTypes } from './ui_componenttypes.js';
import { UIButtonMovieClip } from './ui_buttonmovieclip.js';
import { UIButton } from './ui_button.js';
import { UIInputText } from './ui_inputtext.js';
import { UILayer } from './ui.js';
import { UIStateWidget } from './ui_statewidget.js';
import { Bling } from './ui_bling.js';
import { Easing } from './Tween.js';
import { Tween } from './Tween.js';

export class Dialog extends Container
{
	pos1 = {x: 0, y: 0}
	pos2 = {x: 0, y: 0}
	width = 0
	height = 0
	setup = {}
	objects = {}
	callback = undefined
	masterAnchor = {x:0.5, y:0.5}
	autoDisappear = false
	autoDisappearTime = 0
	isClosed = false
	halign = "center"
	valign = "center"
	uiLayer = UILayer.DEFAULT
	isEnabled = true
	animatedItems = []
	closeCallback = undefined
	onAspectSwap = undefined
	prFrameUpdatePositions = []
	onSwapToAlternative = undefined
	eventListeners = []
	resizeOnTick = false

	constructor(definition, ui, payload, callback, name, options)
	{
		super()
		this.ui = ui;
		this.options = options || {}
		this.companionDialogs = []
		if (definition._setup.companionDialogs)
		{
			for (var i=0; i<definition._setup.companionDialogs.length; i++)
			{
				var companium = this.ui.displayDialog(definition._setup.companionDialogs[i], payload, () => {
					console.log("Companion dialog done")
				})
				this.companionDialogs.push(companium)
			}
		}
		//this.name = name
		this.dialogData = definition
		this.callback = callback
		
		if (this.dialogData == undefined)
		{
			console.error("Dialog not found: ", name)
			return
		}
		this.name = name
		//<debug>
		console.warn("Dialog ", this.dialogData.name, " is being created ", this.dialogData)
		//</debug>
		this.successfull = true
		this.payload = payload
		this.init()
		
		//new PIXI.tween.tween({alpha: 0}).to({alpha: 1}).duration(500).onUpdate((tween, obj) => {})
		this.alpha = 1
		
		this.doEntryTween(definition, () => {
			//console.log("Dialog done")
		})

		if (definition._setup.hackyFirstFrameInvisible)
		{
			this.hackyFirstFrameInvisible = true
			this.visible = false
		}
		if (definition._setup.controller)
		{
			this.controller = new definition._setup.controller(this)
		}
	}

	getItemWithPayloadSetting(payloadSettingName)
	{
		for (var d in this.dialogData)
		{
			if (d == "_setup") continue
			if (d == "_template") continue
			
			var def = this.dialogData[d]
			if (this.isEligibleForPayloadReplacement(def.text))
			{
				// this could be the one...
				if (def.text.indexOf(payloadSettingName) != -1)
				{
					return this[d]
				}
			}
		}
		return undefined
	}

	refreshPayload(payload)
	{
		for (var p in payload)
		{
			this.payload[p] = payload[p]
		}
		for (var d in this.dialogData)
		{
			if (d == "_setup") continue
			if (d == "_template") continue
			
			var def = this.dialogData[d]
			var item = this[d]
			if (!item)
			{

			}
			else if (def.text && !this.isEligibleForPayloadReplacement(def.text))
			{
				continue
			}
			else if (item.setText && def.text)
			{
				item.setText(this.getTextString(def.text, this.payload))
			}
			else if (def.text)
			{
				item.text = this.getTextString(def.text, this.payload)
			}

			var inventoryItem = undefined
			if (def.showIfHave || def.showIfNotHave)
			{
				inventoryItem = this.ui.inventoryInquiryFunction(def.showIfHave || def.showIfNotHave)
			}
			if (def.showIfHave && ((inventoryItem && inventoryItem.showedAquired) ||  !inventoryItem) 	)
			{
				item.visible = inventoryItem && inventoryItem.count > 0 //this.ui.inventoryInquiryFunction(def.showIfHave)
			}
			if (def.showIfNotHave && (!inventoryItem || inventoryItem.count == 0 || (inventoryItem && inventoryItem.showedAquired == undefined)))
			{
				item.visible = !inventoryItem || inventoryItem.count <= 0 // !this.ui.inventoryInquiryFunction(def.showIfNotHave)
			}
			if (def.showIfHave && inventoryItem && inventoryItem.count > 0 && inventoryItem.showedAquired == undefined)
			{
				this.doRevealOrHideAnimation(item, def, inventoryItem)
			}
			if (def.showIfNotHave && inventoryItem && inventoryItem.count == 0 && inventoryItem.showedAquired == undefined)
			{
				this.doRevealOrHideAnimation(item, def, inventoryItem)
			}
			//if (def.showIfNotHave && !inventoryItem)
			//{
			//	item.visible = true
			//}
			//if (def.showIfHave && !inventoryItem)
			//{
			//	item.visible = false
			//}
		}

		
	}

	doRevealOrHideAnimation(item, def, inventoryItem)
	{
		if (def.showIfHave)
		{
			item.alpha = 0
			item.visible = true
			newTween(item, {alpha: 1}, 0.5).onDone(() => {
				inventoryItem.showedAquired = true
				this.ui.inventorySaveFunction()
			})
		}
		if (def.showIfNotHave)
		{
			item.alpha = 1
			item.visible = true
			newTween(item, {alpha: 0}, 0.5).onDone(() => {
				//inventoryItem.showedAquired = false
				item.visible = false
			})
		}
	}

	doEntryTween(definition, callback)
	{
		var transSpeed = .200
		var transcount = 0

		if (definition._setup.appearSound)
		{
			var transSounds = UITransitionSounds[definition._setup.appear]
			if (transSounds && transSounds.insound)
			{
				var idx = Math.floor(Math.random() * transSounds.insound.length)
				transSounds.insound[idx].play()
				
				//<debug>
				console.log("Playing entry sound ", definition.name)
				//</debug>
			}	
		}

		if (definition._setup.appear & TransDef.FADE)
		{
			this.alpha = 0.1
			transcount++
			newTween(this, {alpha:1}, transSpeed).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}
		if (definition._setup.appear & TransDef.ZOOM)
		{
			this.tweenIsScaling = true
			var nscale = this.scale.x
			this.scale.set(nscale * 0.5)
			transcount++
			//this.isEntryOrExitScaling = true
			//console.log("scale Dialog start ", this.name, transSpeed, this.scale.x, this.scale.y)
			newTween(this.scale, {x: nscale, y: nscale}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("scale Dialog done ", this.name, this.scale.x, this.scale.y)
				this.tweenIsScaling = false
				transcount--
				if (transcount == 0) callback()
				this.isEntryOrExitScaling = false
				this.resize()
			}).onUpdate(() => {
				//console.log("Update me ", this.name)
				this.resize(true)
				///console.log("Scale update")
			})	
		}
		if (definition._setup.appear & TransDef.SPIN)
		{
			transcount++
			this.rotation = Math.random()< 0.5 ? -Math.PI : Math.PI
			newTween(this, {rotation:0}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}
		if (definition._setup.appear & TransDef.FROMTOALIGNMENTSIDE)
		{
			transcount++
			var targPos = {x: this.x, y: this.y}
			var outPos = {x: this.x, y: this.y}
			var w = window.getRenderWidth()
			var h = window.getRenderHeight()
			var hali = this.halign; //definition._setup.halign
			var vali = this.valign; //definition._setup.valign
			if (hali == vali == "center") {if (Math.random() < 0.5) {hali = Math.random()<0.5 ? "left":"right" } else {vali = Math.random()<0.5 ? "top":"bottom"}}
			if (hali == "left") {outPos.x = -this.width/2}
			if (hali == "right") {outPos.x = w + this.width/2}
			if (vali == "top") {outPos.y = -this.height/2}
			if (vali == "bottom") {outPos.y = h + this.height/2}
			this.x = outPos.x
			this.y = outPos.y
			newTween(this, {x:targPos.x, y:targPos.y}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}
		if (definition._setup.appear & TransDef.FROMTOLEFT)
		{
			transcount++
			var targPos = {x: this.x, y: this.y}
			this.x = -this.width/2
			//console.log("the width ", this.width)
			newTween(this, {x:targPos.x}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})
		}
		if (definition._setup.appear & TransDef.FROMTORIGHT)
		{
			transcount++
			var targPos = {x: this.x, y: this.y}
			this.x = window.getRenderWidth() + this.width/2
			newTween(this, {x:targPos.x}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}
		if (definition._setup.appear & TransDef.FROMTOBOTTOM)
		{
			transcount++
			var targPos = {x: this.x, y: this.y}
			this.y = window.getRenderHeight() + this.height/2
			newTween(this, {y:targPos.y}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}
		if (definition._setup.appear & TransDef.FROMTOTOP)
		{
			transcount++
			var targPos = {x: this.x, y: this.y}
			this.y = - this.height/2
			newTween(this, {y:targPos.y}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}
	

		if (transcount == 0) callback()
	}
	
	doExitTween(definition, callback)
	{
		if (this.isClosed) return callback()
		
		var transSpeed = 0.200
		var transcount = 0

		if (definition._setup.disappearSound)
		{
			var transSounds = UITransitionSounds[definition._setup.disappear]
			if (transSounds && transSounds.outsound)
			{
				var idx = Math.floor(Math.random() * transSounds.outsound.length)
				transSounds.outsound[idx].play()
				//<debug>
				console.log("Playing exit sound ", definition.name)
				//</debug>
			}
	
		}

		if (definition._setup.disappear & TransDef.FADE)
		{
			//this.alpha = 0.1
			transcount++
			newTween(this, {alpha:0}, transSpeed).ease(Easing.linear).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}

		
		//this.isEntryOrExitScaling = true
		if (definition._setup.disappear & TransDef.ZOOM)
		{
			//this.scale.set(0.5)
			this.tweenIsScaling = true
			transcount++
			newTween(this.scale, {x: .5, y: .5}, transSpeed).ease(Easing.linear).onDone(() => {
				//console.log("Dialog done ", this.name)
				transcount--
				this.tweenIsScaling = false
				this.isEntryOrExitScaling = false
				if (transcount == 0) callback()
					
			}).onUpdate(() => {
				//console.log("exit Update me ", this.name)
				this.resize(true)
				//console.log("Scale update")
			})		
		}
		if (definition._setup.disappear & TransDef.SPIN)
		{
			transcount++
			var targrot = Math.random()< 0.5 ? -Math.PI : Math.PI
			newTween(this, {rotation:targrot}, transSpeed).ease(Easing.linear).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}

		if (definition._setup.disappear & TransDef.FROMTOALIGNMENTSIDE)
		{
			transcount++
			//var targPos = {x: this.x, y: this.y}
			var outPos = {x: this.x, y: this.y}
			var w = window.getRenderWidth()
			var h = window.getRenderHeight()
			var hali = definition._setup.halign
			var vali = definition._setup.valign
			if (hali == vali == "center") {if (Math.random() < 0.5) {hali = Math.random()<0.5 ? "left":"right" } else {vali = Math.random()<0.5 ? "top":"bottom"}}
			if (hali == "left") {outPos.x = -this.width/2}
			if (hali == "right") {outPos.x = w + this.width/2}
			if (vali == "top") {outPos.y = -this.height/2}
			if (vali == "bottom") {outPos.y = h + this.height/2}
			newTween(this, {x:outPos.x, y:outPos.y}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}
		if (definition._setup.disappear & TransDef.FROMTOLEFT)
		{
			transcount++
			var targPos = {x: -this.width/2, y: this.y}
			//this.x = -this.width/2
			newTween(this, {x:targPos.x}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}
		if (definition._setup.disappear & TransDef.FROMTORIGHT)
		{
			transcount++
			var targPos = {x: window.getRenderWidth() + this.width/2, y: this.y}
			//this.x = 
			newTween(this, {x:targPos.x}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}
		if (definition._setup.disappear & TransDef.FROMTOBOTTOM)
		{
			transcount++
			var targPos = {x: this.x, y: window.getRenderHeight() + this.height/2}
			//this.y = window.getRenderHeight() + this.height/2
			newTween(this, {y:targPos.y}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}
		if (definition._setup.disappear & TransDef.FROMTOTOP)
		{
			transcount++
			var targPos = {x: this.x, y: - this.height/2}
			//this.y = - this.height/2
			newTween(this, {y:targPos.y}, transSpeed).ease(Easing.inOutQuad).onDone(() => {
				//console.log("Dialog done")
				transcount--
				if (transcount == 0) callback()
			})	
		}

		if (transcount == 0) callback()
	}


	getSize()
	{
		var ret = {w: 0, h: 0, ax: 0.5, ay: 0.5}
		for (var d in this.dialogData)
		{
			var ditem = this.dialogData[d]
			if (ditem.sizeRef)
			{
				if (ditem.anchor)
				{
					ret.ax = ditem.anchor.x
					ret.ay = ditem.anchor.y
				}
				var compdef = this.ui.componentDefinitions[ditem.type]
				if (compdef.type == ComponentTypes.GRAPHICS)
				{
					var scale = ditem.scale ? ditem.scale : {x:1, y:1}
					var dimensions = this.getDimensionsOfLayers(compdef, compdef.layers, scale)
					return {w: dimensions.w, h: dimensions.h}
				}

				if (ditem.width != undefined)
				{
					ret.w = ditem.width
				}
				if (ditem.height != undefined)
				{
					ret.h = ditem.height
				}
				
				
				return ret
			}
		}
		return ret
	}

	getStartPos(setuppos, sz)
	{
	
		var ret = {x: 0, y: 0}
		if (setuppos) 
		{
			
			if (setuppos.y == "top")
			{
				ret.y = -sz.h * sz.ay
			}
			else if (setuppos.y == "bottom")
			{
				ret.y = sz.h * sz.ay
			}
			else
			{
				ret.y = setuppos.y != undefined ? setuppos.y : 0;
			}
			if (setuppos.x == "left")
			{
				ret.x = -sz.w * sz.ax
			}
			else if (setuppos.x == "right")
			{
				ret.x = sz.w * sz.ax
			}
			else
			{
				ret.x = setuppos.x != undefined ? setuppos.x : 0; 
			}
			
			
		}
		return ret
		
	}
	
	getTextString(rawtext, payload) {
		return rawtext.replace(/{(\w+)}/g, (match, key) => {
		  	return payload[key] !== undefined ? payload[key] : match;
		});
	}
	getPayloadItem(rawitem, payload) {
		// find the first and last {}
		var start = rawitem.indexOf("{")
		var end = rawitem.lastIndexOf("}")
		if (start != -1 && end != -1)
		{
			var key = rawitem.substring(start + 1, end)
			return payload[key] !== undefined ? payload[key] : rawitem
		}
		return rawitem
		
	}
	isEligibleForPayloadReplacement(rawtext) {
		// Check if the text contains at least one pattern that matches {word}
		const pattern = /{(\w+)}/g;
		return pattern.test(rawtext);
	}

	reinitializeToNewDefinition(newDefinitionName)
	{
		var newDefinition = this.ui.dialogDefinitions[newDefinitionName]
		//<debug>
		console.log("Reinitialize to new definition ", newDefinitionName, newDefinition)
		//</debug>
		//if (newDefinitionName == "ftuemessagePickaxe")
		//{
			//<debug>
		//	console.log("Reinitialize to new definition ", newDefinitionName, newDefinition)
			//</debug> 
		//}
		this.dialogData = newDefinition
		this.dialogData.name = newDefinitionName
		var size = this.getSize()
		var testIDsCreated = []
		var ignoreList = []
		this.name = newDefinitionName
		var swapMap = {}
		for (var d in this.dialogData)
		{
			if (d == "name") continue

			if (this[d])
			{
				swapMap[d] = {from: this[d], to: undefined}
				this.removeChild(this[d])
				delete this[d]
			}
			//console.log("Do the dialog", d)
			if (d == "states")
				continue
			if (d == "_setup")
			{
				// here take the position and alignment and stuff
				this.setup = this.dialogData[d]
				this.pos1 = this.getStartPos(this.setup.pos1, size)
				this.pos2 = this.getStartPos(this.setup.pos2, size)
				this.halign = this.setup.halign
				this.valign = this.setup.valign
				if (this.setup.size)
				{
					this.width = this.setup.size.w
					this.height = this.setup.size.h
				}
				this.layer = this.setup.layer ? this.setup.layer : UILayer.DEFAULT
				continue
			}
			if (ignoreList.indexOf(d) != -1)
				continue

			var def = this.dialogData[d]
			var item = this.createItemOnPage(def,d)
			swapMap[d] && (swapMap[d].to =  item)
			if (def.testid)
			{
				testIDsCreated.push({testid: def.testid, item: item})
			}
			if (def.animation)
			{
				this.animatedItems.push(item)
			}
			this.testidlist = testIDsCreated

		}
		if (this.onSwapToAlternative)
		{
			this.onSwapToAlternative(swapMap)
		}
		this.resizeOnTick = true			//this.resize()
	}

	init()
	{
		var size = this.getSize()

		let ignoreList = []
		var curstate
		if (this.dialogData.states)
		{
			//console.log("WE GOT STATES IN THE UI")
			/*states: { 
				coins: {
					show: ["iconAddMoves", "text_add_moves"],
				}, 
				lives: {
					show: ["icon0", "iconLife", "text_lose_life"],
				}
			},*/
			curstate = this.payload.state
			if (curstate == undefined)
			{
				curstate = Object.keys(this.dialogData.states)[0]
			}
			for (var ds in this.dialogData.states)
			{
				if (ds != curstate)
				{
					for (var s in this.dialogData.states[ds].show)
					{
						ignoreList.push(this.dialogData.states[ds].show[s])
					}
				}
			}
		}
		
		var testIDsCreated = []
		for (var d in this.dialogData)
		{
			//console.log("init Do the dialog", d)
			if (d == "states")
				continue
			if (d == "_setup")
			{
				// here take the position and alignment and stuff
				this.setup = this.dialogData[d]
				this.pos1 = this.getStartPos(this.setup.pos1, size)
				this.pos2 = this.getStartPos(this.setup.pos2, size)
				this.halign = this.setup.halign
				this.valign = this.setup.valign
				if (this.setup.size)
				{
					this.width = this.setup.size.w
					this.height = this.setup.size.h
				}
				this.layer = this.setup.layer ? this.setup.layer : UILayer.DEFAULT
				continue
			}
			if (ignoreList.indexOf(d) != -1)
				continue

			var def = this.dialogData[d]
			var item = this.createItemOnPage(def,d)
			if (def.testid)
			{
				testIDsCreated.push({testid: def.testid, item: item})
			}
			if (def.animation)
			{
				this.animatedItems.push(item)
			}
			this.testidlist = testIDsCreated
			

		}
		if (this.setup.autoDisappear)
		{
			//<debug>
			console.log("Auto disappear ", this.dialogData.name, this.setup.autoDisappearResult)
			//</debug>
			this.autoDisappear = true
			this.autoDisappearTime = this.setup.autoDisappearTime
			this.autoDisappearResult = this.setup.autoDisappearResult
		}
		
		if (this.setup.valign == "unaligned")
		{
			// for convenience, if the dialog is unaligned, we center it
			this.y = window.getRenderHeight() / 2
		}
		if (this.setup.halign == "unaligned") 
		{
			this.x = window.getRenderWidth() / 2
		}	
		this.resize()
	}

	createItemOnPage(def, dname)
	{
		var size = this.getSize()
		var compDef = this.ui.componentDefinitions[def.type]
		var item = undefined
		if (compDef != undefined)
		{
			switch (compDef.type)
			{
				case ComponentTypes.BLING:
					item = this.initBling(def, compDef)
					break
				case ComponentTypes.GRAPHICS:// "graphics":
					item = this.initGraphics(def, compDef)
					break
				case ComponentTypes.TEXT: //  "text":
					item = this.initText(def, compDef)
					break
				case ComponentTypes.BUTTON:  //"button":
					item = this.initButton(def, compDef)
					break
				case ComponentTypes.BUTTON9SLICE:  //"button":
					item = this.initButton(def, compDef)

					break
				case ComponentTypes.BUTTONMOVIECLIP:
					item = this.initButtonMovieClip(def, compDef)
					break
				case ComponentTypes.SVG:// "svg":	
					item = this.initSvg(def, compDef)
					break
				case ComponentTypes.IMAGE: // "image":	
					item = this.initImage(def, compDef)
					break
				case ComponentTypes.TUBEIMAGE: // "image":	
					item = this.initImage(def, compDef, true)
					break
				case ComponentTypes.MOVIECLIP: // "movieclip":
					item = this.initMovieClip( def, compDef)
					break
				case ComponentTypes.NINESLICE:// "9slice":
					item = this.init9Slice(def, compDef)
					break
				case ComponentTypes.PROGRESSBARGRAPHICS:
					item = this.initPriogressBar(def, compDef)
					break
				case ComponentTypes.PROGRESSBAR9SLICE:
					item = this.initPriogressBar(def, compDef)
					break
				case ComponentTypes.CHECKBOXGRAPHICS:
				case ComponentTypes.CHECKBOX:
					item = this.initCheckbox(def, compDef)
					break
				case ComponentTypes.INPUTTEXT:
					item = this.initInputText(def, compDef)
					break
				case ComponentTypes.CONTAINER:
					item = this.initContainer(def, compDef)
					break
				case ComponentTypes.STATEWIDGET:
					item = this.initStateWidget(def, compDef)
					break
				case ComponentTypes.SLIDER:
					item = this.initSlider(def, compDef)
					break
				case ComponentTypes.SVGGRAPHICS:
					item = this.initSvgGraphics(def, compDef)
					break
			}
		}
		//console.log("Created item: ", dname, def, item)
		//if (dname == "flare")
		//{
		//	//	console.log("Flare: ", item)
		//}
		if (item)
		{
			//console.warn("Create item on page", dname, def, item	)
			if (def.pos != undefined)
			{
				item.pos = def.pos
				if (this.isEligibleForPayloadReplacement(def.pos))
				{
					item.pos = this.getPayloadItem(def.pos, this.payload)
				}
				
			}
			if (
				compDef.type == ComponentTypes.BUTTON ||
				compDef.type == ComponentTypes.BUTTON9SLICE ||
				compDef.type == ComponentTypes.BUTTONMOVIECLIP
			) {
				this.allButtons.push(item)
			}
			if (this[dname] != undefined)
			{
				console.error("Duplicate or clashing name of dialog object: ", dname)
			}
			else
			{
				this[dname] = item
				//console.log("Added item to dialog: ", dname, item)
			}
			//this.objects[d] = item
			if (def.usePos == "tile")
			{
				//var pos = this.ui.tilePositionInquiryFunction(def.pos.x, def.pos.y)
				//item.x = pos.x
				//item.y = pos.y
				item._def = def
				this.prFrameUpdatePositions.push(item)
			}
			else if (def.usePos == "minetile")
			{
				item._def = def
				this.prFrameUpdatePositions.push(item)
			}
			else if (def.usePos == "mcref")
			{
				var arr = item.pos.split(".")
				var mc = this[arr[0]]
				if (mc)
				{
					var pos = mc.toGlobal(mc.getSprite(arr[1]))
					pos = this.toLocal(pos)
					item.x = pos.x
					item.y = pos.y
				}
				item._def = def
				this.prFrameUpdatePositions.push(item)
			}
			else if (def.usePos == "uielement")
			{
				// get the element from the ui
				var arr = item.pos.split(".")
				var dialog = this.ui.getActiveDialogByDefinitionName(arr[0])
				if (dialog)
				{
					var element = dialog[arr[1]]
					if (element)
					{
						var pos = dialog.toGlobal(element)
						pos = this.toLocal(pos)
						item.x = pos.x
						item.y = pos.y
						item._def = def
						
					}
					
				}
				this.prFrameUpdatePositions.push(item)
			}
			else
			{
				item.x = def.usePos == "absolute" ? item.pos.x : def.usePos == 2 ? this.pos2.x : this.pos1.x
				item.y = def.usePos == "absolute" ? item.pos.y : def.usePos == 2 ? this.pos2.y : this.pos1.y
			}
			//item.x = def.usePos == "absolute" ? def.pos.x : def.usePos == 2 ? this.pos2.x : this.pos1.x
			//item.y = def.usePos == "absolute" ? def.pos.y : def.usePos == 2 ? this.pos2.y : this.pos1.y
			if (def.halign == "right")
			{
				item.x += size.w * (1-size.ax)
			}
			else if (def.halign == "left")
			{
				item.x -= size.w * (size.ax)
			}
			if (def.trans)
			{
				if (def.trans.x) item.x += def.trans.x
				if (def.trans.y) item.y += def.trans.y
				if (def.trans.d)
					item.rotation = def.trans.d / 180 * Math.PI
				else if (def.trans.a) 
					item.rotation = def.trans.a
				if (def.trans.sx) item.scale.x = def.trans.sx
				if (def.trans.sy) item.scale.y = def.trans.sy
			}

			if (def.sizeRef)
			{
				this.width = item.width
				this.height = item.height
				if (def.anchor)
					this.masterAnchor = def.anchor
			}
			
			if (def.tint != undefined)
			{
				item.tint = def.tint
			}
			if (def.visible != undefined)
			{
				item.visible = def.visible
			}
			if (def.renderable != undefined)
			{
				item.renderable = def.renderable
			}
			if (def.useAsButton)
			{
				this.setupItemAsButton(def, item)
				/*g.hitArea = new PIXI.Rectangle(-dimensions.w/2, -dimensions.h/2, dimensions.w, dimensions.h)
				g.on('pointerdown', (e) => {e.stopPropagation()})
				g.on('pointerup', (e) => {e.stopPropagation()})
				g.on('pointerupoutside', (e) => {e.stopPropagation()})
				g.on('pointermove', (e) => {e.stopPropagation()})*/
			}
			if (def.blockClicks)
			{
				item.interactive = true
				//console.log("Do the block clicks")
				item.on('pointerup', (e) => {
					e.stopPropagation()
					//console.log("Block clicks up")
				})
				item.on('pointerdown', (e) => {
					//console.log("Block clicks")
					//this.buttonPress(def.res, item)
					//console.log("Block clicks down")
					e.stopPropagation()
				})
			}
			if (def.inContainer)
			{
				var cont = this[def.inContainer]
				if (cont)
				{
					cont.addChild(item)
					//console.log("Added item to container", def.inContainer, item)
					item.x = 0
					item.y = 0
					if (def.trans)
					{
						if (def.trans.x) item.x += def.trans.x
						if (def.trans.y) item.y += def.trans.y
						if (def.trans.d)
							item.rotation = def.trans.d / 180 * Math.PI
						else if (def.trans.a) 
							item.rotation = def.trans.a
						if (def.trans.sx) item.scale.x = def.trans.sx
						if (def.trans.sy) item.scale.y = def.trans.sy
					}
				}
			}
			if (def.animation)
			{
				item.animation = def.animation
			}
		
			//console.log("item created", dname, item.name,  item.x, item.y)
			
		}
		else
		{
			//console.log ("Nothing created for ", dname)
		}
		var isActive = true
		if (this.ui.inventoryInquiryFunction)
		{
			if (def.showIfHave)
			{
				var inventoryItem = this.ui.inventoryInquiryFunction(def.showIfHave)
				item.visible = inventoryItem && inventoryItem.count > 0
				isActive = item.visible
			}
			if (def.showIfNotHave)
			{
				var inventoryItem = this.ui.inventoryInquiryFunction(def.showIfNotHave)
				item.visible = !inventoryItem || inventoryItem.count <= 0 // !this.ui.inventoryInquiryFunction(def.showIfNotHave)
				isActive = item.visible
			}
		}
		//if (isActive)
		{
			if (def.pos1add) {
				if (def.pos1add.x != undefined) this.pos1.x += def.pos1add.x; 
				if (def.pos1add.y != undefined) this.pos1.y += def.pos1add.y
			}
			if (def.pos2add) {
				if (def.pos2add.x != undefined) this.pos2.x += def.pos2add.x; 
				if (def.pos2add.y != undefined) this.pos2.y += def.pos2add.y
			}
			
		}
		if (def.pos1set && def.pos1set.x != undefined) {this.pos1.x = def.pos1set.x; }
		if (def.pos1set && def.pos1set.y != undefined) {this.pos1.y = def.pos1set.y; }
		if (def.pos2set && def.pos2set.x != undefined) {this.pos2.x = def.pos2set.x; }
		if (def.pos2set && def.pos2set.y != undefined) {this.pos2.y = def.pos2set.y; }
		if (def.alpha != undefined) {item.alpha = def.alpha}
		return item
	}


	setEnabled(enabled)
	{
		this.isEnabled = enabled
		for (var item of this.allButtons)
		{
			item.isEnabled = this.isEnabled
		}
	}

	setupItemAsButton(def, item)
	{
		item.interactive = true
		//g.hitArea = new PIXI.Rectangle(-dimensions.w/2, -dimensions.h/2, dimensions.w, dimensions.h)
		item.def = def
		item.on('pointerdown', (e) => {
			//console.log("Block clicks")
			this.buttonPress(def.res, item)
			e.stopPropagation()
		})
	}

	getListOfResults()
	{
		var results = []
		for (var d in this.dialogData)
		{
			var ditem = this.dialogData[d]
			if (ditem.res)
			{
				results.push(ditem.res)
			}
		}
		if (this.dialogData.autodisappearResult)
		{
			results.push(this.dialogData.autodisappearResult)
		}
		return results
	}


	tick(deltatime, gameIsPaused)
	{
		//if (this.resizeNextTick)
		//{
		//	this.resize()
		//	this.resizeNextTick --
		//}
		if (this.resizeOnTick)
		{
			this.resize()
			this.resizeOnTick = false
		}
		if (!this.parent)
		{
			//<debug>
			console.log("Dialog ", this.name, " is not in the parent")
			//</debug>
			return
		}
		if (this.hackyFirstFrameInvisible)
		{
			this.visible = true
			this.hackyFirstFrameInvisible = false
		}
		//this.visible = true
		if (this.autoDisappear)
		{
			var oldtime = this.autoDisappearTime
			this.autoDisappearTime -= deltatime
			if (this.autoDisappearTime <= 0 && oldtime > 0)
			{
				this.close()
				if (this.autoDisappearResult)
				{
					this.callback(this.autoDisappearResult, this)
				}
				
			}
		}
		//console.log("me ", this.dialogData)
		
		if (this.isEntryOrExitScaling)
		{
			//console.log("Scaling")
			//this.resize()
		}
		//if (this.transcount>0)
		if (this.dbgIsScaling)
		{
			console.log("me	", this.name, this.scale.x, this.scale.y)
		}
		for (var item of this.animatedItems)
		{
			switch (item.animation.type)
			{
				case "rotate":
					item.rotation += item.animation.speed * deltatime
					break
			}
		}
		if (this.controller && !gameIsPaused)
		{
			this.controller.tick(deltatime)
		}
		for (var item of this.prFrameUpdatePositions)
		{
			let def = item._def
			if (def == undefined){
				console.log("def is undefined", item.name)
				continue
			}


			if (def.usePos == "tile")
			{
				
				var pos = this.ui.tilePositionInquiryFunction(item.pos.x, item.pos.y, this)
				if (! this.parent)
					return
				item.x = pos.x
				item.y = pos.y
				if (def.trans)
				{
					if (def.trans.x) item.x += def.trans.x
					if (def.trans.y) item.y += def.trans.y
					if (def.trans.d)
						item.rotation = def.trans.d / 180 * Math.PI
					else if (def.trans.a) 
						item.rotation = def.trans.a
					if (def.trans.sx) item.scale.x = def.trans.sx
					if (def.trans.sy) item.scale.y = def.trans.sy
				}
			}
			else if (def.usePos == "minetile")
			{
				var pos = this.ui.tilePositionInquiryFunction(item.pos.x, item.pos.y, this, true)
				item.x = pos.x
				item.y = pos.y
				if (def.trans)
				{
					if (def.trans.x) item.x += def.trans.x
					if (def.trans.y) item.y += def.trans.y
					if (def.trans.d)
						item.rotation = def.trans.d / 180 * Math.PI
					else if (def.trans.a) 
						item.rotation = def.trans.a
					if (def.trans.sx) item.scale.x = def.trans.sx
					if (def.trans.sy) item.scale.y = def.trans.sy
				}
			}
			else if (def.usePos == "mcref")
			{
				var arr = def.pos.split(".")
				var mc = this[arr[0]]
				if (mc)
				{
					var sprite = mc.getSprite(arr[1])
					if (sprite)
					{
						var pos = mc.toGlobal(sprite)
						pos = this.toLocal(pos)
						item.x = pos.x
						item.y = pos.y
					}
				}
			}
			else if (def.usePos == "uielement")
			{
				
				var arr = def.pos.split(".")
				var dialog = this.ui.getActiveDialogByDefinitionName(arr[0])
				let doClose = false
				//if (dial)
				//console.log("diaogscale: ", dialog.scale.x, dialog.scale.y, "myscale ", this.scale.x, this.scale.y)
				if (dialog && dialog.parent)
				{
					var element = dialog[arr[1]]
					if (element)
					{
						var pos = dialog.toGlobal(element)
						pos = this.toLocal(pos)
						item.x = pos.x
						item.y = pos.y
						if (def.trans && def.trans.sx && def.trans.sy)
							item.scale.set(def.trans.sx * dialog.scale.x, def.trans.sy * dialog.scale.y)
						//item._def = def
					
					}
					else
					{
						doClose = true
					}
				}
				else
				{
					doClose = true
				}
				if (doClose && this.dialogData._setup.closeOnMissingUIElement)
				{
					this.close()
				}
			}
			//item.x = this.ui.tilePositionInquiryFunction(item.pos.x, item.pos.y).x
			//item.y = this.ui.tilePositionInquiryFunction(item.pos.x, item.pos.y).y
		}
	}

	initBling(def, compDef)
	{
		var bling = new Bling(def, compDef, this)
		this.addChild(bling)
		return bling
	}

	initStateWidget(def, compDef)
	{
		//console.log("Init the compdef for ui stte wid")
		for (var s in compDef.states)
		{
			for (var l in compDef.states[s].layers)
			{
				var layer = compDef.states[s].layers[l]
				if (layer.text)
				{
					layer.compDef = this.ui.componentDefinitions[layer.text]
				}
			}
		}
		var ret = new UIStateWidget(this, def, compDef, this.payload)
		this.addChild(ret)
		//console.log("UIStateWidget", def, compDef);
		return ret

	}

	initCheckbox(def, compDef)
	{	
		var scale = def.scale ? def.scale : {x:1, y:1}
		var textstyle = this.ui.componentDefinitions[compDef.text].style
		var dimensions = this.getDimensionsOfLayers(compDef, compDef.layersUnchecked, scale)

		var bg = undefined
		var checked = undefined	
		if (compDef.type == ComponentTypes.CHECKBOXGRAPHICS)
		{
			bg = new Graphics()
			checked = new Graphics()
			this.drawLayersOntoGraphicsObject(bg, compDef, compDef.layersUnchecked, compDef.shapes, dimensions, scale,true)
			this.drawLayersOntoGraphicsObject(checked, compDef, compDef.layersChecked, compDef.shapes, dimensions, scale, true)
			bg.y -= dimensions.h / 2
			checked.y -= dimensions.h / 2
		
		}
		else
		{
			bg = new Container()
			checked = new Container()
			dimensions = {w: 0, h: 0}
			for (var l of compDef.layersUnchecked)
			{
				var s = new Sprite(Texture.from(l.source))
				bg.addChild(s)
				s.x = l.offx != undefined ? l.offx : 0
				s.y = l.offy != undefined ? l.offy : 0
				s.anchor.set(0.5)
				s.scale.set(l.scale != undefined ? l.scale : 1)
				dimensions.w = Math.max(dimensions.w, s.width)
				dimensions.h = Math.max(dimensions.h, s.height)
			}
			
			for (var l of compDef.layersChecked)	
			{
				var s = new Sprite(Texture.from(l.source))
				checked.addChild(s)
				s.x = l.offx != undefined ? l.offx : 0
				s.y = l.offy != undefined ? l.offy : 0
				s.scale.set(l.scale != undefined ? l.scale : 1)
				s.anchor.set(0.5)
			}
			
			
		}
		//console.log("Create the checkbox ", bg, checked)
		let initialValue = def.initialValueGet ? def.initialValueGet() : def.checked != undefined ? def.checked : false
		const checkBox = new CheckBox({
            text: def.text,
            
            checked : initialValue,
            style: {
                unchecked: bg,
                checked: checked,
                text: textstyle,
				/*{
                    textstyle,
                    //fontSize: 22,
                    fill: textstyle.fill,
                },*/
            }
        });

		//bg.x += 50
		if (compDef.textSide == "left")
		{
			checkBox.labelText.anchor.set(1, 0)
			checkBox.labelText.x -= dimensions.w + 20 + dimensions.w / 2
			checkBox.labelText.y -= dimensions.h / 2

			var totw = dimensions.w + checkBox.labelText.width + 20
			bg.x += (totw / 2 - dimensions.w / 2)
			checked.x = bg.x
			checkBox.labelText.x += (totw / 2 - dimensions.w / 2)
			if (compDef.fixedwidth)
			{
				bg.x = compDef.fixedwidth / 2 - dimensions.w / 2
				checked.x = bg.x
				checkBox.labelText.x = -compDef.fixedwidth / 2 
				checkBox.labelText.anchor.set(0, 0)
			}
			var bounds = checkBox.getBounds()
			bounds.x -= 200
			bounds.width +=  200 
			bg.hitArea = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height)
			checked.hitArea = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height)
		}
		else
		{
			checkBox.labelText.anchor.set(0, 0)
			checkBox.labelText.x -= dimensions.w + 20 + dimensions.w / 2
			checkBox.labelText.y -= dimensions.h / 2
			checkBox.labelText.x += bg.width *1.5

			/*var totw = dimensions.w + checkBox.labelText.width + 20
			bg.x += (totw / 2 - dimensions.w / 2)
			checked.x = bg.x
			checkBox.labelText.x += (totw / 2 - dimensions.w / 2)
			if (compDef.fixedwidth)
			{
				bg.x = compDef.fixedwidth / 2 - dimensions.w / 2
				checked.x = bg.x
				checkBox.labelText.x = -compDef.fixedwidth / 2 
				checkBox.labelText.anchor.set(0, 0)
			}
			var bounds = checkBox.getBounds()
			bounds.x -= 200
			bounds.width +=  200 
			bg.hitArea = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height)
			checked.hitArea = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height)
			*/
		}
		this.addChild(checkBox)
		checkBox.def = def

		checkBox.onCheck.connect((checked) =>
		{
			this.buttonPress(checked ? def.restrue : def.resfalse, checkBox)
			if (def.callback) def.callback(checked)
			
			if (checked)
			{
				if (checkBox.soundson)
				{
					var rnd = Math.floor(Math.random() * checkBox.soundson.length)
					checkBox.soundson[rnd].play()
				}
			}
			else
			{
				if (checkBox.soundsoff)
				{
					var rnd = Math.floor(Math.random() * checkBox.soundsoff.length)
					checkBox.soundsoff[rnd].play()
				}
			}
		});

		if (compDef.soundtoggleon)
		{
			checkBox.soundson = []
			for (var s in compDef.soundtoggleon)
			{
				checkBox.soundson.push(new Howl({
					src: compDef.soundtoggleon[s]
					}));
			}
		}
		if (compDef.soundtoggleoff)
		{
			checkBox.soundsoff = []
			for (var s in compDef.soundtoggleoff)
			{
				checkBox.soundsoff.push(new Howl({
					src: compDef.soundtoggleoff[s]
					}));
			}
		}	
	
		return checkBox
	}

	initInputText(def, compDef)
	{
		var input = new UIInputText(this, def, compDef, this.payload)
		this.addChild(input)
		return input

	}
	initContainer(def, compDef)
	{
		var c = new Container()
		this.addChild(c)
		if (def.displaySize && DEBUG.showUIContainers)
		{
			var displaygfx = new Graphics()
			displaygfx.moveTo(-def.displaySize.w/2, -def.displaySize.h/2)
			.lineTo(def.displaySize.w/2, -def.displaySize.h/2)
			.lineTo(def.displaySize.w/2, def.displaySize.h/2)
			.lineTo(-def.displaySize.w/2, def.displaySize.h/2)
			.lineTo(-def.displaySize.w/2, -def.displaySize.h/2)
			.stroke({width: 3, color:0xffffff, alpha: 0.2})
			c.addChild(displaygfx)
		}
		return c
	}

	initPriogressBar(def, compDef)
	{
		var scale = def.scale ? def.scale : {x:1, y:1}
		
		var bg = undefined
		var fill = undefined
		var progressBar = undefined

		if (compDef.type == ComponentTypes.PROGRESSBARGRAPHICS)
		{
			var dimensions = this.getDimensionsOfLayers(compDef, compDef.layersBg, scale)
			bg = new Graphics()
			this.drawLayersOntoGraphicsObject(bg, compDef, compDef.layersBg, compDef.shapes, dimensions, scale, true)
	
			fill = new Graphics()
			this.drawLayersOntoGraphicsObject(fill, compDef, compDef.layersFill, compDef.shapes, dimensions, scale, true)	

			progressBar = new ProgressBar({
				bg,
				fill,
				progress: 25
			});

			progressBar.pivot.set(dimensions.w / 2, dimensions.h / 2)
		}
		else
		{
			progressBar = new ProgressBar({
				bg: compDef.bg.source,
				fill: compDef.fill.source,
				nineSliceSprite: {
					bg: [compDef.bg.left, compDef.bg.right, compDef.bg.top, compDef.bg.bottom],
					fill: [compDef.fill.left, compDef.fill.right, compDef.fill.top, compDef.fill.bottom]
				},
				fillPaddings: {
					left:compDef.fillpadding.left,
					right:compDef.fillpadding.right,
					top:compDef.fillpadding.top,
					bottom:compDef.fillpadding.bottom
				},
				progress: 25
			});
			progressBar.width = def.width
			progressBar.height = def.height
			//var plane9 = new NineSliceSprite(
			//{
			//	texture: Texture.from(compDef.source), leftWidth: compDef.slice.left, rightWidth: compDef.slice.right, topHeight: compDef.slice.top, bottomHeight: compDef.slice.bottom
			//}) ;
		}
		//bg.x = -dimensions.w / 2
		//bg.y = -dimensions.h / 2
		///fill.x = -dimensions.w / 2
		//fill.y = -dimensions.h / 2
		// Component usage
		
		
		
		this.addChild(progressBar)
		progressBar.progress = def.progress != undefined ? def.progress : 0
		return progressBar
	}

	init9Slice(def, compDef)
	{
		//	slice: {left: 10, right: 10, top: 10, bottom: 10},
		//Assets.load(compDef.source).then((texture) => {
		var plane9 = new NineSliceSprite(
		{
			texture: Texture.from(compDef.source), leftWidth: compDef.slice.left, rightWidth: compDef.slice.right, topHeight: compDef.slice.top, bottomHeight: compDef.slice.bottom
		}) ;
		
		this.addChild(plane9)
		//plane9.anchor.set(0.5)
		plane9.setSize(def.width, def.height)
		plane9.pivot.set(def.width / 2, def.height / 2)
			//etup(texture);
		//});
		plane9.compDef = compDef
		
		return plane9
	}

	initText(def, compDef)
	{
		var styl = {}
		for (var s in compDef.style)
		{
			styl[s] = compDef.style[s]
		}
		if (def.wordWrap!= undefined)
		{
			styl.wordWrap = def.wordWrap
			
		}
		if (def.wordWrapWidth != undefined)
		{
			styl.wordWrapWidth = def.wordWrapWidth

			styl._wordWrapWidth = def.wordWrapWidth
		}
		
		var text = new Text(this.getTextString(def.text, this.payload), styl)
		if (def.align == "left")
		{
			text.anchor.set(0, 0.5)
		}
		else if (def.align == "right")	
		{
			text.anchor.set(1, 0.5)
		}
		else
		{	
			text.anchor.set(0.5)
		}
		
		if (def.anchor)
		{
			text.anchor.set(def.anchor.x, def.anchor.y)
		}
		else if (compDef.anchor)
		{
			text.anchor.set(compDef.anchor.x, compDef.anchor.y)
		}
		this.addChild(text)
		return text;
	}

	initGraphics(def, compDef)
	{
		//console.log("Create graphics ", def, compDef)
		var g = new Graphics()
		var scale = def.scale ? def.scale : {x:1, y:1}
		var dimensions = this.getDimensionsOfLayers(compDef, compDef.layers, scale, compDef.shapes)
		if (def.height != undefined)
		{
			scale.y = def.height / dimensions.h
		}
		if (def.width != undefined)
		{
			scale.x = def.width / dimensions.w
		}
		this.drawLayersOntoGraphicsObject(g, compDef, compDef.layers, compDef.shapes, dimensions, scale, true)

		this.addChild(g)
		/*if (def.useAsButton)
		{
			g.interactive = true
			//g.hitArea = new PIXI.Rectangle(-dimensions.w/2, -dimensions.h/2, dimensions.w, dimensions.h)
			g.def = def
			g.on('pointerdown', (e) => {
				console.log("Block clicks")
				this.buttonPress(def.res, g)
				e.stopPropagation()
				
			})
			/*g.hitArea = new PIXI.Rectangle(-dimensions.w/2, -dimensions.h/2, dimensions.w, dimensions.h)
			g.on('pointerdown', (e) => {e.stopPropagation()})
			g.on('pointerup', (e) => {e.stopPropagation()})
			g.on('pointerupoutside', (e) => {e.stopPropagation()})
			g.on('pointermove', (e) => {e.stopPropagation()})*/
		//}
		//g.x = -g.width / 2
		//g.y = -g.height / 2
		if (def.anchor != undefined)
		{
			g.pivot = {x: g.width * def.anchor.x, y: g.height * def.anchor.y}
		}
		else
		{
			g.pivot = {x: g.width * .5, y: g.height * .5}
		}
		
		g.alpha = def.alpha != undefined ? def.alpha : 1
		//console.log("Graphics added", g.width, g.height)		
		return g;
	}

	initSvg(def, compDef)
	{
		var g = new Graphics()
		console.log("Create svg ", def, compDef)
		
		
		fetch(def.source)
        	.then(response => response.text())
        	.then(svgData => {
				console.log("SVG loaded: ", svgData)
				// Use the .svg method on the graphics object to create shapes from the SVG data
				g.svg(svgData, 1);  // Second parameter is the scale (optional)
				console.log("SVG loaded and shapes added to Graphics");
			})
        .catch(error => {
            console.error("Error loading SVG: ", error);
        });

		this.addChild(g)
		
		return g

	}


	initSvgGraphics(def, compDef)
	{
		console.error("SVG parser disabled.. Nothing will come out.")
		
		return undefined
	}

	
	numImagesToLoad = 0
	numImagesLoaded = 0

	initImage(def, compDef, isTubeImage)
	{
		var img = undefined

		/*Texture.fromURL(def.source, { resourceOptions: { scale: 2 } })
		.then((texture) => {
			console.log("Image loaded: ", texture)
			const sprite = new PIXI.Sprite(texture);
			app.stage.addChild(sprite);
		})*/
		//.catch((error) => {
		//	console.error("Error loading SVG: ", error);
		//}//);

		if (isTubeImage)
		{
			img = new Sprite(Texture.from(def.source)); // Another frame name
		}
		else
		{
			img = new Sprite()
			this.numImagesToLoad++
			let texture = Texture.from(def.source)
			//Assets.load(def.source).then((texture) => {
				this.numImagesLoaded++

				//console.log("Image loaded: ", texture)
				img.texture = texture
				if (this.numImagesLoaded == this.numImagesToLoad)
				{
					//this.resize()
				}
			//})	
		}


		//Texture.fromURL(def.source)
		//.then((texture) => {
		//	img.texture = texture
		//})

		this.addChild(img)
		if (def.anchor)
		{
			img.anchor.set(def.anchor.x, def.anchor.y)
		}
		else
			img.anchor.set(0.5)
		if (def.scale)
		{
			if (def.scale.x != undefined) 
			{
				img.scale.x = def.scale.x
				
			}
			else if (def.scale.y != undefined)
			{
				img.scale.y = def.scale.y
			}
			else
			{
				img.scale.set(def.scale)
			}
		}
		img.def = def
		return img
	}

	initMovieClip(def, compDef)
	{
		var tubedef = this.ui.dialogDefinitions.TubeDefinitions[def.tube]
		if (tubedef == undefined)
		{
			console.error("Tube not found: ", def.tube)
			return undefined
		}
		
		if (tubedef.tube == undefined)
		{
			console.error("Tube not loaded: ", def.tube)
			return undefined
		}
		if (tubedef.tube != undefined)
		{
			var ret = tubedef.tube.getMovieClip(def.movieclip)
			ret.interpolate = def.interpolate != undefined ? def.interpolate : false
			if (ret == undefined)
			{
				console.error("Movieclip not found: ", def.movieclip)
				return undefined
			}
			if (def.frame != undefined)
			{
				ret.setFrame(def.frame)
			}
			else if (def.play)
			{
				ret.playLabel(def.play)
				
				ret.looping = def.loop != undefined ? def.loop : false
			}
			if (def.framerate)
				ret.framerate = def.framerate
			
			if (def.blockClicks)
			{

				ret.interactive = true
				ret.on('pointerup', (e) => {
					e.stopPropagation()
				})
				ret.on('pointerdown', (e) => {
					e.stopPropagation()
				})
			}
			this.addChild(ret)
			return ret
		}
		return undefined
	}

	initSlider(def, compDef)
	{
		var width = def.width
		var height = def.height
		var radius = def.radius
		var borderWidth = compDef.borderWidth
		var borderColor = compDef.borderColor
		var backgroundColor = compDef.backgroundColor
		var fillColor = compDef.fillColor
		var handleBorder = compDef.handleBorder
		var meshColor = compDef.meshColor
		var min = def.min || 0
		var max = def.max || 100
		var step = def.step || 1
		var value = def.value || 0
		var fontColor = compDef.fontColor
		var fontSize = compDef.fontSize
		var showValue = def.showValue || true
		const bg = new Graphics().roundRect(0, 0, width, height, radius).fill(borderColor).roundRect(borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2, radius).fill(backgroundColor);
        const fill = new Graphics().roundRect(0, 0, width, height, radius).fill(borderColor).roundRect(borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2, radius).fill(fillColor);
        const slider = new Graphics().circle(0, 0, 20 + handleBorder).fill(borderColor).circle(0, 0, 20).fill(meshColor);

        // Component usage
        const singleSlider = new Slider({
          bg,
          fill,
          slider,
          min,
          max,
          step,
          value,
          valueTextStyle: {
            fill: fontColor,
            fontSize
          },
          showValue
        });
        singleSlider.value = value;
        singleSlider.onUpdate.connect(value => {
			console.log("Slider value changed: ", value)
			this.callback(def.res, this, singleSlider)
		});
        //list.addChild(singleSlider);
        //view.addChild(list);
		this.addChild(singleSlider)
		return singleSlider
	}

	getDimensionsOfLayers(defaults, layers, scale, shapes)
	{
		var ret = {minx: 0, maxx: 0, miny: 0, maxy: 0}
		for (var layer of layers)
		{
			var width = layer.width != undefined ? layer.width : defaults.width
			var height = layer.height != undefined ? layer.height : defaults.height
			switch (layer.type)
			{
				case "rect":
				case "roundrect":
					var sx = scale.x
					var sy = scale.y
					
		
					if (sy.length && sy[sy.length-1] == "%") {
						var h = window.getRenderHeight()
						
						sy = sy.substr(0, sy.length-1) / 100
						sy = h / height

					}
					if (sx.length && sx[sx.length-1] == "%") {
						var w = window.getRenderWidth()
						
						sx = sx.substr(0, sy.length-1) / 100
						sx = w / width

					}

					ret.maxx = Math.max(ret.maxx, layer.offx + width * sx)
					ret.maxy = Math.max(ret.maxy, layer.offy + height * sy)
					ret.miny = Math.min(ret.miny, layer.offy)
					ret.minx = Math.min(ret.minx, layer.offx)
					break
				case "circle":
					ret.maxx = Math.max(ret.maxx, layer.offx + layer.radius  + layer.pos.x)
					ret.maxy = Math.max(ret.maxy, layer.offy + layer.radius  + layer.pos.y)
					ret.miny = Math.min(ret.miny, layer.offy + layer.pos.y - layer.radius)
					ret.minx = Math.min(ret.minx, layer.offx + layer.pos.x - layer.radius)
					break
				case "poly":
					for (var p =0; p<shapes[layer.shape].length; p+=2)
					{
						let x = shapes[layer.shape][p]
						let y = shapes[layer.shape][p+1]
						ret.maxx = Math.max(ret.maxx, x + layer.offx)
						ret.maxy = Math.max(ret.maxy, y + layer.offy)
						ret.minx = Math.min(ret.minx, x + layer.offx)
						ret.miny = Math.min(ret.miny, y + layer.offy)
					}
					break
			}
		}
		ret.w = ret.maxx - ret.minx
		ret.h = ret.maxy - ret.miny
		return ret
	}

	drawLayersOntoGraphicsObject(g, defaults, layers, shapes, dimensions, scale, dontOffset)
	{
		var offx = dontOffset ? 0 : -dimensions.w/2
		var offy = dontOffset ? 0 : -dimensions.h/2

		for (var layer of layers)
		{
			var width = layer.width != undefined ? layer.width : defaults.width
			var height = layer.height != undefined ? layer.height : defaults.height
			
			var fill
			
			if (layer.gradient)
			{
				fill = new FillGradient(layer.gradient.direction[0] * scale.x + offx, layer.gradient.direction[1] * scale.y + offy, layer.gradient.direction[2] * scale.x + offx, layer.gradient.direction[3] * scale.y + offy);
				for (var i = 0; i < layer.gradient.colors.length; i++)
				{       
					var color= layer.gradient.colors[i]
					var ratio= layer.gradient.stops[i]
					fill.addColorStop(ratio, color);
				}
			}
			else
			{
				fill = {color: layer.color, alpha: layer.alpha }
			}
			var sx = scale.x
			var sy = scale.y
			if (sy.length && sy[sy.length-1] == "%") {
				var h = window.getRenderHeight()
				
				sy = sy.substr(0, sy.length-1) / 100
				sy = h / layer.height * sy

			}
			if (sx.length && sx[sx.length-1] == "%") {
				var w = window.getRenderWidth()
				
				sx = sx.substr(0, sy.length-1) / 100
				sx = w / layer.width * sx

			}
			switch (layer.type)
			{
				case "rect":
					g.rect(offx + layer.offx, offy + layer.offy, width* sx, height * sy)
					//console.warn("rect" , offx + layer.offx, offy + layer.offy, width* sx, height * sy)
					g.fill(fill)
					if (layer.strokewidth)
					{
						g.stroke({color: layer.strokecolor, width: layer.strokewidth})
					}
					break
				case "roundrect":
					g.roundRect(offx + layer.offx, offy + layer.offy, width * sx, height * sy, layer.corner)
					//console.warn("roundrect", offx + layer.offx, offy + layer.offy, width * sx, height * sy, layer.corner)
					g.fill(fill)
					if (layer.strokewidth)
					{
						g.stroke({color: layer.strokecolor, width: layer.strokewidth})
					}
					break
				case "circle":
					//g.roundRect(-dimensions.w/2 + layer.offx, -dimensions.h/2 + layer.offy, layer.width * scale.x, layer.height * scale.y, layer.corner)
					g.circle(offx  + layer.offx + layer.pos.x, offy + layer.offy + layer.pos.y, layer.radius )
					//console.warn("circle", offx  + layer.offx + layer.pos.x, offy + layer.offy + layer.pos.y, layer.radius )
					g.fill(fill)
					if (layer.strokewidth)
					{
						g.stroke({color: layer.strokecolor, width: layer.strokewidth})
					}
					break
				case "poly":
					var shape = shapes[layer.shape]
					var cpy = []
					for (var i = 0; i < shape.length; i+=2)
					{
						var x = shape[i] * scale.x 
						var y = shape[i+1] * scale.y 
						var ang = layer.rotate ? layer.rotate / 180 * Math.PI : 0
						// rotate x and y by ang
						var x2 = x * Math.cos(ang) - y * Math.sin(ang)
						var y2 = x * Math.sin(ang) + y * Math.cos(ang)
						cpy.push(x2 + layer.offx)
						cpy.push(y2 + layer.offy)
					}
					g.poly(cpy)
					g.fill(fill)
					if (layer.strokewidth)
					{
						g.stroke({color: layer.strokecolor, width: layer.strokewidth})
						
					}
					break


			}
		}
	}
	createSliceSpriteLayers(layerlist, _width, _height, listToAddTo, container)
	{
		for (var layer of layerlist)
		{
			var plane9 = new NineSliceSprite(
			{
				texture: Texture.from(layer.source), leftWidth: layer.left, rightWidth: layer.right, topHeight: layer.top, bottomHeight: layer.bottom
			});
			let width = _width
			let height = _height
			container.addChild(plane9)
			//plane9.anchor.set(0.5)
			if (layer.scale != undefined && layer.scale.x == undefined && layer.scale.y == undefined)
			{
				width = layer.scale * width
				height = layer.scale * height
			}
			else if (layer.scale != undefined)
			{
				if (layer.scale.x != undefined) width = layer.scale.x * width
				if (layer.scale.y != undefined) height = layer.scale.y * height
			}
			if (layer.widthAdd != undefined) width += layer.widthAdd
			if (layer.heightAdd != undefined) height += layer.heightAdd
			//width *= (layer.scale != undefined ? layer.scale.x != undefined ? layer.scale.x : 1 : 1)
			//height *= (layer.scale != undefined ? layer.scale.y != undefined ? layer.scale.y : 1 : 1)
			plane9.setSize(width, height)
			plane9.pivot.set(width / 2, height / 2)
			plane9.x += layer.offx != undefined ? layer.offx : 0
			plane9.y += layer.offy != undefined ? layer.offy : 0
			plane9.alpha = layer.alpha != undefined ? layer.alpha : 1
			plane9.tint = layer.tint != undefined ? layer.tint : 0xFFFFFF
			if (layer.blur != undefined)
			{
				let filter = new BlurFilter(layer.blur)
				plane9.filters = [filter]
			}
			
			listToAddTo.push(plane9)
			container.addChild(plane9)
		}
	}

	initButtonMovieClip(def, compDef)
	{
		const btn = new UIButtonMovieClip(this, def, compDef)
		if (!btn.mc) {
			btn.destroy({ children: true })
			return undefined
		}
		this.addChild(btn)
		btn.def = def
		return btn
	}

	initButton(def, compDef)
	{
		if (compDef.buttonStates)
		{
			for (var t in compDef.buttonStates)
			{
				var bs = compDef.buttonStates[t]
				if (bs.source == undefined)
				{
					bs.source = this.ui.componentDefinitions[bs.sourcename]
					if (bs.source == undefined)
					{
						console.error("Button state source not found: ", bs.sourcename, "in component defintipon ", compDef)
					}
				}
			}
		}
		var newButton = new UIButton(this, def, compDef)
		if (def.state) newButton.setState(def.state)
		this.addChild(newButton)
		return newButton

	}

	allButtons = []

	buttonPress(res, button)
	{
		//console.log("Button pressed ", res, button)
		var def = button.def

		if (def.autotoggle && def.togglegroup != undefined)
		{
			for (var b in this.allButtons) // this.dialogData)
			{
				var but =  this.allButtons[b]
				var ditem = but.def
				if (ditem.togglegroup == def.togglegroup && ditem != def)
				{
					if (but.resetState)
					{
						but.resetState(false)
					}
				}
			}
		}

		if (this.controller)
		{
			res = this.controller.buttonPress(res, button)
		}


		if (def.closeDialog)
		{
			this.close(res)
			button.isEnabled = false
		}
		else
		{
			this.callback(res, this, button)
		}
	}
	buttonPressExternal(res)
	{
		// look through items and find the one with the res
		for (var d in this.dialogData)
		{
			var ditem = this.dialogData[d]
			if (ditem.res == res)
			{
				this.buttonPress(res, this[d])
				return
			}
		}
		console.warn("item for button action not found. ", res)
		//this.buttonPress(res, undefined)
		this.callback(res, this, undefined)
	}

	getButtonWithRes(res) {
		for (var d in this.dialogData)
		{
			var ditem = this.dialogData[d]
			if (ditem.res == res)
			{
				return this[d]
			}
		}
		return undefined
	}

	close(res)
	{
		if (this.isClosing || this.isClosed) return
		
		this.isClosing = true
		//<debug>
		console.warn("Close dialog ", this.name)
		//</debug>
		this.controller?.onClose()
		for (var i=0; i<this.companionDialogs.length; i++)
		{
			this.companionDialogs[i].close()
		}

		this.doExitTween(this.dialogData, () => {
			if (!this.parent) return
			if (this.parent) this.parent.removeChild(this)
			//console.log("Dialog closed ", this.name)
			for (var d in this.dialogData)
			{
				if (this[d] != undefined)
				{
					var item = this[d]
					if (item.destroymc)
					{
						item.destroymc()
					}

					if (item.off)
					{
						item.off('pointerup')
						item.off('pointerdown')
					}

					this.removeChild(this[d])
					if (item.destroy)
					{
						item.destroy({children: true})
					}
					this[d] = undefined
					
				}
					
			}
			if (res != undefined) if (this.callback) this.callback(res, this)

			this.isClosed = true
			if (this.closeCallback) this.closeCallback(this)
			this.callback = undefined
			this.closeCallback = undefined
			this.controller = undefined
			this.companionDialogs = []
			this.dialogData = undefined
			this.payload = undefined
			this.options = undefined
			this.name = undefined
			this.definition = undefined
			this.allButtons = []
			this.destroy({children: true})
			
			
		})
		
		
	}	


	resize(isEntryOrExitScaling)
	{
		isEntryOrExitScaling = this.tweenIsScaling
		
		if (this == null || this.scale == null) {
			//console.error("Dialog is null in resize")
			return
		}
			

		//console.warn("resize dialog ", this.name, isEntryOrExitScaling)
		var w = window.getRenderWidth()
		var h = window.getRenderHeight()

		
		var hali = this.halign
		var vali = this.valign
		
		//console.log("Resize dialog ", this.name, w, h, hali, vali)
		//if (this.name  == "homeBottomBar")
		//{
		//	console.log("Gotcha")
		//}
		var ox = this.setup.alignOffset ? this.setup.alignOffset.x : 0
		var oy = this.setup.alignOffset ? this.setup.alignOffset.y : 0
		//var alignscale = 1
		//console.log("Scale resize ", this.name)
		var screenAspect = w / h
		if ( this.setup.aspectScaleFactor)
		{
			//this.resizeNextTick = 2
		
			var factor = Math.min(1, Math.max(0, screenAspect - this.setup.aspectScaleFactor.minAspect) / (this.setup.aspectScaleFactor.maxAspect - this.setup.aspectScaleFactor.minAspect))
			var scale = this.setup.aspectScaleFactor.minScale + factor * (this.setup.aspectScaleFactor.maxScale - this.setup.aspectScaleFactor.minScale)
			ox *= scale
			oy *= scale
			//console.log("")
			//console.log("The scale is ", scale)
			if (!isEntryOrExitScaling)
				this.scale.set(scale)
			
			//console.log("Scale aspectScaleFactor resize ", this.name, screenAspect, factor, scale)
			
			//this.scale.set(.5)
			//debugScaleSet(this.name + "scale check ", this)	
		}
		if (this.setup.aspectSwap && !this.options.disableAspectSwap)
		{
			//console.log("Aspect swap ", this.name, this.setup.aspectSwap.aspectRange.min, screenAspect)
			// are we in the aspect range?
			if (screenAspect >= this.setup.aspectSwap.aspectRange.min && screenAspect <= this.setup.aspectSwap.aspectRange.max)
			{
				//console.log("Inside range. Keep as is")
				
			}
			else
			{
				//console.log("Aspect swap ", this.name, "is not in the aspect range")
				this.reinitializeToNewDefinition(this.setup.aspectSwap.alternative)
				ox = this.setup.alignOffset ? this.setup.alignOffset.x : 0
				oy = this.setup.alignOffset ? this.setup.alignOffset.y : 0
				//var alignscale = 1
				if (this.onAspectSwap) this.onAspectSwap(this)
			}
			//if (this.setup._aspectSwap.aspectRange.min > screenAspect)
		}

		if (hali != "unaligned")
		{
			if (hali == "right") ox = -ox
			this.x = (hali == "left" ? this.width  * this.scale.x * this.masterAnchor.x : hali == "right" ? w - (this.width* this.scale.x * (1-this.masterAnchor.x)) : w /2	) + ox	
		}
		
		if (vali == "aspect")
		{
			//console.log("Aspect align")
			var screenAspect = w / h
			var af = this.setup.aspectAlignYFactor
			var factor = Math.min(1, Math.max(0, screenAspect - af.minAspect) / (af.maxAspect - af.minAspect))
			var yfactor = af.min + factor * (af.max - af.min)
			this.y = h * yfactor
		}
		else if (vali != "unaligned")
		{
			if (vali == "bottom") oy = -oy
			this.y = (vali == "top" ? this.height * this.scale.y * this.masterAnchor.y : vali == "bottom" ? h - (this.height * this.scale.y * (1-this.masterAnchor.y)) : h/2 ) + oy
		}
		
		//this.y = (vali == "top" ? this.height/2 : vali == "bottom" ? h - this.height/2 : h /2) + oy
		for (var d in this.dialogData)
		{
			var ditem = this.dialogData[d]
			if (ditem.type == "image" && (ditem.texture == null || ditem.texture == undefined))
			{
				//console.warn("Null texture for image ", d)
				//continue
			}
			if (this[d] == undefined)
				continue
			if (this[d] != undefined && this[d].resize)
				this[d].resize()

			if (ditem.fitToScreenKeepAspect && this[d] && this[d].texture)
			{
				var ogigwidth = this[d].texture.width
				var ogigheight = this[d].texture.height
				var asp = ogigwidth / ogigheight
				var screenasp = (w*(ditem.fitToScreenWidth || 100) /100) / (h*(ditem.fitToScreenHeight || 100) /100)
				if (asp > screenasp) // fit to width
				{
					this[d].width = w  / 100 * ((ditem.fitToScreenWidth || 100) ) / this.scale.x
					this[d].height = this[d].width / asp
					//this.x = getRenderWidth() / 2 - this.x
				}
				else
				{
					this[d].height = h / 100 * ((ditem.fitToScreenHeight || 100) ) / this.scale.y
					this[d].width = this[d].height * asp
					//this.y = getRenderHeight() / 2 - this.y
				}
				if (this[d].compDef?.type == ComponentTypes.NINESLICE)
				{
					console.log(" UPDATE ancho")
					this[d].pivot.set(this[d].width / 2, this[d].height / 2)
				}
				
			}
			else if (this[d].texture)
			{
				if (ditem.fitToScreenWidth)
				{
					
					
					this[d].width = w  / 100 * ditem.fitToScreenWidth / this.scale.x
					if (ditem.type == "svg")
					{
						this[d].x = -w/2 // questionable?
					}
					if (this[d].compDef?.type == ComponentTypes.NINESLICE)
					{
						this[d].pivot.set(this[d].width / 2, this[d].height / 2)
					}
					// positin this in regards to the absolute screen positioningin
					//this[d].x = getRenderWidth() / 2 - this.x
				}
				if (ditem.fitToScreenHeight )
				{
					this[d].height = h / 100 * ditem.fitToScreenHeight / this.scale.y
					if (ditem.type == "svg")
					{
						this[d].y = 0
					}
					if (this[d].compDef?.type == ComponentTypes.NINESLICE)
					{
						this[d].pivot.set(this[d].width / 2, this[d].height / 2)
					}
					//this[d].y = getRenderHeight() / 2 - this.y
				}
			}
			
			if (ditem.alignToScreenVertical != undefined)
			{
				if (this[d].texture == null || this[d].texture == undefined)
					continue
				var sh = this[d].height
				var mul = ditem.alignToScreenVertical/100
				var innerscreenHeight = h / this.scale.y
				var y =  (innerscreenHeight ) * mul - this.y / this.scale.y // this.scale.y //+ this[d].height / 2 - this.y
				// y is the centerpoint placed exactly on the screen position 
				// we need to move it so that the top of the object is at the position
				
				if (ditem.tag == "hello")
					console.log("TYAG ", this.scale.y)

				this[d].y = y /// this.scale.y
			}
			if (ditem.alignToScreenHorizontal != undefined)
			{
				if (this[d].texture == null || this[d].texture == undefined)
					continue
				var sw = this[d].width
				var mul = ditem.alignToScreenHorizontal/100
				var innerscreenWidth = w / this.scale.x
				var x = (innerscreenWidth ) * mul - this.x / this.scale.x
				//var x = (w - this[d].width ) * (ditem.alignToScreenHorizontal/100) + this[d].width / 2 - this.x
				//console.log("Align it ",w, x, ditem.alignToScreenHorizontal)
				this[d].x = x 
			}
		}
		/*if (this.name  == "homeBottomBar")
		{
			console.log("homeBottomBar scale ", this.scale.x, this.scale.y)
			if (this.parent)
			{
				console.log("homeBottomBar Parent scale ", this.parent.scale.x, this.parent.scale.y)
			}
			if (this.parent.parent)
			{
				console.log("homeBottomBar Parent parent scale ", this.parent.parent.scale.x, this.parent.parent.scale.y)
			}
			if (this.parent.parent.parent)
			{
				console.log("homeBottomBar Parent parent parent scale ", this.parent.parent.parent.scale.x, this.parent.parent.parent.scale.y)
			}
			console.log("app homeBottomBar scale ", app.stage.scale.x, app.stage.scale.y)
			debugScaleSet("homeBottomBar scale check ", this)	
		}*/
		
		function debugScaleSet(txt, obj, indent)
		{
			// make text with indentation
			if (indent == undefined) indent = 0
			var ind = ""
			for (var i = 0; i < indent; i++)
			{
				ind += "  "
			}
			ind = ind + txt
			
			console.log(ind, obj.name +  obj.scale.x, obj)
			if (obj.parent)
			{
				debugScaleSet(txt, obj.parent, indent + 1)
			}
		}
	}	

	loadProfilePic(panel, url, onDone)
	{
		// Assuming you're using the new asset loading method
		
		//url = 'https://playseedling.com/profilepics/man-97.jpg';
		
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src =  url;

		img.onload = function() {
			const texture = Texture.from(img);
			//const sprite = new Sprite(texture);
		

    		// Create a sprite from the loaded image
    		const profilePic = new Sprite(texture);

			//console.log("Profile pic loaded", profilePic.width, profilePic.height)
    		// Set the size of the profile picture

			var dialogItem = panel.profilepic
			var data = panel.dialogData.profilepic
			var picoffX = 0
			var picoffY = 0
			if (data.profilepicShape == "circle")	
			{
				// Create a circular mask
				var circlesize = data.profilepicRadius 
				const mask = new Graphics();
				var scale = (circlesize*2) / profilePic.width
				profilePic.scale.set(scale)
				mask.beginFill(0xffffff);
				mask.drawCircle(profilePic.width / 2, profilePic.height / 2, profilePic.width / 2);
				mask.endFill();

				// Apply the mask to the profile picture
				profilePic.mask = mask;
				picoffX = circlesize
				picoffY = circlesize
				profilePic.x =dialogItem.x - picoffX;
				profilePic.y = dialogItem.y - picoffY;
	
				mask.x = profilePic.x;
				mask.y = profilePic.y;
				panel.addChild(profilePic);
				panel.addChild(mask);
			}
			else
			{
				var scale = (dialogItem.width) / profilePic.width
				profilePic.scale.set(scale * data.profilepicScale)
				picoffX = profilePic.width / 2
				picoffY = profilePic.height / 2
				panel.addChild(profilePic);
			}
			

			// Position the mask and the profile picture
			profilePic.x =dialogItem.x - picoffX;
			profilePic.y = dialogItem.y - picoffY;
			!onDone || onDone(panel, profilePic)
			// Add the masked image to the stage
			//if (panel.ProgressBar) panel.addChild(panel.progressbar) // uglyhack
		};
	}
}