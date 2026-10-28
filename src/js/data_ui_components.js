
import { ComponentTypes } from './dome/ui_componenttypes';
import { UISounds } from './dome/ui_sounds.js';


import { TextStyle } from 'pixi.js';

//import dialog_bg from '../g/dialog_bg.svg';
import dialog_bg from '../g/dialog_bg_paper3.svg';

import dialog_bg_noheader from '../g/dialog_bg_noheader.svg';
//import dialog_bg_paper from '../g/dialog_bg_paper.svg';
//import dialog_bg_paper2 from '../g/dialog_bg_paper2.svg';
//import dialog_bg_isme from '../g/dialog_bg_isme.svg';
//import profilepicframe_paper from '../g/profilepicframe_paper.svg';

import button_up from '../g/button_up.svg';
import button_hover from '../g/button_hover.svg';
import button_down from '../g/button_down.svg';
import progress_bg from '../g/progressbar_bg.svg';
import progress_fill from '../g/progressbar_fill.svg';
//import progress_bg_paper from '../g/progressbar_bg_paper.svg';
//import progress_fill_paper from '../g/progressbar_fill_paper.svg';

//import closebutton_up_paper from '../g/closebutton_up_paper.svg';
//import closebutton_hover_paper from '../g/closebutton_hover_paper.svg';
//import closebutton_down_paper from '../g/closebutton_down_paper.svg';

import inputtext_bg from '../g/inputtext_bg.svg';
import inputtext_bg_active from '../g/inputtext_bg_active.svg';
import game_border from '../g/outerframe9s.svg';

// ===================================================================================================================================
// MINING GAME UI SET IMPORTS BELOW
// ===================================================================================================================================

import mine_dialog_bg from '../g/ui/dialog-bg.svg';
//import mine_dialog_bg_shadow from '../g/ui/dialog-bg-shadow.svg';

import mine_dialog_raised from '../g/ui/dialog-raised.svg';
import mine_dialog_inset from '../g/ui/dialog-inset.svg';
import dialog_inset_light from '../g/ui/dialog-inset-light.svg';
import dialog_inset_yellow from '../g/ui/dialog-inset-yellow.svg';
import bottombar_bg from '../g/ui/bottombar-bg.svg';
import topbar_bg from '../g/ui/topbar-bg.svg';
import numberboxgfx from '../g/ui/number-box.svg';
import mine_messagebox from '../g/ui/message-box.svg';
import title_bg from '../g/ui/title-bg.svg';
import button_cavity from '../g/ui/button-cavity.svg';
import button_frame from '../g/ui/button-frame.svg';
import mine_button_green from '../g/ui/button-main-green.svg';
import mine_button_orange from '../g/ui/button-main-orange.svg';
import button_blue from '../g/ui/button-main-blue.svg';
import button_grey from '../g/ui/button-main-grey.svg';
import button_red from '../g/ui/button-main-red.svg';
import mine_button_close from '../g/ui/button-close.svg';
import mine_button_close_small from '../g/ui/button-close-small.svg';
import button_debug from '../g/ui/button-debug.svg';
import button_tool from '../g/ui/button-tool.svg';
import button_info from '../g/ui/button-info.svg';
import button_settings from '../g/ui/button-settings.svg';
//import icon_10x from '../g/ui/icon-10x.svg';
import flare from '../g/ui/flare.svg'
import button_plus from '../g/ui/button-plus.svg'

import buttonPlus from '../g/ui/button-plus.svg'
import buttonCount from '../g/ui/button-count.svg'
import buttonCheck from '../g/ui/button-check.svg'
import button_Offmarker from '../g/ui/button-main-off.svg'

import checkboxOn from '../g/ui/checkboxon.svg'
import checkboxOff from '../g/ui/checkboxoff.svg'

import blingray from '../g/blingray.svg'

/*promise = Assets.load({
  src: 'https://fonts.googleapis.com/css2?family=Chewy',
  loadParser: 'loadWebFont'
})*/

// ===================================================================================================================================
// MINING GAME UI SET IMPORTS DONE
// ===================================================================================================================================



