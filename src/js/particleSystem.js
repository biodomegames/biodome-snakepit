import { Sprite, Texture } from "pixi.js"

import { ParticleLayer, ParticleSources, ParticleTypes } from "./data_particles"
import { TIMINGCONSTANTS } from "./data_timing"
import { Tween } from "./dome/tween"
import { Container } from "pixi.js"
import { ParticleExact } from "./data_particlesexact"


const DelayJobType = {
	NEWPARTICLE: 0,
	ACTIVATEMOVINGPARTICLE: 1,
}

export class ParticleSystem
{
	constructor( world )
	{
		this.world = world
		this.particles = []
		this.movingparticles = []
		this.particlesToFree = []
		this.particleActiveCount = 0
		this.initExactParticles()
		this.delayJobs = []
		this.numDelayJobs = 0
	}

	initExactParticles()
	{
		for (var p in ParticleExact)
		{
			//var part = new Particle(p)
			//	this.exactParticles.push(part)
			var pex = ParticleExact[p]
			if (pex.config != undefined)
				continue

			// 1) find the tube that is referenced
			// 2) find the movieclip id
			var split = pex.mcSource.split(".")
			var tube = alltubes[split[0]]
			var mc = split[1]
			if (tube == undefined)
			{
				console.error("Tube not found ", pex.mcSource)
				continue
			}

			var mcdata = tube.getMovieClipData(mc)
			//console.log("mcdata ", mcdata)
			pex.sprites = mcdata[pex.frame].sprites
		}
	}

	destroy()
	{
		for (var p of this.particles)
		{
			p.spr.parent?.removeChild(p.spr)
			p.spr.destroy({withChildren: true})
		}
		this.particles = []
		for (var p of this.movingparticles)
		{
			p.spr.parent?.removeChild(p.spr)
			p.spr.destroy({withChildren: true})
		}
		for (var b in this.banks)
		{
			var bank = this.banks[b]
			while (bank.length > 0)
			{
				var p =bank.pop()
				p.spr.parent?.removeChild(p.spr)
				p.spr.destroy({withChildren: true})
			}
		}
		this.movingparticles = []
	}
	
	banks = {}
	getParticleFromBank( ptype, source, partLayer, createUnknownSource)
	{
		
		if (this.banks[source] == undefined)
		{
			this.banks[source] = []
		}
		var bank = this.banks[source]
		var part = undefined
		if (bank.length == 0)
		{
			part = new Particle(source, createUnknownSource)			
		}
		else
		{
			part = bank.pop()
		}
		part.spr.visible = true
		var layer = undefined
		if (partLayer == undefined || partLayer == ParticleLayer.MG)
		{
			layer = this.world.layers["particles"]
		}
		else if (partLayer == ParticleLayer.BG)
		{
			layer = this.world.layers["background"]
			//if (part.spr.parent != this.world.layers["background"]) this.world.layers["background"].addChild(part.spr)

		}
		else
		{
			layer = this.world.layers["fx"]
			//if (part.spr.parent != this.world.layers["fx"]) this.world.layers["fx"].addChild(part.spr)
		}

		if (ptype.blend != undefined && ptype.blend != "normal")
		{
			//console.log("Adding particle to blend layer ", ptype.blend)
			var sublayer = layer.getChildByName("particles_"+ ptype.blend)
			if (sublayer == undefined)
			{
				sublayer = new Container()
				sublayer.name = "particles_"+ ptype.blend
				layer.addChild(sublayer)
				
			}
			layer = sublayer
		}

		if (part.spr.parent != layer)
			layer.addChild(part.spr)
	

		part.active = true
		this.particleActiveCount++
		return part
	}

