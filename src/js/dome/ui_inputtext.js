import { Container, Point } from 'pixi.js';
import { Text } from 'pixi.js';
import { ComponentTypes } from './ui_componenttypes.js';
import { Button } from '@pixi/ui';
import { Graphics } from 'pixi.js';
import { Howl } from 'howler';
import { NineSliceSprite } from 'pixi.js';
import { Texture } from 'pixi.js';



export class UIInputText extends Container
{
	dialog = undefined
	def = undefined
	constructor(dialog, def, compDef, payload)
	{
		super()
		this.dialog = dialog
		this.def = def
		//var ipt = new Container()

		var plane9 = new NineSliceSprite(
		{
			texture: Texture.from(compDef.bg.source), 
			leftWidth: compDef.bg.left, 
			rightWidth: compDef.bg.right, 
			topHeight: compDef.bg.top, 
			bottomHeight: compDef.bg.bottom
		}) ;

		var plane9act = new NineSliceSprite(
		{
			texture: Texture.from(compDef.bg_active.source),
			leftWidth: compDef.bg_active.left, 
			rightWidth: compDef.bg_active.right, 
			topHeight: compDef.bg_active.top, 
			bottomHeight: compDef.bg_active.bottom
		}) ;

		//this.addChild(ipt)
		//plane9.anchor.set(0.5)
		plane9.setSize(def.width, def.height)
		plane9.pivot.set(def.width / 2, def.height / 2)
		plane9act.setSize(def.width, def.height)
		plane9act.pivot.set(def.width / 2, def.height / 2)
			//etup(texture);
		//});
		this.addChild(plane9)
		this.addChild(plane9act)
		this.bg = plane9
		this.bgactive = plane9act
		plane9act.visible = false

		this.bg.interactive = true
		this.bg.buttonMode = true
		this.bg.on("pointerdown", () => {
			//this.activate(true)
			this.input.focus()
			//maintainActiveResizing(1)
		})

		var textdef = dialog.ui.componentDefinitions[compDef.text]
		var styl = {}
		for (var s in textdef.style)
		{
			styl[s] = textdef.style[s]
		}
		if (def.wordWrap!= undefined)
		{
			styl.wordWrap = def.wordWrap
			
		}
		if (def.wordWrapWidth != undefined)
		{
			styl.wordWrapWidth = def.wordWrapWidth
		}
		
		var text = new Text(dialog.getTextString(def.text, payload), styl)
		text.anchor.set(0.5)
		this.addChild(text)
		this.textfield = text


		// 3. Create a hidden HTML input
		const input = document.createElement("input");
		input.type = "text";
		input.style.position = "absolute";
		input.style.opacity = "1"; // Hidden but functional
		input.style.zIndex = "10";
		input.style.backgroundColor = "transparent";
		input.style.border = "none";
		input.style.fontSize = "24px";
		input.style.fontFamily = "Arial";
		input.style.fontWeight = "bold";
		input.style.color = "#000000";
		input.style.left = -5000 + "px";
		input.value = "TEKST"
		// centered
		input.style.textAlign = "center";
		this.value =dialog.getTextString(def.text, payload)
		document.body.appendChild(input);
		this.input = input;
		this.def = def
		newTween(this, {}, 0.1).onDone(() => {	
			//this.activate(true)
		})
	

		// Bind methods once so we can remove them properly later
		this.onInput = this.onInput.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onOutsideClick = this.onOutsideClick.bind(this);
		this.inputblur = this.inputblur.bind(this);
		this.inputfocus = this.inputfocus.bind(this);

		//return ipt
		input.addEventListener("blur", this.inputblur.bind(this));
		input.addEventListener("focus", this.inputfocus.bind(this));

	}

	set text(value)
	{
		//console.error("Who does this?")
		this.setValue(value)
	}

	setValue(value)
	{
		if (value == undefined)
		{
			console.error("Value is undefined")
			return
		}
		this.value = value
		this.textfield.text = value
		this.input.value = value
	}