export const UIComponentDefinitions = {

	//==================================================================================================================
	// MINING UI COMPONENT DEFS
	//==================================================================================================================

	container: {
		type: ComponentTypes.CONTAINER,
	},

	blackoutGfx: {
		//type: "graphics",
		type: ComponentTypes.GRAPHICS,
		layers:[
			// bottom first.
			{type: "rect", corner: 0, width: 100, height: 100, offx:0, offy:0, color: 0xffffff, colorid: 1, alpha: 1 },	
			//{type: "rect", corner: 0, width: 100, height: 100, offx:0, offy:0, color: 0xaa8822, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xff2222 },
		]
	},

	bling: {
		type: ComponentTypes.BLING,
		source: blingray,

		growTimeMin: 1,
		growTimeMax: 1,
		scaleMin: 0.6,
		scaleMax: 1.0,
		twinkeTimeMin: .3,
		twinkeTimeMax: .6,
		twinkleCountMin: 3,
		twinkleCountMax: 5,
		twinkleScaleMin: 0.6,
		twinkleScaleMax: 1.0,
		shrinkTimeMin: 2,
		shrinkTimeMax: 4,
	},
	slider: {
		type: ComponentTypes.SLIDER,
		borderWidth: 2,
		borderColor: 0xffffff,
		backgroundColor: 0x000000,
		fillColor: 0x6688aa,
		handleBorder: 2,
		meshColor: 0x000000,
		fontColor: 0xffffff,
		fontSize: 20,
		//bg: {source: slider_bg, left: 25, right: 25, top: 25, bottom: 25},
		//fill: {source: slider_fill, left: 25, right: 25, top: 25, bottom: 25},
		//slider: {source: slider_slider, left: 25, right: 25, top: 25, bottom: 25},
		//min: 0,
		//max: 100,
		//step: 1,
		//value: 0,
		valueTextStyle: {fill: 0x000000, fontSize: 20},
		showValue: true,
	},
	mine_dialog_bg: {
		type: ComponentTypes.NINESLICE,
		source: mine_dialog_bg,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
		
	},
	/*mine_dialog_bg_graphics:{
		type: ComponentTypes.SVGGRAPHICS,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
		source: mine_dialog_bg,
	},*/
	/*mine_dialog_bg_shadow_graphics:{
		type: ComponentTypes.SVGGRAPHICS,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
		source: mine_dialog_bg_shadow,
	},*/
	mine_dialog_bg_shadow_graphics: {
		//type: "graphics",
		type: ComponentTypes.GRAPHICS,
		shapes:{
			shape1: [80, -100, 90,-100, 100, -95, 100, 95, 90, 100, -95, 100, -100, 95, -100, 80, 80,80],
		},
		layers:[
			// bottom first.
			{type: "poly", pos: {x:0, y:0}, shape:"shape1", offx:0, offy:0,  color: 0xBCC8D8, colorid: 1, alpha: 1 },	
			
		]
	},

	mine_dialog_raised: {
		type: ComponentTypes.NINESLICE,//,
		source: mine_dialog_raised,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},
	mine_dialog_inset: {
		type: ComponentTypes.NINESLICE,
		source: mine_dialog_inset,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},
	dialog_inset_light: {
		type: ComponentTypes.NINESLICE,
		source: dialog_inset_light,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},
	dialog_inset_yellow: {
		type: ComponentTypes.NINESLICE,
		source: dialog_inset_yellow,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},
	flare: {
		type: ComponentTypes.NINESLICE,
		source: flare,
		slice: {left: 0, right: 0, top: 0, bottom: 0},
	},
	mine_button_green: {
		type: ComponentTypes.NINESLICE,
		source: mine_button_green,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},
	mine_button_orange: {
		type: ComponentTypes.NINESLICE,
		source: mine_button_orange,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},
	mine_messagebox: {
		type: ComponentTypes.NINESLICE,
		source: mine_messagebox,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},
	title_bg: {
		type: ComponentTypes.NINESLICE,
		source: title_bg,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},
	numberbox: {
		type: ComponentTypes.NINESLICE,
		source: numberboxgfx,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},
	bottombar_bg: {
		type: ComponentTypes.NINESLICE,
		source: bottombar_bg,
		slice: {left: 90, right: 90, top: 0, bottom: 0},
	},
	topbar_bg: {
		type: ComponentTypes.NINESLICE,
		source: topbar_bg,
		slice: {left: 90, right: 90, top: 0, bottom: 0},
	},
	button_bottom_bar: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "h2_button_mine_g",
		textoffset: { up: {x:0, y:0},
					  hover: {x:0, y:0, scale: 1.05},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 260,
		defaultheight: 220,

		up: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.04, widthAdd: 0, heightAdd: 0},
		],
		down: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: .97, widthAdd: 0, heightAdd: 0},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	button_mainplay: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "h1_button_mine_g",
		textoffset: { up: {x:0, y:-4},
					  hover: {x:0, y:-2},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 480,
		defaultheight: 200,

		up: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.01},
		],
		down: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0,scale: .97},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	button_mainred: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "h1_button_mine_r",
		textoffset: { up: {x:0, y:-4},
					  hover: {x:0, y:-2},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 480,
		defaultheight: 200,

		up: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_red, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_red, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.01},
		],
		down: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_red, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0,scale: .97},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	button_maingold: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "h1_button_mine_y",
		textoffset: { up: {x:0, y:-4},
					  hover: {x:0, y:-2},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 480,
		defaultheight: 200,

		up: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_orange, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_orange, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.01},
		],
		down: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_orange, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0,scale: .97},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	mine_button_g_S: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "h2_button_mine_g",
		textoffset: { up: {x:0, y:0},
					  hover: {x:0, y:-2},
					  down: {x:0, y:2, scale: 0.9}},

		defaultwidth: 300,
		defaultheight: 100,

		up: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.02 },
		],
		down: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: .96},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},

	configuratorButton: {
		type: ComponentTypes.BUTTONMOVIECLIP,
		tube: "main",
		movieclip: "smallArrowButton",
		frame: 0,
		//defaultwidth: 60,
		//defaultheight: 86,
		framerate: 30,
		labels: {
			hover: "hover",
			press: "press",
			unhover: "~hover",
		},
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},

	/** Tube `checkbox` clip: labels off / turnon / on / turnoff. */
	settingsCheckbox: {
		type: ComponentTypes.BUTTONMOVIECLIP,
		tube: "main",
		movieclip: "checkbox",
		toggle: true,
		framerate: 30,
		defaultwidth: 72,
		defaultheight: 72,
		checkboxLabels: {
			off: "off",
			on: "on",
			turnOn: "turnon",
			turnOff: "turnoff",
		},
		soundtoggleon: [UISounds.toggleon1],
		soundtoggleoff: [UISounds.toggleoff1],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},

	arrowButton: {
		type: ComponentTypes.BUTTONMOVIECLIP,
		tube: "main",
		movieclip: "arrowButton",
		frame: 0,
		//defaultwidth: 60,
		//defaultheight: 86,
		framerate: 30,
		labels: {
			hover: "hover",
			press: "press",
			unhover: "~hover",
		},
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},
	jungleButton: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "jungleButtonText",
		textoffset: { up: {x:0, y:-4},
					  hover: {x:0, y:-2},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 500,
		defaultheight: 200,

		// the sources is names of sprites in the tube.
		up: [
			//{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: "main_btn9slice.png", left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
		//	{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: "main_btn9slicehover.png", left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.02 },
		],
		down: [
		//	{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: "main_btn9slicehover.png", left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: .96},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	jungleButtonText: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 48, fontWeight: 800, fill: 0xEAFFE0, stroke: { color: '#336633', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: { //fill: 0x57992C
				color: '#000000',
				blur: 4,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .2
			},
		}),
	},

	mine_button_g: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "h1_button_mine_g",
		textoffset: { up: {x:0, y:-4},
					  hover: {x:0, y:-2},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 500,
		defaultheight: 200,

		up: [
			{source: "main_buttonGreenCavity.png", left: 30, right: 30, top: 30, bottom: 30, offx:0, offy:0},
			{source: "main_buttonGreen.png", left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: "main_buttonGreenCavity.png", left: 30, right: 30, top: 30, bottom: 30, offx:0, offy:0,  scale: 1.06},
			{source: "main_buttonGreen.png", left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, scale: 1.02 },
		],
		down: [
			{source: "main_buttonGreenCavity.png", left: 30, right: 30, top: 30, bottom: 30, offx:0, offy:0},
			{source: "main_buttonGreen.png", left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, scale: .96},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	mine_button_o: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "buttonfacetext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 500,
		defaultheight: 200,

		up: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_orange, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_orange, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.02},
		],
		down: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_orange, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: .96},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	mine_button_b: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "buttonfacetext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 500,
		defaultheight: 200,

		up: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_blue, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_blue, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.02},
		],
		down: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_blue, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: .96},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},

	statebadge:{
		type: ComponentTypes.STATEWIDGET,
		states: {
			number: { 
				layers: [
					{ source: buttonCount, scale: {x: 0.9, y: 0.9} } ,  // an image ref
					{ text: "countCaption" }, // a text ref
				]
			},
			plus: {
				layers: [
					{ source: buttonPlus, scale: {x: 0.9, y: 0.9} } 
				]
			},
			check: {
				layers: [
					{ source: buttonCheck, scale: {x: 0.9, y: 0.9} } 
				]
			}

			
		}

	},


	equip_button: {
		type: ComponentTypes.BUTTON9SLICE,
		buttonStates: {
			green: { sourcename: "equip_button_g" },
			orange: { sourcename: "equip_button_o" },
			blue: { sourcename: "equip_button_b" },
			grey: { sourcename: "equip_button_grey" },
		},
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},


	equip_button_g: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "equip_text_g",
		textoffset: { up: {x:0, y:-4},
					  hover: {x:0, y:-2},
					  down: {x:0, y:0, scale: 0.95}},

		defaultwidth: 220,
		defaultheight: 220,
		disabled: false,

		up: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.02 },
		],
		down: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_green, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: .96},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	

	equip_button_o: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "buttonfacetext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 220,
		defaultheight: 220,
		disabled: false,

		up: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_orange, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_orange, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.02},
		],
		down: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: mine_button_orange, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: .96},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},
	
	equip_button_b: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "buttonfacetext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 220,
		defaultheight: 220,
		disabled: false,

		up: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_blue, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},		
		],
		hover: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_blue, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.02},
		],
		down: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_blue, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: .96},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	equip_button_grey: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "buttonfacetext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 220,
		defaultheight: 220,
		disabled: true,

		up: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_grey, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},		
		],
		hover: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_grey, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.02},
		],
		down: [
			{source: button_cavity, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_grey, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: .96},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},

	/*
	button_multiplier: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "rewardCaption",
		textoffset: { 
						up: {x:0, y:50},
					  hover: {x:0, y:50},
					  down: {x:0, y:50}},
		defaultwidth: 180,
		defaultheight: 180,

		up: [
			//{source: icon_10x, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0},			
			{source: button_info, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:50, offy:-55, scale: 0.3},			
		],
		hover: [
			//{source: icon_10x, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0},
			{source: button_info, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:50, offy:-55, scale: 0.35},			
		],
		down: [
			//{source: icon_10x, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0},
			{source: button_info, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:50, offy:-55, scale: 0.25},			
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
		
	},
	*/
	button_tool_g: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "buttonfacetext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:1},
					  down: {x:0, y:1}},

		defaultwidth: 140,
		defaultheight: 140,

		up: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_grey, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_grey, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},		
		],
		down: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_grey, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},		

		],
		//sound: [clicksound1, clicksound2, clicksound3],
		//sounddown: [UISounds.clickdown1],
		//soundup: [UISounds.clickup1],
	},
		button_tool: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "buttonfacetext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:5, scale: 0.9}},

		defaultwidth: 140,
		defaultheight: 140,

		up: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_tool, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_tool, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: 1.04},
		],
		down: [
			{source: button_frame, left: 90, right: 90, top: 90, bottom: 90, offx:0, offy:0},
			{source: button_tool, left: 90, right: 90, top: 90, bottom: 90, alpha: 1, offx:0, offy:0, scale: .96},

		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},

	buttonInfo: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		
		defaultwidth: 80,
		defaultheight: 80,

		up: [
			{source: button_info, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0},
		],
		hover: [
			{source: button_info, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, scale: 1.1},
		],
		down: [
			{source: button_info, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, scale: .9},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	buttonPlus: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		
		defaultwidth: 80,
		defaultheight: 80,

		up: [
			{source: button_plus, left: 0, right: 0, top: 0, bottom: 0, alpha: .3, tint: 0x000000, offx:0, offy:8},
			{source: button_plus, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0},
		],
		hover: [
			{source: button_plus, left: 0, right: 0, top: 0, bottom: 0, alpha: .3, tint: 0x000000, offx:0, offy:8, scale: 1.1},
			{source: button_plus, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, scale: 1.1},
		],
		down: [
			{source: button_plus, left: 0, right: 0, top: 0, bottom: 0, alpha: .3, tint: 0x000000, offx:0, offy:8, scale: .9},
			{source: button_plus, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, scale: .9},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	mine_closebutton: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,	

		// if width and height not specified on the button in the definition, this is used.			  
		defaultwidth: 100,
		defaultheight: 100,

		up: [
			{source: mine_button_close, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: mine_button_close, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, widthAdd: 5, heightAdd: 5},			
		],
		down: [
			{source: mine_button_close, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, widthAdd: -2, heightAdd: -2},			
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},	

	mine_closebutton_s: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,	

		// if width and height not specified on the button in the definition, this is used.			  
		defaultwidth: 60,
		defaultheight: 60,

		up: [
			{source: mine_button_close_small, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: mine_button_close_small, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, widthAdd: 2, heightAdd: 2},			
		],
		down: [
			{source: mine_button_close_small, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, widthAdd: -2, heightAdd: -2},			
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},	
	button_plus: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,	

		// if width and height not specified on the button in the definition, this is used.			  
		defaultwidth: 60,
		defaultheight: 60,

		up: [
			{source: mine_button_close_small, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: mine_button_close_small, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, widthAdd: 2, heightAdd: 2},			
		],
		down: [
			{source: mine_button_close_small, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, widthAdd: -2, heightAdd: -2},			
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	button_settings: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		
		defaultwidth: 110,
		defaultheight: 110,

		up: [
			{source: button_settings, left: 0, right: 0, top: 0, bottom: 0, alpha: .3, tint: 0x000000, offx:0, offy:8},
			{source: button_settings, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0},
		],
		hover: [
			{source: button_settings, left: 0, right: 0, top: 0, bottom: 0, alpha: .3, tint: 0x000000, offx:0, offy:8, scale: 1.05},
			{source: button_settings, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, scale: 1.05},
		],
		down: [
			{source: button_settings, left: 0, right: 0, top: 0, bottom: 0, alpha: .3, tint: 0x000000, offx:0, offy:8, scale: .95},
			{source: button_settings, left: 0, right: 0, top: 0, bottom: 0, alpha: 1, offx:0, offy:0, scale: .95},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},	
	button_debug: {
		type: ComponentTypes.BUTTON9SLICE,
		buttonStates: {
			normal: { sourcename: "button_debug_normal" },
			select: { sourcename: "button_debug_tint" },
			
		}
	},
	button_debug_normal: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,	
		text: "buttondebugtext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.9}},

		// if width and height not specified on the button in the definition, this is used.			  
		defaultwidth: 260,
		defaultheight: 60,

		up: [
			{source: button_debug, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: button_debug, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, widthAdd: 2, heightAdd: 2},			
		],
		down: [
			{source: button_debug, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, widthAdd: -4, heightAdd: -2},			
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},	
	button_debug_tint: {
		type: ComponentTypes.BUTTON9SLICE,	
		text: "buttondebugtext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.9}},

		// if width and height not specified on the button in the definition, this is used.			  
		defaultwidth: 260,
		defaultheight: 60,

		up: [
			{source: button_debug, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, tint: 0xffaa00},			
		],
		hover: [
			{source: button_debug, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, widthAdd: 2, heightAdd: 2, tint: 0xffaa00},			
		],
		down: [
			{source: button_debug, left: 30, right: 30, top: 30, bottom: 30, alpha: 1, offx:0, offy:0, widthAdd: -4, heightAdd: -2, tint: 0xffaa00},			
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},
	button_textlink: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,	
		text: "linkButtonText",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.9}},

		// if width and height not specified on the button in the definition, this is used.			  
		defaultwidth: 420,
		defaultheight: 70,

		up: [
			{source: button_debug, left: 30, right: 30, top: 30, bottom: 30, alpha: 0, offx:0, offy:0},			
		],
		hover: [
			{source: button_debug, left: 30, right: 30, top: 30, bottom: 30, alpha: 0.2, offx:0, offy:0, widthAdd: 2, heightAdd: 2},			
		],
		down: [
			{source: button_debug, left: 30, right: 30, top: 30, bottom: 30, alpha: 0.3, offx:0, offy:0, widthAdd: -4, heightAdd: -2},			
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},	
	body_mine: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 48, fontWeight: 500, fill: 0x857E76, stroke: { color: '#ffffff', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 660}),
	},	
	h1_title: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 82, fontWeight: 800, fill: 0xF2FFE0, stroke: { color: '#9B5018', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 800,dropShadow: {
				color: '#000000',
				blur: 4,
				angle: Math.PI / 3,
				distance: 6,
				alpha: .5
			},
		}),
	},	
	h1_mine: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 82, fontWeight: 800, fill: 0x857E76, stroke: { color: '#ffffff', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600,dropShadow: {
				color: '#000000',
				blur: 2,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .5
			},
		}),
	},	
	h1_mine_otherColor: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 82, fontWeight: 800, fill: 0xF2FFE0, stroke: { color: '#9B5018', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600,dropShadow: {
				color: '#000000',
				blur: 2,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .5
			},
		}),
	},	
	h1_message: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 56, fontWeight: 800, fill: 0x857E76, stroke: { color: '#ffffff', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600}),
	},
	h2_mine: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 56, fontWeight: 800, fill: 0xF2FFE0, stroke: { color: '#9B5018', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: {
				color: '#000000',
				blur: 2,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .5
			},
		}),
	},
	h3_mine: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 42, fontWeight: 800, fill: 0xF2FFE0, stroke: { color: '#9B5018', width: 4, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: {
				color: '#000000',
				blur: 2,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .5
			},
		}),
	},
	h4_mine: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 36, fontWeight: 800, fill: 0xF2FFE0, stroke: { color: '#9B5018', width: 4, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: {
				color: '#000000',
				blur: 2,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .5
			},
		}),
	},
	h1_button_mine_g: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 68, fontWeight: 800, fill: 0xEAFFE0, stroke: { color: '#336633', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: { //fill: 0x57992C
				color: '#000000',
				blur: 4,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .2
			},
		}),
	},
	h1_button_mine_r: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 68, fontWeight: 800, fill: 0xf7dada, stroke: { color: '#991626', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: { //fill: 0x57992C
				color: '#000000',
				blur: 4,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .2
			},
		}),
	},
	h1_button_mine_y: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 68, fontWeight: 800, fill: 0xfffac0, stroke: { color: '#b2530d', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: { //fill: 0x57992C
				color: '#000000',
				blur: 4,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .2
			},
		}),
	},
	h2_button_mine_g: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: "center", fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 38, fontWeight: 800, fill: 0xEAFFE0, stroke: { color: '#336633', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: { //fill: 0x57992C
				color: '#000000',
				blur: 4,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .2
			},
		}),
	},
	h2_mine_g: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({  
		fontFamily: 'Chewy, Helvetica, Arial, sans', 
		fontSize: 42, 
		fontWeight: 800, 
		fill: 0xEAFFE0, 
		stroke: { 
				color: '#336633', 
				width: 6, join: 
				'round' 
			}, 
			wordWrap: true, 
			wordWrapWidth: 600, 
			align: 'left', 
			dropShadow: { //fill: 0x57992C
				color: '#000000',
				blur: 4,
				angle: Math.PI / 3,
				distance: 4,
				alpha: .2
			},
		}),
	},
	topBarNumbers: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 92, fontWeight: 800, fill: 0xAEE0FF, stroke: { color: '#323B42', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: {
				color: '#000000',
				blur: 1,
				angle: Math.PI / 3,
				distance: 2,
				alpha: .5
			},
		}),
	},
	topBarCaption: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 36, fontWeight: 600, fill: 0x9AB8CF, stroke: { color: '#323B42', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: {
				color: '#000000',
				blur: 1,
				angle: Math.PI / 3,
				distance: 2,
				alpha: .5
			},
		}),
	},
	rewardCaption: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 32, fontWeight: 500, fill: 0xF2FFE0, stroke: { color: '#9B5018', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: {
				color: '#000000',
				blur: 1,
				angle: Math.PI / 3,
				distance: 2,
				alpha: .3
			},
		}),
	},
	countCaption: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 46, fontWeight: 800, fill: 0xF2FFE0, stroke: { color: '#9B5018', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: {
				color: '#000000',
				blur: 1,
				angle: Math.PI / 3,
				distance: 2,
				alpha: .3
			},
		}),
	},
	captionLeft: {
		//type: "text",
		type: ComponentTypes.TEXT,
		anchor: {x:0, y:0},
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 46, fontWeight: 800, fill: 0xF2FFE0, stroke: { color: '#9B5018', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: {
				color: '#000000',
				blur: 1,
				angle: Math.PI / 3,
				distance: 2,
				alpha: .3
			},
		}),
	},
	linkButtonText: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 42, fontWeight: 800, fill: 0xb0bfc7, 
		 		wordWrap: true, wordWrapWidth: 600, dropShadow: {
					color: '#000000',
					blur: 2,
					angle: Math.PI / 3,
					distance: 4,
					alpha: .3
			},
		}),
	},
	goalNumbers: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 42, fontWeight: 600, fill: 0xAEE0FF, stroke: { color: '#323B42', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: {
				color: '#000000',
				blur: 1,
				angle: Math.PI / 3,
				distance: 2,
				alpha: .5
			},
		}),
	},
	equip_text_g: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 30, fontWeight: 800, fill: 0xEAFFE0, stroke: { color: '#336633', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 600, dropShadow: { //fill: 0x57992C
				color: '#000000',
				blur: 3,
				angle: Math.PI / 3,
				distance: 3,
				alpha: .2
			},
		}),
	},

	checkboxcompact: {
		type: ComponentTypes.CHECKBOX,
		text: "captionLeft",
		textSide: "left", // where to place the text in relation to the checkbox
		fixedwidth: 200,
		layersUnchecked:[
			{source: checkboxOff, offx: 100, offy: 0, scale: .8},	
		],
		layersChecked:[
			{source: checkboxOn, offx: 100, offy: 0, scale: .8},	
			
		],
		soundtoggleon: [UISounds.toggleon1],
		soundtoggleoff: [UISounds.toggleoff1],
	},

	checkboxImage: {
		type: ComponentTypes.CHECKBOX,
		text: "captionLeft",
		textSide: "left", // where to place the text in relation to the checkbox
		fixedwidth: 400,
		layersUnchecked:[
			{source: checkboxOff, offx: 100, offy: 0, scale: .8},	
		],
		layersChecked:[
			{source: checkboxOn, offx: 100, offy: 0, scale: .8},	
		],
		soundtoggleon: [UISounds.toggleon1],
		soundtoggleoff: [UISounds.toggleoff1],
	},
	checkboxMusic: {
		type: ComponentTypes.CHECKBOX,
		text: "countCaption",
		textSide: "left", // where to place the text in relation to the checkbox
		fixedwidth: 0,
		layersUnchecked:[
			{source: button_cavity, offx: 0, offy: 0, scale: .6},	
			{source: mine_button_green, offx: 0, offy: 0, scale: .6},	

		],
		layersChecked:[
			{source: button_cavity, offx: 0, offy: 0, scale: .6},	
			{source: mine_button_green, offx: 0, offy: 0, scale: .6},	
			{source: button_Offmarker, offx: 0, offy: 0, scale: .6},	
		],
		soundtoggleon: [UISounds.toggleon1],
		soundtoggleoff: [UISounds.toggleoff1],
	},

	//==================================================================================================================
	// MINING UI COMPONENT DEFS END
	//==================================================================================================================


	inputtext: {
		type: ComponentTypes.INPUTTEXT,
		text: "normaltext",
		textAlign: "left",

		bg:{source: inputtext_bg, left: 25, right: 25, top: 25, bottom: 25},			
		bg_active:{source: inputtext_bg_active, left: 25, right: 25, top: 25, bottom: 25},			
	},

	movieclip: {
		type: ComponentTypes.MOVIECLIP,
	},

	checkbox: {
		type: ComponentTypes.CHECKBOXGRAPHICS,
		text: "normaltext",
		textAlign: "right", // where to place the text in relation to the checkbox
		layersUnchecked:[
			{type: "roundrect", corner: 15, width: 40, height: 40, offx:2, offy:2, color: 0x000000, colorid: 0, alpha: .3},
			{type: "roundrect", corner: 15, width: 40, height: 40, offx:0, offy:0, color: 0x8888a8, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xaaaaaa },
		],
		layersChecked:[
			
			{type: "roundrect", corner: 15, width: 40, height: 40, offx:2, offy:2, color: 0x000000, colorid: 0, alpha: .3},
			{type: "roundrect", corner: 15, width: 40, height: 40, offx:0, offy:0, color: 0x8888a8, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xaaaaaa },
			{type: "circle", pos: {x:20,y:20}, radius: 10, offx:0, offy:0,  color: 0x00ff00, colorid: 0, alpha: 1 },	
		]
	},

	progressbar: {
		type: ComponentTypes.PROGRESSBARGRAPHICS,

		
		layersBg:[
			//{type: "roundrect", corner: 18, width: 100, height: 20, offx:5, offy:8, color: 0x000000, colorid: 1, alpha: 0.3 },	
			{type: "roundrect", corner: 15, width: 100, height: 30, offx:0, offy:0, color: 0xff6600, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xff2222 },
		],
		layersFill:
		[
			//{type: "roundrect", corner: 18, width: 100, height: 20, offx:5, offy:8, color: 0x000000, colorid: 1, alpha: 0.3 },	
			{type: "roundrect", corner: 15, width: 100, height: 30, offx:0, offy:0, color: 0x44bb00, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xff2222 },
		]
	},

	progressbar9: {
		type: ComponentTypes.PROGRESSBAR9SLICE,

		bg:{source: progress_bg, left: 25, right: 25, top: 25, bottom: 25},			
		fill: {source: progress_fill, left: 25, right: 25, top: 25, bottom: 25},
		fillpadding: {left: 0, right: 0, top: 0, bottom: 0},
	},
	/*progressbar9paper: {
		type: ComponentTypes.PROGRESSBAR9SLICE,

		bg:{source: progress_bg_paper, left: 25, right: 25, top: 25, bottom: 25},			
		fill: {source: progress_fill_paper, left: 25, right: 25, top: 25, bottom: 25},
		fillpadding: {left: 0, right: 0, top: 0, bottom: 0},
	},*/
	slicebox: {
		type: ComponentTypes.NINESLICE,
		source: dialog_bg,
		slice: {left: 100, right: 100, top: 100, bottom: 100},
		
	},
	gameframe: {
		type: ComponentTypes.NINESLICE,
		source: game_border,
		slice: {left: 10, right: 10, top: 10, bottom: 10},
		
	},
	sliceboxnoheader: {
		type: ComponentTypes.NINESLICE,
		source: dialog_bg_noheader,
		slice: {left: 30, right: 30, top: 60, bottom: 30},
		
	},
	/*sliceboxpaper: {
		type: ComponentTypes.NINESLICE,
		source: dialog_bg_paper,
		slice: {left: 80, right: 80, top: 80, bottom: 80},
		
	},

	sliceboxpaper2: {
		type: ComponentTypes.NINESLICE,
		source: dialog_bg_paper2,
		slice: {left: 40, right: 40, top: 40, bottom: 40},
	},
	
	sliceboxprofile: {
		type: ComponentTypes.NINESLICE,
		source: profilepicframe_paper,
		slice: {left: 40, right: 40, top: 40, bottom: 40},
	},

	sliceboxisme: {
		type: ComponentTypes.NINESLICE,
		source: dialog_bg_isme,
		slice: {left: 36, right: 36, top: 36, bottom: 36},	
	},

	portraitcircle: {
		//type: "graphics",
		type: ComponentTypes.GRAPHICS,
		layers:[
			// bottom first.
			{type: "circle", pos: {x:58, y:58}, radius: 58, offx:0, offy:0,  color: 0xBCC8D8, colorid: 1, alpha: 1 },	
			{type: "circle", pos: {x:54, y:54}, radius: 54, offx:4, offy:4,  color: 0x899AAE, colorid: 1, alpha: 1 },	
		]
	},
	*/
	// box with shadow
	flatwindow: {
		//type: "graphics",
		type: ComponentTypes.GRAPHICS,
		layers:[
			// bottom first.
			{type: "rect", corner: 0, width: 100, height: 100, offx:15, offy:15, color: 0x776611, colorid: 1, alpha: 1 },	
			{type: "rect", corner: 0, width: 100, height: 100, offx:0, offy:0, color: 0xaa8822, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xff2222 },
		]
	},
	// rounded corners and shadow
	flatwindowround: {
		//type: "graphics",
		type: ComponentTypes.GRAPHICS,
		layers:[
			{type: "roundrect", corner: 18, width: 100, height: 100, offx:5, offy:8, color: 0x000000, colorid: 1, alpha: 0.3 },	
			{type: "roundrect", corner: 15, width: 100, height: 100, offx:0, offy:0, color: 0xff6600, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xff2222 },
		]
	},
	// rounded corners an GRADIENT and shadow
	flatwindowroundgradient: {
		//type: "graphics",
		type: ComponentTypes.GRAPHICS,
		layers:[
			{type: "roundrect", corner: 18, width: 100, height: 100, offx:5, offy:8, color: 0x000000, colorid: 1, alpha: 0.3 },	
			{type: "roundrect", corner: 15, width: 100, height: 100, offx:0, offy:0, color: 0xaa8822, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xff2222, 
				gradient: { colors:[0xffff00, 0xff6600], stops: [0,1], direction:[0,0,50,100]} 
			},
		]
	},
	// polygon shape with shadow
	flatwindowpoly: {
		//type: "graphics",
		type: ComponentTypes.GRAPHICS,
		shapes:{
			shape1: [-50, -47, 4,-58, 54, -45, 48, 55, -10, 37, -33, 58],
		},
		layers:[
			{type: "poly", shape: "shape1", offx:5, offy:8, color: 0x000000, colorid: 0, alpha: 0.3 },	
			{type: "poly", shape: "shape1", offx:0, offy:0, color: 0xaa8822, colorid: 0, alpha: 1 },	
		]
	},

	svg: {
		//type: "svg",
		type: ComponentTypes.SVG,
		scale: 1,
		pos: {x:0, y:0},
	},
	image: {
		//type: "image",
		type: ComponentTypes.IMAGE,
		scale: 1,
		pos: {x:0, y:0},
	},
	tubeimage: {
		//type: "image",
		type: ComponentTypes.TUBEIMAGE,
		scale: 1,
		pos: {x:0, y:0},
	},

	button9slice: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "buttonfacetext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.95}},


		/*textoffset: { up: {x:0, y:-8},
					  hover: {x:0, y:-2},
					  down: {x:0, y:2, scale: 0.95}},*/
		

		// if width and height not specified on the button in the definition, this is used.			  
		defaultwidth: 400,
		defaultheight: 80,

		up: [
			// shadow. Look at the blur! It will blur it!
			//{source: nineslicesprite, left: 30, right: 30, top: 30, bottom: 30, tint: 0x000000, alpha: .3, offx:10, offy:10, blur: 10},
			// sprite
			{source: button_up, left: 50, right: 50, top: 50, bottom: 50, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			// this has scale set to 1.1 which will scale it up from its original size
			// shadow
			
			//{source: nineslicesprite, left: 30, right: 30, top: 30, bottom: 30, tint: 0x000000, alpha: .3, offx:10, offy:10, scale: 1.1, blur: 10},
			{source: button_hover, left: 50, right: 50, top: 50, bottom: 50, alpha: 1, offx:0, offy:0, scale: 1},
		],
		down: [
			// this uses withadd and heightadd to make the button bigger.
			//{source: nineslicesprite, left: 30, right: 30, top: 30, bottom: 30, tint: 0x000000, alpha: .3, offx:13, offy:13, widthAdd: 10, heightAdd: 10, blur: 4},
			{source: button_down, left: 50, right: 50, top: 50, bottom: 50, alpha: 1, offx:0, offy:0, widthAdd: 0, heightAdd: 0},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	button9sliceEmoji: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,
		text: "emoji",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.95}},


		/*textoffset: { up: {x:0, y:-8},
					  hover: {x:0, y:-2},
					  down: {x:0, y:2, scale: 0.95}},*/
		

		// if width and height not specified on the button in the definition, this is used.			  
		defaultwidth: 70,
		defaultheight: 70,

		up: [
			// shadow. Look at the blur! It will blur it!
			//{source: nineslicesprite, left: 30, right: 30, top: 30, bottom: 30, tint: 0x000000, alpha: .3, offx:10, offy:10, blur: 10},
			// sprite
			{source: button_up, left: 50, right: 50, top: 50, bottom: 50, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			// this has scale set to 1.1 which will scale it up from its original size
			// shadow
			
			//{source: nineslicesprite, left: 30, right: 30, top: 30, bottom: 30, tint: 0x000000, alpha: .3, offx:10, offy:10, scale: 1.1, blur: 10},
			{source: button_hover, left: 50, right: 50, top: 50, bottom: 50, alpha: 1, offx:0, offy:0, scale: 1},
		],
		down: [
			// this uses withadd and heightadd to make the button bigger.
			//{source: nineslicesprite, left: 30, right: 30, top: 30, bottom: 30, tint: 0x000000, alpha: .3, offx:13, offy:13, widthAdd: 10, heightAdd: 10, blur: 4},
			{source: button_down, left: 50, right: 50, top: 50, bottom: 50, alpha: 1, offx:0, offy:0, widthAdd: 0, heightAdd: 0},
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},
	button: {
		//type: "button",
		type: ComponentTypes.BUTTON,
		text: "buttonfacetext",
		textoffset: { up: {x:0, y:-2},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.95}},
		
		defaultwidth: 150,
		defaultheight: 50,

		up: [
			{type: "roundrect", corner: 10,/* width: 150, height: 50,*/ offx:0, offy:6, color: 0xff2222, colorid: 1, alpha: 1, strokewidth: 2, strokecolor: 0xff2222 },	
			{type: "roundrect", corner: 10,/* width: 150, height: 50,*/ offx:0, offy:0, color: 0xffff22, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xff2222 },	
		],
		hover: [
			{type: "roundrect", corner: 10,/* width: 150, height: 50,*/ offx:0, offy:6, color: 0xff2222, colorid: 1, alpha: 1 },	
			{type: "roundrect", corner: 10,/* width: 150, height: 50,*/ offx:0, offy:2, color: 0xffffaa, colorid: 0, alpha: 1 },	
		],
		down: [
			{type: "roundrect", corner: 10,/* width: 150, height: 50,*/ offx:0, offy:6, color: 0xff2222, colorid: 1, alpha: 1 },	
			{type: "roundrect", corner: 10,/* width: 150, height: 50,*/ offx:0, offy:4, color: 0xffff22, colorid: 0, alpha: 1, scale: 0.9 },	
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},

	closebutton: {
		//type: "button",
		type: ComponentTypes.BUTTON,
		
		shapes:{
			cross: [-15, -4, -4,-4, -4, -15, 4,-15, 4, -4, 15, -4, 15,4, 4, 4, 4, 15, -4, 15, -4, 4, -15, 4],
		},					  
		
		// note that the rotate only works when using poly shapes.
		up: [
			{type: "poly", shape: "cross", offx:0, offy:0, rotate: 45, color: 0x8A9BAE, colorid: 1, alpha: 1, strokewidth: 6, strokecolor: 0x8A9BAE },	
			{type: "poly", shape: "cross", offx:0, offy:0, rotate: 45, color: 0xFFCC33, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xF8B131 },	
		],
		hover: [
			{type: "poly", shape: "cross", offx:0, offy:0, rotate: 45, color: 0x8A9BAE, colorid: 1, alpha: 1, strokewidth: 6, strokecolor: 0x8A9BAE },	
			{type: "poly", shape: "cross", offx:0, offy:0, rotate: 45, color: 0xFFCC66, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xFFEFAF },	
		],
		down: [
			{type: "poly", shape: "cross", offx:0, offy:0, rotate: 45, color: 0x8A9BAE, colorid: 1, alpha: 1, strokewidth: 6, strokecolor: 0x8A9BAE },	
			{type: "poly", shape: "cross", offx:0, offy:1, rotate: 45, color: 0xFFCC33, colorid: 0, alpha: 1, strokewidth: 2, strokecolor: 0xFFEFAF },	
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},
	/*
	closebutton_paper: {
		//type: "button",
		type: ComponentTypes.BUTTON9SLICE,	

		// if width and height not specified on the button in the definition, this is used.			  
		defaultwidth: 40,
		defaultheight: 40,

		up: [
			{source: closebutton_up_paper, left: 25, right: 25, top: 25, bottom: 25, alpha: 1, offx:0, offy:0},			
		],
		hover: [
			{source: closebutton_hover_paper, left: 25, right: 25, top: 25, bottom: 25, alpha: 1, offx:0, offy:0},			
		],
		down: [
			{source: closebutton_down_paper, left: 25, right: 25, top: 25, bottom: 25, alpha: 1, offx:0, offy:0},			
		],
		//sound: [clicksound1, clicksound2, clicksound3],
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],

	},*/
	buttondebugtext: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
		  fontFamily: 'Helvetica, Arial, sans',	
			// fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 28,
			fontWeight: 'bold',
			fill: 0xffffff ,// new FillGradient(0, 0, 0, 36 * 1.7 * 7) ,
		}),
	},
	buttonfacetext: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
		//	fontFamily: 'Helvetica, Arial, sans',	
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 28,
			fontWeight: 'bold',
			fill: 0x993333 ,// new FillGradient(0, 0, 0, 36 * 1.7 * 7) ,
			dropShadow: {
				color: '#ffffff',
				blur: 3,
				angle: Math.PI / 3,
				distance: 1,
				alpha: 1
			},
		}),
	},
	emoji: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
		//	fontFamily: 'Helvetica, Arial, sans',	
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 40,
			fontWeight: 'bold',
			fill: 0x993333 ,// new FillGradient(0, 0, 0, 36 * 1.7 * 7) ,
			dropShadow: {
				color: '#ffffff',
				blur: 3,
				angle: Math.PI / 3,
				distance: 1,
				alpha: 1
			},
		}),
	},
	normaltext: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
		//	fontFamily: 'Helvetica, Arial, sans',
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 28,
			fontWeight: 'bold',
			fill: 0xffffff ,// new FillGradient(0, 0, 0, 36 * 1.7 * 7) ,
		}),
	},
	bodytext: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
		//	fontFamily: 'Helvetica, Arial, sans',
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 18,
			fontWeight: '400',
			fill: 0x333399 ,
			//wordWrap: true, 
			//wordWrapWidth: 140,
		}),
	},
	bodytextLarge: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
		//	fontFamily: 'Helvetica, Arial, sans',
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 24,
			fontWeight: '400',
			fill: 0x333399 ,
			//wordWrap: true, 
			//wordWrapWidth: 140,
		}),
	},
	bodyinfotext: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
		//	fontFamily: 'Helvetica, Arial, sans',
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 18,
			fontWeight: '400',
			fill: 0x333399 ,
			wordWrap: true, 
			wordWrapWidth: 300,
		}),
	},
	h1: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
			//fontFamily: 'Helvetica, Arial, sans',
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 28,
			fontWeight: '800',
			fill: 0x333399 ,
			stroke: { color: '#ffffff', width: 2, join: 'round' },
			dropShadow: {
				color: '#ffffff',
				blur: 2,
				angle: Math.PI / 6,
				distance: 2,
				alpha: 0.6
			},
			//wordWrap: true,
			//wordWrapWidth: 440,
		}),
	},
	h2: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
			//fontFamily: 'Helvetica, Arial, sans',
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 22,
			fontWeight: '800',
			fill: 0x333399 ,// new FillGradient(0, 0, 0, 36 * 1.7 * 7) ,
		}),
	},
	h2gray: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
			//fontFamily: 'Helvetica, Arial, sans',
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 22,
			fontWeight: '800',
			fill: 0x999999 ,// new FillGradient(0, 0, 0, 36 * 1.7 * 7) ,
		}),
	},
	
	callouttext: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
			align: 'center',
	//		fontFamily: 'Helvetica, Arial, sans',
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 32,
			fontWeight: 800,
			fill: 0xffffff ,
			stroke: { color: '#000000', width: 3, join: 'round' },
			wordWrap: true,
			wordWrapWidth: 600,
			dropShadow: {
				color: '#000000',
				blur: 2,
				angle: Math.PI / 3,
				distance: 1,
				alpha: 1
			},
		
		}),

	},
	bigcallouttext: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
			align: 'center',
	//		fontFamily: 'Helvetica, Arial, sans',
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 60,
			fontWeight: 800,
			fill: 0xffffff ,
			stroke: { color: '#000000', width: 3, join: 'round' },
			wordWrap: true,
			wordWrapWidth: 600,
			dropShadow: {
				color: '#000000',
				blur: 2,
				angle: Math.PI / 3,
				distance: 1,
				alpha: 1
			},
		
		}),

	},
	hugecallouttext: {
		//type: "text",
		type: ComponentTypes.TEXT,
		style: new TextStyle({
			align: 'center',
		//	fontFamily: 'Helvetica, Arial, sans',
			fontFamily: 'Sniglet, Helvetica, Arial, sans',
			fontSize: 120,
			fontWeight: 800,
			fill: 0xffffff ,
			stroke: { color: '#000000', width: 4, join: 'round' },
			wordWrap: true,
			wordWrapWidth: 800,
			dropShadow: {
				color: '#000000',
				blur: 2,
				angle: Math.PI / 3,
				distance: 2,
				alpha: 1
			},
		
		}),

	},


}