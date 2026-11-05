import { Howl } from "howler"
import { isSfxMuted } from "../soundlibrary.js"

import snakeStart01 from "../../s/snake start 01.mp3"
import snakeStart02 from "../../s/snake start 02.mp3"
import slither01 from "../../s/slither 01.mp3"
import slither02 from "../../s/slither 02.mp3"
import bonk01 from "../../s/bonk 01.mp3"
import bonk02 from "../../s/bonk 02.mp3"
import slideBack01 from "../../s/slide back 01.mp3"
import antWalkLoop from "../../s/ant walk loop.mp3"
import squash01 from "../../s/squash 01.mp3"
import squash02 from "../../s/squash 02.mp3"
import laneClick01 from "../../s/lane click 01.mp3"
import laneClick02 from "../../s/lane click 02.mp3"
import pitCleared01 from "../../s/pit cleared 01.mp3"
import pitCleared02 from "../../s/pit cleared 02.mp3"
import levelComplete from "../../s/levelcomplete.mp3"
import signThud01 from "../../s/sign thud 01.mp3"
import signThud02 from "../../s/sign thud 02.mp3"

/** @type {Record<string, Howl[]>} */
const banks = {
	snakeStart: howls([snakeStart01, snakeStart02]),
	slither: howls([slither01, slither02], { loop: true, volume: 0.45 }),
	park: howls([]),
	bonk: howls([bonk01, bonk02]),
	slideBack: howls([slideBack01]),
	snakeLeave: howls([]),
	snakeComplete: howls([]),
	antWalk: howls([antWalkLoop], { loop: true, volume: 0.4 }),
	antScuttle: howls([]),
	antSit: howls([]),
	squash: howls([squash01, squash02]),
	anteaterWalk: howls([]),
	snuffle: howls([]),
	chomp: howls([]),
	gulp: howls([]),
	lane: howls([laneClick01, laneClick02], { volume: 0.6 }),
	/** Pit empty — all snakes have left the board. */
	pitCleared: howls([pitCleared01, pitCleared02]),
	/** Last snake left the lane and the level is fully cleared. */
	levelComplete: howls([levelComplete]),
	climb: howls([]),
	gameOver: howls([]),
	signThud: howls([signThud01, signThud02]),
	restart: howls([]),
	logo: howls([]),
	critter: howls([]),
}

/** @type {Map<string, number>} */
const lastIndex = new Map()
/** @type {Map<string, { howl: Howl, id: number, n: number }>} */
const loops = new Map()

function howls(srcs, { loop = false, volume = 0.85 } = {}) {
	return srcs.map((src) => new Howl({ src: [src], loop, volume, preload: true }))
}

function pick(name) {
	const list = banks[name]
	if (!list?.length) return null
	let i = Math.floor(Math.random() * list.length)
	if (list.length > 1 && i === lastIndex.get(name)) i = (i + 1) % list.length
	lastIndex.set(name, i)
	return list[i]
}

export function play(name) {
	if (isSfxMuted()) return null
	const howl = pick(name)
	if (!howl) return null
	const id = howl.play()
	return { howl, id }
}

/** One shared loop while at least one caller still needs it. */
export function loopAdd(name) {
	const slot = loops.get(name)
	if (slot) {
		slot.n++
		return
	}
	if (isSfxMuted()) {
		loops.set(name, { howl: null, id: 0, n: 1 })
		return
	}
	const howl = pick(name)
	if (!howl) {
		// Keep a mute placeholder so loopRemove still balances.
		loops.set(name, { howl: null, id: 0, n: 1 })
		return
	}
	loops.set(name, { howl, id: howl.play(), n: 1 })
}

export function loopRemove(name) {
	const slot = loops.get(name)
	if (!slot) return
	slot.n--
	if (slot.n > 0) return
	if (slot.howl && slot.id != null) slot.howl.stop(slot.id)
	loops.delete(name)
}
