import clickdown1 from "../../s/ui button down 01.mp3"
import clickdown2 from "../../s/ui button down 02.mp3"
import clickup1 from "../../s/ui button up 01.mp3"
import clickup2 from "../../s/ui button up 02.mp3"
import toggleon1 from "../../s/ui toggle on 01.mp3"
import toggleon2 from "../../s/ui toggle on 02.mp3"
import toggleoff1 from "../../s/ui toggle off 01.mp3"
import toggleoff2 from "../../s/ui toggle off 02.mp3"
import dialogOpen1 from "../../s/ui dialog open 01.mp3"
import dialogOpen2 from "../../s/ui dialog open 02.mp3"
import dialogClose1 from "../../s/ui dialog close 01.mp3"
import dialogClose2 from "../../s/ui dialog close 02.mp3"

export const UISounds = {
	clickdown1: [clickdown1, clickdown2],
	clickup1: [clickup1, clickup2],
	toggleon1: [toggleon1, toggleon2],
	toggleoff1: [toggleoff1, toggleoff2],
	dialogOpen: [dialogOpen1, dialogOpen2],
	dialogClose: [dialogClose1, dialogClose2],
}

/** One Howl per file. A nested array is a set of variations, not format fallbacks. */
export function soundSrcList(list) {
	const out = []
	if (!list) return out
	for (const entry of list) {
		if (Array.isArray(entry)) out.push(...entry)
		else if (entry) out.push(entry)
	}
	return out
}
