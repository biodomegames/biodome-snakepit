import { FlashTube } from './flashtube.js';
//import * as PIXI from 'pixi.js';
import { Application } from 'pixi.js';
import { Assets } from 'pixi.js';
import { Texture } from 'pixi.js';
import { Sprite } from 'pixi.js';
import { Container } from 'pixi.js';
import { tubeManager } from './flashtubemanager.js';
import { GameEvents } from '../gameevents.js';

var mcCount = 0

/** Timeline labels with this prefix are sync markers only (not {@link MovieClip#playLabel} targets). */
const SOUND_LABEL_PREFIX = "sound_"

/** @param {string | undefined} labelStr */
function parseFrameLabelString(labelStr)
{
	if (labelStr == undefined || labelStr === "") return []
	return String(labelStr).split(",").map((s) => s.trim()).filter(Boolean)
}

/** @param {string} label */
function isSoundLabel(label)
{
	return label.startsWith(SOUND_LABEL_PREFIX)
}

export class MovieClip extends Container {
	
	flashTube = undefined;
	data = undefined
	spritecache = {}
	isTicking = false
	curframe = 0
	app = undefined
	framerate = 24
	time = 0
	//name = ""
	tintrules = {}
	tintWildcards = {}
	/** Exact match on a sprite's type name (`sprite.name` in the frame data). */
	tintSpriteTypeRules = {}
	/** Substring/prefix match on a sprite's type name (`sprite.name`). */
	tintSpriteTypeWildcards = {}
	/** Per nested subsequence name → sprite type name → tint (applied on child {@link MovieClip}). */
	tintSubsequenceSpriteTypeRules = {}
	visibilityrules = {}
	childmcframerules = {}
	gluerules = {}
	framelabels = {}
	/** Frame index → `sound_*` label names encountered on that frame (for sync SFX). */
	soundLabelsByFrame = {}
	looping = false
	playReverse = false
	interpolate = false
	mcid = 0
	_name = "unnamed"
	set name(nj)
	{
		//console.warn(this.mcid, " set name", nj)
		this._name = this.mcid + "_" + nj
	}
	get name()
	{
		return this._name
	}
	//<debug>
	set visible(v)
	{

		if (this.inuse === false && v && !super.visible)
		{
			console.warn("Movieclip ", this.name, " is not in use, but is being set to visible")
		}
		super.visible = v
		/*if (v)
		{
			this.name = this.name
		}*/
	}
	get visible()
	{
		return super.visible
	}
	//</debug>

	constructor(myTube, name, data, app)
	{
		super()
		mcCount++
		this.mcid = mcCount
		this.flashTube = myTube;
		this.data = data;
		this.name = name;
		//this.setName(name)
		this.app = app;
		this.label = name
		this.gluerules = {}
		this._buildFrameLabelMaps()
	}

	/**
	 * Same instance name can swap atlas frames (e.g. snakeFace blinks). Keep the Sprite,
	 * but refresh its texture when the tube sprite type name changes.
	 * @param {import('pixi.js').Sprite} spr
	 * @param {{ type?: string, name?: string }} sprite
	 */
	_syncSpriteTexture(spr, sprite) {
		if (sprite?.type !== "sprite" || !sprite.name || !spr?.texture) return
		if (spr._tubeSpriteName === sprite.name) return
		spr.texture = Texture.from(sprite.name)
		spr._tubeSpriteName = sprite.name
	}

	/**
	 * Builds {@link MovieClip#framelabels} from non-`sound_*` labels only.
	 * `sound_*` labels (including comma-separated pairs like `sound_grabtokena,grabtoken`)
	 * are stored in {@link MovieClip#soundLabelsByFrame} and do not split playable ranges.
	 */
	_buildFrameLabelMaps()
	{
		this.framelabels = {}
		this.soundLabelsByFrame = {}
		var curfl = undefined
		for (var s in this.data)
		{
			var frame = this.data[s]
			if (frame.label == undefined) continue

			const labels = parseFrameLabelString(frame.label)
			const soundLabels = []
			const playableLabels = []
			for (const label of labels)
			{
				if (isSoundLabel(label)) soundLabels.push(label)
				else playableLabels.push(label)
			}

			if (soundLabels.length > 0)
			{
				this.soundLabelsByFrame[s] = soundLabels
			}

			for (const playable of playableLabels)
			{
				if (curfl != undefined)
				{
					curfl.e = Number(s) - 1
				}
				this.framelabels[playable] = { s: Number(s) }
				curfl = this.framelabels[playable]
			}
		}
		if (curfl != undefined)
		{
			curfl.e = this.data.length - 1
		}
	}

