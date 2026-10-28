export const InputNaming = {
	UP: 1,
	DOWN: 2,
	LEFT: 3,
	RIGHT: 4,
	JUMP: 5,
	ALT: 6,
	SHIFT: 7,
}

export var InputMappings = {
	wasd:{
		87: InputNaming.UP,
		83: InputNaming.DOWN,
		65: InputNaming.LEFT,
		68: InputNaming.RIGHT,
		69: InputNaming.JUMP,
		18: InputNaming.ALT,
		16: InputNaming.SHIFT,
	},
	arrowkeys:{
		38: InputNaming.UP,
		40: InputNaming.DOWN,
		37: InputNaming.LEFT,
		39: InputNaming.RIGHT,
		32: InputNaming.JUMP,
		18: InputNaming.ALT,
		16: InputNaming.SHIFT,
	},
}

export class Input
{
	constructor(mapping)
	{
		this.mapping = mapping;
		this.keys = {};
		this.down = {};
		this.onInputDown = undefined
		this.onInputUp = undefined

		this.onInputDirChange = undefined
		this.dirx = 0
		this.diry = 0
		this.alt = false

		document.addEventListener("keydown", (e) => {
			//<debug>
			//console.log("Input Keydown", e.keyCode)
			//</debug>
			if (this.mapping[e.keyCode] == undefined)
			{
				return
			}
			if (this.down[e.keyCode] == true)
			{
				return
			}
			//console.log("Keydown", this.mapping[e.keyCode])
			this.keys[this.mapping[e.keyCode]] = true;
			this.down[e.keyCode] = true;
			if (this.onInputDown != undefined)
			{
				this.onInputDown(this.mapping[e.code])
			}

			let olddirx = this.dirx
			let olddiry = this.diry
			if (this.mapping[e.keyCode] == InputNaming.UP)
			{
				this.diry = -1
			}
			if (this.mapping[e.keyCode] == InputNaming.DOWN)
			{
				this.diry = 1
			}
			if (this.mapping[e.keyCode] == InputNaming.LEFT)
			{
				this.dirx = -1
			}
			if (this.mapping[e.keyCode] == InputNaming.RIGHT)
			{
				this.dirx = 1
			}
			if (olddirx != this.dirx || olddiry != this.diry)
			{
				if (this.onInputDirChange != undefined)
				{
					this.onInputDirChange(this.dirx, this.diry)
				}
			}
			this.alt = this.keys[InputNaming.ALT]
			this.shift = this.keys[InputNaming.SHIFT]
				
		});
		document.addEventListener("keyup", (e) => {
			if (this.mapping[e.keyCode] == undefined)
			{
				return
			}
			if (!this.down[e.keyCode])
			{
				return
			}
			console.log("Keyup", this.mapping[e.keyCode])
			this.keys[this.mapping[e.keyCode]] = false;
			this.down[e.keyCode] = false;
			let olddirx = this.dirx
			let olddiry = this.diry
			
			this.alt = this.keys[InputNaming.ALT]

			if (this.mapping[e.keyCode] == InputNaming.UP)
			{
				this.diry = 0
			}
			if (this.mapping[e.keyCode] == InputNaming.DOWN)
			{
				this.diry = 0
			}
			if (this.mapping[e.keyCode] == InputNaming.LEFT)
			{
				this.dirx = 0
			}
			if (this.mapping[e.keyCode] == InputNaming.RIGHT)
			{
				this.dirx = 0
			}
			if (olddirx != this.dirx || olddiry != this.diry)
			{
				if (this.onInputDirChange != undefined)
				{
					this.onInputDirChange(this.dirx, this.diry)
				}
			}
			

			if (this.onInputUp != undefined)
			{
				this.onInputUp(this.mapping[e.code])
			}
	
			this.alt = this.keys[InputNaming.ALT]
			this.shift = this.keys[InputNaming.SHIFT]
		});
	}

	getKeyStatus(inputname)
	{
		return this.keys[inputname];
	}
}