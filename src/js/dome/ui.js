
import {Dialog} from './ui_dialog.js';


import { ComponentTypes } from './ui_componenttypes.js';
//import { UIComponentDefinitions } from '../data_ui_components.js';
import { UISounds } from './ui_sounds.js';
import { shouldSkipBareFilenamePreload } from '../svg_atlas_preload_helper.js';


export const TransDef = 
{
	FADE: 1,
	ZOOM: 2,
	FADEZOOM: 3,
	SPIN: 4,
	SPINZOOM: 6,
	SPINZOOMFADE: 7,
	FROMTOALIGNMENTSIDE: 8,
	FROMTOLEFT: 16,
	FROMTORIGHT: 32,
	FROMTOTOP: 64,
	FROMTOBOTTOM: 128,
}

export const UITransitionSounds = 
{
}

export const UILayer = 
{
	BACKGROUND: 1,
	BEHINDDEFAULT: 2,
	DEFAULT: 3,
	FOREGROUND: 4,
}

export class UI 
{
	activeDialogs = []
	inventoryInquiryFunction = undefined
	inventorySaveFunction = undefined
	tilePositionInquiryFunction = undefined

	constructor(app, dialogDefinitions, componentDefinitions, targetContainer, targetContainerBG, targetContainerFG, targetContainerBehindDefault)
	{
		this.app = app
		this.dialogDefinitions = dialogDefinitions
		for (var d in this.dialogDefinitions)
		{
			var def = this.dialogDefinitions[d]
			if (def._template)
			{
				//console.log("Copy template data for dialog: ", d)
				if (d == "claimReward")
				{
					//console.log("claimReward template: ", def._template.name)
				}
				var template = this.dialogDefinitions[def._template.name]
				this.dialogDefinitions[d] = this.copyTemplateData(template, def, d)
			}
			
		}
		this.componentDefinitions = componentDefinitions
		this.targetContainer = targetContainer
		if (targetContainerBG == undefined)
		{
			//<debug>
			console.error("No target BG ui defined. Using target container as BG")
			//</debug>
			targetContainerBG = targetContainer
		}
		this.targetContainerBG = targetContainerBG
		this.targetContainerFG = targetContainerFG
		this.targetContainerBehindDefault = targetContainerBehindDefault
		if (this.targetContainer) this.targetContainer.name = "ui_targetContainer"
		if (this.targetContainerBG) this.targetContainerBG.name = "ui_targetContainerBG"
		if (this.targetContainerFG) this.targetContainerFG.name = "ui_targetContainerFG"
		if (this.targetContainerBehindDefault) this.targetContainerBehindDefault.name = "ui_targetContainerBehindDefault"
		if (this.targetContainer == undefined) this.targetContainer = this.app.stage
		this.init()

		// take all transition sounds and create the instances
		for (var t in UITransitionSounds)
		{
			var sound = UITransitionSounds[t]
			if (sound.insrc)
			{
				sound.insound = []
				for (var src of sound.insrc)
				{
					sound.insound.push(new Howl({
						src: [src]
					}))
				}
			}
			if (sound.outsrc)
			{
				sound.outsound = []
				for (var src of sound.outsrc)
				{
					sound.outsound.push(new Howl({
						src: [src]
					}))
				}
			}
		
		}
	}

