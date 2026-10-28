import  { Container } from "pixi.js"
import { Application, Text, TextStyle, Color, FillGradient } from 'pixi.js';
import { TransDef } from "./ui.js"
import { UI } from "./ui"
import { ComponentTypes } from "./ui_componenttypes"

import logo from '../../g/biodome_logo.svg'; // rasterize: ignore
import checkbox_on from '../../g/checkbox_on.svg'
import checkbox_off from '../../g/checkbox_off.svg'

import button_side_up from '../../g/button_side_up.svg'
import button_side_hover from '../../g/button_side_hover.svg'
import button_side_down from '../../g/button_side_down.svg'

//import clicksound1 from '../../s/clic1.mp3';
//import clicksound2 from '../../s/clic2.mp3';

export const OptionsDialogDefinitions = 
{
	sideMenuButton:{ // the button opening and closing the sidemenu
		_setup: 	{halign: "left", valign: "top", appear: TransDef.FROMTOLEFT, disappear: TransDef.FROMTOLEFT, alignOffset: {x:40, y:40}, pos1: {x:0, y:0},  aspectScaleFactor: {minAspect: 0.5, minScale: 1.5, maxAspect: 1, maxScale:0.5}},
		togglebut: 	{type: "sidemenuButton", res: "but1", text: "", closeDialog: true, usePos: 1, trans: {sx: 1.2, sy: 1.2}, pos1add: {x:0, y:0}},
	},
	sideMenu:{
		_setup: 		{hackyFirstFrameInvisible: true, halign: "left", valign: "top", appear: TransDef.FROMTOLEFT, disappear: TransDef.FROMTOLEFT, alignOffset: {x:0, y:0}, pos1: {x:0, y:0},  aspectScaleFactor: {minAspect: 0.5, minScale: 1.5, maxAspect: 1.3, maxScale:.6}},
		box: 			{type: "sidemenubox", alpha: 1, usePos: 1, scale:{x:3, y:"150%"}, pos1add: {x:0, y:0}, sizeRef: true, anchor: {x:0.5, y:0}},
		boxclickcover: 	{type: "sidemenubox", alpha: 0, usePos: 1, scale:{x:15, y:26}, pos1add: {x:0, y:48}, useAsButton: true, closeDialog: true, res: "clickcatch"},
		logo: 			{type: "image", source: logo, scale: 0.4, offx:40, usePos:1, pos1add: {x:0, y:80}},
		but0: 		{type: "sideMenuItem", text: "but1", usePos: 1, pos1add: {x:0, y:0}, trans: {x:-1000, y:0}}, // dummy button so the preloader can know that this button asset should be loaded
		//but2: 		{type: "sideMenuItem", text: "but2", usePos: 1, pos1add: {x:0, y:45}},
	},
	extendedMenu:{
		_setup: {halign: "left", valign: "top", appear: TransDef.FROMTOLEFT, disappear: TransDef.FROMTOLEFT, alignOffset: {x:0, y:0}, pos1: {x:40, y:40},  aspectScaleFactor: {minAspect: 0.5, minScale: 1.5, maxAspect: 1, maxScale:1}},
		
		box: 			{type: "sidemenubox", alpha: 1, usePos: 1, scale:{x:3, y:9}, pos1add: {x:0, y:0}, sizeRef: true, anchor: {x:0.5, y:0}},
		boxclickcover: 	{type: "sidemenubox", alpha: 0, usePos: 1, scale:{x:15, y:26}, pos1add: {x:0, y:48}, useAsButton: true, closeDialog: true, res: "clickcatch"},

		giveiap: 		{type: "sideMenuItem", text: "IAP premum", res: "iap", usePos: 1, pos1add: {x:0, y:60},  closeDialog: true, trans: {x:0, y:0}},
		give1: 		{type: "sideMenuItem", text: "1000 coins", res: "coins1000", usePos: 1, pos1add: {x:0, y:60},  closeDialog: true, trans: {x:0, y:0}},
		give2: 		{type: "sideMenuItem", text: "10000 coins", res: "coins10000", usePos: 1, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:0, y:0}}, 
		give3: 		{type: "sideMenuItem", text: "Set coins to 2", res: "coins2", usePos: 1, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:0, y:0}},
		give4: 		{type: "sideMenuItem", text: "100 shovels", res: "shovels100", usePos: 1, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:0, y:0}}, 
		give5: 		{type: "sideMenuItem", text: "1000 shovels", res: "shovels1000", usePos: 1, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:0, y:0}}, 
		give6: 		{type: "sideMenuItem", text: "Set shovels to 2", res: "shovels2", usePos: 1, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:0, y:0}}, 
		//<premium>
		giveprem: 	{type: "sideMenuItem", text: "Premium", res: "premium", usePos: 1, width: 200, pos1add: {x:0, y:0}, closeDialog: true, trans: {x:-40, y:0}}, 
		takeprem2: 	{type: "sideMenuItem", text: "REM", res: "rem_premium", usePos: 1, width: 60, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:110, y:0}}, 
		//</premium>
		give7: 		{type: "sideMenuItem", text: "UNLOCK_mine", res: "UNLOCK_mine", usePos: 1, width: 200, pos1add: {x:0, y:0}, closeDialog: true, trans: {x:-40, y:0}}, 
		take7: 		{type: "sideMenuItem", text: "REM", res: "REM_UNLOCK_mine", usePos: 1, width: 60, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:110, y:0}}, 
		give8: 		{type: "sideMenuItem", text: "UNLOCK_pickaxe", res: "UNLOCK_pickaxe", usePos: 1, width: 200, pos1add: {x:0, y:0}, closeDialog: true, trans: {x:-40, y:0}}, 
		take8: 		{type: "sideMenuItem", text: "REM", res: "REM_UNLOCK_pickaxe", usePos: 1, width: 60, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:110, y:0}}, 
		give9: 		{type: "sideMenuItem", text: "UNLOCK_powersaw", res: "UNLOCK_powersaw", usePos: 1, width: 200, pos1add: {x:0, y:0}, closeDialog: true, trans: {x:-40, y:0}}, 
		take9: 		{type: "sideMenuItem", text: "REM", res: "REM_UNLOCK_powersaw", usePos: 1, width: 60, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:110, y:0}}, 
		give10: 	{type: "sideMenuItem", text: "UNLOCK_powerdrill", res: "UNLOCK_powerdrill", usePos: 1, width: 200, pos1add: {x:0, y:0}, closeDialog: true, trans: {x:-40, y:0}}, 
		take10: 	{type: "sideMenuItem", text: "REM", res: "REM_UNLOCK_powerdrill", usePos: 1, width: 60, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:110, y:0}}, 
		give11: 	{type: "sideMenuItem", text: "UNLOCK_shuffle", res: "UNLOCK_shuffle", usePos: 1, width: 200, pos1add: {x:0, y:0}, closeDialog: true, trans: {x:-40, y:0}}, 
		take11: 	{type: "sideMenuItem", text: "REM", res: "REM_UNLOCK_shuffle", usePos: 1, width: 60, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:110, y:0}}, 
		give12: 	{type: "sideMenuItem", text: "UNLOCK_bomb", res: "UNLOCK_bomb", usePos: 1, width: 200, pos1add: {x:0, y:0}, closeDialog: true, trans: {x:-40, y:0}}, 
		take12: 	{type: "sideMenuItem", text: "REM", res: "REM_UNLOCK_bomb", usePos: 1, width: 60, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:110, y:0}}, 
		give13: 	{type: "sideMenuItem", text: "UNLOCK_rocket", res: "UNLOCK_rocket", usePos: 1, width: 200, pos1add: {x:0, y:0}, closeDialog: true, trans: {x:-40, y:0}}, 
		take13: 	{type: "sideMenuItem", text: "REM", res: "REM_UNLOCK_rocket", usePos: 1, width: 60, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:110, y:0}}, 
		give14: 	{type: "sideMenuItem", text: "UNLOCK_lightball", res: "UNLOCK_lightball", usePos: 1, width: 200, pos1add: {x:0, y:0}, closeDialog: true, trans: {x:-40, y:0}}, 
		take14: 	{type: "sideMenuItem", text: "REM", res: "REM_UNLOCK_lightball", usePos: 1, width: 60, pos1add: {x:0, y:60}, closeDialog: true, trans: {x:110, y:0}}, 
	},

	resetandtest:{
		_setup: {halign: "left", valign: "top", appear: TransDef.FROMTOLEFT, disappear: TransDef.FROMTOLEFT, alignOffset: {x:0, y:0}, pos1: {x:40, y:40},  aspectScaleFactor: {minAspect: 0.5, minScale: 1.5, maxAspect: 1, maxScale:1}},
		box: 			{type: "sidemenubox", alpha: 1, usePos: 1, scale:{x:3, y:5}, pos1add: {x:0, y:0}, sizeRef: true, anchor: {x:0.5, y:0}},
		boxclickcover: 	{type: "sidemenubox", alpha: 0, usePos: 1, scale:{x:15, y:26}, pos1add: {x:0, y:48}, useAsButton: true, closeDialog: true, res: "clickcatch"},
		res1: 		{type: "sideMenuItem", text: "AD interstitial", res: "adinterstitial", usePos: 1, pos1add: {x:0, y:60},  closeDialog: true, trans: {x:0, y:0}},
		res2: 		{type: "sideMenuItem", text: "AD reward", res: "adreward", usePos: 1, pos1add: {x:0, y:60},  closeDialog: true, trans: {x:0, y:0}},
		res3: 		{type: "sideMenuItem", text: "Reset mine (Shift+M)", res: "resetmine", usePos: 1, pos1add: {x:0, y:60},  closeDialog: true, trans: {x:0, y:0}},
		res4: 		{type: "sideMenuItem", text: "Reset all (Shift+R)", res: "resetprogress", usePos: 1, pos1add: {x:0, y:60},  closeDialog: true, trans: {x:0, y:0}},
		res5: 		{type: "sideMenuItem", text: "flush inventory", res: "flush", usePos: 1, pos1add: {x:0, y:60},  closeDialog: true, trans: {x:0, y:0}},
	},

	dummy:{
		_setup: 	{halign: "center"},
		checkbox: 	{type: "checkbox", text: "optionsmenutext", textAlign: "left", fixedwidth: 200},
	}
}

