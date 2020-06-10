window.addEventListener("load", test, false);

//let SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
//let SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
//let SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

function test () {
	const canvas = document.getElementById('toh');
	const logElement = document.getElementById('log');
	const commandElement = document.getElementById('command');
	const listenElement = document.getElementById('listen');
	const clearElement = document.getElementById('clear');
	const ctx = canvas.getContext('2d');
	const width = canvas.width;
	const height = canvas.height;
	let towers, factGraph, ruleGraph, goalModule, factsModule, rulesModule;
	
	function log (message) {
		let atBottom = logElement.scrollHeight - 
			logElement.clientHeight <= logElement.scrollTop + 1;
			
		logElement.innerText += message + '\n';
		
		if (logElement.innerText.length > 100000)
			// discard old data to avoid memory overflow
			logElement.innerText =
				logElement.innerText.substr(logElement.innerText.length - 50000);
		
		if (atBottom)
			logElement.scrollTop = logElement.scrollHeight;
	}
	
	function say (message) {
		log(message);
		let t2s = new SpeechSynthesisUtterance(message);
		window.speechSynthesis.speak(t2s);
	}
	
	function viewButton (buttonID, viewID) {
		let button = document.getElementById(buttonID);
		let view = document.getElementById(viewID);
		button.innerText = "▼";
		view.style.height = "auto";
		
		view.show = function (text) {
			view.textContent = text;
			text = view.innerHTML;
			text = text.replace(/=>/ig, "<span class='implies'>=&gt;</span>");
			text = text.replace(/@[\w|\.|\-|\/|:]+/ig, function replace(match) {
				return "<span class='operator'>"+match+"</span>";
			});
			view.innerHTML = text.replace(/#.*/ig, function replace(match) {
				return "<span class='comment'>"+match+"</span>";
			});
		};
		
		button.parentElement.addEventListener("click", () => {
			if (button.innerText === "►") {
				button.innerText = "▼"
				view.style.height = "auto";
			} else {
				button.innerText = "►"
				view.style.height = "20px";
			}
		});
	}
	
	viewButton("factsButton", "facts");
	viewButton("rulesButton", "rules");
	
	function initialiseInput () {
		commandElement.disabled = true;
		commandElement.setAttribute("spellcheck", "false");
		commandElement.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				let words = commandElement.value.toLowerCase();
				words = words.replace(/[^\ \w]/g, '');
				words = words.replace(/\s\s+/g, ' ');
				words = words.split(" ");
				nlu(words);
				return false;
			}
		});
		
		clearElement.addEventListener("click", () => {
			commandElement.value = "";
			commandElement.focus();
		});
		
		listenElement.addEventListener("click", () => {
			listen();
		});
				
		let grammar = '#JSGF V1.0; grammar move; public <command> = ' +
			'move the (red|green|blue) disc to the (left|middle|right) peg;';
			
		if (!window.webkitSpeechRecognition) {
			listenElement.disabled = true;
			listenElement.style.display = "none";
			return;
		}
			
		let recognition = new webkitSpeechRecognition();
		let synthesis = window.speechSynthesis;
		
		recognition.lang = "en-US";
		recognition.continuous = true;
		
		let speechRecognitionList = new webkitSpeechGrammarList();
		speechRecognitionList.addFromString(grammar, 1);
		recognition.grammar = speechRecognitionList;
		
		recognition.onresult = function (event) {
			let result = event.results[0][0].transcript;
			commandElement.value = result;
			commandElement.focus();
			recognition.stop();
		};
		
		recognition.onspeechend = function() {
			recognition.stop();
		};
		
		recognition.onnomatch = function(event) {
			recognition.stop();
			say("Sorry, I did not recognise that");
		};
		
		recognition.onerror = function(event) {
			recognition.stop();
			say('Error occurred in recognition: ' + event.error);
		};
		
		let listen = function () {
			commandElement.value = "";
			recognition.start();
		}
	}

	// loads the chunk graphs and other resources as needed
	function loadResources(next) {
		let promises = [];
		let ready = null;
		
		promises.push(
    		new Promise((resolve, reject) => {
				fetch("facts.chk")
				.then((response) => response.text())
				.then(function (source) {
						factGraph = new ChunkGraph(source);
						document.getElementById("facts").show(source);
						log("loaded " + factGraph.chunkCount() + " facts");
						resolve(true);
				});
			})
    	);

		promises.push(
    		new Promise((resolve, reject) => {
				fetch("rules.chk")
				.then((response) => response.text())
				.then(function (source) {
						ruleGraph = new ChunkGraph(source);
						document.getElementById("rules").show(source);
						log("loaded " + ruleGraph.typeCount('rule') + " rules");
						resolve(true);
				});
			})
    	);
    	
		Promise.all(promises).then((results) => {			
			ready();			
		});
		
		return new Promise(resolve => {
			ready = resolve;
		});
	};

	function Peg (name, x, y, w, h) {
		let peg = this;
		
		peg.discs = [];
		
		peg.name = name;
		peg.x = x;
		peg.y = y+h;
		
		peg.add = function (disc) {
			if (peg.discs.length < 3) {
				peg.discs.push(disc);
				disc.peg = peg;
				disc.x = x;
				disc.y = y + h - 50 * (peg.discs.length - 1);
			}
		};
		
		peg.remove = function () {
			if (peg.discs.length > 0) {
				let disc = peg.discs.pop();
				disc.peg = undefined;
				return disc;
			}
		};
		
		peg.getNextLocation = function () {
			return y + h - 50 * peg.discs.length;
		};
		
		peg.moveable = function (disc) {
			if (peg.discs.length > 0) {
				let topDisc = peg.discs[peg.discs.length-1];
				return (disc === topDisc)
			}
		
			return false;
		}
		
		peg.draw = function () {
			ctx.fillStyle = '#835C3B';
			ctx.fillRect(x-w/2, y, w, h);
			
			for (let i = 0; i < peg.discs.length; ++i) {
				peg.discs[i].draw();
			}
		};
	}
	
	function Disc (name, colour, w, h) {
		let disc = this;
		disc.name = name;
		
		// dummy values overridden when added to peg
		disc.x = width/2;
		disc.y = height/2;
		
		disc.draw = function () {
			let x = disc.x;
			let y = disc.y;
			ctx.fillStyle = colour;
			ctx.fillRect(x-w/2, y-h, w, h);
			ctx.strokeStyle = '#000000'; //'#9e876a'
			ctx.beginPath();
			ctx.moveTo(x-w/2, y-h);
			ctx.lineTo(x-w/2, y);
			ctx.lineTo(x+w/2, y);
			ctx.lineTo(x+w/2, y-h);
			ctx.lineTo(x-w/2, y-h);
			ctx.stroke();
		}
	}
	
	function TowersOfHanoi (x, y, w, h) {
		let towers = this;
		let pegTop = 100;
		let pegBottom = y-h/2;
		let pegWidth = 20;
		let pegHeight = pegBottom - pegTop;
		
		towers.pegs = {};
		towers.discs = {};
		
	    let chunks = factGraph.types['disc'];
	    
	    for (let i = 0; i < chunks.length; ++i) {
	    	let chunk = chunks[i];
	    	let name = chunk.id;
	    	let props = chunk.properties;
	    	towers.discs[name] = new Disc(name, props.colour, props.width, props.height);
	    }
	    
	    chunks = factGraph.types['peg'];
		
		for (let i = 0; i < chunks.length; ++i) {
			let chunk = chunks[i];
	    	let name = chunk.id;
	    	let loc = chunk.properties.location;
	    	let x = (loc === "left" ? 175 : (loc === "middle" ? 400 : 625));
	    	let peg = towers[loc] = towers.pegs[name] =
	    			new Peg(name, x, pegTop, pegWidth, pegHeight);

	    	let ids = chunk.properties.discs;
	    	
	    	if (ids) {
	    		if (Array.isArray(ids)) {
	    			for (let i = 0; i < ids.length; ++i) {
	    				peg.add(towers.discs[ids[i]]);
	    			}
	    		} else {
	    			peg.add(towers.discs[ids]);
	    		}
	    	}
		}
		
		towers.moveable = function (disc) {
			return (towers.left.moveable(disc) ||
				towers.middle.moveable(disc) || towers.right.moveable(disc))
		};
				
		towers.draw = function () {
			ctx.save();
			ctx.fillStyle = 'rgb(250, 250, 250)';
			ctx.fillRect(0, 0, width, height);
			ctx.fillStyle = '#835C3B';
			ctx.fillRect(x-w/2, y-h/2, w, h);
			towers.left.draw();
			towers.middle.draw();
			towers.right.draw();
			ctx.restore();
		}
	}
	
	function animate (disc, x1, y1, x2, y2 , interval) {
		let t0 = null;
		
		let step = function (t) {
			if (t0 === null)
				t0 = t;
				
			if (t <= t0 + interval) {
				let frac = (t-t0)/interval;
				disc.x = x1 + (x2-x1)*frac;
				disc.y = y1 + (y2-y1)*frac;
			
				towers.draw();
				disc.draw();
				window.requestAnimationFrame(step);
			} else {
				disc.moved();
				disc.moved = undefined;
			}
		}
		window.requestAnimationFrame(step);
	}
	
	function shunt (disc, x1, y1, x2, y2, interval) {
		if (interval < 0.01)
			return Promise.resolve();
				
		let promise = new Promise(resolve => {
			disc.moved = resolve;
		});
			
		animate(disc, x1, y1, x2, y2, interval * 1000);
		return promise;
	}
	
	function move(disc, toPeg) {
		let fromPeg = disc.peg;
		fromPeg.remove(disc);
		const speed = 200;
		let top = 80;
		let done;
		
		// current position
		let x1 = disc.x;
		let y1 = disc.y;
		
		// target position
		let x2 = toPeg.x;
		let y2 = toPeg.getNextLocation();
		let t1 = (y1-top)/speed;
		let t2 = Math.abs(x2-x1)/speed;
		let t3 = (y2-top)/speed;
		
		// animate disc motion to top
		shunt(disc, x1, y1, x1, top, t1).then(() => {
			// then across to target pag
			shunt(disc, x1, top, x2, top, t2).then(() => {
				// and down to its new location
				shunt(disc, x2, top, x2, y2, t3).then(() => {
					toPeg.add(disc);
					towers.draw();
					done();
				});
			});
		});
				
		
		let promise = new Promise(resolve => {
			done = resolve;
		});
		
		return promise;
	}
	
	// the first baby step towards a dependency parser that
	// concurrently processes syntax and semantics one word
	// at a time, using the previous words to compute the
	// likelihood of different parts of speech for the next
	// word, along with the dialogue history and semantic
	// knowledge to then select the word sense, and later to
	// resolve references and where to attach prepositions.
	// the parser should track statistics to ensure that
	// competence in understanding drives performance in
	// natural language generation

	
	// this version assumes each word has a single
	// part of speech and a single word sense
	
	
	function nlu (words) {
		let queue = [];
		let index = 0, word, chunk;
		
		let nextWord = function () {
			if (index < words.length) {
				word = words[index++];
				return word;
			}
			
			return word = null;
		};
		
		let classifyWord = function (word) {
			let lexicon = factGraph.chunks[word];
			if (lexicon)
				return lexicon.properties.pos;
				
			say("Sorry, I don't know the word " + word);
			throw new Error("unknown word");
		}
		
		let getAdjectives = function () {
			while (word) {
				let pos = classifyWord(word);
				
				if (pos !== "adj")
					break;
					
				let props = chunk.properties.adj;
				
				if (props) {
					if (!Array.isArray(props))
						props = [props];
						
					chunk.properties.adj = props.push(word);
				} else {
					chunk.properties.adj = word;
				}
				
				nextWord();
			}
		};
		
		let getNouns = function () {
			while (word) {
				let pos = classifyWord(word);
				
				if (pos !== "noun")
					break;
					
				let props = chunk.properties.nouns;
				
				if (props) {
					if (!Array.isArray(props))
						props = [props];
						
					chunk.properties.noun = props.push(word);
				} else {
					chunk.properties.noun = word;
				}
				
				nextWord();
			}
		};
		
		let reduce = function () {
			while (queue.length >= 2) {
				let top = queue.shift();	// most recent chunk
				let prev = queue[0];		// the chunk before that
			
				if (prev.type === "verb") {
					if (top.type === "np") {
						prev.properties.subject = top.id;
					} else if (top.type === "prep") {
						let np = top.properties.np;
						np = factsModule.graph.chunks[np]
						prev.properties[top.properties.word] = np.id;

						// forget prep chunk as no longer referenced
						factsModule.graph.remove(top);
					}
				} else if (prev.type === "prep") {
					if (top.type === "np") {
						prev.properties.np = top.id;
					}
				}
			}
		};
		
		nextWord();
		
		try {
			while (word) {
				let pos = classifyWord(word);
			
				if (pos === "verb" || pos === "prep") {
					chunk = new Chunk(pos);
					factsModule.graph.add(chunk);
					chunk.properties.word = word;
					queue.unshift(chunk);
					nextWord()
					continue; 
				}
			
				if (pos === "det") {
					chunk = new Chunk("np");
					factsModule.graph.add(chunk);
					chunk.properties.det = word;
					queue.unshift(chunk);
					nextWord();
					getAdjectives();
					getNouns();
					reduce();
					continue; 
				}
			
			}
		} catch (e) {
			log("exception: " + e.name + ': ' + e.message);
			return;
		}
		
		log("queue length is " + queue.length);
		
		if (queue.length > 0)
			log("parsed to " + queue[0]);
			
		// interpret {utterance ?id}
		chunk = new Chunk("interpret");
		chunk.properties.utterance = queue[0].id;
		factsModule.graph.add(chunk);
		goalModule.pushBuffer(chunk);
		ruleEngine.run();
	}
	
	let actions = {
		move: function (action, properties) {
			let disc = towers.discs[properties.disc];
			let peg = towers.pegs[properties.peg];
			
			if (towers.moveable(disc))
				move(disc, peg);
			else {
				say("Sorry, you can't move discs when they are below another disc");
			}
		}
	};
	
	let ruleEngine = new RuleEngine(log);
	
	initialiseInput();  // the input field
	
	// load the facts and rules
	loadResources().then(() => {
		console.log("*** Facts ***")
		console.log(factGraph.toString());
		console.log("*** Rules ***")
		console.log(ruleGraph.toString());
		commandElement.disabled = false;
		commandElement.focus();
		
		towers = new TowersOfHanoi (width/2, height - 30, width-20, 30);
	    towers.draw();
		
		rulesModule = ruleEngine.addModule('rules', ruleGraph);
		factsModule = ruleEngine.addModule('facts', factGraph);
		goalModule = ruleEngine.addModule('goal', new ChunkGraph(), actions);
		//ruleEngine.setGoal('interpret {utterance v1}');
		//ruleEngine.run();
	});

/*
	// animates moving all 3 discs to right peg
	let play = async function () {
		await move(disc3, towers.right);
		await move(disc2, towers.middle);
		await move(disc3, towers.middle);
		await move(disc1, towers.right);
		await move(disc3, towers.left);
		await move(disc2, towers.right);
		await move(disc3, towers.right);
	};
	
	play();
*/
}