	/** @param {number} frameNum */
	_raiseSoundLabelsForFrame(frameNum)
	{
		if (!this.isTicking) return
		const soundLabels = this.soundLabelsByFrame[frameNum]
		if (!soundLabels?.length) return
		for (const soundLabel of soundLabels)
		{
			GameEvents.raise(GameEvents.events.FLASH_TUBE_SOUND, {
				soundLabel,
				clipName: this._name,
				frame: Number(frameNum),
				playLabel: this.curPlayLabel?.label,
			})
		}
	}
	get numFrames()
	{
		return this.data.length
	}
	tintWildcard(prefixname, color, onSpriteType)
	{
		this.tintWildcards[prefixname] = {color: color, onSpriteType: onSpriteType}
	}
	tintInstance(instancename, color)
	{
		this.tintrules[instancename] = color
	}
	/**
	 * Tint every sprite whose **type name** (frame reference name, e.g. `wing1`) matches
	 * `typeName` exactly. Applied after {@link tintrules}/{@link tintWildcards}, so it can override them.
	 */
	tintSpriteType(typeName, color)
	{
		this.tintSpriteTypeRules[typeName] = color
	}
	/**
	 * Tint every sprite whose **type name** contains the substring `prefixname`.
	 * Like {@link tintSpriteType} but does a substring match, mirroring how {@link tintWildcards} works
	 * but always operating on sprite type names.
	 */
	tintSpriteTypeWildcard(prefixname, color)
	{
		this.tintSpriteTypeWildcards[prefixname] = {color: color}
	}
	/**
	 * Tint sprites inside a nested subsequence clip (e.g. `headfeather1` on the bird).
	 * `typeName` is the texture name used in the child clip (e.g. `headfeather1.png`).
	 */
	tintSubsequenceSpriteType(subsequenceName, typeName, color)
	{
		if (!this.tintSubsequenceSpriteTypeRules[subsequenceName]) {
			this.tintSubsequenceSpriteTypeRules[subsequenceName] = {}
		}
		this.tintSubsequenceSpriteTypeRules[subsequenceName][typeName] = color
		const child = this.spritecache[subsequenceName]
		if (child?.setFrame) {
			this._applyTintRulesToSubsequenceClip(subsequenceName, child)
		}
	}
	_applyTintRulesToSubsequenceClip(subsequenceName, childMc)
	{
		const rules = this.tintSubsequenceSpriteTypeRules[subsequenceName]
		if (!rules || !childMc?.setFrame) return
		for (const typeName in rules) {
			childMc.tintSpriteType(typeName, rules[typeName])
		}
		childMc.setFrame(childMc.curframe ?? 0)
	}
	setVisibility(instancename, visible)
	{
		this.visibilityrules[instancename] = visible
		this.setFrame(this.curframe)
	}
	setChildMcFrame(instancename, frame)
	{
		this.childmcframerules[instancename] = frame
		var spr = this.spritecache[instancename]
		if (spr != undefined)
		{
			spr.setFrame(frame)
		}
		else
		{
			this.setFrame(this.curframe)
		}	
	}

	
	setItemTransformOnInstanceItem(id, itemToPlace, instancename)
	{
		if (this.gluerules[id] == undefined)
		{
			this.gluerules[id] = {}
		}
		this.gluerules[id].item = itemToPlace
		this.gluerules[id].instancename = instancename
		this.setFrame(this.curframe)
	}
	setAllFramesFromItemOnTop(itemName)
	{
		var founditem = false
		var frame = this.data[this.curframe]
		if (frame == undefined) return

		for (let i=0; i<frame.sprites.length; i++)
		{
			var sprdata = frame.sprites[i]
			var idname = sprdata.instancename
			if (idname == itemName || sprdata.name == itemName)
			{
				founditem = true
			}
			if (!founditem) continue
			if (sprdata.type == "sprite")
			{
				this.spritecache[idname].parent.addChild(this.spritecache[idname])
			}
		}
	}

