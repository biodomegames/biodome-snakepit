import { UI } from "./ui.js"


import { Container } from "pixi.js"
import { TransDef } from "./ui.js"
import { Assets } from "pixi.js"
import { shouldIgnorePreloadAsset, shouldSkipBareFilenamePreload } from "../svg_atlas_preload_helper.js"
//import { UIComponentDefinitions } from "../data_ui_components.js"

import { FlashTube } from "./flashtube.js"
import { ComponentTypes } from "./ui_componenttypes.js"
import progress_bg from '../../g/progressbar_bg.svg'; // rasterize: ignore
import progress_fill from '../../g/progressbar_fill.svg'; // rasterize: ignore
import logo from '../../g/biodome_logo.svg'; // rasterize: ignore
//import { UIComponentDefinitions } from "./data_ui_components.js"

/** Max number of asset loads to run in parallel (per chunk). */
const PRELOAD_CONCURRENCY = 4

export class Preloader extends Container 
{
	app = undefined
	ui = undefined
	dialog = undefined
	isLoadingAssets = false	
	curChunkId = -1
	requireTotalsRefresh = true
	numCompleted = 0
	numTotal = 1
	onProgress = undefined
	/** Number of loads currently in flight. */
	_inFlight = 0
	constructor(app)
	{
		super()
		this.app = app
		this.ui = new UI(app, PreloaderDialogDefinitions, UIComponentDefinitions, this)
	}

	preloadList = []

	preloadSelfAndShow()
	{
		return new Promise((resolve) => {
			var myAssets = this.ui.getAssetsForPreload().filter(
				(item) =>
					typeof item !== 'string' ||
					(!shouldIgnorePreloadAsset(item) && !shouldSkipBareFilenamePreload(item)),
			)
			if (myAssets.length == 0)
			{
				this.showPreloader()
				resolve()
				return
			}
			Assets.load(myAssets).then((textures) => {				
				console.log("Preloadied assets", myAssets)
				this.showPreloader()
				resolve()
				return
			}).catch((error) => {
				console.error("Error loading assets: ", myAssets, error);
			});
			//resolve()
		})
	}

	showPreloader()
	{
		this.dialog = this.ui.displayDialog("preloader", {}, (res) => {
			//console.log("Preloader dialog closed", res)
		})
	}

	addAssetsForPreloading(assetlist, callbackWhenDone)
	{
		var newAssetlist = []
		for (var item of assetlist) {
			if (typeof item === 'string' && shouldIgnorePreloadAsset(item)) continue
			if (typeof item === 'string' && shouldSkipBareFilenamePreload(item)) continue
			newAssetlist.push(item)
		}
		assetlist = newAssetlist

		this.requireTotalsRefresh = true
		var chunk = { list: assetlist, callback: callbackWhenDone, done: false, loadid: 0, completedCount: 0 }
		this.preloadList.push(chunk)

		if (!this.isLoadingAssets)
		{
			this._tryStartLoads()
		}
	}

	/** Returns next (chunk, index) to load, or null. Advances chunk.loadid. */
	_getNextItem() {
		if (this.requireTotalsRefresh) this._refreshTotals()
		if (this.curChunkId < 0) this.curChunkId = 0
		if (this.curChunkId >= this.preloadList.length) return null
		const chunk = this.preloadList[this.curChunkId]
		const list = chunk.list
		if (list.length === 0) {
			this._finishChunk(chunk)
			return this._getNextItem()
		}
		if (chunk.loadid >= list.length) return null
		const index = chunk.loadid
		chunk.loadid++
		return { chunk, index, assetlist: list }
	}

	_refreshTotals() {
		this.numTotal = 0
		this.numCompleted = 0
		for (let i = 0; i < this.preloadList.length; i++) {
			const c = this.preloadList[i]
			const loaded = c.completedCount ?? 0
			this.numTotal += c.list.length
			this.numCompleted += loaded
		}
		this.requireTotalsRefresh = false
	}

	_finishChunk(chunk) {
		chunk.done = true
		if (chunk.callback != undefined) chunk.callback()
		this.curChunkId++
		if (this.curChunkId >= this.preloadList.length) {
			this.isLoadingAssets = false
			this.doneLoading()
		}
	}

	_onAssetLoaded(chunk, index, assetlist) {
		chunk.completedCount = (chunk.completedCount || 0) + 1
		this.numCompleted++
		if (this.onProgress != undefined) this.onProgress(this.numCompleted / this.numTotal)
		if (this.dialog && this.dialog.progressbar) this.dialog.progressbar.progress = (this.numCompleted / this.numTotal) * 100
		if (chunk.completedCount >= assetlist.length) this._finishChunk(chunk)
		this._inFlight--
		this._tryStartLoads()
	}

	_loadOne(entry) {
		const { chunk, index, assetlist } = entry
		const item = assetlist[index]
		const that = this
		const onDone = () => that._onAssetLoaded(chunk, index, assetlist)

		if (typeof item === 'string' && shouldIgnorePreloadAsset(item)) {
			onDone()
			return false
		}
		if (typeof item === 'string' && shouldSkipBareFilenamePreload(item)) {
			onDone()
			return false
		}

    	if (item.xml && item.json) {
			item.tube = new FlashTube(item.xml, item.json, this.app)
			item.tube.init().then(onDone)
		} else if (typeof item === 'string' && /\.mp3([?#]|$)/i.test(item)) {
			fetch(item).then(() => onDone()).catch((error) => {
				console.error("Error preloading audio: ", item, error)
				onDone()
			})
		} else {
			Assets.load(item).then(() => onDone()).catch((error) => {
				console.error("Error loading assets: ", item, error)
				onDone()
			})
		}
		return true
	}

	_tryStartLoads() {
		while (this._inFlight < PRELOAD_CONCURRENCY) {
			const entry = this._getNextItem()
			if (!entry) break

			if (this._loadOne(entry)) {
				this._inFlight++
				this.isLoadingAssets = true
			}
		}
	}

	doneLoading()
	{
		this.ui.closeDialog(this.dialog)
	}

	resize(w,h)
	{
		this.ui.resize(w,h)
	}
}

const PreloaderDialogDefinitions = 
{
	preloader:{
		_setup: 	{halign: "center", valign: "center", appear: 0, disappear: TransDef.FADE, alignOffset: {x:0, y:0}, pos1: {x:0, y:0}, pos2:{x:0, y:0}},		
		
		logoshadow: {type: "image", source: logo, scale: 0.98, usePos: 1, pos1add: {x:0, y:0}, tint: 0x000000, alpha: .3, trans: {x:0, y:8}}, 
		logo: 		{type: "image", source: logo, scale: 1, usePos: 1, pos1add: {x:0, y:140}}, 
		progressbar: {type: "progressbar9", width:300, height:30, trans: {x:-150, y:0}, pos1add: {x:0, y:0}},
		
	},
}


const UIComponentDefinitions = {
	image: {
		//type: "image",
		type: ComponentTypes.IMAGE,
		scale: 1,
		pos: {x:0, y:0},
	},
	progressbar9: {
		type: ComponentTypes.PROGRESSBAR9SLICE,

		bg:{source: progress_bg, left: 25, right: 25, top: 25, bottom: 25},			
		fill: {source: progress_fill, left: 25, right: 25, top: 25, bottom: 25},
		fillpadding: {left: 0, right: 0, top: 0, bottom: 0},
	},
}
