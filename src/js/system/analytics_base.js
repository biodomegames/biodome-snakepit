
export class AnalyticsBase
{
	constructor() {
	}

	isAvailable() {
		return true
	}
	async start() {
	}

	levelStart(levelNumber, levelName) 
	{
		//<debug>
		console.log("Analytics BASE: levelStart", levelNumber, levelName)
		//</debug>
	}

	levelEnd(levelNumber, success, levelName, score) 
	{
		//<debug>
		console.log("Analytics BASE: levelEnd", levelNumber, success, levelName, score)
		//</debug>
	}

	levelUp(levelNumber, levelName)
	{
		//<debug>
		console.log("Analytics BASE: levelUp", levelNumber, levelName)
		//</debug>
	}

	ftue(step, name)
	{
		//<debug>
		console.log("Analytics BASE: ftue", step, name)
		//</debug>
	}
	ftueUnordered(step, name)
	{
		//<debug>
		console.log("Analytics BASE: ftueUnordered", step, name)
		//</debug>
	}

	trackView(viewName)
	{
		//<debug>
		console.log("Analytics BASE: trackView", viewName)
		//</debug>
	}

	logEvent(eventName, eventData)
	{
		//<debug>
		console.log("Analytics BASE: logEvent", eventName, eventData)
		//</debug>
	}

}