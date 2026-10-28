import { AnalyticsBase } from "./analytics_base.js";

export class AnalyticsFrvr extends AnalyticsBase
{
	constructor() {
		super()
	}

	levelStart(levelNumber, levelName) {
		//<debug>
		console.log("Analytics FRVR: levelStart", levelNumber, levelName)
		//</debug>
		if (!FRVR.tracker) return
		FRVR.tracker.levelStart('my_level_1');
	}

	levelEnd(levelNumber, success, levelName, score) {
		//<debug>
		console.log("Analytics FRVR: levelEnd", levelNumber, success, levelName, score)
		//</debug>
		if (!FRVR.tracker) return
		FRVR.tracker.levelEnd(levelNumber, success, levelName, score)
	}

	ftue(step, name) {
		//<debug>
		console.log("Analytics FRVR: ftue", step, name)
		//</debug>
		if (!FRVR.tracker) return
		FRVR.tracker.ftue(step, name)
	}

	ftueUnordered(step, name) {
		//<debug>
		console.log("Analytics FRVR: ftueUnordered", step, name)
		//</debug>
		if (!FRVR.tracker) return
		FRVR.tracker.ftueUnordered(step, name)
	}



}