	getRefPoint(instancename)
	{
		var spr = this.spritecache[instancename]
		if (spr == undefined)
		{
			spr = new Container()
			this.spritecache[instancename] = spr
			this.addChild(spr)
		}
		return spr
	}

	getSprite(instancename)
	{
		var spr = this.spritecache[instancename]
		return spr
	}
	getAllSpritesWithPrefix(prefix)
	{
		var ret = []
		for (var sc in this.spritecache)
		{
			var s = this.spritecache[sc]
			if (!s.visible) continue

			if (sc.indexOf(prefix) >= 0) ret.push(s)
		}
		return ret
	}

	setFrameInLabel(label, frame)
	{
		if (this.framelabels[label] == undefined)
		{
			console.error("Label not found: ", label)
			return
		}
		var fl = this.framelabels[label]
		//if (frame < fl.s || frame > fl.e)
		{
			//console.error("Frame out of range: ", frame)
		//	return
		}
		if (frame < 0) frame = 0
		if (frame > (fl.e - fl.s)) frame = fl.e - fl.s
		//if (frame < fl.s) frame = fl.s
		//if (frame > fl.e) frame = fl.e
		//this.curframe = frame
		this.setFrame(fl.s + Math.floor(frame))
	}

	getAllSubMovieClips()
	{
		var ret = []
		for (var frame in this.data)
		{
			var frameData = this.data[frame]
			for (var sprite in frameData.sprites)
			{
				var spriteData = frameData.sprites[sprite]
				if (spriteData.type == "subsequence" && ret.indexOf(spriteData.name) == -1)
				{
					ret.push(spriteData.name)
				}
			}
		}
		return ret;
	}

