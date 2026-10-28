/**
 * Terminal “clickable” link via OSC 8 (iTerm2, VS Code, Windows Terminal, WezTerm, many others).
 * Falls back to plain text when not a TTY or when NO_COLOR is set.
 * @see https://gist.github.com/egmontkob/eab271a02d7bf880cb05448651c40b08
 * @param {string} url
 * @param {string} [displayText=url]
 */
export function terminalHyperlink(url, displayText = url) {
	if (!process.stdout.isTTY || process.env.NO_COLOR || process.env.TERM === "dumb") {
		return displayText
	}
	const esc = "\u001b"
	const st = esc + "\\"
	return `${esc}]8;;${url}${st}${displayText}${esc}]8;;${st}`
}