	createParticleBurst(type, postile, count, duration, spread, power, colors)
	{
		var self = this
		var pixpos = {x: postile.xt * this.world.mapTileSize, y: postile.yt * this.world.mapTileSize}
		for (var i=0; i<count; i++)
		{
			var pos = {x:pixpos.x + Math.random() * spread - spread / 2, y:pixpos.y + Math.random() * spread - spread / 2}
			var vel = {x:Math.random() * spread - spread / 2, y:Math.random() * spread - spread / 2}
			// normalize vel
			var len = Math.sqrt(vel.x * vel.x + vel.y * vel.y)
			vel.x /= len
			vel.y /= len
			vel.x *= power * Math.random()
			vel.y *= power * Math.random()
			var delay = Math.random() * duration	
			var color = colors[Math.floor(Math.random() * colors.length)]
			queueParticle(type, pos, vel, color, delay)
			
		}

		function queueParticle(type, pos, vel, color, delay)
		{
			if (ParticleTypes[type] == undefined)
			{
				console.error("Queued Unknown particle type", type)
				return
			}
			var job = self.getDelayJob(delay)
			
			job.type = DelayJobType.NEWPARTICLE
			
			job.pos = pos
			job.vel = vel
			job.color = color
			job.particletype = type
			/*newTween(self, {}, delay).onDone(() => {
				var part = self.addParticle(type, pos,  vel, color, ParticleLayer.FG)
				//console.log("The part created ", part, part.x, part.y)
				part.lifetime = 2
				//part.tag = "Burst"
			})*/
		}
	}

	getDelayJob(delay)
	{
		var job = undefined
		if (this.numDelayJobs == this.delayJobs.length)
		{
			job = { delay: delay, time: 0, active: true}
			
			this.delayJobs.push(job)
			this.numDelayJobs++
		}
		else
		{
			this.numDelayJobs++
			job = this.delayJobs[this.numDelayJobs - 1]
			job.delay = delay
			job.time = 0
			job.active = true
		}
		return job
	}

	dbgParticleId = 0
	freeParticle(p)
	{

		//if (p.tag == "Burst") console.warn("Free particle ", p)
		if (this.particles.indexOf(p) != -1)
		{
			//console.warn("Particle already in particles array ", p.source)
			return
		}
		//if (p.id == undefined)
		//	p.id = this.dbgParticleId++

		//console.warn("queued Freeing particle ", p.id)

		this.particlesToFree.push(p)
	}
	freeAllQueuedParticles()
	{
		for (var p of this.particlesToFree)
		{
			if (this.banks[p.source] == undefined)
			{
				this.banks[p.source] = []
			}
			p.spr.visible = false	
			p.active = false
			//p.spr?.parent?.removeChild(p.spr)
			if (this.banks[p.source].indexOf(p) != -1)
			{
				//console.warn("Particle already freed in bank ", p.id)
				
			}
			else
			{
				//console.warn("Adding particle to bank ", p.id)
				this.banks[p.source].push(p)
				this.particleActiveCount--
			}
	
			
			
		}
		this.particlesToFree = []
	}

	addExactParticles(type, damage, xt, yt, mc, moving = true)
	{
		//if (mc == undefined)
		//{
			//console.error("No mc provided for exact particles", type)
			//r//eturn
		//}
		var pex = ParticleExact[type]
		if (pex == undefined)
		{
			pex = ParticleExact[type  + damage]
		}
		if (pex == undefined)
		{
			//<debug>
			console.error("Unknown exact particle type", type, (type  + damage))
			//</debug>
			return
		}
		if (pex.sprites == undefined)
		{
			console.error("Exact particle type has no config", type)
			return
		}
		//var config = pex.config
		

		//var srcscl = sprite.parent.worldTransform.a
		var dstscl = mc != undefined ? mc.worldTransform.a : 1
		//console.log("dstscl ", dstscl)
		// get the mc's exact global scale
		var mcscale = 1
		if (mc != undefined)
		{
			mcscale = mc.scale.x
		}

		var particles = []
		var pos = {x: xt * this.world.mapTileSize, y: yt * this.world.mapTileSize}
		var sprites = pex.sprites
		for (var i=0; i<sprites.length; i++)
		{
			var spr = sprites[i]
			var part = this.getParticleFromBank(pex, spr.name, ParticleLayer.FG, true)
			part.setType("exact")
			part.spr.visible = true
			//console.log("part.spr.worldTransform.a ", part.spr.worldTransform.a)

			part.spr.scale.set(.95)
			//part.spr.setFrame(spr.frame)
			part.x = pos.x + spr.x
			part.y = pos.y + spr.y
			part.vel.x = Math.random() * 1000 - 500
			part.vel.y = Math.random() * 1000 - 500 - 1000
			part.rotvel = -Math.PI + Math.random() * 2 * Math.PI
			part.lifetime = 3
			if (moving) this.activateMovingParticle(part, 0, true)		
			particles.push(part)
		}
		return particles
	}

