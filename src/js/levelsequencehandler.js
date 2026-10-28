
import { DataChapters } from "./data_chapters";

export class LevelSequenceHandler
{
	chaptersIndex = null
	loadedChapterName = null
	async init(onDone)
	{
		try {
			const response = await fetch(`levels/chaptersIndex.json`);
			if (!response.ok) {
				console.error('Failed to load level');
				return null;
			}
			var ret = await response.json();
			this.chaptersIndex = ret;
			//console.log("chaptersIndex", this.chaptersIndex)
			onDone(ret);
		} catch (err) {
			console.error('Error loading cchapters index:', err);
			return -1;
		}
	}

	async loadChapter(chaptername, onDone)
	{
		try {
			var chapter = DataChapters[chaptername]
			
			const response = await fetch("levels/" + chapter.fn);
			if (!response.ok) {
				console.error('Failed to load chapter');
				return null;
			}
			var ret = await response.json();
			this.loadedChapter = ret;
			this.loadedChapterName = chaptername
			//console.log("chapter", this.loadedChapter)
			onDone(ret);
		} catch (err) {
			//console.error('Error loading chapter:', err);
			return -1;
		}
	}

	getLevelObject(absoluteLevelIdx, onDone)
	{
		var chapterIdx = 0;
		var levelIdx = absoluteLevelIdx;
		var neededchapter = null;
		for (var c in this.chaptersIndex)
		{
			var chapter = this.chaptersIndex[c];
			if (chapter.startLevel == undefined)
				continue;
			if (chapter.startLevel <= absoluteLevelIdx && chapter.endLevel >= absoluteLevelIdx)
			{
				// we found the chapter
				neededchapter = c;
				break;
			}
		}
		if (neededchapter == null)
		{
			console.error("Level ",absoluteLevelIdx, " not found in any chapter")
			onDone(null)
			return
		}

		//<debug>
		console.log("LevelSequenceHandler: Need to load absolute level ", absoluteLevelIdx, " from chapter ", neededchapter)
		console.log("LevelSequenceHandler: neededchapter", neededchapter, this.loadedChapterName)
		//</debug>

		if (neededchapter != this.loadedChapterName)
		{
			//console.log("loading chapter", neededchapter)

			this.loadChapter(neededchapter, ()=>{
				//this.getLevelObject(absoluteLevelIdx, onDone)
				//<debug>
				console.log("LevelSequenceHandler: loaded chapter", neededchapter, this.loadedChapterName)
				//</debug>
				onDone(this.loadedChapter.levels[absoluteLevelIdx - this.chaptersIndex[neededchapter].startLevel])
				
			})
			return
		}
		else
		{
			//<debug>
			console.log("LevelSequenceHandler: chapter already loaded", neededchapter)
			//</debug>
			onDone(this.loadedChapter.levels[absoluteLevelIdx - this.chaptersIndex[neededchapter].startLevel])
		}
		
	}


}