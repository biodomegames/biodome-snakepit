// simple class to store data as key value pairs

import { BiodataCloudFrvr } from "./biodata_cloud_frvr.js"

var lastQueuedTime = 0
var lastSaveTime = 0

export class BioData
{
	data = {_v: 0}
	basekeyname = ""
	perKeyStorage = false // If true, each key is stored as a separate localStorage item
	cloudStorage = false
	//<frvr>
	cloudStorage = true
	//</frvr>
	//<ios,google>
	//@ts-ignore
	//storeMachine = localStorage
	//usePromises = false
	//</ios,google>
	anyDataArrived = false
	dataVersionCount = 0
	cloudKeysChanged = []
	firstCloudDataArrived = false
	cloudDataRequestTime = 0
	//lastSaveTime = 0
	onDataArrived = undefined

	
	constructor(basekeyname, perKeyStorage = false, onReady, onDataArrived, onDiscardedLocalData)
	{
	
		this.basekeyname = basekeyname
		this.perKeyStorage = perKeyStorage
		this.onDataArrived = onDataArrived
		this.onDiscardedLocalData = onDiscardedLocalData
		//this.lastSaveTime = performance.now()
		lastSaveTime = performance.now()
		if (perKeyStorage)
		{
			// For per-key storage, we don't load all keys at once
			// Keys are loaded on-demand in getByPromise()
			this.data = {}
			//<frvr>
			this.cloudStorage = true
			/*this.cloudStorage = new BiodataCloudFrvr(this.basekeyname+"_c", this.perKeyStorage, (res)=>
			{
				console.log("PER KEY Cloud ready " + res)
				//this.mergeData(this.data, this.cloudStorage.data)
				onReady && onReady()
			})*/
			//</frvr>
		}
		else
		{
			// load from local storage


			//<frvr>
			FRVR.localStorage.getItem(this.basekeyname).then((stored) => {
				//this.anyDataArrived = true
				if (stored)
				{
					console.log("Local data: " , stored)
					// is it a string?
					var loadedData = undefined
					if (typeof stored === "string")
					{
						loadedData = JSON.parse(stored)
					}
					else
					{
						loadedData = stored
					}
					
					this.dataVersionCount = this.data._v
					this.dataArrived(loadedData, "local")
					
				}
				else
				{
					this.anyDataArrived = true
				}
				
				onReady && onReady(this)
			})
				
			this.cloudDataRequestTime = performance.now()
			this.cloudStorage && FRVR.cloudStorage.getItem(this.basekeyname+"_c").then((stored) => {
				
				if (stored)
				{
					newTween(this, {}, .1).onDone(() => {
						this.firstCloudDataArrived = true
						this.cloudKeysChanged = []
						var loadedData = undefined
						if (typeof stored === "string")
						{
							loadedData = JSON.parse(stored)
						}
						else
						{
							loadedData = stored
						}
	
						this.dataArrived(loadedData, "cloud")
					})
				}
				else
				{
					this.firstCloudDataArrived = true
					//onReady && onReady()
				}
			})


		
			
			//</frvr>


			//<web,ios,google>
			var stored = localStorage.getItem(this.basekeyname)
			if (stored)
			{
				
				this.data = JSON.parse(stored)
			}
			onReady && onReady(this)
			//</web,ios,google>			
		}
	}

	discardClusters(clusterPrefix, clusterList)
	{
		if (this.perKeyStorage)
		{
			var keysToRemove = []
			var cloudKeysToRemove = []

			for (var key of clusterList)
			{
				keysToRemove.push(clusterPrefix + "_" + key)
				cloudKeysToRemove.push(clusterPrefix + "_c_" + key)
			}

			//<frvr>
			FRVR.cloudStorage.removeItems(cloudKeysToRemove)
			FRVR.localStorage.removeItems(keysToRemove)
			//</frvr>

			this.cloudKeysChanged = []
			
			

			
		}
		else
		{
			// does not apply
		}
	}

	dataArrived(data, source)
	{
		if (!this.anyDataArrived)
		{
			this.anyDataArrived = true
			this.data = data
			this.dataVersionCount = this.data._v
			this.onDataArrived && this.onDataArrived(this.data)
			this.currentDataSource = source
		}
		else
		{
			
			let res = this.mergeData(this.data, data)
			if (res.use == this.currentDataSource) 
				return // nothing new here
			
			if (res.use == "cloud")
			{
				this.onDiscardedLocalData && this.onDiscardedLocalData(this.data, res.merged)
				this.data = res.merged
				//<frvr>
				FRVR.localStorage.setItem(this.basekeyname, this.data)
				//</frvr>
			}
			
			this.data = res.merged


			this.dataVersionCount = this.data._v
			this.onDataArrived && this.onDataArrived(this.data)
		}
	}
	mergeData(localdata, clouddata)
	{
		var res = {merged: localdata, use: "local"}
		if (localdata == undefined)
		{
			res.merged = clouddata
			res.use = "cloud"
			return res
		}
		if (clouddata == undefined)
		{
			res.merged = localdata
			res.use = "local"
			return res
		}
		if (localdata._v > clouddata._v || clouddata._v == undefined)
		{
			res.merged = localdata
			res.use = "local"
			return res
		}
		if (clouddata._v > localdata._v || localdata._v == undefined)
		{
			res.merged = clouddata
			res.use = "cloud"
			return res	
		}
		//console.log("Merge the data: " + localdata != undefined ? JSON.stringify(localdata) : "undefined" + " " + clouddata != undefined ? JSON.stringify(clouddata) : "undefined")
		//console.log("Versions: " + localdata != undefined ? localdata._v : "undefined" + " " + clouddata != undefined ? clouddata._v : "undefined")
		return res
	}

