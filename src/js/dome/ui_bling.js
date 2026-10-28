import { Container, Sprite, Texture} from 'pixi.js'

export class Bling extends Container
{
	constructor( def, compdef, dialog )
	{
		super()
		//console.log("Create the bling")
		var spriteH = new Sprite(Texture.from(compdef.source ))
		var spriteV = new Sprite(Texture.from(compdef.source ))
		if (def.tint)
		{
			spriteH.tint = def.tint
			spriteV.tint = def.tint
			
		}
		spriteH.blendMode = "add"
		spriteV.blendMode = "add"
		spriteV.rotation = Math.PI/2
		spriteH.anchor.set(0.5)
		spriteV.anchor.set(0.5)
		this.addChild(spriteH)
		this.addChild(spriteV)
		this.spriteH = spriteH
		this.spriteV = spriteV
		this.def = def
		this.compdef = compdef
		this.positionsIsRef = false
		// is the positions in def a string or an array?
		if (typeof def.positions === "string")
		{
			var arr = def.positions.split(".")
			if (arr.length != 2)
			{
				console.error ("Can not understand bling positions " + def.positions)
				return
			}
			var refanim = dialog[arr[0]]
			if (!refanim)
			{
				console.error ("Ref anim not found in bling piositions " + def.positions)
				return
			}
			this.refanim = refanim
			this.refanimBlingPosPrefix = arr[1]
			this.positionsIsRef = true
			
		}
		else
		{
			
			this.positions = def.positions
		}


		this.blingit()
	}

	getRandomPositionFromRef()
	{
		var refanim = this.refanim
		var sprites = refanim.getAllSpritesWithPrefix(this.refanimBlingPosPrefix)
		if (sprites.length == 0)
		{
			//console.error ("No sprites found for bling positions " + this.refanimBlingPosPrefix)
			return false
		}
		//console.log("sprites " + sprites.length)
		var posidx = Math.floor(sprites.length * Math.random())
		var pos = sprites[posidx]
		pos = sprites[posidx].parent.toGlobal(pos)
		pos = this.parent.toLocal(pos)
		return {x: pos.x, y: pos.y}
	}

	blingit()
	{
		var def = this.def
		var spriteH = this.spriteH
		var spriteV = this.spriteV
		spriteH.scale.set(0.01)
		spriteV.scale.set(0.01)
		//{type: "bling", usePos: 1, positions: [{x:-30,y:10}], scale: 1, freq: 10, speed:10},
		//console.log("Bling it")
		
		var twinkleCount = 3
		var self = this
		var compdef = this.compdef
		
		dormant()
		
		/* the compdef
		bling: {
				type: ComponentTypes.BLING,
				source: blingray,
				growTimeMin: 1,
				growTimeMax: 1,
				scaleMin: 0.6,
		scaleMax: 1.0,
				twinkeTimeMin: 1,
				twinkeTimeMax: 2,
				twinkleCountMin: 3,
				twinkleCountMax: 5,
				twinkleScaleMin: 0.6,
				twinkleScaleMax: 1.0,
				shrinkTimeMin: 2,
				shrinkTimeMax: 2,
			},
		*/
		

		function grow()
		{
			//console.log("bling")
			if (!self.parent || !self.parent.parent)
			{
				//console.log("no parent")
				return
			}
			var pos = {x:0, y:0}
			if (self.positionsIsRef)
			{
				pos = self.getRandomPositionFromRef()
				if (!pos)
				{
					dormant()
					return
				}
			}
			else
			{
				var posidx = Math.floor(self.positions.length * Math.random())
				pos = {x: self.positions[posidx].x, y: self.positions[posidx].y}
			}
			if (def.spread)
			{
				pos.x += (Math.random() - 0.5) * def.spread.x
				pos.y += (Math.random() - 0.5) * def.spread.y
			}
			spriteH.position.set(pos.x, pos.y)
			spriteV.position.set(pos.x, pos.y)
	
			spriteH.scale.set(0)
			spriteV.scale.set(0)
			var targScale = def.scale * (compdef.scaleMin + Math.random() * (compdef.scaleMax - compdef.scaleMin))
			var growSpeed = def.speed * (compdef.growTimeMin + Math.random() * (compdef.growTimeMax - compdef.growTimeMin))
			
			newTween(spriteH.scale, {x: targScale, y: targScale},growSpeed).onDone(()=>{
				twinkleCount = Math.floor(compdef.twinkleCountMin + Math.random() * (compdef.twinkleCountMax - compdef.twinkleCountMin))
				twinkle()

			})
			newTween(spriteV.scale, {x: targScale, y: targScale}, growSpeed).onDone(()=>{
				
			})
		}

		function twinkle()
		{
			var scla = (compdef.twinkleScaleMin + Math.random() * (compdef.twinkleScaleMax - compdef.twinkleScaleMin)) * def.scale
			var sclb = (compdef.twinkleScaleMin + Math.random() * (compdef.twinkleScaleMax - compdef.twinkleScaleMin)) * def.scale
			var timea = (compdef.twinkeTimeMin + Math.random() * (compdef.twinkeTimeMax - compdef.twinkeTimeMin)) * def.speed
			var timeb = (compdef.twinkeTimeMin + Math.random() * (compdef.twinkeTimeMax - compdef.twinkeTimeMin)) * def.speed
			newTween(spriteH.scale, {x: def.scale * scla, y: def.scale * scla}, timea).onDone(()=>{
				newTween(spriteH.scale, {x: def.scale * sclb, y: def.scale * sclb},timeb).onDone(()=>{
					twinkleCount--
					if (twinkleCount > 0)
					{
						twinkle()
					}
					else
					{
						shrink()
					}
				})
			})
			var timec = (0.3 + Math.random() * .5) * (timea + timeb)
			var timed = (timea + timeb) - timec
			
			newTween(spriteV.scale, {x: def.scale * scla, y: def.scale * scla}, timec).onDone(()=>{
				newTween(spriteV.scale, {x: def.scale * sclb, y: def.scale * sclb}, timed).onDone(()=>{
				})
			})		
		}

		function shrink()
		{
			var shrinktime = def.speed * (compdef.shrinkTimeMin + Math.random() * (compdef.shrinkTimeMax - compdef.shrinkTimeMin))
			newTween(spriteH.scale, {x: 0.1, y: 0.1}, shrinktime).onDone(()=>{
				//self.parent.removeChild(self)
				dormant()
			})
			newTween(spriteV.scale, {x: 0.1, y: 0.1}, shrinktime).onDone(()=>{
			})
		}

		function dormant()
		{
			
			var dormantTime = def.dormant * Math.random() 
			//console.log("dirmatn time " + dormantTime)
			newTween(spriteH.scale, {x: 0.1, y: 0.1}, dormantTime).onDone(()=>{

				grow()
			})
		}

	}
	
}