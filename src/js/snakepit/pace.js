/** Level 5 and later use the authored timings. Earlier levels stretch them. */
const FULL_PACE_LEVEL = 5
/** How much longer a level-1 action takes compared with level 5. */
const LEVEL_ONE_SCALE = 1.5

/**
 * Duration multiplier for a 1-based level. 1.5 on level 1, 1 from level 5 on.
 * @param {number} level
 */
export function durationScaleForLevel(level) {
	const n = Math.max(1, level | 0)
	const t = Math.min(1, (n - 1) / (FULL_PACE_LEVEL - 1))
	return LEVEL_ONE_SCALE + (1 - LEVEL_ONE_SCALE) * t
}
