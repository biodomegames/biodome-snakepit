import { MovieClip } from './movieclip.js';
//import { Application } from 'pixi.js';
import { Assets } from 'pixi.js';
//import { Texture } from 'pixi.js';
//import { Sprite } from 'pixi.js';
export var alltubes = {}

export class FlashTube {
    constructor(xmlPath, jsonPath, app) {
        // Store the paths to XML and JSON files
        this.xmlPath = xmlPath;
        this.jsonPath = jsonPath;
		this.isReady = false;
		this.xmlData = undefined;
		this.myApp = app;
        // Initialize by loading the files
        //this.init();
    }



    // Asynchronous function to initialize loading of both XML and JSON files
    init() {

		var cleanname = this.xmlPath.replace(/^.*[\\\/]/, '').replace(".xml", "")
		//console.log("Init called for ", cleanname)
		if (window.alltubes == undefined)
			window.alltubes = alltubes = {}
		cleanname = cleanname.split("-")[0]
		window.alltubes[cleanname] = this

		//console.log("Init called")
		return Promise.all([this.loadXML(this.xmlPath), this.loadJSON(this.jsonPath)])
			.then(([xmltext, jsonData]) => {
				// Assets are loaded, you can process them here
				//console.log("XML and JSON loaded:", xmlData, jsonData);
				
				const parser = new DOMParser(); // Create a new DOMParser instance
				const xmlDoc = parser.parseFromString(xmltext, 'text/xml'); // Parse the XML
				this.xmlData = xmlDoc; // Return the parsed XML document
				this.processAnimationData()
				this.isReady = true;
				return { xmlDoc, jsonData };  // Return loaded data to .then() chain
			});
        
    }

	// Function to load XML (returns a Promise)
	loadXML(path) {
		return new Promise((resolve, reject) => {
			fetch(path)
			.then(response => {
				if (!response.ok) throw new Error("Failed to load XML");
				return response.text();
			})
			.then(data => resolve(data)) // Resolve with the XML content
			.catch(error => reject(error));
		});
	}
   
    // Asynchronous function to load the texture atlas (JSON file)
    // Function to load JSON using PIXI.Assets.load (returns a Promise)
  loadJSON(path) {
    // Extract cache busting parameter from path if present
    const urlObj = new URL(path, window.location.href);
   
	 
	// No cache busting, use normal PIXI loading
	return Assets.load(path)
        .then((jsonData) => {
          if (jsonData) {
            return jsonData;
          } else {
            throw new Error("Failed to load JSON with PIXI");
          }
	});
    
  }

