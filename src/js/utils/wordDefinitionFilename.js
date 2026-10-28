/**
 * Stable basename (no extension) for `src/web/word-definitions/<name>.json`.
 * Matches dictionaryapi.dev slug: letters only, lowercase.
 *
 * @param {string} word — any casing; non-letters stripped
 * @returns {string}
 */
export function wordToDefinitionFilename(word) {
	const base = String(word).replace(/[^a-zA-Z]/g, "").toLowerCase()
	return base.length ? base : "_"
}
