import { Howl, Howler } from "howler"

/** Tag music Howls so {@link setSfxMuted} leaves them alone. */
export const BIODOME_MUSIC_HOWL_FLAG = "_isBiodomeMusic"

/** Add gameplay sounds here. UI clicks live in `dome/ui_sounds.js`. */
export const SoundMap = {}

let sfxMuted = false
let howlPlayPatched = false

function ensureHowlPlayPatch() {
	if (howlPlayPatched) return
	howlPlayPatched = true
	const originalPlay = Howl.prototype.play
	Howl.prototype.play = function (spriteOrId) {
		if (sfxMuted && !this[BIODOME_MUSIC_HOWL_FLAG]) return
		return originalPlay.call(this, spriteOrId)
	}
}

export function isSfxMuted() {
	return sfxMuted
}

/**
 * Mute or unmute all non-music Howls. Does not use global {@link Howler.mute},
 * so music can keep playing when sound effects are off.
 * @param {boolean} muted
 */
export function setSfxMuted(muted) {
	ensureHowlPlayPatch()
	sfxMuted = !!muted
	Howler.mute(false)
	for (const h of Howler._howls) {
		if (h[BIODOME_MUSIC_HOWL_FLAG]) continue
		h.mute(sfxMuted)
	}
}

export function getSoundAssetsForPreload() {
	return []
}

export class SoundLibrary {
	constructor() {
		ensureHowlPlayPatch()
	}

	startPreload() {}

	play() {}
}