	setFrameInterpolated(frm)
	{
		var frameNumA = Math.floor(frm)
		var frameNumB = Math.ceil(frm)
		var fraction = frm - frameNumA
		var frameA = this.data[frameNumA]
		var frameB = this.data[frameNumB]

		for (let sc in this.spritecache)
		{
			this.spritecache[sc].visible = false
		}
		for (var g in this.gluerules)
		{
			var gr = this.gluerules[g]
			gr.item.visible = false
		}
		if (!frameA || !frameA.sprites)
		{
			return
		}
		if (!frameB || !frameB.sprites)
		{
			frameB = frameA
			fraction = 0
		}
		for (let i=0; i<frameA.sprites.length; i++)
		{
			var sprite = frameA.sprites[i]
			var idname = sprite.instancename
			if (sprite.type == "refpoint") idname = sprite.name
			var spr = this.spritecache[idname]
			if (spr == undefined)
			{
				if (sprite.type == "sprite")
				{
					spr = new Sprite(Texture.from(sprite.name))
					spr.anchor.set(.5,.5)
					spr._tubeSpriteName = sprite.name
				}
				else if (sprite.type == "refpoint")
				{
					spr = new Container()
					if (sprite.instancename == undefined)
					{
						sprite.instancename = sprite.name
					}
					//console.log("Refpoint created ", sprite.instancename)

				}
				else if (sprite.type == "subsequence")
				{
					spr = this.flashTube.getMovieClip(sprite.name)
					//console.log("Got movieclip ", sprite.name)
					spr.setFrame(0)
					this._applyTintRulesToSubsequenceClip(sprite.name, spr)
					//spr.play()
				}
				this.spritecache[sprite.instancename] = spr
				this.addChild(spr)
			}
			else
			{
				this._syncSpriteTexture(spr, sprite)
			}

			this.addChild(spr)
			if (sprite.type === "subsequence") {
				this._applyTintRulesToSubsequenceClip(sprite.name, spr)
			}
			if (this.tintrules[sprite.instancename] != undefined)
			{
				spr.tint = this.tintrules[sprite.instancename]
			}
			for (var tr in this.tintWildcards)
			{
				console.log("tint the wildcard ", tr)
				var tp = this.tintWildcards[tr]
				if (tp.onSpriteType)
				{
					// check if sprite.name contains the string 
					if (sprite.name.indexOf(tr) >= 0)
					{
						spr.tint = tp.color
					}
				}
				else
				{
					console.error (" tint instance names not implemented ")
				}
				
			}
			if (this.tintSpriteTypeRules[sprite.name] != undefined)
			{
				spr.tint = this.tintSpriteTypeRules[sprite.name]
			}
			for (var tstWc in this.tintSpriteTypeWildcards)
			{
				if (sprite.name && sprite.name.indexOf(tstWc) >= 0)
				{
					spr.tint = this.tintSpriteTypeWildcards[tstWc].color
				}
			}
			if (this.visibilityrules[sprite.instancename] != undefined)
			{
				spr.visible = this.visibilityrules[sprite.instancename]
			}
			else
			{
				spr.visible = true
			}
			if (this.childmcframerules[sprite.instancename] != undefined)
			{
				if (spr.setFrame )
				{
					spr.setFrame(this.childmcframerules[sprite.instancename])
				}
			}
			
			// find frame b's instance
			var spriteB = undefined
			if (frameB != undefined)
			{
				for (var ii in frameB.sprites)
					{
						var findsprite = frameB.sprites[ii]
						if (findsprite.instancename == sprite.instancename)
						{
							spriteB = findsprite
							break
						}
					}
		
			}

			if (spriteB)
			{
				// Prefer destination frame art when instance swaps texture mid-tween.
				if (fraction >= 0.5) this._syncSpriteTexture(spr, spriteB)
				else this._syncSpriteTexture(spr, sprite)
				//var spriteB = frameB.sprites[sprite.instancename]
				// we must interpolate the position, scale, skew, rotation, alpha and zIndex
				var posx = sprite.x + (spriteB.x - sprite.x) * fraction
				var posy = sprite.y + (spriteB.y - sprite.y) * fraction
				var scalex = sprite.scaleX + (spriteB.scaleX - sprite.scaleX) * fraction
				var scaley = sprite.scaleY + (spriteB.scaleY - sprite.scaleY) * fraction
				var skewx = sprite.skewX + (spriteB.skewX - sprite.skewX) * fraction
				var skewy = sprite.skewY + (spriteB.skewY - sprite.skewY) * fraction
				var rotation = sprite.rotation + (spriteB.rotation - sprite.rotation) * fraction
				var alpha = sprite.alpha + (spriteB.alpha - sprite.alpha) * fraction
				var zIndex = sprite.z 
				spr.position.set(posx, posy)
				spr.scale.set(scalex, scaley)
				spr.skew.set(skewx, skewy)
				spr.rotation = rotation
				spr.alpha = alpha
				spr.zIndex = zIndex
			}
			else
			{
				spr.position.set(sprite.x, sprite.y)
				spr.scale.set(sprite.scaleX, sprite.scaleY)
				spr.skew.set(sprite.skewX, sprite.skewY)
				spr.rotation = sprite.rotation
				spr.alpha = sprite.alpha == null ? 1 : sprite.alpha
				spr.zIndex = sprite.z	
			}

			//console.log("SPR name ", sprite.instancename, " visible ", spr.visible)
			
			for (var g in this.gluerules)
			{
				var gr = this.gluerules[g]
				//var found = false
				if (gr.instancename == sprite.name)
				{
					gr.item.visible = spr.visible
					if (!spr.visible) continue
					gr.item.x = spr.x
					gr.item.y = spr.y
					gr.item.visible = true
					gr.item.rotation = spr.rotation
					gr.item.scale.x = spr.scale.x
					gr.item.scale.y = spr.scale.y
					gr.item.skew.x = spr.skew.x
					gr.item.skew.y = spr.skew.y
					

				}
			}
		}
		
	}

