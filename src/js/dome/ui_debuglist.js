import { DialogDefinitions } from "../data_ui_dialogs"

export function showDialogDebug(game)
{
	var ui = game.ui
	getCompleteDialogList(game, (allDialogs)=>{
		console.log("allDialogs", allDialogs)

		
		var def = ui.getDialogDefinition("debugSelectDialogList")
		var src = def.levelitem0
		var numPrPage = 15

		for (var l=1;l<numPrPage;l++)
		{
			var cpy = JSON.parse(JSON.stringify(src))
			def["levelitem" + l] = cpy
		}

		var curPage = bdata.get("showdialogpage", 0)

		var diag = ui.displayDialog("debugSelectDialogList", {}, (res)=>{
			if (res == "prev")
			{
				curPage--
				if (curPage < 0)
					curPage = 0
				bdata.set("showdialogpage", curPage)
				showDialogDebug(game)
			}
			else if (res == "next")
			{
				curPage++
				if (curPage >= numPages)
					curPage = numPages - 1
				bdata.set("showdialogpage", curPage)
				showDialogDebug(game)
			}
			else if (res.startsWith("dlg_"))
			{
				console.log("res", res)
				var dialogname = res.split("_")[1]
				
				game.ui.displayDialog(dialogname, {}, (res)=>{
					console.log("res", res)
				})
				bdata.set("showdialogpreviousname", dialogname)
				/*var levelIdx = parseInt(res.split("_")[1])
				console.log("levelIdx", levelIdx)

				game.gameProgress.level = levelIdx
				if (game.worldContent)
				{
					// we are in a level now
					game.worldContent.jumptoLevel(levelIdx)
					if (game.debugmenu) game.debugmenu.textCurLevel.text = "Level " + (game.worldContent.curLevelIdx + 1)
				}
				else
				{
					game.saveProgress()
					game.gameFlow.refresh()
				}
				*/
				//game.gameFlow.startLevel(levelIdx)
			}
		})

		
		
		var numPages = Math.ceil(allDialogs.length / numPrPage)
		var startIdx = curPage * numPrPage
		var endIdx = Math.min( startIdx + numPrPage, allDialogs.length)
		
		var itmidx = 0;
		for (var l=startIdx; l<endIdx; l++)
		{
			var dialog = allDialogs[l]
			var levelName = dialog
			//var levelIdx = level.idx
			console.log("itmidx", itmidx)
			var item = diag["levelitem" + itmidx]
			item.text.text =  levelName
			item.def.res = "dlg_" + levelName
			//if (level.setup.difficulty == 0)
				item.children[0].tint = 0xffffff

			var previousname = bdata.get("showdialogpreviousname", "")
			if (previousname == levelName)
			{
				item.children[0].tint = 0xaaaaaa
			}
			else
			{
				item.children[0].tint = 0xffffff
			}
			/*else if (level.setup.difficulty == 1)
				item.children[0].tint = 0xaaaaaa
			else if (level.setup.difficulty == 2)
				item.children[0].tint = 0x888888
			else if (level.setup.difficulty == 3)
				item.children[0].tint = 0xaa3333
			else if (level.setup.difficulty == 4)
				item.children[0].tint = 0xffff77
			item.text.text = (l+1) + " : " + level.chapter + " / " + levelName
			item.def.res = "lvl_" + l
			*/
			itmidx++
		}
		while (itmidx <numPrPage)
		{
			var item = diag["levelitem" + itmidx]
			item.visible = false
			itmidx++
		}
		//var levels = allLevels.slice(startIdx, endIdx)
		
	})
}

var allLevels = []
function getCompleteDialogList(game, onDone)
{
	var allDialogs = []
	for (var d in DialogDefinitions)
	{
		allDialogs.push(d)
	}
	onDone(allDialogs)
}