	clear()
	{
		
		if (this.perKeyStorage)
		{
			// Remove all keys that start with basekeyname
			let storeMachine = localStorage
			//<frvr>
			storeMachine = FRVR.localStorage
			//</frvr>
			var keysToRemove = []
			var cloudKeysToRemove = []
			for (var key in this.data)
			{
				
				//var key = this.storeMachine.key(i)
				//if (key && key.startsWith(this.basekeyname + "_"))
				//{
					keysToRemove.push(this.basekeyname + "_" + key)
					cloudKeysToRemove.push(this.basekeyname + "_c_" + key)
				//}//
			}

			//<frvr>
			FRVR.cloudStorage.removeItems(cloudKeysToRemove)
			FRVR.localStorage.removeItems(keysToRemove)
			//</frvr>
			//<web,ios,google>
			for (var key of keysToRemove)
			{
				localStorage.removeItem(key)
			}
			//</web,ios,google>
			this.data = {}
			
		}
		else
		{
			this.data = {}
			//<frvr>
			FRVR.localStorage.removeItem(this.basekeyname)
			FRVR.cloudStorage.removeItem(this.basekeyname + "_c")
			//</frvr>
			//<web,ios,google>
			localStorage.removeItem(this.basekeyname)
			//</web,ios,google>
		}
		this.cloudKeysChanged = []
	}

	lastQueuedTime = 0
	queueCloudSave(key)
	{
		if (!this.cloudKeysChanged.includes(key))
		{
			lastQueuedTime = performance.now()
			this.cloudKeysChanged.push(key)
		}
		
		
		this.cloudSaveTick()
		
		if (this.cloudKeysChanged.length > 0)
		{
			//FRVR.cloudStorage.setItem(this.basekeyname + "_c", this.data)
		}
	}

	cloudSaveTick()
	{
		if (this.cloudTimerRunning) return

		

		this.cloudTimerRunning = false
		var delta1 = performance.now() - lastSaveTime
		var doSave = true
				
		if (delta1 < 1000 ) doSave = false // its been less than 1 second since last save
		var delta2 = performance.now() - lastQueuedTime
		if (delta2 < 300) doSave = false // its been less than 100ms since last queued save

		if (!this.firstCloudDataArrived)
		{
			var delta3 = performance.now() - this.cloudDataRequestTime
			if (delta3 < 10000) doSave = false // its been less than 10 seconds since our first cloud data request
		}
		//console.log("cloudSaveTick", delta1, delta2, doSave)

		if (doSave)
		{
			var items = []
			var savekeys = ""
			for (var key of this.cloudKeysChanged)
			{
				var cloudkey = ""
				if (key == this.basekeyname)
				{
					cloudkey = this.basekeyname + "_c" // this is for the non pr key storage
					items.push({key: cloudkey, value: this.data})
				}
				else
				{
					cloudkey = this.basekeyname + "_c_" + key
					items.push({key: cloudkey, value: this.data[key]})
				}
				
				
				//<debug>
				savekeys += key + " "
				
				//</debug>
			}
			
			FRVR.cloudStorage.setItems(items)
			//<debug>
			
			const style = 'background-color: red; color: white; font-size: 1.5em;' //; font-style: italic; border: 5px solid hotpink; font-size: 2em;'
			console.log("%cSave to cloud " + savekeys , style);
			//</debug>
			
			this.cloudKeysChanged = []
			lastSaveTime = performance.now()	
		}

		//if (!this.cloudTimerRunning) // to soon
		if (!doSave && this.cloudKeysChanged.length > 0)
		{
			this.cloudTimerRunning = true
			newTween(this, {}, 0.5).onDone(() => {
				this.cloudTimerRunning = false
				this.cloudSaveTick()
			})	
		}


		//if (this.cloudKeysChanged.length > 0)
		
		
	}


