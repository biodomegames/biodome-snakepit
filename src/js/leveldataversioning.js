import { LevelBricks } from "./data_levelbricks";

export const LevelDataVersioning = {
	curVersion: 1,
	
	getLevelDataVersion(data) {
		return data.version || 0
	},

	deepEquals(obj1, obj2) {
		// Handle primitive types
		if (obj1 === obj2) return true;
		if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) return false;
		
		// Get keys of both objects
		const keys1 = Object.keys(obj1);
		const keys2 = Object.keys(obj2);
		
		// Check if number of keys is the same
		if (keys1.length !== keys2.length) return false;
		
		// Check each key and its value
		for (const key of keys1) {
			if (!keys2.includes(key)) return false;
			
			const val1 = obj1[key];
			const val2 = obj2[key];
			
			// Recursively compare if both values are objects
			if (typeof val1 === 'object' && typeof val2 === 'object') {
				if (!this.deepEquals(val1, val2)) return false;
			} else if (val1 !== val2) {
				return false;
			}
		}
		
		return true;
	},

	upgrade(data) {
		if (data.version == undefined)
		{
			data.version = 0
		}

		if (data.version == 0)
		{
			
			for (var y=0; y<data.size.height; y++)
			{
				var row = data.grid[y]
				var newrow = ""
				for (var x=0; x<data.size.width; x++)
				{
					var char = row.charAt(x)
					newrow += LevelDataVersioning.convertLegacyBrickToNewBrick(char, data.version)
					
					if (x < data.size.width-1)
						newrow += ","
				}
				data.grid[y] = newrow
				console.log("newrow", newrow)
					
			}
		}
		var legacyBricks = legacyLevelBricks["version_"+data.version]
		
		return data
	},

	convertLegacyBrickToNewBrick(char, version)
	{
		if (char == "f")
		{
			console.log("got an f")
		}
		var legacyBricks = legacyLevelBricks["version_"+version]
		var newBricks = LevelBricks
		// take our legacybrick and find the combination of new bricks that matches it
		var oldBrick = undefined
		for (var k in legacyBricks)
		{
			var legacyBrick = legacyBricks[k]
			if (legacyBrick.alias == char)
			{
				oldBrick = legacyBrick
				break
			}
		}
		if (oldBrick == undefined)
		{
			console.error("No legacy brick found for", char)
			return char
		}
		// now we need to find the new brick that matches the old brick
		var ret = ""
		// find match for tiletype
		if (oldBrick.tileType)	{
			for (var k in newBricks)	{
				var newBrick = newBricks[k]
				if (newBrick.tileType == oldBrick.tileType && newBrick.excavated == oldBrick.excavated ){
					ret += newBrick.alias
					break
				}
			}
		}
		// find match for fob
		if (oldBrick.fob) {
			for (var k in newBricks)
			{
				var newBrick = newBricks[k]
				if (newBrick.fob && newBrick.fob.type == oldBrick.fob.type)
				{
					ret += newBrick.alias
					break
				}
			}
		}
		if (oldBrick.modifier)
		{
			for (var k in newBricks)
			{
				var newBrick = newBricks[k]
				if (newBrick.modifier && LevelDataVersioning.deepEquals(newBrick.modifier, oldBrick.modifier))
				{
					ret += newBrick.alias
					break
				}
			}
				
		}
		if (oldBrick.random)
		{
			for (var k in newBricks)
			{
				var newBrick = newBricks[k]
				if (newBrick.random && LevelDataVersioning.deepEquals(newBrick.random, oldBrick.random))
				{
					ret += newBrick.alias
					break
				}
			}
		}
		if (oldBrick.spawner)
		{
			for (var k in newBricks)
			{
						
			}
		}
		return ret
	}
};


