export class BiodataCloudFrvr
{
	constructor(basekeyname, perKeyStorage = false, onReady)
	{
		this.basekeyname = basekeyname
		this.perKeyStorage = perKeyStorage
		this.data = {}
		this.dataVersionCount = 0

		if (!perKeyStorage)
		{
			FRVR.cloudStorage.getItem(this.basekeyname).then((stored) => {
				if (stored)
				{
					console.log("Cloud data: ", stored)
					// is it a string?
					if (typeof stored === "string")
					{
						this.data = JSON.parse(stored)
					}
					else
					{
						this.data = stored
					}
					
				
					this.dataVersionCount = this.data._v
					onReady(true)
				}
				else
				{
					onReady(false)
				}
			}).catch((error) => {
				console.error("Error getting data from cloud", error)
				onReady(false)
			})
		}
		else
		{
			onReady(true)
		}
	}
	set(key, value, save, dataVersionCount)
	{
		this.data[key] = value
		
		if (save == undefined || save == true)
		{
			if (!this.perKeyStorage)
			{
				//this.dataVersionCount++
				this.data._v = dataVersionCount
				//if (save)
				{
					FRVR.cloudStorage.setItem(this.basekeyname,this.data)
				}
				
			}
			else
			{
				//this.data[key]._v = dataVersionCount
				var data = {
					data: this.data[key],
					_v: dataVersionCount
				}
				FRVR.cloudStorage.setItem(this.basekeyname + "_" + key, data)
			}		
		}
	}
	get(key, defaultvalue)
	{
		//return FRVR.cloudStorage.getItem(this.basekeyname + "_" + key)
	}
	getByPromise(key, defaultvalue)
	{
		return new Promise((resolve, reject) => {
			resolve(this.get(key, defaultvalue))
		})
	}
	has(key)
	{
		//return FRVR.cloudStorage.getItem(this.basekeyname + "_" + key) !== null
	}
}