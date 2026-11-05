/** UI SFX banks. Empty until the matching files are restored under `src/s/`. */
export const UISounds = {
	clickdown1: [],
	clickup1: [],
	toggleon1: [],
	toggleoff1: [],
	dialogOpen: [],
	dialogClose: [],
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