const legacyLevelBricks = {
	version_0: {
		void:					{alias: " ", tileType: "empty", excavated: false},  
		voidpass:				{alias: "_", tileType: "empty", excavated: true},  
		empty:					{alias: ".", tileType: "boardbg", excavated: true},
		foba:					{alias: "a", tileType: "boardbg", excavated: true, fob: { type: "fobA"}}, 
		fobb:					{alias: "b", tileType: "boardbg", excavated: true, fob: { type: "fobB"}}, 
		fobc:					{alias: "c", tileType: "boardbg", excavated: true, fob: { type: "fobC"}}, 
		fobd:					{alias: "d", tileType: "boardbg", excavated: true, fob: { type: "fobD"}}, 
		fobrock:				{alias: "e", tileType: "boardbg", excavated: true, fob: { type: "fobRock"}, targetRelease: "crystal"},
		randomfob:				{alias: "f",  tileType: "boardbg", excavated: true, random: ["foba", "fobb", "fobc", "fobd"]},
		rock:					{alias: "g", tileType: "rockWithAmmonite", excavated: false}, 
		bomb: 					{alias: "h", tileType: "boardbg", excavated: true, fob: { type: "fobBomb" } },
		horizblast: 			{alias: "i", tileType: "boardbg", excavated: true, fob: { type: "fobBlasterHoriz" } },
		vertblast: 				{alias: "j", tileType: "boardbg", excavated: true, fob: { type: "fobBlasterVert" } },
		jumper: 				{alias: "x", tileType: "boardbg", excavated: true, fob: { type: "fobJumper" } },
		lightball: 				{alias: "z", tileType: "boardbg", excavated: true, fob: { type: "fobLightball" } },
		soil:					{alias: "k", tileType: "boardbg", excavated: false}, 
		hiddenfob:				{alias: "l", tileType: "boardbg", excavated: false, hiddenFob: {types: ["fobA", "fobB", "fobC", "fobD"]}},  // this is soil with hidden FOBS
		soilhiddenfob:			{alias: "m", random: ["hiddenfob", "soil"]}, // this is a random soil with hidden FOBS OR just a soil with nothing hidded
		spawner:				{alias: "n", tileType: "boardbg", excavated: true, modifier: {type: "fobspawn", frequency: .01, types: ["fobA",  "fobBRound", "fobC", "fobD"] }}, 
		rockspawner:			{alias: "C", tileType: "rockWithAmmonite", excavated: false, modifier: {type: "fobspawn", frequency: .01, types: ["fobA",  "fobB", "fobC", "fobD"] }}, 
		voidspawner:			{alias: "D", tileType: "empty", excavated: true, modifier: {type: "fobspawn", frequency: .01, types: ["fobA",  "fobB", "fobC", "fobD"] }}, 
		bigdestructable:		{alias: "o", tileType: "bigdestructable", excavated: false},
		bigContentBox: 			{alias: "p", tileType: "bigContentBox", excavated: false, 
			modifier: { type:"destructContent", mc: "soil.plate", count: 6, numHitsPrItem: 1, targetRelease: "plate", damageAnim: "shake", particles: {colors: [0xffeeaa, 0xffddbb], count: 10, scale: 1, type:"shards"} } 
		},
		bigcoverup:				{alias: "q", tileType: "bigcoverup", excavated: false},
		grass: 					{alias: "r", tileType: "grass", excavated: false},	
		grassFobA: 				{alias: "s", tileType: "grass", excavated: false,  fob: { type: "fobA"}},	
		grassFobB: 				{alias: "t", tileType: "grass", excavated: false,  fob: { type: "fobB"}},	
		grassFobC: 				{alias: "u", tileType: "grass", excavated: false,  fob: { type: "fobC"}},	
		grassFobD: 				{alias: "v", tileType: "grass", excavated: false,  fob: { type: "fobD"}},	
		grassRandFob: 			{alias: "w", random: ["grassFobA", "grassFobB", "grassFobC", "grassFobD"]},
		boards3x: 				{alias: "y", tileType: "boards3x", excavated: false, targetRelease: "boards3x"},	
		
		mole: 					{alias: "A", tileType: "mole", excavated: false},	
		foblantern:				{alias: "B", tileType: "boardbg", excavated: true, targetRelease: "lantern", fob: { type: "fobLantern"}},
		fobbarrel:				{alias: "E", tileType: "boardbg", excavated: true, targetRelease: "barrel", fob: { type: "fobBarrel"}},
		fobcrate:				{alias: "F", tileType: "boardbg", excavated: true, targetRelease: "crate", fob: { type: "fobCrate"}},
		fobe:					{alias: "G", tileType: "boardbg", excavated: true, fob: { type: "fobESquare"}}, 
		oredirt: 				{alias: "H", tileType: "oredirt", excavated: false},	
		oredirtd1: 				{alias: "I", tileType: "oredirt", excavated: false, digcount: 1},	
		oredirtd2: 				{alias: "J", tileType: "oredirt", excavated: false, digcount: 2},	
		fobunmoveabletest:		{alias: "K",  fob: { type: "fobUnmoveableTest"}},
	}
}