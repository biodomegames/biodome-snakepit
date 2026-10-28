export class DialogController
{
	constructor(dialog)
	{
		this.dialog = dialog
	}

	setGameObjects(objects)
	{
		for (var i in objects)
		{
			var obj = objects[i]
			this[i] = obj
		}
	}
	buttonPress(result, button)
	{
		return result
	}

	onClose()
	{
		//console.log("DialogController onClose")
	}
	tick(delta)
	{
		//console.log("DialogController tick", delta)
	}

	getPayload(payload)
	{
		return payload
	}
}