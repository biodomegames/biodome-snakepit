
import '../../style.css'


import { mainPixi } from './mainpixi.js';
import { mainPreloader } from './mainpreloader.js';
var mainClass = undefined

//<frvr>
let frvrInit = "prod"
//<debug>
frvrInit = ""
//</debug>
//@ts-ignore
FRVR.init(frvrInit);

FRVR.bootstrapper.init().then(function() {
	return loadGame((progress)=>{
	    // call setProgress as many times as needed to update progress bar		
		FRVR.bootstrapper.setProgress(progress);
	})
	
}).then(function() {
	FRVR.bootstrapper.complete();
	console.log("Game loaded")
	mainClass.resize()
	//window.addEventListener('resize', () => {
	//	mainClass.refreshGameSize();
	//});
});

//var self = this

function loadGame(onProgress) {
	return new Promise(function(resolve, reject) {
		// load game assets
		mainPixi.initialize(() => {
			mainPreloader.initialize(async () => {
				const { MainClass } = await import('./mainclass.js');
				mainClass = new MainClass(mainPixi, ()=>{
					
					mainClass.createGame(()=>
					{
						//<debug>
						console.log("Game created")
						//</debug>
						resolve()
					})
				})
				
				
			}, (progress)=>{
				onProgress && onProgress(progress);
			})
		}, (deltaTime, now)=>{ 
			// TICK functuion
			//console.log("Tick", deltaTime, now)
			if (mainClass) mainClass.mainTick(deltaTime, now)
		}, ()=>{
			// RESIZE function
			//mainPixi.refreshGameSize()
			//console.log("Resize")
			mainPreloader.resize()
			if (mainClass) mainClass.resize()
		});
	})
	
}

//</frvr>

//<web,ios,google>
console.log("---------- Initializing Pixi application")
mainPixi.initialize(() => {
	// INITIALIZE function
	//<debug>
	
	//</debug>
	//console.log("Pixi application initialized")
	console.log("---------- Initializing Preloader")
	mainPreloader.initialize(async () => {
		console.log("---------- import the mainclass")
		const { MainClass } = await import('./mainclass.js');
		mainClass = new MainClass(mainPixi, (mainClass)=>{
			console.log("---------- mainclass created")
			mainClass.createGame(()=>
			{
				console.log("---------- Game created")
			})
			
			
		})

	})
}, (deltaTime, now)=>{ 
	// TICK functuion
	//console.log("Tick", deltaTime, now)
	if (mainClass) mainClass.mainTick(deltaTime, now)
}, ()=>{
	// RESIZE function
	//mainPixi.refreshGameSize()
	//console.log("Resize")
	mainPreloader.resize()
	if (mainClass) mainClass.resize()
});
//</web,ios,google>