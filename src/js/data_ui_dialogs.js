import { TransDef } from "./dome/ui.js"
import { DialogSettings } from "./dialogsettings.js"
import { TubesList } from "./data_tubelist.js"

export const DialogDefinitions = {
	TubeDefinitions: TubesList,

	/** Settings (sound/music). Opened from the shell options menu. */
	home: {
		_setup: {
			halign: "center",
			valign: "center",
			appear: TransDef.FADE,
			disappear: TransDef.FADE,
			alignOffset: { x: 0, y: 0 },
			pos1: { x: 0, y: 0 },
			pos2: { x: 0, y: 0 },
			aspectScaleFactor: {
				minAspect: 0.4,
				minScale: 1,
				maxAspect: 1.4,
				maxScale: 0.55,
			},
			controller: DialogSettings,
		},

		panel: {
			type: "mine_dialog_raised",
			width: 640,
			height: 420,
			sizeRef: true,
		},

		title: {
			type: "h3_mine",
			text: "Snakepit",
			usePos: "absolute",
			pos: { x: 0, y: -120 },
		},

		labelSound: {
			type: "h3_mine",
			text: "Sound",
			usePos: "absolute",
			pos: { x: -30, y: -20 },
			anchor: { x: 1, y: 0.5 },
		},
		checkboxSound: {
			type: "settingsCheckbox",
			restrue: "soundon",
			resfalse: "soundoff",
			closeDialog: false,
			usePos: "absolute",
			pos: { x: 70, y: -20 },
			initialValueGet: () => window.bdata.get("Sound", true),
		},

		labelMusic: {
			type: "h3_mine",
			text: "Music",
			usePos: "absolute",
			pos: { x: -30, y: 90 },
			anchor: { x: 1, y: 0.5 },
		},
		checkboxMusic: {
			type: "settingsCheckbox",
			restrue: "musicon",
			resfalse: "musicoff",
			closeDialog: false,
			usePos: "absolute",
			pos: { x: 70, y: 90 },
			initialValueGet: () => window.bdata.get("Music", false),
		},
	},

	deviceInfo: {
		_setup: {
			halign: "center",
			valign: "center",
			appear: TransDef.FADE,
			disappear: TransDef.FADE,
		},
		panel: { type: "mine_dialog_raised", width: 760, height: 820, sizeRef: true },
		closebut: {
			type: "mine_closebutton",
			res: "close",
			text: "",
			closeDialog: true,
			usePos: 1,
			trans: { x: 280, y: -340, a: 0 },
		},
		title: { type: "h1_title", text: "Device Info", pos1add: { x: 0, y: -280 } },
		dpr0: { type: "body_mine", text: "dpr", wordWrapWidth: 680, pos1add: { x: 0, y: 50 } },
		dpr1: { type: "body_mine", text: "dpr", wordWrapWidth: 680, pos1add: { x: 0, y: 40 } },
		dpr2: { type: "body_mine", text: "dpr", wordWrapWidth: 680, pos1add: { x: 0, y: 40 } },
		dpr3: { type: "body_mine", text: "dpr", wordWrapWidth: 680, pos1add: { x: 0, y: 40 } },
		dpr4: { type: "body_mine", text: "dpr", wordWrapWidth: 680, pos1add: { x: 0, y: 40 } },
		dpr5: { type: "body_mine", text: "dpr", wordWrapWidth: 680, pos1add: { x: 0, y: 40 } },
		dpr6: { type: "body_mine", text: "dpr", wordWrapWidth: 680, pos1add: { x: 0, y: 40 } },
		dpr7: { type: "body_mine", text: "dpr", wordWrapWidth: 680, pos1add: { x: 0, y: 40 } },
	},

	debugSelectDialogList: {
		_setup: {
			valign: "center",
			halign: "center",
			pos1: { x: 0, y: -400 },
			pos2: { x: 0, y: "bottom" },
			aspectScaleFactor: {
				minAspect: 0.4,
				minScale: 1.9,
				maxAspect: 1,
				maxScale: 0.8,
			},
		},
		tbg: {
			type: "mine_messagebox",
			usePos: "absolute",
			blockClicks: true,
			pos: { x: 0, y: 0 },
			width: 450,
			height: 900,
			sizeRef: true,
		},
		tclosebut: {
			type: "mine_closebutton",
			res: "close",
			text: "",
			closeDialog: true,
			usePos: 1,
			halign: "right",
			valign: "top",
			trans: { x: 0, y: -30, a: 0, sx: 0.75, sy: 0.75 },
		},
		levelitem0: {
			type: "button_debug",
			width: 460,
			res: "none",
			text: "Level {levelid}",
			closeDialog: true,
			usePos: 1,
			pos1add: { x: 0, y: 50 },
			trans: { sx: 0.75, sy: 0.75 },
		},
		botset: { pos2add: { x: 0, y: -30 } },
		prev: {
			type: "button_debug",
			res: "prev",
			text: "<< Prev",
			closeDialog: true,
			usePos: 2,
			trans: { x: -100, y: 0, sx: 0.75, sy: 0.75 },
		},
		next: {
			type: "button_debug",
			res: "next",
			text: "Next >>",
			closeDialog: true,
			usePos: 2,
			pos2add: { x: 0, y: 50 },
			trans: { x: 100, y: 0, sx: 0.75, sy: 0.75 },
		},
	},
}
