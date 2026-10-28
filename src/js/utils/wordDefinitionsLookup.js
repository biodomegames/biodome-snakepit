/**
 * Loads word explanations from bundled JSON (`web/word-definitions/<slug>.json`), produced by levelgen.
 * Shows one random definition; prefixes with "Noun:" or "Verb:" when that sense is tagged as noun or verb.
 *
 * @param {string} word — letters only (caller normalizes casing)
 * @param {AbortSignal} [signal]
 * @param {string} [avoidText] Previously shown definition text for this word; if possible, pick another.
 * @returns {Promise<string>} Human-readable definition text for the dialog
 */
import { wordToDefinitionFilename } from "./wordDefinitionFilename.js"

/**
 * @typedef {{ partOfSpeech: string, text: string }} TaggedDefinition
 */

/**
 * @param {unknown} data
 * @returns {TaggedDefinition[]}
 */
function taggedDefinitionsFromCachePayload(data) {
	if (!data || typeof data !== "object") return []
	const meanings = /** @type {{ meanings?: unknown }} */ (data).meanings
	if (!Array.isArray(meanings)) return []
	/** @type {TaggedDefinition[]} */
	const out = []
	for (const m of meanings) {
		if (!m || typeof m !== "object") continue
		const posRaw =
			typeof /** @type {{ partOfSpeech?: unknown }} */ (m).partOfSpeech === "string"
				? String(/** @type {{ partOfSpeech: string }} */ (m).partOfSpeech).trim()
				: ""
		const partOfSpeech = posRaw || "unknown"
		const arr = /** @type {{ definitions?: unknown }} */ (m).definitions
		if (!Array.isArray(arr)) continue
		for (const d of arr) {
			const text =
				d && typeof d === "object" && typeof /** @type {{ definition?: unknown }} */ (d).definition === "string"
					? String(/** @type {{ definition: string }} */ (d).definition).trim()
					: ""
			if (text) out.push({ partOfSpeech, text })
		}
	}
	return out
}

/**
 * One random definition; adds "Noun:" / "Verb:" when that sense’s partOfSpeech matches.
 *
 * @param {unknown} data
 * @param {string} [avoidText]
 * @returns {string}
 */
function formatSingleRandomDefinition(data, avoidText) {
	const tagged = taggedDefinitionsFromCachePayload(data)
	if (!tagged.length) return ""
	let pool = tagged
	if (avoidText && tagged.length > 1) {
		const trimmedAvoid = avoidText.trim()
		const filtered = tagged.filter((d) => {
			const posLower = d.partOfSpeech.toLowerCase()
			const label = posLower === "noun" || posLower === "verb" ? `${posLower.charAt(0).toUpperCase()}${posLower.slice(1)}: ${d.text}` : d.text
			return label !== trimmedAvoid
		})
		if (filtered.length) pool = filtered
	}
	const pick = pool[Math.floor(Math.random() * pool.length)]
	const posLower = pick.partOfSpeech.toLowerCase()
	if (posLower === "noun" || posLower === "verb") {
		const label = posLower.charAt(0).toUpperCase() + posLower.slice(1)
		return `${label}: ${pick.text}`
	}
	return pick.text
}

/**
 * @param {string} word
 * @param {AbortSignal} [signal]
 * @param {string} [avoidText]
 * @returns {Promise<string>}
 */
export async function loadWordDefinitionFromCache(word, signal, avoidText) {
	const base = wordToDefinitionFilename(word)
	const cacheUrl = `./web/word-definitions/${base}.json`

	const res = await fetch(cacheUrl, { signal })
	if (!res.ok) {
		if (res.status === 404) throw new Error("No definition saved for this word yet.")
		throw new Error("Could not load definition.")
	}

	let data
	try {
		data = await res.json()
	} catch {
		throw new Error("Could not read definition file.")
	}

	if (data && typeof data === "object" && /** @type {{ error?: string }} */ (data).error === "not_found") {
		throw new Error("No definition saved for this word yet.")
	}

	const text = formatSingleRandomDefinition(data, avoidText)
	if (!text.trim()) throw new Error("No definition saved for this word yet.")
	return text
}