	getAssetsForPreload()
	{
		var assets = []
		function addAssetToList(asset)
		{
			if (typeof asset === 'string' && shouldSkipBareFilenamePreload(asset)) return
			if (assets.indexOf(asset) == -1)
			{
				assets.push(asset)
			}
		}
		for (var d in this.dialogDefinitions)
		{

			var def = this.dialogDefinitions[d]
			var completeListOfCompDefs = []
			for (var items in def)
			{
				var item = def[items]
				var comp = this.componentDefinitions[item.type]
				if (!comp)
					continue
				if (item.image)
				{
					addAssetToList(item.image.source)
				}
				if (comp.buttonStates)
				{
					for (var bs in comp.buttonStates)
					{
						var comp2 = this.componentDefinitions[comp.buttonStates[bs].sourcename]
						completeListOfCompDefs.push({comp: comp2, item: item} )
					}
				}
				else
				{
					completeListOfCompDefs.push({comp: comp, item: item} )
				}
				
			}
			//console.log("dialogdef: ", d, completeListOfCompDefs)
			//for (var items in def)
			for (var cc of completeListOfCompDefs)
			{	
				var comp = cc.comp
				var item = cc.item
				//var item = def[items]
				//var comp = this.componentDefinitions[item.type]
				if (!comp)
					continue

				var asset = undefined
				if (comp.type == ComponentTypes.IMAGE)
				{
					//asset = item.source
					if (item.source != undefined) addAssetToList(item.source)
				}
				if (comp.type == ComponentTypes.INPUTTEXT)
				{
					//asset = item.source
					if (comp.bg.source != undefined) addAssetToList(comp.bg.source)
					if (comp.bg_active.source != undefined) addAssetToList(comp.bg_active.source)
				}
				else if (comp.type == ComponentTypes.SVG)
				{
					//asset = item.source
					addAssetToList(item.source)
					//assets.push(item.source)
				}
				else if (comp.type == ComponentTypes.SVGGRAPHICS)
				{
					//asset = item.source
					addAssetToList(comp.source)
					//assets.push(item.source)
				}
				else if (comp.type == ComponentTypes.MOVIECLIP)
				{
					var tubedef = this.dialogDefinitions.TubeDefinitions[item.tube]
					if (tubedef)
						addAssetToList(tubedef)
					else
						console.error("INVALID TUBE DEF ", item.tube, d)
					//if (tubedef)
					//{
					//	addAssetToList(tubedef.json)
					//	addAssetToList(tubedef.xml)
					//}
				}
				if (comp.source)
				{
					addAssetToList(comp.source)
					//assets.push(comp.source)
				}
				if (comp.bg?.source)
				{
					addAssetToList(comp.bg.source)
					//assets.push(comp.bg.source)
				}
				if (comp.fill?.source)
				{
					addAssetToList(comp.fill.source)
					//assets.push(comp.fill.source)
				}
				if (comp.layersBg)
				{
					for (var layer of comp.layersBg) {
						if (layer.source) {addAssetToList(layer.source)}
					}

				}
				if (comp.layersFill)
				{
					for (var layer of comp.layersFill) {
						if (layer.source) {addAssetToList(layer.source)}
					}
				}
				
				if (comp.up)
				{ 
					for (var layer of comp.up) {
						if (layer.source) {addAssetToList(layer.source)}
					}
				}
				if (comp.hover)
				{ 
					for (var layer of comp.hover) {
						if (layer.source) {addAssetToList(layer.source)}
					}
				}
				if (comp.down)
				{ 
					for (var layer of comp.down) {
						if (layer.source) {addAssetToList(layer.source)}
					}
				}
				if (comp.layersUnchecked)
				{ 
					for (var layer of comp.layersUnchecked) {
						if (layer.source) {addAssetToList(layer.source)}
					}
				}
				if (comp.layersChecked)
				{ 
					for (var layer of comp.layersChecked) {
						if (layer.source) {addAssetToList(layer.source)}
					}
				}
		
			}
		}
		for (var asset of assets)
		{
			//console.log("Preload asset: ", asset)
		}
		return assets
		//Assets.load(assets, callbackOnProgress, callbackOnComplete)
	}


	init()
	{
		
	}

	getDefinitionCopy(name)
	{
		var def = this.dialogDefinitions[name]
		if (def)
		{
			var newdef = {}
			for (var d in def)
			{
				newdef[d] = {}
				for (var key in def[d])
				{
					newdef[d][key] = def[d][key]
				}
			}
			return newdef
		}
		return undefined
	}

	
	displayDialogObject(def, payload, cb, name, options)
	{
		if (def)
		{
			//<debug>
			console.warn('----- Display dialog: ', name)
			//</debug>
			var dialog = new Dialog(def, this, payload, cb, name, options)
			//dialog.name = name
			//console.log(" dialog X ", dialog.x, " dialog Y ", dialog.y)
			if (dialog.layer == UILayer.BACKGROUND)
			{
				this.targetContainerBG.addChild(dialog)
			}
			else if (dialog.layer == UILayer.BEHINDDEFAULT)
			{
				this.targetContainerBehindDefault.addChild(dialog)
			}
			else if (dialog.layer == UILayer.FOREGROUND)
			{
				this.targetContainerFG.addChild(dialog)
			}
			else
			{
				this.targetContainer.addChild(dialog)
			}
			this.activeDialogs.push(dialog)
			//dialog.resize(getRenderWidth(), getRenderHeight())
			//this.resizeNextTick.push(dialog)
			
			//newTween(dialog, {}, 1).onDone	(() => {
			//	dialog.scale.x = dialog.scale.y = dialog.scale.x + 0.1
			//	dialog.scale.x = dialog.scale.y = dialog.scale.x - 0.09
			//})
			//if (dialog.name == "homeBottomBar")
			//{
			//	console.log("THE homeBottomBar BAR scale is: ", dialog.scale.x, dialog.scale.y)
			//}
			return dialog
		}
		else
		{
			console.error("Dialog not found: ", name)
			return undefined
		}		
	}
	getDialogDefinition(name)
	{
		return this.dialogDefinitions[name]
	}