	setFrame(framenum) 
	{
		// is framnum a string or a label?
		//console.warn("setframe ", framenum, this.name)
		if (framenum == undefined)
		{
			console.error("Undefined frame number")
			return
		}
		if (typeof(framenum) == "string")
		{
			if (this.framelabels[framenum] == undefined)
			{
				console.error("Frame not found: ", framenum)
				return
			}
			framenum = this.framelabels[framenum].s	
		}
		
		this.curframe = framenum
		var frame = this.data[framenum]
		if (frame == undefined)
		{
			//console.error("Frame not found: ", framenum)
			return
		}
		for (let sc in this.spritecache)
		{
			this.spritecache[sc].visible = false
		}
		for (var g in this.gluerules)
		{
			var gr = this.gluerules[g]
			gr.item.visible = false
		}
		for (let i=0; i<frame.sprites.length; i++)
		{
			var sprite = frame.sprites[i]
			var idname = sprite.instancename
			if (sprite.type == "refpoint") idname = sprite.name
			var spr = this.spritecache[idname]
			if (spr == undefined)
			{
				if (sprite.type == "sprite")
				{
					spr = new Sprite(Texture.from(sprite.name))
					spr.anchor.set(.5,.5)
					spr._tubeSpriteName = sprite.name
				}
				else if (sprite.type == "refpoint")
				{
					spr = new Container()
					if (sprite.instancename == undefined)
					{
						sprite.instancename = sprite.name
					}
					//console.log("Refpoint created ", sprite.instancename)

				}
				else if (sprite.type == "subsequence")
				{
					spr = this.flashTube.getMovieClip(sprite.name)
					//console.log("Got movieclip ", sprite.name)
					spr.setFrame(0)
					this._applyTintRulesToSubsequenceClip(sprite.name, spr)
					//spr.play()
				}
				this.spritecache[sprite.instancename] = spr
				this.addChild(spr)
			}
			else
			{
				this._syncSpriteTexture(spr, sprite)
			}

			this.addChild(spr)
			if (sprite.type === "subsequence") {
				this._applyTintRulesToSubsequenceClip(sprite.name, spr)
			}
			if (this.tintrules[sprite.instancename] != undefined)
			{
				spr.tint = this.tintrules[sprite.instancename]
			}
			for (var tr in this.tintWildcards)
			{
				console.log("tint the wildcard ", tr)
				var tp = this.tintWildcards[tr]
				if (tp.onSpriteType)
				{
					// check if sprite.name contains the string 
					if (sprite.name.indexOf(tr) >= 0)
					{
						spr.tint = tp.color
					}
				}
				else
				{
					console.error (" tint instance names not implemented ")
				}
				
			}
			if (this.tintSpriteTypeRules[sprite.name] != undefined)
			{
				spr.tint = this.tintSpriteTypeRules[sprite.name]
			}
			for (var tstWc in this.tintSpriteTypeWildcards)
			{
				if (sprite.name && sprite.name.indexOf(tstWc) >= 0)
				{
					spr.tint = this.tintSpriteTypeWildcards[tstWc].color
				}
			}
			if (this.visibilityrules[sprite.instancename] != undefined)
			{
				spr.visible = this.visibilityrules[sprite.instancename]
			}
			else
			{
				spr.visible = true
			}
			if (this.childmcframerules[sprite.instancename] != undefined)
			{
				if (spr.setFrame )
				{
					spr.setFrame(this.childmcframerules[sprite.instancename])
				}
			}
			
			spr.position.set(sprite.x, sprite.y)
			spr.scale.set(sprite.scaleX, sprite.scaleY)
			spr.skew.set(sprite.skewX, sprite.skewY)
			spr.rotation = sprite.rotation
			spr.alpha = sprite.alpha == null ? 1 : sprite.alpha
			spr.zIndex = sprite.z
			//console.log("SPR name ", sprite.instancename, " visible ", spr.visible)
			
			for (var g in this.gluerules)
			{
				var gr = this.gluerules[g]
				//var found = false
				if (gr.instancename == sprite.name)
				{
					gr.item.visible = spr.visible
					if (!spr.visible) continue
					gr.item.x = spr.x
					gr.item.y = spr.y
					gr.item.visible = true
					gr.item.rotation = spr.rotation
					gr.item.scale.x = spr.scale.x
					gr.item.scale.y = spr.scale.y
					gr.item.skew.x = spr.skew.x
					gr.item.skew.y = spr.skew.y
					

				}
			}
		}
		//<debug>
		this.label = this.name + " " + framenum
		//</debug>
	}