	deactivate()
	{
		if (!this.alreadyActivated) return
		this.alreadyActivated = false
		
		console.warn("Deactivate the input")
		this.bg.visible = true
		this.bgactive.visible = false
		
		this.gotFocus = false
		this.input.style.left = -5000 + "px";
		window.inputInFocus = false

		this.input.removeEventListener("input", this.onInput);
		this.input.removeEventListener("keydown", this.onKeyDown);
		document.removeEventListener("pointerdown", this.onOutsideClick);
		if  (this.input.value != this.preActivateValue)
		{
			this.value = this.input.value
			this.dialog.buttonPress(this.def.res, this)
		}
		
	}

	activate(selectit)
	{
		//console.warn("Activate the input")
		/*8
		this.bg.visible = false
		this.bgactive.visible = true
		
		this.positionInputField()
		var input = this.input
		input.value = this.value
		input.addEventListener("input",this.onInput.bind(this));
		if (selectit)
		{
			input.focus()
			input.select()
		}	
		input.addEventListener("keydown", this.onKeyDown.bind(this));
		*/
		if (this.alreadyActivated) return
		this.alreadyActivated = true
		console.warn("Activate the input");
		this.bg.visible = false;
		this.bgactive.visible = true;
		
		this.positionInputField();
		var input = this.input;
		this.preActivateValue = this.value;
		input.value = this.value;
		input.addEventListener("input", this.onInput);
		input.addEventListener("keydown", this.onKeyDown);
		document.addEventListener("pointerdown", this.onOutsideClick);
	
		if (selectit) {
			setTimeout(() => {
				console.warn("Selecting all text");
				input.focus();
				input.setSelectionRange(0, input.value.length); // Select all text
			}, 10); // Small delay to ensure proper focus handling
		}    
	}

	onOutsideClick(e) {
		// Don't deactivate if clicking on the input field itself
		if (e.target === this.input || this.input.contains(e.target)) {
			return;
		}
		this.deactivate();
	}

	onKeyDown(e) {
		console.log("Key down: ", e.key);
		if (e.key === "Enter") {
			console.log("Enter pressed, deactivating input.");
			this.deactivate();
		}
	}

	onInput  (e) 
	{
		this.textfield.text = this.input.value || "Tap to enter text";
		this.value = this.input.value
		
		console.log("Input: ", this.input.value)
	}			

	inputblur()
	{
		//maintainActiveResizing(2)
		console.warn("Input field lost focus");
		//this.deactivate()
	}
	inputfocus()
	{
		//maintainActiveResizing(2)
		this.activate(true)
		console.log("Input field got focus");
	}
	positionInputField()
	{
		if (!this.bgactive.visible)
			return

		var input = this.input
		if (!input)
			return	
		
		const rect = this.dialog.ui.app.view.getBoundingClientRect();

		// find my own absolute position
		var pos = this.getGlobalPosition(new Point())
		//console.log("Position: ", pos)
		
		var scl = this.getGlobalScale()

		var w = this.def.width * scl.x
		var h = this.def.height * scl.y
		
		pos.x -=w/2
		pos.y -=h/2
		input.style.fontSize = Math.floor(scl.x * 36) + "px";
		input.style.left = `${rect.left }px`; // Match Pixi position
		input.style.top = `${rect.top }px`;
		input.style.left = pos.x + "px"
		input.style.top = pos.y + "px"
		input.style.width = w + "px";
		input.style.height = h + "px";
		//input.focus();
		//i//nput.focus();
		this.gotFocus = true
		window.inputInFocus = true
	}

	getGlobalScale() {
		let globalScaleX = 1;
		let globalScaleY = 1;
		
		let current = this;
	  
		// Traverse up the parent hierarchy and multiply scales
		while (current) {
		  globalScaleX *= current.scale.x;
		  globalScaleY *= current.scale.y;
		  current = current.parent;
		}
	  
		return new Point(globalScaleX, globalScaleY);
	  }

	destroy(options)
	{
		this.input.removeEventListener("focus", this.inputfocus);
		this.input.removeEventListener("blur", this.inputblur);
		this.input.removeEventListener("input",this.onInput);
		this.input.remove()
		this.input = undefined
		window.inputInFocus = false
		maintainActiveResizing(2)
		//this.bg.visible = true
		super.destroy(options)
		//this.bgactive.visible = false
	}

	resize()
	{
		this.positionInputField()
	}
}