export const UIOptionsComponents = 
{
	svg: {
		type: ComponentTypes.SVG,
		scale: 1,
		pos: {x:0, y:0},
	},

	image: {
		type: ComponentTypes.IMAGE,
		scale: 1,
		pos: {x:0, y:0},
	},
	
	sidemenubox: {
		type: ComponentTypes.GRAPHICS,
		layers:[
			// bottom first.
			{type: "rect", corner: 0, width: 100, height: 100, offx:0, offy:0, color: 0x444444, colorid: 1, alpha: 1 },				
		]
	},

	/*sideMenuItemOLD: {
		type: ComponentTypes.BUTTON,
		text: "optionsmenutext",
		defaultwidth: 100,
		defaultheight: 30,
		textoffset: { up: {x:0, y:0},
					hover: {x:0, y:2},
					down: {x:0, y:0, scale: 1.2}},		
		up: [
			{type: "rect", corner: 0, width: 190, height: 40, offx:0, offy:0, color: 0x446688, colorid: 1, alpha: 1, strokewidth: 2, strokecolor: 0xaaaaaa},	
			
		],
		hover: [
			{type: "rect", corner: 0, width: 190, height: 40, offx:0, offy:0, color: 0x446688, colorid: 1, alpha: 1, strokewidth: 2, strokecolor: 0xffffff },	
			
		],
		down: [
			{type: "rect", corner: 0, width: 190, height: 40, offx:0, offy:0, color: 0x446688, colorid: 1, alpha: 1, strokewidth: 4, strokecolor: 0xffffff },	
			
		],
	},
	*/
	sideMenuItem: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "optionsmenubuttontext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.95}},


		/*textoffset: { up: {x:0, y:-8},
					  hover: {x:0, y:-2},
					  down: {x:0, y:2, scale: 0.95}},*/
		

		// if width and height not specified on the button in the definition, this is used.			  
		defaultwidth: 280,
		defaultheight: 50,

		up: [
			{source: button_side_up, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_side_hover, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, scale: 1},
		],
		down: [
			{source: button_side_down, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, widthAdd: 0, heightAdd: 0},
		],
		//sound: [clicksound1, clicksound2, clicksound3],

	},

	sidemenuButton: {
		type: ComponentTypes.BUTTON,
		text: "optionsmenutext",
		textoffset: { up: {x:0, y:0},
					hover: {x:0, y:4},
					down: {x:0, y:0, scale: 1.3}},				  
		
		defaultwidth: 40,
		defaultheight: 40,
		
	
		up: [
			{type: "rect", corner: 0, width: 40, height: 40, offx:0, offy:0, color: 0x444444, colorid: 1, alpha: .3 },	
			{type: "circle", pos: {x:8, y:20}, radius: 4, offx:0, offy:0,  color: 0xffffff, colorid: 1, alpha: 1 },	
			{type: "circle", pos: {x:20,y:20}, radius: 4, offx:0, offy:0,  color: 0xffffff, colorid: 1, alpha: 1 },	
			{type: "circle", pos: {x:32,y:20}, radius: 4, offx:0, offy:0,  color: 0xffffff, colorid: 1, alpha: 1 },	
		],
		hover: [
			{type: "rect", corner: 0, width: 40, height: 40, offx:0, offy:0, color: 0x444444, colorid: 1, alpha: .0 },	
			{type: "circle", pos: {x:8, y:20}, radius: 4, offx:0, offy:0,  color: 0xffffff, colorid: 1, alpha: 1 },	
			{type: "circle", pos: {x:20,y:20}, radius: 4, offx:0, offy:0,  color: 0xffffff, colorid: 1, alpha: 1 },	
			{type: "circle", pos: {x:32,y:20}, radius: 4, offx:0, offy:0,  color: 0xffffff, colorid: 1, alpha: 1 },	
		],
		down: [
			{type: "rect", corner: 0, width: 40, height: 40, offx:0, offy:0, color: 0x444444, colorid: 1, alpha: .0 },	
			{type: "circle", pos: {x:8, y:20}, radius: 5, offx:0, offy:0, color: 0xffffff, colorid: 1, alpha: 1 },	
			{type: "circle", pos: {x:20,y:20}, radius: 5, offx:0, offy:0, color: 0xffffff, colorid: 1, alpha: 1 },	
			{type: "circle", pos: {x:32,y:20}, radius: 5, offx:0, offy:0, color: 0xffffff, colorid: 1, alpha: 1 },	
		],
		
	},
	sidemenubutton9slice: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "optionsmenutext",
		textoffset: { up: {x:0, y:0},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.95}},
		
		defaultwidth: 100,
		defaultheight: 30,

		up: [
			{source: button_side_up, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_side_hover, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, scale: 1},
		],
		down: [
			{source: button_side_down, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, widthAdd: 0, heightAdd: 0},
		],
		//sound: [clicksound1, clicksound2],


	},
	optionsmenutext: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
			fontFamily: 'Helvetica, Arial, sans',
			fontSize: 20,
			fontWeight: 'bold',
			fill: 0xffffff ,// new FillGradient(0, 0, 0, 36 * 1.7 * 7) ,
		}),
	},
	optionsmenubuttontext: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
			fontFamily: 'Helvetica, Arial, sans',
			fontSize: 20,
			fontWeight: 'bold',
			fill: 0x000000 ,// new FillGradient(0, 0, 0, 36 * 1.7 * 7) ,
		}),
	},
	optionsmenutextSmall: {
		//type: "text",
		type: ComponentTypes.TEXT,
		anchor: {x:0, y:0},
		style: new TextStyle({
			fontFamily: 'Helvetica, Arial, sans',
			fontSize: 20,
			fontWeight: 'normal',
			fill: 0xffffff ,// new FillGradient(0, 0, 0, 36 * 1.7 * 7) ,
		}),
	},

	checkbox: {
		type: ComponentTypes.CHECKBOX,
		text: "optionsmenutext",
		textSide: "left", // where to place the text in relation to the checkbox
		fixedwidth: 250,
		layersUnchecked:[
			{source: checkbox_off, offx: 4, offy: 0, scale: 1.4},	
		],
		layersChecked:[
			{source: checkbox_on, offx: 4, offy: 0, scale: 1.4},	
		]
	},
}

