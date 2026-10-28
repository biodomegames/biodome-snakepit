
const SoundMap = {
}



export class SoundLibrary
{
	constructor(options = {})
	{
		// Don't start loading until startPreload() is called (lets you prioritize graphics/code first)
		const preload = options.preload !== undefined ? options.preload : false;
		this._preloadStarted = false;

		for (var snam in SoundMap)
		{
			//console.log("SoundLibrary initialize sound", s)
			var s = SoundMap[snam]
			s.howls = []
			var mastervol = s.mastervol ? s.mastervol : 1
			for (var src of s.sources)
			{
				//console.log("    snd", src.src)
				var vol = (src.vol ? src.vol : 1) * mastervol
				var sound  = new Howl({ src: [src.src], volume: vol, preload })
				s.howls.push(sound)
			}
		}
	}

	/**
	 * Start loading all sounds. Call this when you're ready to allow sound loading
	 * (e.g. after tubes/graphics are ready). If you never call this, sounds will
	 * still load on first play(), but may be delayed.
	 */
	startPreload()
	{
		if (this._preloadStarted) return;
		this._preloadStarted = true;
		for (var snam in SoundMap)
		{
			var s = SoundMap[snam]
			if (s.howls)
				for (var h of s.howls)
					h.load();
		}
	}

	play(name, options)
	{
		//console.log("play sound", name, options)
		if (options && options.delay && !options.noDelay)
		{
			newTween(this,{}, options.delay).onDone(() => {
				options.noDelay = true
				var id = this.play(name, options)
				if (options.onStartedPlaying)
					options.onStartedPlaying(id)
			})
			return
		}
		var s = SoundMap[name]
		if (!s)
		{
			console.error("Sound not found", name)
			return
		}
		var rnd = Math.floor(Math.random() * s.howls.length)
		var id = s.howls[rnd].play()
		var ret = { howl: s.howls[rnd], id: id}
		if (options && options.pan)
			this.pan(options.pan, ret)
		if (options && options.volume)
			this.volume(options.volume, ret)
		//console.log("Playing sound", name, rnd, id)
		return ret
	}

	volume(vol, id)
	{
		if (id)
		{
			id.howl.volume(vol, id.id)
		}
	}

	pan(pan, id)
	{
		if (id)
		{
			id.howl.stereo(pan, id.id)
		}
	}

	stop(id)
	{
		if (id)
		{
			id.howl.stop(id.id)
		}
			
	}
}