	addParticle( type, pos, vel, color, partLayer )
	{
		if (ParticleTypes[type] == undefined)
		{
			console.error("Unknown particle type", type)	
			return
		}
		var ptype = ParticleTypes[type]
		
		var part = this.getParticleFromBank(ptype, ptype.source, partLayer)
		part.setType(type)
		
		if (pos != undefined)
		{
			part.x = pos.x
			part.y = pos.y
	
		}
		part.vel = vel != undefined ? vel : {x:0, y:0}
		part.color = color != undefined ? color : ptype.color != undefined ? ptype.color : 0xffffff
		part.age = 0
		part.alpha = ParticleTypes[type].alpha
		part.drag = 0
		
		var lt = ptype.lifetime
		if (ptype.lifetimevariationfactor)
		{
			lt += (Math.random()-.5) * ptype.lifetime * ptype.lifetimevariationfactor
		}
		part.lifetime = lt

		

		if (ptype.moving)
		{
			this.activateMovingParticle(part, 0, ptype.gravity)
		}

		return part
	}

	activateMovingParticle( part, delay, usegravity )
	{
		if (delay != undefined && delay > 0)
		{
			var job = this.getDelayJob(delay)
			job.type = DelayJobType.ACTIVATEMOVINGPARTICLE
			job.part = part
			job.usegravity = usegravity

			//newTween(part, {}, delay).onDone(() => {
			//	this.activateMovingParticle(part,0,usegravity)
		//	})
			return
		}
		part.usegravity = usegravity != undefined ? usegravity : true
		this.movingparticles.push(part)
	}

	dbgTickCount = 0