export class OptionsMenu extends Container 
{
	constructor(mainclass)
	{
		super()
		this.mainclass = mainclass
		if (dome.platform == "ios") OptionsDialogDefinitions.sideMenuButton._setup.alignOffset.y = 200
		this.ui = new UI(this.app, OptionsDialogDefinitions, UIOptionsComponents, this)
		
		
	}

	tick(deltatime)
	{
		this.ui.tick(deltatime)
	}

	getAssetsForPreload()
	{
		return this.ui.getAssetsForPreload()
		
	}

	
	showSideMenuButton()
	{
		if (this._sideMenuHidden) return
		if (this.sideMenuButton) return
		
		this.sideMenuButton = this.ui.displayDialog("sideMenuButton", {}, (res)=>{
			//console.log("Dialog resukt", res)
			if (res == "but1")
			{
				this.showSideMenu()
			}
			this.sideMenuButton = undefined
		})

	}

	/** Hide the corner options button (e.g. for clean screenshots). Stays hidden until reload. */
	hideSideMenuButton()
	{
		this._sideMenuHidden = true
		if (this.sideMenuButton) {
			this.ui.closeDialog(this.sideMenuButton)
			this.sideMenuButton = undefined
		}
	}

	showSideMenu()
	{
		//console.log("Showing side menu")
		this.ui.displayDialog("sideMenu", {}, (res)=>{
			//console.log("Dialog resukt", res)
			if (res == "clickcatch")
			{
				this.showSideMenuButton()
			}
			else 
			{
				var itemsrc = OptionsDialogDefinitions.sideMenu[res]
				if (itemsrc && itemsrc.callback)
				{
					itemsrc.callback()
					this.showSideMenuButton()
				}
			}
		})
	}