	set(key, value, save)
	{
	
		//if (!this.perKeyStorage) console.warn("biodata SET " + key + " " + value)
		if (this.data[key] == value)
		{
			return
		}
		if (!this.perKeyStorage)
		{
			this.data[key] = value
		}
		else
		{
			if (this.data[key] != undefined && typeof this.data[key] == "object")
			{
				this.data[key].data = value
			}
			else
			{
				this.data[key] = {data: value, _v: 0}
			}
		}
		
		// save to local storage
		if (save || save == undefined)
		{
			if (this.perKeyStorage)
			{
				// Store each key as a separate localStorage item
				// This avoids JSON.stringify on the entire dataset
				// Only serialize the single value being set, not the entire data object
				var itemKey = this.basekeyname + "_" + key
				// Store as JSON string with a prefix to distinguish from plain strings
				// This allows us to store both strings and objects correctly
				//var serialized = JSON.stringify(value)
				//var data = {
				//	data: value,
				//	_v: this.dataVersionCount
				//}
				this.data[key]._v ++ // = data
				//<frvr>
				FRVR.localStorage.setItem(itemKey, this.data[key])
				//</frvr>
				
				if (this.cloudStorage)
				{
					this.queueCloudSave(key)
				}
		  
				
				//<web,ios,google>
				localStorage.setItem(itemKey, JSON.stringify(this.data[key]))
				//</web,ios,google>
			}
			else
			{
				this.dataVersionCount++
				this.data._v = this.dataVersionCount

				//<frvr>
				FRVR.localStorage.setItem(this.basekeyname, (this.data))
				
				// maybe disable cloud save for now while testing merge strategt
				let disable = false
				if (!disable && this.cloudStorage && this.firstCloudDataArrived)
				{
					this.queueCloudSave(this.basekeyname)
					//FRVR.cloudStorage.setItem(this.basekeyname + "_c", this.data)
					//this.cloudStorage.set(key, value, save, this.dataVersionCount)
				}
				//</frvr>
				
				//<web,ios,google>
				localStorage.setItem(this.basekeyname, JSON.stringify(this.data))
				//</web,ios,google>
			}
		}
	}
	
	getByPromise(key, defaultvalue)
	{
		// return a promise
		return new Promise((resolve, reject) => {
			//resolve(this.get(key, defaultvalue))
			if (this.perKeyStorage)
			{
				//<frvr>
				if (this.cloudStorage)
				{
					// first get cloud
					var cloudkey = this.basekeyname + "_c_" + key
					FRVR.cloudStorage.getItem(cloudkey).then((stored) => {
						var clouddata = undefined
						if (stored)
						{
							//var clouddata = stored != undefined ? JSON.parse(stored) : undefined
							//resolve(clouddata)
							clouddata = stored
						}
						else
						{
							clouddata = defaultvalue
						}
						FRVR.localStorage.getItem(this.basekeyname + "_" + key).then((lstored) => {
							// merge the data
							var res = this.mergeData(lstored, clouddata)
							let useData = res.merged

							this.data[key] = useData
							if (useData === null)
							{
								resolve(defaultvalue)
							}
							resolve(useData.data)
						})		
					})

				}
				else
				{
					FRVR.localStorage.getItem(this.basekeyname + "_" + key).then((stored) => 
					{
						if (stored === null)
						{
							resolve(defaultvalue)
						}
						this.data[key] = stored
						resolve(this.data[key])
					})
		
				}
				//</frvr>
				//<web,ios,google>
				var itemKey = this.basekeyname + "_" + key
				console.log("GET BY KEY " + itemKey)
				var stored = localStorage.getItem(itemKey)
				
				
				
				if (stored === null)
				{
					resolve(defaultvalue)
				}
				else
				{
					this.data[key] = JSON.parse(stored)
					resolve(this.data[key])
				}
				//</web,ios,google>
			}
			else
			{
				if (this.data[key] == undefined)
				{
					resolve(defaultvalue)
				}
				resolve(this.data[key])
			}
		})
	}
	
	get(key, defaultvalue)
	{
		//if (!this.perKeyStorage) console.warn("biodata GET " + key )
		// return a promise
		
		if (this.perKeyStorage)
		{
			throw new Error("get is not supported for perKeyStorage. Use getByPromise instead.")
		}
		else
		{
			if (this.data[key] == undefined)
			{
				return defaultvalue
			}
			return this.data[key]
		}	
	}
	



		/*if (this.perKeyStorage)
		{
			// Load from per-key storage
			var itemKey = this.basekeyname + "_" + key
			var stored = this.storeMachine.getItem(itemKey)
			if (stored === null)
			{
				return defaultvalue
			}
			// Parse the JSON string (which may be a string value or an object)
			try
			{
				return JSON.parse(stored)
			}
			catch (e)
			{
				// If parsing fails, return the raw string (shouldn't happen with JSON.stringify)
				console.warn("BioData: Failed to parse stored value for key", key, e)
				return stored
			}
		}
		else
		{
			if (this.data[key] == undefined)
			{
				return defaultvalue
			}
			return this.data[key]
		}*/
	//}
 
	// might not be used
	has(key)
	{
		if (this.perKeyStorage)
		{
			var itemKey = this.basekeyname + "_" + key
			return this.storeMachine.getItem(itemKey) !== null
		}
		else
		{
			return this.data[key] != undefined
		}
	}
}