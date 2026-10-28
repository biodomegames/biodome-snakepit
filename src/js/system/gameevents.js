
export const GameEventsTypes = 
{
	WORD_PICK_FROM_RACK: 0,
	WORD_PLACE_ON_BOARD: 1,
	WORD_PLACE_PICK_FROM_BOARD: 2,
	RED_LETTER_SHOW: 3,
	LEVEL_COMPLETE: 4,
	LEVEL_GOLDLETTER_SHOW: 5,
	LEVEL_COMPLETE_PAYOFF_MESSAGE: 6,
	EXECUTE_HELP: 7,
	EXECUTE_CLEAR: 8,
	SHOW_DICTIONARY: 9,
	
	NO_MORE_HELP_AVAILABLE: 12,
	WORD_SNAP_TO_BOARD: 13,
	WORD_UNSNAP: 14,
	AD_STARTED: 15,
	AD_COMPLETED: 16,
	GAME_WON: 17,
	WORD_POP_SCORE_SEQUENCE: 18,
	/** One or more words animated from the board back to the rack (parallel overlap, reveal-letter bump, clear, etc.). */
	WORDS_KICKED_FROM_BOARD: 19,
	/** Help credit icon spawned at full gold cup during level-complete sequence (before leg to screen top). */
	HELPER_FLY_STARTED: 20,
	/** Help credit reached the Help control after cup → top → ingame-bar flight; bank is applied right after. */
	HELPER_FLY_COMPLETED: 21,

} 

export class GameEventsClass
{
	idCount = 0
	propagationPaused = false
	queuedEvents = []
	
	constructor()
	{
		//if (GameEvents.instance != undefined)
		//	return GameEvents.instance
		this.listeners = []
		this.events = GameEventsTypes
		this.hasQueuedDeletions = false
	}

	addListener( gameevent, listener )
	{
		var obj = {
			gameevent: gameevent,
			listener: listener,
			id: this.idCount,
			active: true
		}
		if (this.listeners[gameevent] == undefined)
			this.listeners[gameevent] = []
		this.listeners[gameevent].push(obj)

		this.idCount++
		//this.listeners.push(listener)
		return obj.id
	}

	removeListener(id)
	{
		for (var e in this.listeners)
		{
			for (var i = this.listeners[e].length-1; i >= 0; i--)
			{
				if (this.listeners[e][i].id == id)
				{
					if (this.listenersLocked)
					{
						this.listeners[e][i].deleteMe = true
						this.hasQueuedDeletions = true
					}
					else
					{
						this.listeners[e].splice(i, 1)
					}
					return
				}
			}
		}
	}

	setPropagationPause( pause )
	{
		this.propagationPaused = pause
		if (!pause)
		{
			//console.log("GameEvents setPropagationPause false")
			for (var e of this.queuedEvents)
			{
				this.raise(e.gameevent, e.data)
			}
			this.queuedEvents = []
		}
	}

	firePausedEvents(ofType)
	{
		//if (this.queuedEvents.length) console.log("GameEvents firePausedEvents", ofType)
		var tmp = this.propagationPaused
		this.propagationPaused = false
		for (var e=this.queuedEvents.length-1; e >= 0; e--)
		{
			
			var ev = this.queuedEvents[e]
			if (ev.gameevent == ofType)
			{
				//console.log("GameEvents firePausedEvents", ofType, ev.gameevent, ev.data)
				this.raise(ev.gameevent, ev.data)
				this.queuedEvents.splice(e, 1)

			}
		}
		this.propagationPaused = tmp
	}

	raise( gameevent, data, consoleLog = false )
	{
		if (gameevent == undefined)
		{
			console.error("gameevent undefined", data)
			return
		}
		consoleLog = true
		//<debug>
		if (consoleLog) console.warn("GameEvent raise: ", this.getGameEventName(gameevent), data)
		//</debug>

		if (this.propagationPaused)
		{
			//<debug>
			if (consoleLog) console.log("GameEvent raise queued: ", this.getGameEventName(gameevent), data)
			//</debug>
			this.queuedEvents.push({gameevent: gameevent, data: data})
			return
		}
		//
		if (this.listeners[gameevent] == undefined)
			return
		data.event = gameevent
		this.listenersLocked = true
		//console.log("raise: ", this.getGameEventName(gameevent), data)
		for (var lidx = this.listeners[gameevent].length-1; lidx >= 0; lidx--)
		{
			var l = this.listeners[gameevent][lidx]
			if (!l)
			{
				console.error("gameEvent: " + lidx + " " + this.getGameEventName(gameevent))
				//throw new Error("Listener is undefined " + l + " for gameevent: " + this.getGameEventName(gameevent))
			}
			
			if (!l || l.deleteMe)
			{
				this.listeners[gameevent].splice(lidx, 1)
				continue
			}
			if (l.active===false) 
			{
				//console.log("GameEvent raise: ", this.getGameEventName(gameevent), data, "listener is inactive")
				continue
			}
				
			if (l.gameevent == gameevent) // && !(l.listener.active===false))
			{
				//console.log("        - listener ", lidx)
				l.listener(data)	
			}
			
		}
		this.listenersLocked = false

		if (this.hasQueuedDeletions)
		{
			this.hasQueuedDeletions = false
			for (var e in this.listeners)
			{
				for (var i = this.listeners[e].length-1; i >= 0; i--)
				{
					if (this.listeners[e][i].deleteMe)
					{
						this.listeners[e].splice(i, 1)
					}
				}
			}
		}
		/*for (var l of this.listeners[gameevent])
		{
			
			
		}*/
	}