    // Function to process animation data after both XML and JSON are loaded
	processAnimationData() {
		// is data in a <stuff> tag or a <compressed> tag?
		const stuff = this.xmlData.getElementsByTagName('stuff');
		if (stuff.length > 0) {
			this.processAnimationDataUncompressed();
		}
		else {
			this.processAnimationDataCompressed();
		}
	}
	processAnimationDataCompressed() {
		//console.log("Processing animation data compressed")
		const xframeReferences = this.xmlData.getElementsByTagName('fr');
		this.frameReferences = {}
		for (let i = 0; i < xframeReferences.length; i++) {
            const name = xframeReferences[i].getAttribute('n');
			const file = xframeReferences[i].getAttribute('f');
			this.frameReferences[name] = file;
		}
		const sequences = this.xmlData.getElementsByTagName('sq');
		this.data = {}
		for (let i = 0; i < sequences.length; i++) {
			const name = sequences[i].getAttribute('n');
			this.data[name] = []
			const frames = sequences[i].getElementsByTagName('f');
			var prevFrm = undefined	
			for (let j = 0; j < frames.length; j++) {
				const framenum = Number(frames[j].getAttribute('n'))-1
				var frm = {}
				
				const label = frames[j].getAttribute('l');
				//console.log(`   framenum: ${framenum}, label: ${label}`);
				frm.num = framenum
				frm.label = label
				frm.sprites = []
				for (let s=0; s<frames[j].children.length; s++) {

					//console.log(`      child: ${frames[j].children[s].tagName}`);
					var sprite = {}
					// if no attribute a exist, set it to 1
					if (frames[j].children[s].getAttribute('a') == undefined)
						sprite.alpha = 1
					else
						sprite.alpha =  Number(frames[j].children[s].getAttribute('a'))

					if (frames[j].children[s].tagName == "s") {
						sprite.type = "sprite"
						var tp = frames[j].children[s].getAttribute('tp')

						sprite.name = this.frameReferences[tp] // frames[j].children[s].getAttribute('n')
						sprite.instancename = frames[j].children[s].getAttribute('in')
					}
					else if (frames[j].children[s].tagName == "ss") {
						sprite.type = "subsequence"
						sprite.name = frames[j].children[s].getAttribute('n')
						sprite.instancename = sprite.name
					}
					else if (frames[j].children[s].tagName == "rp") {
						sprite.type = "refpoint"
						sprite.name = frames[j].children[s].getAttribute('n')
					}
					
					var t = frames[j].children[s].getAttribute('t')
					var tparts = t.split(',')
					var n = 0
					sprite.x = Number(tparts[n++])
					sprite.y = Number(tparts[n++])
					sprite.rotation = Number(tparts[n++]) / 180 * Math.PI
					sprite.skewX = -Number(tparts[n++]) / 180 * Math.PI
					sprite.skewY = -Number(tparts[n++]) / 180 * Math.PI
					sprite.scaleX = Number(tparts[n++])
					sprite.scaleY = Number(tparts[n++])
					
					if (Math.abs(-sprite.rotation - sprite.skewX) < 0.0001 && Math.abs(-sprite.rotation - sprite.skewY) < 0.0001)
					{
						sprite.skewX = 0
						sprite.skewY = 0
						//console.log("Setting skew to 0 frame ", framenum, " sprite ",sprite.instancename)

					}
					else if (Math.abs(sprite.rotation - sprite.skewX) < 0.0001 && Math.abs(sprite.rotation - sprite.skewY) < 0.0001)
					{
						sprite.skewX = 0
						sprite.skewY = 0
						//console.log("Setting skew to 0 frame ", framenum, " sprite ",sprite.instancename)
					}
					else{
						sprite.rotation = 0
						//console.log("Rotation to 0 frame ", framenum, " sprite ",sprite.instancename)
					}
					sprite.skewY = -sprite.skewY
					
					sprite.framespan = Number(frames[j].children[s].getAttribute('fs'))
					sprite.z = Number(frames[j].children[s].getAttribute('z'))
					frm.sprites.push(sprite)
				
				}
				while (this.data[name].length < framenum-1) {
					this.data[name].push(prevFrm)
				}
				this.data[name].push(frm)
				prevFrm = frm
			}
			var spanners = []
			for (var f=0; f< this.data[name].length; f++)
			{	
				var frame = this.data[name][f]

				// make opies if all spanners and insert them in sprites
				for (var span=0; span<spanners.length; span++)
				{
					var spanner = spanners[span]
					if (spanner.framespan <= 1)
						continue

					var cpy = {}
					for (var key in spanner)
					{
						cpy[key] = spanner[key]
					}
					cpy.framespan = 1
					spanner.framespan--
					frame.sprites.push(cpy)
				}

				// sort the frames sprites by z
				frame.sprites.sort((a,b) => a.z - b.z)

				for (let s = 0; s < this.data[name][f].sprites.length; s++)
				{
					var sprite = this.data[name][f].sprites[s]
					if (sprite.framespan > 1)
					{
						spanners.push(sprite)
					}
				}
			}	
		}
	}
		