	displayDialog(name, payload, cb, options)
	{
		console.warn("Display dialog: ", name)
		var def = this.dialogDefinitions[name]
		if (!def)
		{
			console.error("Dialog not found: ", name)
			return undefined
		}
		this.dialogDefinitions[name].name = name
		return this.displayDialogObject(def, payload, cb, name, options)
		/*if (def)
		{
			console.log('----- Display dialog: ', name)
			if (def._template)
			{
				var template = this.dialogDefinitions[def._template.name]
				def = this.dialogDefinitions[name] = this.copyTemplateData(template, def)
			}
			var dialog = new Dialog(def, this, payload, cb)
			
			this.targetContainer.addChild(dialog)
			this.activeDialogs.push(dialog)
			return dialog
		}
		else
		{
			console.error("Dialog not found: ", name)
			return undefined
		}*/		
	}

	copyTemplateData(template, target, name)
	{
		var newdef = {}
		var templateData = target._template
		//if (name == "foundItemBg")
		//{
		//	console.log("template data: ", template, target, name)
		//}
		//console.log("template data: ", template, target, name)
		//if (target.)
		for (var t in template)
		{
			var src = template[t]
			if (target[t] != undefined)
			{
				src = target[t] // take this from target as it is overriding template
				//console.log("skip template item ", t)
				//continue
			}
			newdef[t] = {}
			for (var key in src)
			{
				//console.log("Copy template data: ", t, key, target[key])
				//if (target[key] == undefined)
					newdef[t][key] = src[key]
				//else
				//{
				//	console.log("COLLIDE template data: ", t, key, target[key])
				//	newdef[t][key] = target[key]
				//}
					

			}
			// the object in the template has template parameters to set
			if (template[t].templateParameters)
			{
				// look if this parameter is set in the _template object on the dialog def
				for (var pname in template[t].templateParameters)
				{
					var psourcename = template[t].templateParameters[pname]
					if (templateData[psourcename] != undefined)
					{
						//console.log("         Set template parameter: ", t, pname, psourcename, templateData[psourcename])
						newdef[t][pname] = templateData[psourcename]
					}
				}
			}	
		}
		for (var t in target)
		{
			//if (t== "_template") continue
			if (newdef[t] == undefined)
			{
				newdef[t] = target[t]
			}
		}
		return newdef
	}

	destroyDialog(dialog)
	{
		if (dialog.parent)
			dialog.parent.removeChild(dialog)
		
		
	}


	closeDialog(dialog) // close dialog with the exit tween and e verything
	{
		if (!dialog) return

		if (!dialog.isClosed)
		{
			dialog.close()
			return
		}
			
		this.destroyDialog(dialog)
		var idx = this.activeDialogs.indexOf(dialog)
		if (idx != -1)
			this.activeDialogs.splice(idx, 1)
		else
			console.log("Dialog not found in active dialogs: ", dialog)
		//dialog.close()
		/*dialog.doExitTween(dialog.dialogData, () => {
			this.destroyDialog(dialog)
			var idx = this.activeDialogs.indexOf(dialog)
			if (idx != -1)
				this.activeDialogs.splice(idx, 1)
			else
				console.log("Dialog not found in active dialogs: ", dialog)
	
		})*/
	}

	resize(width, height)
	{
		for (var d of this.activeDialogs)
		{
			d.resize(width, height)
		}
	}
	tick(deltatime, gameIsPaused)
	{
		//console.log("uitick ", this.activeDialogs)
		for (var d=this.activeDialogs.length-1; d>=0; d--) //  of this.activeDialogs)
		{
			var diag = this.activeDialogs[d]
			if (diag == undefined) 
			{
				this.activeDialogs.splice(d, 1)
				continue
			}
			diag.tick(deltatime, gameIsPaused)
			if (diag.isClosed)
			{
				this.closeDialog(diag)
			}
		}
	}
	dumpActiveDialogNames()
	{
		console.log("-------- Active dialog names ("+ this.activeDialogs.length +") ---- ")
		var c = 0
		for (var d of this.activeDialogs)
		{
			console.log("Active dialog " + c + ": ", d.name, " has parent: ", d.parent ? d.parent.name : " - ")
			console.log("    scale: ", d.scale.x, d.scale.y)
			console.log("    objectt: ", d)
			for (var o in d)
			{
				if (d[o] && d.dialogData && d.dialogData[o])			{
					console.log("    " + o + ": ", d[o].name)
				}
				//else if (d[o] && d[o].name)
				//{
				//	console.log("    Whats this? " + o )
				//}
			}
			c++
		}
		console.log("--------------------------------- ")
	}
	getActiveDialogByDefinitionName(definitionName)
	{
		for (var d of this.activeDialogs)
		{
			if (!d) continue
			if (!d.dialogData) continue
			if (d.dialogData.name == definitionName)
				return d
		}
		return undefined
	}
	
}


