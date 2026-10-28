import { Container, Sprite } from 'pixi.js'

import { Texture } from 'pixi.js';
export class UIStateWidget extends Container
{
	constructor(dialog, def, compdef, payload)
	{
		super()
		
		//console.log("UIStateWidget", def, compdef);
		let stateObjects = {}

		for (var state in compdef.states)
		{
			if (this.curState == undefined)
			{
				this.curState = state
			}
			var arr = this.createState(compdef.states[state], def, dialog)
			stateObjects[state] = arr
		}
		this.stateObjects = stateObjects
		if (def.state) this.curState = def.state
		this.setState( this.curState)
		
	}

	setState(state)
	{
		//console.log("setState", state)
		if (!Object.keys(this.stateObjects).includes(state))
		{
			//<debug>
			console.error("State not found", state)
			//</debug>
			return
		}
		for (var s in this.stateObjects)
		{
			for (var i in this.stateObjects[s])
			{
				this.stateObjects[s][i].visible = state == s
			}
		}
		this.curState = state
	}

	set text(value)
	{
		//this.text = text
		for (var i in this.stateObjects)
		{
			for (var j in this.stateObjects[i])
			{
				if (this.stateObjects[i][j].text != undefined) 
				{
					this.stateObjects[i][j].text = value
				}
			}
		}
	}

	createState(state, def, dialog)
	{

		var ret = []
		for (var l in state.layers)
		{
			
			var layer = state.layers[l]

			//console.log("layer", layer)
			if (layer.source)
			{
				var img = new Sprite()
				this.numImagesToLoad++
				let texture = Texture.from(layer.source)
				//Assets.load(layer.source).then((texture) => {
					img.texture = texture
				//})	
		
				this.addChild(img)
				img.anchor.set(0.5)
				if (layer.scale)
				{
					if (layer.scale.x != undefined || layer.scale.y != undefined) 
					{
						img.scale.x = layer.scale.x
						
					}
					if (layer.scale.y != undefined)
					{
						img.scale.y = layer.scale.y
					}
					
					if (layer.scale && layer.scale.x == undefined && layer.scale.y == undefined)
					{
						img.scale.set(layer.scale)
					}
				}
				ret.push(img)
			}
			if (layer.text)
			{
				//console.log("statewidget", layer.text)
				var txt = dialog.initText(def, layer.compDef)
				txt.x = 0
				txt.y = 0
				this.addChild(txt)
				ret.push(txt)
			}
		}
		return ret
	}
}