	tick(deltatime)
	{
		var grav = {x:0, y:TIMINGCONSTANTS.particlesGravity}
		var upm = this.world.unitsPrMeter
		var self = this
		
		//window.statDisplay && window.statDisplay.addStat("PartActive", this.particleActiveCount)
		//window.statDisplay && window.statDisplay.addStat("PartMove", this.movingparticles.length)
		//var dustspawn = []
		//console.log("numpoart ", this.movingparticles.length)
		this.dbgTickCount++

		for (var d = this.numDelayJobs-1; d>=0; d--)
		{
			var job = this.delayJobs[d]
			if (!job.active) continue
			job.time += deltatime
			if (job.time >= job.delay)
			{
				job.active = false
				
				if (job.type == DelayJobType.NEWPARTICLE)
				{
					this.addParticle(job.particletype, job.pos, job.vel, job.color, ParticleLayer.FG)
				}
				else if (job.type == DelayJobType.ACTIVATEMOVINGPARTICLE)
				{
					this.activateMovingParticle(job.part, 0, job.usegravity)
				}
			}
		}
		while (this.numDelayJobs > 0 && this.delayJobs[this.numDelayJobs-1].active == false)
		{
			this.numDelayJobs--
			//this.delayJobs.pop()
		}
		

		//var statCount = {}
		var numParticlesActive = 0;
		for (var t= this.movingparticles.length-1; t >= 0; t--)
		{
			var part = this.movingparticles[t]
			if (!part.active && t==this.movingparticles.length-1)
			{
				this.movingparticles.pop()
				//console.log("movingparticles length ", this.movingparticles.length)
			}
			if (!part.active) continue


			if (part.dbgTickCount == this.dbgTickCount)
			{
				console.error("DOUBLE TICK PARTICLE ", part.type)
			}
			part.dbgTickCount = this.dbgTickCount

			/*if (statCount[part.source] == undefined)
			{
				statCount[part.source] = 0
			}
			statCount[part.source]++
			*/
			numParticlesActive++
			if (part.usegravity)
			{
				part.vel.x += grav.x * deltatime * upm
				part.vel.y += grav.y * deltatime * upm	
				if (part.collide)
				{
					if (!this.world.isPointPassable(part.x, part.y, undefined, true))
					//if (part.y > this.world.height)
					{
						//console.log("Collided with ground")
						//this.movingparticles.splice(t, 1)
						//part.active = false
						disableParticle(part, t)
						
						if (part.ptype.onCollideSpawn != undefined)
						{
							var spawnCount = part.ptype.onCollideSpawnCount.min + Math.random() * (part.ptype.onCollideSpawnCount.max - part.ptype.onCollideSpawnCount.min)
							for (var i=0; i<spawnCount; i++)
							{
								var spawnpos = {x:part.x + Math.random() * part.ptype.onCollideSpawnAreaSpread.x - part.ptype.onCollideSpawnAreaSpread.x / 2, y:part.y + Math.random() * part.ptype.onCollideSpawnAreaSpread.y - part.ptype.onCollideSpawnAreaSpread.y / 2}
								var delay = part.ptype.onCollideSpawnDelay.min + Math.random() * (part.ptype.onCollideSpawnDelay.max - part.ptype.onCollideSpawnDelay.min)
								var vfac = part.ptype.onCollideSpawnVelocityFactor
								var vspread = part.ptype.onCollideSpawnVelocitySpreadFactor
								var vel = {
									x:part.vel.x * vfac.x, 
									y:part.vel.y * vfac.y
								}
								vel.x *= (Math.random() * vspread.x )
								vel.y *= (Math.random() * vspread.y )
								var vadd = part.ptype.onCollideSpawnVelocitySpreadAdd
								vel.x += Math.random() * vadd.x - vadd.x / 2
								vel.y += Math.random() * vadd.y - vadd.y / 2
								var newpart = this.addParticle(part.ptype.onCollideSpawn, spawnpos, vel, part.color)
								let lifetimeadd = part.ptype.onCollideSpawnLifetimeAdd.min + Math.random() * (part.ptype.onCollideSpawnLifetimeAdd.max - part.ptype.onCollideSpawnLifetimeAdd.min)
								newpart.lifetime += lifetimeadd
							}
						}
						this.freeParticle(part)
						
						continue
					}
				}
			}
			var oldx = part.x
			var oldy = part.y
			part.x += part.vel.x * deltatime 
			part.y += part.vel.y * deltatime
			part.vel.x *= 1 - part.drag * deltatime
			part.vel.y *= 1 - part.drag * deltatime
			part.rotation += part.rotvel * deltatime
			part.age += deltatime
			part.scale.x += part.growspeed.x * deltatime
			part.scale.y += part.growspeed.y * deltatime
			if (part.lifetime > 0)
			{
				if (part.age > part.lifetime)
				{
					//this.movingparticles.splice(t, 1)
					disableParticle(part, t)
					//part.active = false
					//this.freeParticle(part)
					//console.log("Particle died ", part.tag)
				}
				else if (part.age > part.lifetime - part.fadetime)
				{
					part.alpha = part.startalpha - ((part.age - (part.lifetime - part.fadetime)) / part.fadetime) * part.startalpha
				}
			}
			else
			{
				// particle never dies	
			}
			if (part.spawnTrailDuration > part.spawnTrainTime)
			{	
				let trailAgeFactor = 1 - (part.spawnTrainTime / part.spawnTrailDuration) 
				//console.log("trailAgeFactor ", trailAgeFactor)
				part.spawnTrainTime += deltatime
				part.spawnTrailAccum += part.spawnTrailRate * deltatime
				var numSpawnNow = Math.floor(part.spawnTrailAccum)
				var dx = part.x - oldx
				var dy = part.y - oldy
				if (numSpawnNow > 0)
				{
					dx /= numSpawnNow
					dy /= numSpawnNow
					for (var i=0; i<numSpawnNow; i++)
					{
						var trailpart = this.addParticle(part.spawnTrailType, {x:oldx, y:oldy}, {x:0, y:0}, 0xffffff, ParticleLayer.FG)
						//trailpart.lifetime = part.spawnTrailDuration
						trailpart.alpha = part.alpha
						trailpart.scale.x = .2
						trailpart.scale.y = .2
						trailpart.vel.x = 0
						trailpart.vel.y = 0
						trailpart.age = 0
						trailpart.drag = 0
						trailpart.growspeed.x *= trailAgeFactor
						trailpart.growspeed.y *= trailAgeFactor

						//trailpart.lifetime = 10
						oldx += dx
						oldy += dy
						//trailpart.tag = "HALLO"
						//this.activateMovingParticle(trailpart, 0, false)
						//trailpart.lifetime = .5
					}
				}
			}
	
		}
		this.freeAllQueuedParticles()	

		/*for (var s in statCount)
		{
			window.statDisplay &&window.statDisplay.addStat(s, statCount[s])
		}*/

		if (this.world.game.fpsDisplay) this.world.game.fpsDisplay.setParticleCount(numParticlesActive)

		//<debug>
		if (DEBUG.particleSystemDumpStats)
		{
			this.dumpStats(deltatime, numParticlesActive)
		}
		//</debug>

		function disableParticle(part, movingParticleIndex)
		{
			if (self.movingparticles.length > movingParticleIndex-1)
			{
				var mpl = self.movingparticles.length
				var swap = self.movingparticles[mpl-1]
				self.movingparticles[movingParticleIndex] = swap
				self.movingparticles.pop()
			}
			part.active = false
			self.freeParticle(part)
		}
			
	}

