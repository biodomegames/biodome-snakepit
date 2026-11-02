import { Howl } from "howler"
import { isSfxMuted } from "../soundlibrary.js"

import snakeStart01 from "../../s/snake start 01.mp3"
import snakeStart02 from "../../s/snake start 02.mp3"
import slither01 from "../../s/slither 01.mp3"
import slither02 from "../../s/slither 02.mp3"
import park01 from "../../s/park 01.mp3"
import park02 from "../../s/park 02.mp3"
import bonk01 from "../../s/bonk 01.mp3"
import bonk02 from "../../s/bonk 02.mp3"
import slideBack01 from "../../s/slide back 01.mp3"
import slideBack02 from "../../s/slide back 02.mp3"
import snakeLeave01 from "../../s/snake leave 01.mp3"
import snakeLeave02 from "../../s/snake leave 02.mp3"
import snakeComplete01 from "../../s/snake complete 01.mp3"
import snakeComplete02 from "../../s/snake complete 02.mp3"
import antWalkLoop from "../../s/ant walk loop.mp3"
import antScuttle01 from "../../s/ant scuttle 01.mp3"
import antScuttle02 from "../../s/ant scuttle 02.mp3"
import antSit01 from "../../s/ant sit 01.mp3"
import antSit02 from "../../s/ant sit 02.mp3"
import squash01 from "../../s/squash 01.mp3"
import squash02 from "../../s/squash 02.mp3"
import anteaterWalkLoop from "../../s/anteater walk loop.mp3"
import anteaterSnuffle01 from "../../s/anteater snuffle 01.mp3"
import anteaterSnuffle02 from "../../s/anteater snuffle 02.mp3"
import anteaterChomp01 from "../../s/anteater chomp 01.mp3"
import anteaterChomp02 from "../../s/anteater chomp 02.mp3"
import anteaterGulp from "../../s/anteater gulp.mp3"
import laneClick01 from "../../s/lane click 01.mp3"
import laneClick02 from "../../s/lane click 02.mp3"
import pitCleared01 from "../../s/pit cleared 01.mp3"
import pitCleared02 from "../../s/pit cleared 02.mp3"
import levelComplete from "../../s/levelcomplete.mp3"
import climb01 from "../../s/climb 01.mp3"
import climb02 from "../../s/climb 02.mp3"
import gameOver01 from "../../s/game over 01.mp3"
import gameOver02 from "../../s/game over 02.mp3"
import signThud01 from "../../s/sign thud 01.mp3"
import signThud02 from "../../s/sign thud 02.mp3"
import restart from "../../s/restart.mp3"
import logoIntro from "../../s/logo intro.mp3"
import critter01 from "../../s/critter 01.mp3"
import critter02 from "../../s/critter 02.mp3"

/** @type {Record<string, Howl[]>} */
const banks = {
	snakeStart: howls([snakeStart01, snakeStart02]),
	slither: howls([slither01, slither02], { loop: true, volume: 0.45 }),
	park: howls([park01, park02]),
	bonk: howls([bonk01, bonk02]),
	slideBack: howls([slideBack01, slideBack02]),
	snakeLeave: howls([snakeLeave01, snakeLeave02]),
	snakeComplete: howls([snakeComplete01, snakeComplete02]),
	antWalk: howls([antWalkLoop], { loop: true, volume: 0.4 }),
	antScuttle: howls([antScuttle01, antScuttle02], { volume: 0.7 }),
	antSit: howls([antSit01, antSit02], { volume: 0.75 }),
	squash: howls([squash01, squash02]),
	anteaterWalk: howls([anteaterWalkLoop], { loop: true, volume: 0.55 }),
	snuffle: howls([anteaterSnuffle01, anteaterSnuffle02]),
	chomp: howls([anteaterChomp01, anteaterChomp02]),
	gulp: howls([anteaterGulp]),
	lane: howls([laneClick01, laneClick02], { volume: 0.6 }),
	pitCleared: howls([pitCleared01, pitCleared02, levelComplete]),
	climb: howls([climb01, climb02]),
	gameOver: howls([gameOver01, gameOver02]),
	signThud: howls([signThud01, signThud02]),
	restart: howls([restart]),
	logo: howls([logoIntro]),
	critter: howls([critter01, critter02], { volume: 0.35 }),
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
	if (!howl) return
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
