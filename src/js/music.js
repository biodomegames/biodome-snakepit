
import { Howl } from "howler"
import music from "../s/music.mp3"

import { GameEvents } from "./gameevents.js"
import { newTween } from "./dome/Tween.js"
import { BIODOME_MUSIC_HOWL_FLAG } from "./soundlibrary.js"

const MUSIC_VOLUME = .25
/** Silence between the end of a track and the next play. */
const MUSIC_RESTART_PAUSE_SEC = 15

const TRACKS = [music]

function shuffleInPlace(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

/** Resolved URLs for the preloader (Vite emits hashed paths in production). */
export function getMusicAssetsForPreload() {
	return [...TRACKS]
}

export class MusicManager	
{
	curMusic = undefined
	/** performance.now() when the next track should start; 0 = not waiting. */
	playNextAt = 0
	
	constructor()
	{
		// set up a slow tick every 1 second
		this.slowTick()
		// create a playlist
		this.generatePlaylist()
		GameEvents.addListener(GameEvents.events.AD_STARTED, () => {
			if (!this.isMuted)
			{
				this.wasPlayingBeforeMute = true
			}
			this.mute  = true
		})
		GameEvents.addListener(GameEvents.events.AD_COMPLETED, () => {
			if (this.wasPlayingBeforeMute)
			{
				this.mute = false
			}
		})
	}

	generatePlaylist()
	{
		this.playlist = []
		for (let cycle = 0; cycle < 6; cycle++) {
			const round = [...TRACKS]
			shuffleInPlace(round)
			for (const url of round) {
				this.playlist.push(url)
			}
		}
	}

	isMuted = false

	get mute()
	{
		return this.isMuted;
	}
	set mute(value)
	{
		
		this.isMuted = value;
		//console.log("ISMUTED: ", this.isMuted)
		if (this.curMusic)
		{
			this.curMusic.volume( !this.isMuted  ? MUSIC_VOLUME : 0)

		}
	}

	createMusic()
	{
		var musicErrorCount = 0
		if (this.playlist.length == 0)
		{
			this.generatePlaylist()
		}
		var mus = this.playlist.shift()
		this.playNextAt = 0
		this.music = new Howl({
			src: [mus],
			html5: false,
			loop: false,
			autoplay: true,
			onplayerror: function() {
				if (musicErrorCount > 0) return
				musicErrorCount++
				console.log("MUSIC pkay error")
				this.music.once('unlock', function() {
					console.log("MUSIC unlocked")
					this.music.play();
				}.bind(this));
				}.bind(this),
			onplay: () => {
				this.playNextAt = 0
			},
			onend: () => {
				this.playNextAt = performance.now() + MUSIC_RESTART_PAUSE_SEC * 1000
			},
		});
		this.music[BIODOME_MUSIC_HOWL_FLAG] = true
		this.curMusic = this.music

		this.music.volume( !this.isMuted  ? MUSIC_VOLUME : 0)
	}

	slowTick()
	{
		if (this.curMusic && this.playNextAt > 0 && performance.now() >= this.playNextAt)
		{
			this.playNextAt = 0
			this.createMusic()
		}
		newTween(this, {}, 1).onDone(()=>{
			this.slowTick()
		})
	}
}