	//<debug>

	dumpStats(deltatime, numParticlesActive)
	{
		
		if (this.dumpTimer == undefined)
		{
			this.dumpTimer = 0;
			this.dumpBankTimer = 0
		}
		this.dumpTimer += deltatime
		this.dumpBankTimer += deltatime

		if (this.dumpBankTimer > 1)
		{
			this.dumpBankTimer = 0;
			console.log("---------- PARTICLES Bank DUMP --------- ")
			console.log("Banks: ", this.banks)
			console.log("-------------------------------- ")
		}

		if ((this.dumpTimer > 0.5 && numParticlesActive > 500) || (this.dumpTimer > 0.1 && numParticlesActive > 2000 ))
		{
			this.dumpTimer = 0;
			var map = {}
			for (var p of this.movingparticles)
			{
				if (!p.active) continue
				if (map[p.type] == undefined)
				{
					map[p.type] = 0
				}
				map[p.type]++
			}
			console.log("---------- PARTICLES DUMP --------- ")
			console.log("Number of particles active: ", this.particleActiveCount)
			for (var t in map)
			{
				console.log("Particle type ", t, " count ", map[t])
			}
			console.log("-------------------------------- ")
			
		}
		
	
		
		
	}
	//</debug>
	
}



export class Particle
{
	vel = {x:0, y:0}
	rotvel = 0
	//color = 0xffff00
	usegravity = false
	collide = true
	lifetime = 1
	drag = 0
	_age = 0
	fadetime = 0
	startalpha = 1
	growspeed = {x:0, y:0}
	isMovieClip = false
	active = true
	constructor(source, createUnknownSource)
	{
		//this.type = type
		this.source = source
		if (createUnknownSource && ParticleSources[source] == undefined)
		{
			ParticleSources[source] = {spriteNames: [source]}
		}
		
		if (ParticleSources[source].mc != undefined)
		{
			// its a tube mc
			var idx = Math.floor(Math.random() * ParticleSources[source].mc.length)
			var arr = ParticleSources[source].mc[idx].split(".")
			var tube = alltubes[arr[0]]

			this.spr = tube.getMovieClip(arr[1])
			this.spr.name = "particle_mc_" + source + "_" + arr[1]
			this.isMovieClip = true
		}
		else if (createUnknownSource) // exact particles... this is a bit hacky but i just need to know now.
		{
			this.spr = new Sprite(Texture.from(ParticleSources[source].spriteNames[Math.floor(Math.random() * ParticleSources[source].spriteNames.length)]))
			this.spr.anchor.set(0.5)
			//this.spr.scale.set(0.5)
		}
		else
		{
			this.spr = new Sprite(Texture.from(ParticleSources[source].spriteNames[Math.floor(Math.random() * ParticleSources[source].spriteNames.length)]))
			this.spr.anchor.set(0.5)
			this.spr.scale.set(0.5)
		}
		
	}
	set age(a)
	{ 
		this._age = a
		if (this.isMovieClip)
		{
			var frm = this.spr.numFrames / this.lifetime * a
			//console.log("Set the frame ", frm)
			var newFrame = Math.floor(frm)
			if (newFrame != this.spr.curframe)
			{
				this.spr.setFrame(newFrame)
			}
		}
	}
	get age()
	{
		return this._age
	}
	get scale()
	{
		
		return this.spr.scale
	}
	set scale(s)
	{
		this.spr.scale.set(s)
	}
	set x(p) { this.spr.x = p	}
	get x() { return this.spr.x	}
	set y(p) { this.spr.y = p	}
	get y() { return this.spr.y	}