	playDoneCallback = undefined
	play(callbackOnDone)
	{
		this.curPlayLabel = undefined
		this.playDoneCallback = callbackOnDone
		this.startTicking()
	}

	curPlayLabel = undefined
	playLabel(label, callbackOnDone, reverse)
	{
		//console.warn("Play label ", label)
		if (isSoundLabel(label))
		{
			console.error("Cannot playLabel on sound sync label: ", label)
			return
		}
		if (this.framelabels[label] == undefined)
		{
			console.error("Label not found: ", label)
			return
		}
		this.curPlayLabel = this.framelabels[label]
		this.curPlayLabel.label = label
		this.curframe = reverse ? this.curPlayLabel.e : this.curPlayLabel.s
		this.playDoneCallback = callbackOnDone
		this.startTicking()
		this.playReverse = reverse != undefined ? reverse : false
		this.setFrame(this.curframe)
		this._raiseSoundLabelsForFrame(this.curframe)
		//this.play()
	}
	playRange(startFrame, endFrame, callbackOnDone, reverse)
	{
		this.curPlayLabel = undefined
		this.playDoneCallback = callbackOnDone
		this.startTicking()
		this.playReverse = reverse != undefined ? reverse : false
		this.setFrame(startFrame)
		this.playRangeStartFrame = startFrame
		this.playRangeEndFrame = endFrame
	}

	stop()
	{
		
		this.stopTicking()
	}
	startTicking()
	{
		if (!this.isTicking)
		{
			tubeManager.addMovieClip(this)
			this.isTicking = true
			//console.warn("Starting ticking ", this.name)
			/*/this.boundTick = this.tick.bind(this);
			this.app.ticker.add(this.boundTick) //this.tick.bind(this))	
			this.isTicking = true
			*/
		}

	}

	stopTicking()
	{
		if (this.isTicking)
		{
			tubeManager.removeMovieClip(this)
			this.isTicking = false
			for (var sc in this.spritecache)
			{
				if (this.spritecache[sc].stopTicking)
				{
					this.spritecache[sc].stopTicking()
				}
			}
			/*
			this.app.ticker.remove(this.boundTick)
			this.boundTick = undefined
			this.isTicking = false
			*/
		}
	}

	destroy(options)
	{
		this.stopTicking()
		for (var sc in this.spritecache)
		{
			if (this.spritecache[sc].parent)
			{
				this.spritecache[sc].parent.removeChild(this.spritecache[sc])
			}
			this.spritecache[sc].destroy()
				
		}
		this.spritecache = {}
		super.destroy(options)
	}

	/*(options)
	{
		this.stopTicking()
		for (var sc in this.spritecache)
		{
			if (this.spritecache[sc].parent)
				this.spritecache[sc].parent.removeChild(this.spritecache[sc])
		}
		//super.destroy(options)
	}
*/
	get isPlaying()
	{
		return this.isTicking
	}

