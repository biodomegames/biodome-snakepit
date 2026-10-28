
export class Perlin {
	constructor(seed) {
		this.seed = seed;
		this.p = this._generatePermutation();
	}

	_generatePermutation() {
		const perm = new Array(256);
		const random = this._seededRandom();
		for (let i = 0; i < 256; i++) {
			perm[i] = i;
		}
		for (let i = 255; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			[perm[i], perm[j]] = [perm[j], perm[i]];
		}
		return [...perm, ...perm];
	}

	_seededRandom() {
		let seed = this.seed;
		return function () {
			seed = (seed * 16807) % 2147483647;
			return (seed - 1) / 2147483646;
		};
	}

	_fade(t) {
		return t * t * t * (t * (t * 6 - 15) + 10);
	}

	_lerp(a, b, t) {
		return a + t * (b - a);
	}

	_grad(hash, x, y, z) {
		const h = hash & 15;
		const u = h < 8 ? x : y;
		const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
		return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
	}

	noise(x, y = 0, z = 0) {
		const xi = Math.floor(x) & 255;
		const yi = Math.floor(y) & 255;
		const zi = Math.floor(z) & 255;

		const xf = x - Math.floor(x);
		const yf = y - Math.floor(y);
		const zf = z - Math.floor(z);

		const u = this._fade(xf);
		const v = this._fade(yf);
		const w = this._fade(zf);

		const aaa = this.p[this.p[this.p[xi] + yi] + zi];
		const aba = this.p[this.p[this.p[xi] + yi + 1] + zi];
		const aab = this.p[this.p[this.p[xi] + yi] + zi + 1];
		const abb = this.p[this.p[this.p[xi] + yi + 1] + zi + 1];
		const baa = this.p[this.p[this.p[xi + 1] + yi] + zi];
		const bba = this.p[this.p[this.p[xi + 1] + yi + 1] + zi];
		const bab = this.p[this.p[this.p[xi + 1] + yi] + zi + 1];
		const bbb = this.p[this.p[this.p[xi + 1] + yi + 1] + zi + 1];

		const x1 = this._lerp(
			this._grad(aaa, xf, yf, zf),
			this._grad(baa, xf - 1, yf, zf),
			u
		);
		const x2 = this._lerp(
			this._grad(aba, xf, yf - 1, zf),
			this._grad(bba, xf - 1, yf - 1, zf),
			u
		);
		const y1 = this._lerp(x1, x2, v);

		const x3 = this._lerp(
			this._grad(aab, xf, yf, zf - 1),
			this._grad(bab, xf - 1, yf, zf - 1),
			u
		);
		const x4 = this._lerp(
			this._grad(abb, xf, yf - 1, zf - 1),
			this._grad(bbb, xf - 1, yf - 1, zf - 1),
			u
		);
		const y2 = this._lerp(x3, x4, v);

		return (this._lerp(y1, y2, w) + 1) / 2; // Normalize to [0, 1]
	}
}

// Example Usage
//const perlin = new Perlin(12345); // Replace with your desired seed
//console.log(perlin.noise(1.3, 4.7, 0.5)); // Perlin noise value at x=1.3, y=4.7, z=0.5
