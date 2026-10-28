//import { UI } from './ui.js';
//import { Dialog } from './ui_dialog.js';
//import { DialogDefinitions } from '../data_ui_dialogs.js';

export class UIDebug
{
	constructor(game, ui)
	{	
		this.ui = ui
		this.game = game
		this.curDialog = undefined
		this.dialogId = -1
		this.keys = []
		this.shift = false
		this.curstate = undefined
		document.addEventListener("keyup", (e) => {
			if (window.inputInFocus) return
			if (e.code == "ShiftLeft" || e.code == "ShiftRight")
			{
				this.shift = false
			}
		})
		document.addEventListener("keydown", (e) => {
			if (window.inputInFocus) return
			if (e.code == "ShiftLeft" || e.code == "ShiftRight")
			{
				this.shift = true
			}

			//console.log("UI Debug keydown", e.code)
			
			if (e.code == "KeyR")
			{
				this.stepDebugDialog(-1)
			}
			else if (e.code == "KeyT")
			{
				this.stepDebugDialog(1)
			}				
			else if (e.code == "KeyG")
			{
				this.stepDebugDialog(0, 1)
			}
		});
	}

	stepDebugDialog(dir, statestep)
	{
		if (this.dialogId == -1)
		{
			this.dialogId = 0
			this.keys = []
			for (var t in Object.keys(this.ui.dialogDefinitions))
			{
				var key  = Object.keys(this.ui.dialogDefinitions)[t]
				if (this.ui.dialogDefinitions[key]._setup != undefined || this.ui.dialogDefinitions[key]._template != undefined)
				{
					this.keys.push(key)
				}
			}
			//this.keys = Object.keys( DialogDefinitions)

		}
		else
		{
			this.dialogId += dir
			if (this.dialogId < 0)
			{
				this.dialogId = 0
			}
			if (this.dialogId >= this.keys.length)
			{
				this.dialogId = this.keys.length-1
			}
		}
		if (this.curDialog != undefined)
		{
			
			this.ui.closeDialog(this.curDialog)	
			this.curDialog = undefined
		}
		if (dir!=0)
		{
			this.curstate = 0
		}
		if (statestep)
		{
			this.curstate += 1
		}
		let payload =  []

		var dialogdef = this.ui.dialogDefinitions[this.keys[this.dialogId]]
		if (dialogdef.states)
		{
			console.log("WE GOT STATES")
			this.curstate = this.curstate % Object.keys(dialogdef.states).length
			payload.state = Object.keys(dialogdef.states)[this.curstate]
		}
		console.warn("Display dialog ", this.keys[this.dialogId] )
		this.curDialog = this.ui.displayDialog(this.keys[this.dialogId], payload, (res) => {
			//console.log("Dialog closed", res)
		}, {disableAspectSwap: true})
	}

}