	getNumFramesInLabel(label)
	{
		if (this.framelabels[label] == undefined)
		{
			console.error("Label not found: ", label)
			return 0
		}
		var fl = this.framelabels[label]
		return fl.e - fl.s + 1
	}
	tickInterpolated(delta)
	{
		this.time += delta
		var frm = this.curframe
		//this.setFrame(this.curframe)
		
		
		/*if (this.curPlayLabel != undefined)
		{
			//console.log("Frame ", this.curPlayLabel.label, this.curframe, this.curPlayLabel.s, this.curPlayLabel.e, this.time)
		}*/
		let firePlayDone = false
		while (this.time >= 1/this.framerate)
		{
			if (this.playReverse)
			{
				this.curframe--
			}
			else
			{
				this.curframe++
			}
			this.time -= 1/this.framerate
			this._raiseSoundLabelsForFrame(this.curframe)
			
			var endFrame = 0
			var startFrame = 0
			if (this.playReverse )
			{
				endFrame = this.curPlayLabel != undefined ? this.curPlayLabel.s : this.playRangeEndFrame != undefined ? this.playRangeEndFrame : 0
				startFrame = this.curPlayLabel != undefined ? this.curPlayLabel.e : this.playRangeStartFrame != undefined ? this.playRangeStartFrame : this.data.length
			}
				
			else
			{
				endFrame = this.curPlayLabel != undefined ? this.curPlayLabel.e : this.playRangeEndFrame != undefined ? this.playRangeEndFrame : this.data.length
				startFrame = this.curPlayLabel != undefined ? this.curPlayLabel.s : this.playRangeStartFrame != undefined ? this.playRangeStartFrame : 0
			}
				
			
			//console.log("endFrame", endFrame,  this.curPlayLabel)
			if ( (! this.playReverse && this.curframe >= endFrame)  || (this.playReverse && this.curframe <= endFrame))
			{
				if (this.looping)
				{
					this.curframe = startFrame
					this._raiseSoundLabelsForFrame(this.curframe)
					firePlayDone = true
				}
				else
				{
					//this.curframe = 0
					this.stopTicking()

					if (this.playDoneCallback != undefined)
					{
						firePlayDone = true
						
					}
				}
			}
		}

		var frm = this.curframe
		var fraction = this.time / (1/this.framerate)
		if (this.playReverse) frm -= fraction
		else frm += fraction

		//console.log("Set frame ", frm)
		this.setFrameInterpolated(frm)



		if (firePlayDone && this.playDoneCallback)
		{
			this.playRangeStartFrame = undefined
			this.playRangeEndFrame = undefined
			this.playDoneCallback()
		}
	}

	tick(delta)
	{
		//delta = delta.deltaTime
		//console.log("tick", delta)
		if (!this.visible || this.parent == undefined) 
		{
			//console.log("Movieclip not visible ", this.name)
			this.stopTicking()
		}
	
		if (this.interpolate)
		{
			this.tickInterpolated(delta)
			return
		}

		
		this.time += delta
		var frm = this.curframe
		/*if (this.curPlayLabel != undefined)
		{
			//console.log("Frame ", this.curPlayLabel.label, this.curframe, this.curPlayLabel.s, this.curPlayLabel.e, this.time)
		}*/
		let firePlayDone = false
		while (this.time >= 1/this.framerate)
		{
			if (this.playReverse)
			{
				this.curframe--
			}
			else
			{
				this.curframe++
			}
			this.time -= 1/this.framerate
			this._raiseSoundLabelsForFrame(this.curframe)
			
			var endFrame = 0
			var startFrame = 0
			if (this.playReverse )
			{
				endFrame = this.curPlayLabel != undefined ? this.curPlayLabel.s : this.playRangeEndFrame != undefined ? this.playRangeEndFrame : 0
				startFrame = this.curPlayLabel != undefined ? this.curPlayLabel.e : this.playRangeStartFrame != undefined ? this.playRangeStartFrame : this.data.length
			}
				
			else
			{
				endFrame = this.curPlayLabel != undefined ? this.curPlayLabel.e : this.playRangeEndFrame != undefined ? this.playRangeEndFrame : this.data.length
				startFrame = this.curPlayLabel != undefined ? this.curPlayLabel.s : this.playRangeStartFrame != undefined ? this.playRangeStartFrame : 0
			}
				
			
			//console.log("endFrame", endFrame,  this.curPlayLabel)
			if ( (! this.playReverse && this.curframe >= endFrame)  || (this.playReverse && this.curframe <= endFrame))
			{
				if (this.looping)
				{
					this.curframe = startFrame
					this._raiseSoundLabelsForFrame(this.curframe)
					firePlayDone = true
				}
				else
				{
					//this.curframe = 0
					this.stopTicking()

					if (this.playDoneCallback != undefined)
					{
						firePlayDone = true
						
					}
				}
			}
		}
		if (frm != this.curframe && (this.curPlayLabel == undefined || (frm >= this.curPlayLabel.s && frm <= this.curPlayLabel.e)))
		{
			
			this.setFrame(this.curframe)
			//if (this.curPlayLabel 	)
			//{
			//	console.log("Frame ", this.curframe, this.curPlayLabel.s, this.curPlayLabel.e)
			//}
		}

		if (firePlayDone && this.playDoneCallback)
		{
			this.playRangeStartFrame = undefined
			this.playRangeEndFrame = undefined
			this.playDoneCallback()
		}
		
	}
}

window.MovieClip = MovieClip