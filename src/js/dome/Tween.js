var tweenCountId = 0

/** @param {number} timeSeconds */
function durationMsFromSeconds(timeSeconds) {
	const ms = timeSeconds * 1000
	return ms === 0 ? 1 : ms
}

export class Tween {//extends EventEmitter{
	constructor(target, to, time) //target, manager){
	{
		//super();
		this.id = tweenCountId++
		this.clear();
		this._configure(target, to, time)
		this.addTo(tweenManager);
		this.start();
	}

	/** Shared by constructor and TweenManager pooled {@link newTween}. */
	_configure(target, to, timeSeconds) {
		this.target = target;
		this.to(to);
		this.time = durationMsFromSeconds(timeSeconds);
	}

	addTo(manager){
		this.manager = manager;
		this.manager.addTween(this);
		return this;
	}

	chain(tween){
		if(!tween)tween = newTween(this.target);
		this._chainTween = tween;
		return tween;
	}
	delay(time){
		this._delay = time * 1000;
		return this;
	}
	onDone(cb){
		this.onDoneCb = cb;
		return this;
	}
	onUpdate(cb){
		this.onUpdateCb = cb;
		return this;
	}
	start(){
		this.active = true;
		return this;
	}

	stop(){
		this.active = false;
		//this.emit('stop');
		return this;
	}

	ease(e){
		this.easing = e
		return this;
	}

	to(data){
		this._to = data;
		return this;
	}

	from(data){
		this._from = data;
		return this;
	}

	/*remove(){
		if(!this.manager)return this;
		this.manager.removeTween(this);
		return this;
	}*/

	clear(){
		this.time = 0;
		this.target = null;
		this.active = false;
		this.easing = Easing.linear;
		this.expire = false;
		this.repeat = 0;
		this.loop = false;
		this._delay = 0;
		this.pingPong = false;
		this.isStarted = false;
		this.isEnded = false;
		this.onUpdateCb = null;
		this.onDoneCb = null;
		this._to = null;
		this._from = null;
		this._delayTime = 0;
		this._elapsedTime = 0;
		this._repeat = 0;
		this._pingPong = false;

		this._chainTween = null;

		this.path = null;
		this.pathReverse = false;
		this.pathFrom = 0;
		this.pathTo = 0;
	}

	reset(){
		this._elapsedTime = 0;
		this._repeat = 0;
		this._delayTime = 0;
		this.isStarted = false;
		this.isEnded = false;

		if(this.pingPong && this._pingPong){
			let _to = this._to;
			let _from = this._from;
			this._to = _from;
			this._from = _to;
			this._pingPong = false;
		}

		return this;
	}

	update(delta, deltaMS){
		if (!this.target) 
		{
			this.active = false;
			return;
		}
		if(!this._canUpdate() && (this._to||this.path))return;
		let _to, _from;
		if(this._delay > this._delayTime){
			this._delayTime += deltaMS;
			return;
		}
 
		//his.time += delta;

		if(!this.isStarted){
			this._parseData();
			this.isStarted = true;
			//this.emit('start');
		}

		let time = (this.pingPong) ? this.time/2 : this.time;


		this._elapsedTime += deltaMS;
		let ended = false;
		
		if (this._elapsedTime > time )
		{
			this._elapsedTime = time;
			ended = true;
		}
		this._apply(this._elapsedTime);

		if(ended){
				if(this.pingPong && !this._pingPong){
					this._pingPong = true;
					_to = this._to;
					_from = this._from;
					this._from = _to;
					this._to = _from;

					if(this.path){
						_to = this.pathTo;
						_from = this.pathFrom;
						this.pathTo = _from;
						this.pathFrom = _to;
					}

					//this.emit('pingpong');
					this._elapsedTime = 0;
					return;
				}

				if(this.loop || this.repeat > this._repeat){
					this._repeat++;
					//this.emit('repeat', this._repeat);
					this._elapsedTime = 0;

					if(this.pingPong&&this._pingPong){
						_to = this._to;
						_from = this._from;
						this._to = _from;
						this._from = _to;

						if(this.path){
							_to = this.pathTo;
							_from = this.pathFrom;
							this.pathTo = _from;
							this.pathFrom = _to;
						}

						this._pingPong = false;
					}
					return;
				}

				this.isEnded = true;
				this.active = false;
				//this.onUpdate = undefined
				//this.emit('end');
				if (this.onDoneCb) {
					var before = performance.now();
					this.onDoneCb();
					var after = performance.now();
					this.manager.dbgTimeUsedInCallbacks += after - before;
				}

				if(this._chainTween){
					this._chainTween.addTo(this.manager);
					this._chainTween.start();
				}
			}
		if (this.onUpdateCb && !this.isEnded)
		{
			this.onUpdateCb(this._elapsedTime, delta);
		}
			
	}

