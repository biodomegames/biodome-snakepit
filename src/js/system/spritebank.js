import { Sprite, Texture } from "pixi.js"

import questionmark from "../../g/questionmark.svg"

const SpriteSources = 
{

	questionmark: 
	{ 
		type: "sprite",
		sources: [questionmark]
	},
	
}


class SpriteBankClass 
{
	static #instance = null;

	static getInstance() {
		if (!SpriteBankClass.#instance) {
			SpriteBankClass.#instance = new SpriteBankClass();
		}
		return SpriteBankClass.#instance;
	}

	constructor()
	{
		if (SpriteBankClass.instance != undefined)
			return SpriteBankClass.instance

		this.banks = {}
		//this.loadSprites()
	}

	getAssetsForPreload()
	{
		return [questionmark]
	}

	getSprite( source )
	{
		
		if (this.banks[source] == undefined)
		{
			this.banks[source] = []
		}
		var bank = this.banks[source]
		var spr = undefined
		if (bank.length == 0)
		{
			if (SpriteSources[source] == undefined)
			{
				console.error("sprite not found ", source)
				source = "questionmark"
			}
			if (SpriteSources[source].type == "sprite")
			{
				spr = new Sprite(Texture.from(SpriteSources[source].sources[Math.floor(Math.random() * SpriteSources[source].sources.length)]))
				spr._bank = source
				spr.anchor.set(0.5)	
			}
			else if (SpriteSources[source].type == "movieclip")
			{
				let rnd = Math.floor(Math.random() * SpriteSources[source].sources.length)
				let mc = SpriteSources[source].sources[rnd]
				var arr = mc.split(".")
				let tubeid = arr[0]
				if (alltubes[tubeid] == undefined)
				{
					console.error("tube not found ", tubeid)
					return undefined
				}
				let tube = alltubes[tubeid]
				spr = tube.getMovieClip(arr[1])
				spr.setFrame(0)
				spr._bank = source
			}
		}
		else
		{
			spr = bank.pop()
		}		
		
		return spr
	}
	
	freeSprite(spr)
	{
		if (this.banks[spr._bank] == undefined)
		{
			this.banks[spr._bank] = []
		}
		spr.parent?.removeChild(spr)
		if (this.banks[spr._bank].indexOf(spr) != -1)
		{
			console.error("sprite already freed in bank ", spr._bank)
			return
		}

		this.banks[spr._bank].push(spr)
	}

	dumpSpriteBankStats()
	{
		for (var bank in this.banks)
		{
			console.log("bank ", bank, " count ", this.banks[bank].length)
		}
	}
}

// Create the instance immediately
const spriteBankInstance = new SpriteBankClass();

// Export both the class and the instance
export { SpriteBankClass };
export const SpriteBank = spriteBankInstance;