	getGameEventName( gameevent )
	{
		for (var e in this.events)
		{
			if (this.events[e] == gameevent)
				return e
		}
		return "Unknown event"
	}

	disabledHandlerIds = []
	disableEventHandler(id)
	{
		this.disabledHandlerIds.push(id)
		for (var e in this.listeners)
		{
			for (var i = this.listeners[e].length-1; i >= 0; i--)
			{
				if (this.listeners[e][i].id == id)
				{
					this.listeners[e][i].active = false	
					//this.listeners[e].splice(i, 1)
					return
				}
			}
		}
	}
	enableEventHandler(id)
	{
		var idx = this.disabledHandlerIds.indexOf(id)
		if (idx >-1)
			this.disabledHandlerIds.splice(idx, 1)
		for (var e in this.listeners)
		{
			for (var i = this.listeners[e].length-1; i >= 0; i--)
			{
				if (this.listeners[e][i].id == id)
				{
					this.listeners[e][i].active = true
					return
				}
			}
		}
	}

	dumpListeners()
	{
		if (this.previousDump == undefined)  this.previousDump = {}
		
		console.log("-------- GameEvents dumpListeners --------")
		var totalListeners = 0
		for (var e in this.listeners)
		{
			var eventName = this.getGameEventName(e)
			var numListeners = this.listeners[e].length
			totalListeners += numListeners
			if (numListeners == 0) continue
			
			if (this.previousDump[eventName] && this.previousDump[eventName] != numListeners)
			{
				console.log("CHG Listener: ", eventName, " has ", numListeners, " listeners (changed from ", this.previousDump[eventName], ")")
			}
			else if (this.previousDump[eventName] == undefined)
			{
				console.log("NEW Listener: ", eventName, " has ", numListeners, " listeners")
			}
			else
			{
				console.log("SAM Listener: ", eventName, " has ", numListeners, " listeners")
			}
			
			this.previousDump[eventName] = numListeners
		}
		console.log("Total number of listeners: ", totalListeners)
		this.checkMemoryHealth()
		console.log("----------------------------------------")
		
	}

	// Memory leak detection helper
	checkMemoryHealth()
	{
		console.log("-------- Memory Health Check --------")
		
		// Count total listeners
		var totalListeners = 0
		var listenerBreakdown = {}
		for (var e in this.listeners)
		{
			var eventName = this.getGameEventName(e)
			var count = this.listeners[e].length
			totalListeners += count
			if (count > 0)
			{
				listenerBreakdown[eventName] = count
			}
		}
		
		console.log("Total event listeners: ", totalListeners)
		console.log("Listener breakdown:", listenerBreakdown)
		
		// Check for potential leaks (events with many listeners)
		var suspiciousEvents = []
		for (var eventName in listenerBreakdown)
		{
			if (listenerBreakdown[eventName] > 10)
			{
				suspiciousEvents.push({event: eventName, count: listenerBreakdown[eventName]})
			}
		}
		
		if (suspiciousEvents.length > 0)
		{
			console.warn("⚠️  Potential listener leaks detected:")
			suspiciousEvents.forEach(e => console.warn(`  ${e.event}: ${e.count} listeners`))
		}
		
		// Memory info (if available - Chrome-specific)
		// @ts-ignore - performance.memory is Chrome-specific
		if (performance.memory)
		{
			// @ts-ignore
			var mem = performance.memory
			console.log("Heap used: ", (mem.usedJSHeapSize / 1048576).toFixed(2), "MB")
			console.log("Heap total: ", (mem.totalJSHeapSize / 1048576).toFixed(2), "MB")
			console.log("Heap limit: ", (mem.jsHeapSizeLimit / 1048576).toFixed(2), "MB")
		}
		else
		{
			console.log("⚠️  performance.memory not available. Open DevTools to see memory stats.")
		}
		
		console.log("----------------------------------------")
		console.log("💡 To check compiled code memory:")
		console.log("   1. Open Chrome DevTools → Memory tab")
		console.log("   2. Take a heap snapshot")
		console.log("   3. Filter by 'compiled code'")
		console.log("   4. Compare snapshots over time to detect leaks")
		console.log("----------------------------------------")
	}
}

export const GameEvents = new GameEventsClass()	
//GameEvents.instance = new GameEvents()