    processAnimationDataUncompressed() {
		//console.log("Processing animation data ")
        const frameReferences = this.xmlData.getElementsByTagName('frameReference');

        for (let i = 0; i < frameReferences.length; i++) {
            const name = frameReferences[i].getAttribute('name');
			//console.log(`Processing frame: ${name}`);
            // Get the texture from the loaded atlas using the frame name
           // const texture = PIXI.Texture.from(name);

            // Create a sprite from the texture (you can customize how this is handled)
            //const sprite = new PIXI.Sprite(texture);

            // Add the sprite to the stage or process it as part of the animation
            //console.log(`Sprite for frame: ${name} created`);

            // You can add the sprite to the PIXI stage here if needed
            // app.stage.addChild(sprite);
        }
		this.data = {}
		
		const sequences = this.xmlData.getElementsByTagName('sequence');
		for (let i = 0; i < sequences.length; i++) {
			const name = sequences[i].getAttribute('name');
			this.data[name] = []

			//console.log(`Processing sequence: ${name}`);
			const frames = sequences[i].getElementsByTagName('frame');
			
			var prevFrm = undefined	
			for (let j = 0; j < frames.length; j++) {
				const framenum = Number(frames[j].getAttribute('num'))-1
				var frm = {}
				
				const label = frames[j].getAttribute('label');
				//console.log(`   framenum: ${framenum}, label: ${label}`);
				frm.num = framenum
				frm.label = label
				frm.sprites = []
				for (let s=0; s<frames[j].children.length; s++) {

					//console.log(`      child: ${frames[j].children[s].tagName}`);
					var sprite = {}
					if (frames[j].children[s].tagName == "sprite") {
						sprite.type = "sprite"
						sprite.name = frames[j].children[s].getAttribute('spritename')
						sprite.instancename = frames[j].children[s].getAttribute('instancename')
					}
					else if (frames[j].children[s].tagName == "subsequence") {
						sprite.type = "subsequence"
						sprite.name = frames[j].children[s].getAttribute('name')
						sprite.instancename = sprite.name
					}
					else if (frames[j].children[s].tagName == "refpoint") {
						sprite.type = "refpoint"
						sprite.name = frames[j].children[s].getAttribute('name')

					}
					
					sprite.x = Number(frames[j].children[s].getAttribute('posx'))
					sprite.y = Number(frames[j].children[s].getAttribute('posy'))
					sprite.scaleX = Number(frames[j].children[s].getAttribute('scalex'))
					sprite.scaleY = Number(frames[j].children[s].getAttribute('scaley'))
					sprite.skewX = -Number( frames[j].children[s].getAttribute('skewx')) / 180 * Math.PI
					sprite.skewY = -Number( frames[j].children[s].getAttribute('skewy')) / 180 * Math.PI
					sprite.rotation = Number( frames[j].children[s].getAttribute('angle'))  / 180 * Math.PI
					//if (Math.abs(sprite.skewX - sprite.skewY) < 0.0001)
					//	{
					//		sprite.skewX = 0
					//		sprite.skewY = 0
					//	}
					//if (sprite.instancename == "slowrot")
					//{
					//	console.log("Slowrot skewX: ", sprite.skewX, " skewY: ", sprite.skewY, " rotation: ", sprite.rotation)
					//}
					// here all sorts of skew/rotation combinations are sorted out.. Skew and rotation are exported from flash in an interprative way
					if (Math.abs(-sprite.rotation - sprite.skewX) < 0.0001 && Math.abs(-sprite.rotation - sprite.skewY < 0.0001))
					{
						sprite.skewX = 0
						sprite.skewY = 0
						//console.log("Setting skew to 0 frame ", framenum, " sprite ",sprite.instancename)

					}
					else if (Math.abs(sprite.rotation - sprite.skewX) < 0.0001 && Math.abs(sprite.rotation - sprite.skewY < 0.0001))
					{
						sprite.skewX = 0
						sprite.skewY = 0
						//console.log("Setting skew to 0 frame ", framenum, " sprite ",sprite.instancename)
					}
					else{
						sprite.rotation = 0
						//console.log("Rotation to 0 frame ", framenum, " sprite ",sprite.instancename)
					}
					sprite.skewY = -sprite.skewY
					// Alpha: uncompressed `<sprite … alpha="…">` uses `alpha`; compressed `<s … a="…">` uses `a`.
					{
						let aStr = frames[j].children[s].getAttribute("alpha")
						if (aStr == null || aStr === "") aStr = frames[j].children[s].getAttribute("a")
						sprite.alpha = aStr == null || aStr === "" ? 1 : Number(aStr)
					}
					
					sprite.framespan = Number(frames[j].children[s].getAttribute('framespan'))
					sprite.z = Number(frames[j].children[s].getAttribute('z'))
					frm.sprites.push(sprite)
				
				}
				while (this.data[name].length < framenum-1) {
					this.data[name].push(prevFrm)
				}
				this.data[name].push(frm)
				prevFrm = frm
			}
			var spanners = []
			for (var f=0; f< this.data[name].length; f++)
			{	
				var frame = this.data[name][f]

				// make opies if all spanners and insert them in sprites
				for (var span=0; span<spanners.length; span++)
				{
					var spanner = spanners[span]
					if (spanner.framespan <= 1)
						continue

					var cpy = {}
					for (var key in spanner)
					{
						cpy[key] = spanner[key]
					}
					cpy.framespan = 1
					spanner.framespan--
					frame.sprites.push(cpy)
				}

				// sort the frames sprites by z
				frame.sprites.sort((a,b) => a.z - b.z)

				for (let s = 0; s < this.data[name][f].sprites.length; s++)
				{
					var sprite = this.data[name][f].sprites[s]
					if (sprite.framespan > 1)
					{
						spanners.push(sprite)
					}
				}
			}
		}
		//console.log("Data is: ", this.data)
    }

	getMovieClip(name) {
		if (name == undefined)
			name = "anim"
		if (this.data[name] == undefined)
		{
			console.error("getMovieClip No data for ", name)
			return undefined
		}
		var data = this.data[name]
		var mc = new MovieClip(this, name, data, this.myApp)
		mc.setFrame(0)
		return mc
	}

	getMovieClipData(name)
	{
		if (this.data[name] == undefined)
		{
			console.error("getMovieClipData No data for ", name)
			return undefined
		}
		return this.data[name]
	}
}

// Usage

window.FlashTube = FlashTube;