	showExtendedMenu(onDone)
	{
		return this.ui.displayDialog("extendedMenu", {}, (res)=>{
			console.log("Dialog resukt", res)	
			if (onDone) onDone(res)
		})
	}

	showResetAndTest(onDone)
	{
		this.ui.displayDialog("resetandtest", {}, (res)=>{
			console.log("Dialog resukt", res)	
			if (onDone) onDone(res)
		})
	}

	addedItemNum = 0
	addButtonToOptionsMenu(itemText, callback)
	{
		var dialog = OptionsDialogDefinitions.sideMenu
		var butnam = "but"+this.addedItemNum
		var newobj = {type: "sideMenuItem", text: itemText, usePos: 1, pos1add: {x:0, y:50}, res: butnam, callback: callback,  closeDialog: true}
		dialog[butnam] = newobj
		this.addedItemNum++
		//console.log("ADD Dialog item ", dialog)
		this.debug()
		return butnam
		//this.ui.addComponent("sideMenuItem", {text: itemText}, this, (res)=>{
		//	console.log("Dialog resukt", res)
		//	if (res == "clickcatch")
		//	{
		//		callback()
		//	}
		//})
	}

	addToggleToOptionsMenu(itemText, value, callback, initialValueGet)
	{
		var dialog = OptionsDialogDefinitions.sideMenu
		var butnam = "but"+this.addedItemNum
		var newobj = {type: "checkbox", text: itemText, usePos: 1, pos1add: {x:0, y:50}, res: butnam, callback: (res) => {
			callback(res)
		},  closeDialog: false, initialValueGet: ()=>{
			//console.log("INITIAL VALUE GET")
			return initialValueGet ? initialValueGet() : value
		}}
		dialog[butnam] = newobj
		this.addedItemNum++
		//this.ui.addComponent("sideMenuItem", {text: itemText}, this, (res)=>{
		//	console.log("Dialog resukt", res)
		//	if (res == "clickcatch")
		//	{
		//		callback()
		//	}
		//})
		//console.log("optionsmenu ", dialog)
		this.debug()
		return butnam
	}
	removeItemFromOptionsMenu(itemName)
	{
		var dialog = OptionsDialogDefinitions.sideMenu
		delete dialog[itemName]
		console.log("REMOVE optionsmenu ", dialog)
		this.debug()
	}
	addLabelToOptionsMenu(itemText, itemText2)
	{
		var dialog = OptionsDialogDefinitions.sideMenu
		
		if (itemText2 == undefined) itemText2 = ""
		
		var newobj = {type: "optionsmenutextSmall", text: itemText, usePos: 1, pos1add: {x:0, y:18}, trans:{x:-125,y:-27}, closeDialog: false}
		var butnam = "but"+this.addedItemNum
		dialog[butnam] = newobj
		this.addedItemNum++
		if (itemText2 != undefined && itemText2 != "")
		{
			newobj = {type: "optionsmenutextSmall", text: itemText2, usePos: 1, pos1add: {x:0, y:18}, trans:{x:-125,y:-27}, closeDialog: false}
			butnam = "but"+this.addedItemNum
			dialog[butnam] = newobj
			this.addedItemNum++	
		}
		else
		{
			newobj.pos1add.y = 25
		}

		//console.log("ADD Dialog item LABEL ", dialog)
		
		this.debug()
		return butnam
	}

	debug()
	{
		var dialog = OptionsDialogDefinitions.sideMenu
		for (var d in dialog)
	
		{
			//console.log("Dialog item ", d, dialog[d].type)
		}
	}
}