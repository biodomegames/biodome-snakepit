import { Application } from 'pixi.js';
import { Preloader} from './dome/preloader.js'
import { mainApp } from './mainpixi.js'



export const mainPreloader = {
	preloader: undefined,

	initialize: (onPreloaderReady, onProgress) => 
	{
		const preloader = new Preloader(mainApp)
		window.preloader = preloader
		mainPreloader.preloader = preloader
		preloader.onProgress = onProgress
		mainApp.stage.addChild(preloader)

		preloader.preloadSelfAndShow().then(() => {
			console.log("Preloader finished")
			if (onPreloaderReady) onPreloaderReady()
		})
	},
	resize: () => {
		mainPreloader.preloader && mainPreloader.preloader.resize()
	}
}