	set color(c)
	{
		this.spr.tint = c
	}
	get color()
	{
		return this.spr.tint
	}
	set alpha(a)
	{
		this.spr.alpha = a
	}
	get alpha()
	{
		return this.spr.alpha
	}
	set rotation (r)
	{
		this.spr.rotation = r
	}
	get rotation()
	{
		return this.spr.rotation
	}
	setType(type)
	{
		this.type = type
		this.ptype = ParticleTypes[type]
		if (type == "fobhilite")
		{
			console.log("DO IT ", this.ptype)
		}
		this.alpha = (this.ptype.startalpha != undefined) ? this.ptype.startalpha : 1
		this.startalpha = (this.ptype.startalpha != undefined) ? this.ptype.startalpha : 1
		this.age = 0
		this.spawnTrainTime = 0
		this.lifetime = this.ptype.lifetime
		if (this.ptype.lifetimeSpread)
		{
			this.lifetime += Math.random() * this.ptype.lifetime * this.ptype.lifetimeSpread
		}
		this.fadetime = this.ptype.fadetime
		this.drag = this.ptype.drag
		if (this.ptype.growspeed)
		this.growspeed = {x: this.ptype.growspeed.x, y: this.ptype.growspeed.y}
		if (this.ptype.blend)
		{
			if (Array.isArray(this.ptype.blend))
			{
				this.spr.blendMode = this.ptype.blend[Math.floor(Math.random() * this.ptype.blend.length)]
			}
			else
			{
				this.spr.blendMode = this.ptype.blend
			}
		}
		else	
		{
			this.spr.blendMode = "normal"
		}
		this.spawnTrailType = this.ptype.spawnTrailType
		this.spawnTrailRate = this.ptype.spawnTrailRate
		this.spawnTrailDuration = this.ptype.spawnTrailDuration
		this.spawnTrailAccum = 0
		this.collide = this.ptype.collide
		//this.spr.alpha = .5
		//this.spr.blendMode = "add"
		//console.log(" blend: ",this.spr.blendMode , this.ptype.name)
		if (this.ptype.scale)
		{
			this.scale.x = this.ptype.scale.x
			this.scale.y = this.ptype.scale.y
		}
		//if (this.spr) this.spr.alpha = this.ptype.startalpha

		
	}
}