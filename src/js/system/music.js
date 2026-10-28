
import music from "../../s/music.mp3"
//import musicshort1 from '../../s/musicS1.mp3';
//import musicshort2 from '../../s/musicS2.mp3';
/*import musicshort3 from '../s/music_short3.mp3';
import musicshort4 from '../s/music_short4.mp3';
import musicshort5 from '../s/music_short5.mp3';
*/
import { GameEvents } from "./gameevents.js"
import { newTween } from "../dome/tween.js"

const MUSIC_VOLUME = .15

export class MusicManager	
{
	curMusic = undefined
	playNextSong = -1
	/** Restored after {@link GameEvents.events.AD_COMPLETED} when we muted for an ad. */
	wasPlayingBeforeMute = false
	
	constructor()
	{
		// set up a slow tick every 1 second
		this.slowTick()
		// create a playlist
		this.generatePlaylist()
		GameEvents.addListener(GameEvents.events.AD_STARTED, () => {
			if (!this.isMuted) {
				this.wasPlayingBeforeMute = true
			}
			this.mute = true
		})
		GameEvents.addListener(GameEvents.events.AD_COMPLETED, () => {
			if (this.wasPlayingBeforeMute) {
				this.mute = false
			}
			this.wasPlayingBeforeMute = false
		})

		GameEvents.addListener(GameEvents.events.GAME_WON, () => {
			return
			if (this.isMuted) return
			this.mute = true
			newTween(this, {}, 5).onDone(() => {
				this.mute = false
			})
		})

		this.createMusic()
	}

	generatePlaylist()
	{
		var shorts = []
		var musics = [music]
		
		// add random music
		var rnd = Math.floor(Math.random() * musics.length)
		this.playlist = [musics[rnd]]
		musics.splice(rnd, 1)
		// add 1 shorts
		
		/*for (var i = 0; i < 1; i++)
		{
			if (shorts.length == 0) continue
			var rnd = Math.floor(Math.random() * shorts.length)
			this.playlist.push(shorts[rnd])
			shorts.splice(rnd, 1)
		}*/
		// add remaining music
		this.playlist.push(...musics)
		// add remaining shorts
		/*
		for (var i = 0; i < shorts.length; i++)
		{
			if (shorts.length == 0) continue
			var rnd = Math.floor(Math.random() * shorts.length)
			this.playlist.push(shorts[rnd])
			shorts.splice(rnd, 1)
		}*/
			
		
		
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
				//console.log("PLAYING MUSIC")
				this.playNextSong = 2
			},
			onend: () => {
				//console.log("ENDING MUSIC")
			},
		});
		this.curMusic = this.music

		this.music.volume( !this.isMuted  ? MUSIC_VOLUME : 0)
	}

	slowTick()
	{
		if ( this.curMusic)
		{
			console.log("TIK ", this.curMusic.playing(), this.playNextSong)
			if (!this.curMusic.playing() && this.playNextSong > 0)
			{
				this.playNextSong --
				if (this.playNextSong == 0)
				{
					this.createMusic()
				}
			}
		}
		newTween(this, {}, 3).onDone(()=>{
			this.slowTick()
		})
	}
}