	_parseData(){
		if(this.isStarted)return;

		if(!this._from)this._from = {};
		_parseRecursiveData(this._to, this._from, this.target);

		if(this.path){
			let distance = this.path.totalDistance();
			if(this.pathReverse){
				this.pathFrom = distance;
				this.pathTo = 0;
			}else{
				this.pathFrom = 0;
				this.pathTo = distance;
			}
		}
	}

	_apply(time){
		for (let k in this._to)
		{
			let fromValue = this._from[k];
			let deltaValue = this._to[k] - this._from[k];
			let duration = this.time;
			let factor = duration > 0 ? time/duration : 1;
			//console.log("Tween apply", k, b, c, d, t)
			if (!this.target) return
			try
			{
				this.target[k] = fromValue+(deltaValue*this.easing(factor));
			}
			catch(e){
			}
		}

		if(this.path){
			let time = (this.pingPong) ? this.time/2 : this.time;
			let b = this.pathFrom;
			let c = this.pathTo - this.pathFrom;
			let d = time;
			let t = this._elapsedTime/d;

			let distance = b+(c*this.easing(t));
			let pos = this.path.getPointAtDistance(distance);
			this.target.position.set(pos.x, pos.y);
		}
	}

	_canUpdate(){
		return (/*this.time && */this.active && this.target);
	}


}

function _parseRecursiveData(to, from, target){
	for(let k in to){
		if(from[k] !== 0 && !from[k]){
			//if(_isObject(target[k])){
			//	from[k] = JSON.parse(JSON.stringify(target[k]));
			//	_parseRecursiveData(to[k], from[k], target[k]);
			//}else{
			if (target == undefined || from == undefined)
				continue
			if (target == null || from == null)
				continue
			try{
				from[k] = target[k];
			}
			catch(e){
				//console.error("Error parsing data", e)
			}
			
			//}
		}
	}
}

export const Easing = {
	linear: function(t){
			return t;
		
	},

	inQuad: function(t){
			return t*t;
		
	},

	outQuad: function(t){
			return t*(2-t);
		
	},

	inOutQuad: function(t){
			//console.log(t)
			t *= 2;
			if ( t < 1 ) return 0.5 * t * t;
			return - 0.5 * ( --t * ( t - 2 ) - 1 );
		
	},

	inCubic: function (t) {
			return t * t * t;
		
	},

	outCubic: function(t){
			return --t * t * t + 1;
		
	},

	inOutCubic: function(t){
		 
			t *= 2;
			if ( t < 1 ) return 0.5 * t * t * t;
			t -= 2
			return 0.5 * ( t * t * t + 2 );
		
	},

	inQuart: function(t){
			return t * t * t * t;
		
	},

	outQuart: function(t){
			return 1 - ( --t * t * t * t );
		
	},

	inOutQuart: function(t){
			t *= 2;
			if ( t < 1) return 0.5 * t * t * t * t;
			t -= 2;
			return - 0.5 * ( t * t * t * t - 2 );
		
	},

	inQuint: function(t){
			return t * t * t * t * t;
		
	},

	outQuint: function(t){
			return --t * t * t * t * t + 1;
		
	},

	inOutQuint: function(t){
			t *= 2;
			if ( t < 1 ) return 0.5 * t * t * t * t * t;
			t -= 2;
			return 0.5 * ( t * t * t * t * t + 2 );
		
	},

	inSine: function(t){
			return 1 - Math.cos( t * Math.PI / 2 );
		
	},

	outSine: function(t){
			return Math.sin( t * Math.PI / 2 );
		
	},

	inOutSine: function(t){
			return 0.5 * ( 1 - Math.cos( Math.PI * t ) );
		
	},

	inExpo: function(t){
			return t === 0 ? 0 : Math.pow( 1024, t - 1 );
		
	},

	outExpo: function(t){
			return t === 1 ? 1 : 1 - Math.pow( 2, - 10 * t );
		
	},

	inOutExpo: function(t){
			if ( t === 0 ) return 0;
			if ( t === 1 ) return 1;
			t *= 2;
			if ( t < 1 ) return 0.5 * Math.pow( 1024, t - 1 );
			return 0.5 * ( - Math.pow( 2, - 10 * ( t - 1 ) ) + 2 );
		
	},

	inCirc: function(t){
			return 1 - Math.sqrt( 1 - t * t );
		
	},

	outCirc: function(t){
			return Math.sqrt( 1 - ( --t * t ) );
		
	},

	inOutCirc: function(t){
			t *= 2
			if ( t < 1) return - 0.5 * ( Math.sqrt( 1 - t * t) - 1);
			return 0.5 * ( Math.sqrt( 1 - (t - 2) * (t - 2)) + 1);
	},

	inBack: function(t){
		const s = 1.70158;
		return t * t * ( ( s + 1 ) * t - s );
	},

	outBack: function(t){
			const s = 1.70158;
			return --t * t * ( ( s + 1 ) * t + s ) + 1;
		
	},

	inOutBack: function(t){
			const s = 1.70158 * 1.525;
			t *= 2;
			if ( t < 1 ) return 0.5 * ( t * t * ( ( s + 1 ) * t - s ) );
			return 0.5 * ( ( t - 2 ) * (t-2) * ( ( s + 1 ) * (t-2) + s ) + 2 );
		
	},

	inBounce: function(t){
			return 1 - Easing.outBounce( 1 - t );
		
	},

	outBounce: function(t){
			if ( t < ( 1 / 2.75 ) ) {
				return 7.5625 * t * t;
			} else if ( t < ( 2 / 2.75 ) ) {
				t = ( t - ( 1.5 / 2.75 ) );
				return 7.5625 * t * t + 0.75;
			} else if ( t < ( 2.5 / 2.75 ) ) {
				t = (t - ( 2.25 / 2.75 ));
				return 7.5625 * t * t + 0.9375;
			} else {
				t -= ( 2.625 / 2.75 );
				return 7.5625 * t * t + 0.984375;
			}
		
	},

	inOutBounce: function(t){
			if ( t < 0.5 ) return Easing.inBounce( t * 2 ) * 0.5;
			return Easing.outBounce( t * 2 - 1 ) * 0.5 + 0.5;
		
	},


};


