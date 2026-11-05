import { ComponentTypes } from './dome/ui_componenttypes';
import { UISounds } from './dome/ui_sounds.js';

import { TextStyle } from 'pixi.js';

import mine_dialog_raised from '../g/ui/dialog-raised.svg';
import mine_messagebox from '../g/ui/message-box.svg';
import mine_button_close from '../g/ui/button-close.svg';
import button_debug from '../g/ui/button-debug.svg';
import button_settings from '../g/ui/button-settings.svg';

export const UIComponentDefinitions = {

	container: {
		type: ComponentTypes.CONTAINER,
	},

	mine_dialog_raised: {
		type: ComponentTypes.NINESLICE,
		source: mine_dialog_raised,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},

	mine_messagebox: {
		type: ComponentTypes.NINESLICE,
		source: mine_messagebox,
		slice: {left: 90, right: 90, top: 90, bottom: 90},
	},

	mechanicSoundToggle: {
		type: ComponentTypes.BUTTONMOVIECLIP,
		tube: "tiles",
		movieclip: "soundOnOff",
		toggle: true,
		framerate: 30,
		defaultwidth: 123,
		defaultheight: 114,
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

	/** tiles `musicOnOff`: note icon, labels off / turnon / on / turnoff. */
	mechanicMusicToggle: {
		type: ComponentTypes.BUTTONMOVIECLIP,
		tube: "tiles",
		movieclip: "musicOnOff",
		toggle: true,
		framerate: 30,
		defaultwidth: 117,
		defaultheight: 112,
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

	/** tiles `mcBtn`: main button, labels up / over / down. Face content tracks `btnFace`. */
	mechanicBtn: {
		type: ComponentTypes.BUTTONMOVIECLIP,
		tube: "tiles",
		movieclip: "mcBtn",
		faceInstance: "btnFace",
		framerate: 30,
		interpolate: true,
		defaultwidth: 188,
		defaultheight: 76,
		labels: {
			up: "up",
			hover: "over",
			press: "down",
			unhover: "up",
		},
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},

	/** tiles `mcBtnClose`: close X, labels up / over / down. */
	mechanicCloseBtn: {
		type: ComponentTypes.BUTTONMOVIECLIP,
		tube: "tiles",
		movieclip: "mcBtnClose",
		framerate: 30,
		defaultwidth: 69,
		defaultheight: 76,
		labels: {
			up: "up",
			hover: "over",
			press: "down",
			unhover: "up",
		},
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},

	mine_closebutton: {
		type: ComponentTypes.BUTTON9SLICE,
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
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},

	button_settings: {
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
		type: ComponentTypes.BUTTON9SLICE,
		text: "buttondebugtext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.9}},
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
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},

	button_debug_tint: {
		type: ComponentTypes.BUTTON9SLICE,
		text: "buttondebugtext",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.9}},
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
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},

	button_textlink: {
		type: ComponentTypes.BUTTON9SLICE,
		text: "linkButtonText",
		textoffset: { up: {x:0, y:1},
					  hover: {x:0, y:0},
					  down: {x:0, y:2, scale: 0.9}},
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
		sounddown: [UISounds.clickdown1],
		soundup: [UISounds.clickup1],
	},

	body_mine: {
		type: ComponentTypes.TEXT,
		style: new TextStyle({ align: 'center', fontFamily: 'Chewy, Helvetica, Arial, sans', fontSize: 48, fontWeight: 500, fill: 0x857E76, stroke: { color: '#ffffff', width: 6, join: 'round' }, wordWrap: true, wordWrapWidth: 660}),
	},

	h1_title: {
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

	h2_title: {
		type: ComponentTypes.TEXT,
		style: new TextStyle({
			align: "center",
			fontFamily: "Chewy, Helvetica, Arial, sans",
			fontSize: 46,
			fontWeight: 800,
			fill: 0xf2ffe0,
			stroke: { color: "#9B5018", width: 5, join: "round" },
			wordWrap: true,
			wordWrapWidth: 400,
			dropShadow: {
				color: "#000000",
				blur: 4,
				angle: Math.PI / 3,
				distance: 5,
				alpha: 0.45,
			},
		}),
	},

	linkButtonText: {
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

	movieclip: {
		type: ComponentTypes.MOVIECLIP,
	},

	tubeimage: {
		type: ComponentTypes.TUBEIMAGE,
		scale: 1,
		pos: {x:0, y:0},
	},

	image: {
		type: ComponentTypes.IMAGE,
		scale: 1,
		pos: {x:0, y:0},
	},

	svg: {
		type: ComponentTypes.SVG,
		scale: 1,
		pos: {x:0, y:0},
	},

	buttondebugtext: {
		type: ComponentTypes.TEXT,
		style: new TextStyle({
		  fontFamily: 'Helvetica, Arial, sans',
			fontSize: 28,
			fontWeight: 'bold',
			fill: 0xffffff,
		}),
	},
}
