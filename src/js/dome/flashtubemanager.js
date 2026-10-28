export class FlashTubeManager
{
	constructor()
	{
		this.flashTubes = []
		this.movieClips = []
	}

	addMovieClip(movieClip)
	{
		this.movieClips.push(movieClip)

	}
	removeMovieClip(movieClip)
	{
		var index = this.movieClips.indexOf(movieClip)
		if (index == -1)
		{
			return false
		}
		if (index < this.movieClips.length - 1)
		{
			this.movieClips[index] = this.movieClips[this.movieClips.length - 1]
		}
		this.movieClips.pop()
		return true
		
	}

	tick(deltatime)
	{
		for (var i = 0; i < this.movieClips.length; i++)
		{
			this.movieClips[i].tick(deltatime)
		}
	}
}

export const tubeManager = new FlashTubeManager()