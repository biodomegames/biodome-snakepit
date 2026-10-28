export class NameGenerator
{
	library = {}


	constructor()
	{
		// this is a singleton	
		if (NameGenerator.instance)
		{
			return NameGenerator.instance
		}
		var lib = this.library

		lib.firstSyllables = {}
		lib.firstSyllables.a = ["dav", "ben", "fra", "ste", 'tho', 'ke', 'rob', 'ro', 'hen', "ge", "pe" ]
		lib.firstSyllables.a.push("bar", "gra", "deb", "cha", "jen", "kar", "vio", "ti", "ton")
		lib.firstSyllables.b = []
		lib.firstSyllables.b.push("ad", "and", "eth", "eva", "isa", "eli", "oli", "osc", "ute")
		lib.firstSyllables.b.push("ali", "em", "oli", "eva", "ela", "ubu")


		lib.midSyllables = {}
		lib.midSyllables.a = [ "ja", "nk", "ven", "mas", "vin", "ert", "bert", "son", "ri", "bis"]
		lib.midSyllables.a.push("ba", "rlo",  "let", "ffa", "lo", "tori")
		lib.midSyllables.b = []
		lib.midSyllables.b.push("am", "id", "ys", "ora", "ya", "as", "ia", "al", "el", "ar")
		lib.midSyllables.b.push("ella", "ily", "un", "an", "or", "ur", "ir", "er", "ol")

	}

	mulberry32(seed) {
		return function() {
		  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
		  let t = seed ^ seed >>> 15;
		  t = Math.imul(t, 1 | t);
		  t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
		  return ((t ^ t >>> 14) >>> 0) / 4294967296;
		};
	  }

	getConfigSeed(face, ears, nose, hair, eyes, mouth)
	{

		return face + ears*100 + nose*10000 + hair*1000000 + eyes*100000000 + mouth*10000000000
	}

	endsOnVowel(str)
	{
		var last = str[str.length-1]
		return last == "a" || last == "e" || last == "i" || last == "o" || last == "u"
	}

	isEndLetterRepeatable(str)
	{
		var last = str[str.length-1]
		return last == "b" || last == "d" || last == "g" || last == "l" || last == "m" || last == "n" || last == "r" || last == "t"
	}

	getRandomName(seed)
	{
		// number of syllables
		let randor = this.mulberry32(seed)
		console.log("randor: ", randor(), " ", seed)
		this.syllables = 2 + Math.floor(randor()*1)

		let startvowel =randor() > 0.5

		let prevEndOnVowel = !startvowel
		let list = []
		if (startvowel)
		{
			list = this.library.firstSyllables.a
			//list.push("bar", "gra", "deb", "cha", "jen", "kar", "vio", "Ti", "To")	
		}
		else 
		{
			list = this.library.firstSyllables.b
			//list = ["bo",  "mi", "je", "go", "han", "ja", "le", "mi", "no", "pe", "ro", "sa", "to", "va", "wa",  "za", "wra", ]
		}
		
		var ret = ""
		ret += list[Math.floor(randor()*list.length)]

		
		prevEndOnVowel = this.endsOnVowel(ret)

		if (!this.isEndLetterRepeatable && randor() > 0.5)
		{
			// repeat last consonant
			ret += ret[ret.length-1]

		}

		for (var s = 1; s < this.syllables; s++)
		{
			prevEndOnVowel = this.endsOnVowel(ret)
			
			if (s == 1)
			{
				if (prevEndOnVowel)
					list = this.library.midSyllables.a
				else
					list = this.library.midSyllables.b				  
				  
			}
			else if (s > 1)
			{
				if (prevEndOnVowel)
					list = this.library.midSyllables.a
				else
					list = this.library.midSyllables.b
				  
			}

			ret += list[Math.floor(randor()*list.length)]
			/*if (!prevEndOnVowel && s < this.syllables-1 && randor() > 0.5)
			{
				// repeat last consonant
				ret += ret[ret.length-1]
			}*/
		}
		return ret
	}

}
NameGenerator.instance = new NameGenerator()