export default class TweenManager {
	constructor(){
			this.tweens = [];
			this._tweensToDelete = [];
			this._last = 0;
			this.numTweens = 0;
			this.numActiveTweens = 0
	}

	update(delta){
		//console.log("TweenManager update")
		this.dbgTimeUsedInCallbacks = 0;

		let deltaMS;
		if(!delta && delta !== 0){
			deltaMS = this._getDeltaMS();
			delta = deltaMS/1000;
		}else{
			deltaMS = delta*1000;
		}

		this.numActiveTweens = 0;

		for(let i = this.numTweens-1 ; i>=0; i--){
			let tween = this.tweens[i];
			if(tween.active){
				tween.update(delta, deltaMS);
				this.numActiveTweens++;
				if(tween.isEnded){
					tween.clear()
				}
			}
		}
		while (this.numTweens > 0 && !this.tweens[this.numTweens-1].active)
		{
			this.tweens[this.numTweens-1].clear()
			this.numTweens--;
		}
	}

	getTweensForTarget(target){
		let tweens = [];
		for(let i = 0; i < this.tweens.length; i++){
			if(this.tweens[i].target === target)tweens.push(this.tweens[i]);
		}

		return tweens;
	}

	/**
	 * Reset and start a tween from the pool (or grow the pool). Prefer {@link newTween} in game code.
	 */
	createTween(target, to, time){
		if (this.numTweens < this.tweens.length) {
			const tween = this.tweens[this.numTweens++];
			this._initPooledTween(tween, target, to, time);
			return tween;
		}
		for (let i = 0; i < this.numTweens; i++) {
			if (!this.tweens[i].active) {
				this._initPooledTween(this.tweens[i], target, to, time);
				return this.tweens[i];
			}
		}
		this.tweens.push(new Tween(target, to, time));
		this.numTweens++;
		return this.tweens[this.numTweens - 1];
	}

	_initPooledTween(tween, target, to, timeSeconds) {
		tween.clear();
		tween._configure(target, to, timeSeconds);
		tween.manager = this;
		tween.addTo(this);
		tween.start();
	}

	addTween(tween){
		//tween.manager = this;
		//this.tweens.push(tween);
		//console.warn("Added tween", this.tweens.length)
	}

	removeTween(tween){
		this._tweensToDelete.push(tween);
	}

	_remove(tween){
		let index = this.tweens.indexOf(tween);
		if(index !== -1)this.tweens.splice(index, 1);
	}

	_getDeltaMS(){
		if(this._last === 0)this._last = Date.now();
		let now = Date.now();
		let deltaMS = now-this._last;
		this._last = now;
		return deltaMS;
	}

	dumpTweenStats(){
		console.log("========== TweenManager stats: num: ", this.numTweens, "numactive: ", this.numActiveTweens," array len: ", this.tweens.length)
		for(let i = 0; i < this.tweens.length; i++){
			if(this.tweens[i].active){
				if (!this.tweens[i].target)
					console.log("Tween ", i, " NO TARGET")
				else
					console.log("Tween ", i, " target: ", this.tweens[i].target.name, this.tweens[i].target)
			}
		}
		console.log("========== TweenManager stats: end")
	}
}

/** Acquire a tween from the global {@link tweenManager} pool (reuses finished instances). */
export function newTween(target, to, time){
	return tweenManager.createTween(target, to, time);
}

window.newTween = newTween;


window.TweenManager = TweenManager;
window.tweenManager = new TweenManager();
window.Tween = Tween;
window.Easing = Easing;


