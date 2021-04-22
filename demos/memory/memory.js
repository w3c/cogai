window.addEventListener("load", test, false);

//let SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
//let SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
//let SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

function test () {
	const PARSE_ALL = 0;
	const PARSE_CHUNK = 1;
	const logElement = document.getElementById('log');
	const clearLog = document.getElementById('clear');
	const clusterButton = document.getElementById('cluster');
	const canvas = document.getElementById('decay');
	const ctx = canvas.getContext('2d');
	const width = canvas.width;
	const height = canvas.height;
	const tmax = 100;
	
	let factGraph, ruleGraph, goalModule, factsModule, rulesModule;
	let man = true, woman = false, timeOfDay = "morning";
	
	function log(message)  {
		//console.log(message);
	}
	
	function show (message) {
		if (Array.isArray(message)) {
			message = message.join(' ');
		}
	
		let atBottom = logElement.scrollHeight - 
			logElement.clientHeight <= logElement.scrollTop + 1;
			
		logElement.innerText += message + '\n';
		
		if (logElement.innerText.length > 10000)
			// discard old data to avoid memory overflow
			logElement.innerText =
				logElement.innerText.substr(logElement.innerText.length - 5000);
		
		if (atBottom)
			logElement.scrollTop = logElement.scrollHeight;
	}
	
	function clear () {
		logElement.innerText = "";
	}
	
	clearLog.addEventListener("click", () =>  {
		clear();
	});
	
	clusterButton.addEventListener("click", () =>  {
		let horse = factGraph.chunks['horse'];
		// set goal to execute clustering
		let goal = new Chunk("start");
		goalModule.pushBuffer(goal);
	});
	
	// used from initFields to prettify <pre> with class="chunks"
	function prettify() {
		let elements = document.body.getElementsByTagName("pre");
		for (let i = 0; i < elements.length; ++i) {
			let view = elements[i];
			if (view.classList.contains("chunks")) {
				let text = view.innerHTML;
				text = text.replace(/=\&gt;/ig, "<span class='implies'>=&gt;</span>");
				text = text.replace(/@[\w|\.|\-|\/|:]+/ig, function replace(match) {
					return "<span class='operator'>"+match+"</span>";
				});
				view.innerHTML = text.replace(/#.*/ig, function replace(match) {
					return "<span class='comment'>"+match+"</span>";
				});		
			}
		}
	}
	
	function viewButton (buttonID, viewID) {
		let button = document.getElementById(buttonID);
		let view = document.getElementById(viewID);
		button.innerText = "►";
		view.style.height = "1em";
		
		view.show = function (text) {
			view.textContent = text;
			text = view.innerHTML;
			text = text.replace(/=\&gt;/ig, "<span class='implies'>=&gt;</span>");
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
				view.style.height = "1em";
			}
		});
	}
	
	viewButton("factsButton", "facts");
	viewButton("rulesButton", "rules");
		
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
	
	// prepare for memory test1
	let prepareTest1 = function () {
		let words = [];
		// carry out test for given delay in days
		let test1 = function (days) {
			let now = factGraph.now;
			factGraph.now = Date.now()/1000;  // now in seconds
			
			// remember the words
			for (let i = 0; i < words.length; ++i) {
				let chunk = new Chunk("word", words[i]);
				factGraph.add(chunk);
			}
			
			// let time pass
			factGraph.now += days * 24*60*60;  // in seconds
			
			// now see how many we can recall
			let list = factGraph.get({type: "word", all: true});
			
			log("recalled: " + list);
			
			let score = document.getElementById("score1");
			score.innerText = "recalled " +
				(list ? list.length : "zero") + " words" +
				" (" + (100.0*list.length/25).toFixed(0) + "%)";
				
			let items = [];
			for (let i = 0; i < list.length; ++i)
				items.push(list[i].id);
			document.getElementById("recalled1").innerText = items.join(", ");
			
			// now clear up by deleting the words
			factGraph.delete("word");
			factGraph.now = now;
		};
		
		let table = document.getElementById("unrelated");
		let cells = table.getElementsByTagName("td");
		for (let i = 0; i < cells.length; ++i) {
			words.push(cells[i].innerText.toLowerCase());
		}
				
		let div = document.getElementById("test1");
		let buttons = div.getElementsByTagName("button");
		for (let i = 0; i < buttons.length; ++i) {
			let button = buttons[i];
			button.addEventListener("click", () => {
				log("test with " + button.getAttribute("delay") + " days");
				test1(parseInt(button.getAttribute("delay")));
			});
		}
	};
	
	// prepare for memory test2
	let prepareTest2 = function () {
		let words = [];
		// carry out test for given delay in days
		let test2 = function (days) {
			let now = factGraph.now;
			factGraph.now = Date.now()/1000;  // now in seconds
			
			// remember the words
			for (let i = 0; i < words.length; ++i) {
				let chunk = new Chunk("word", words[i]);
				factGraph.add(chunk);
			}
			
			// remember the clusters
			
			factGraph.add(factGraph.parseChunk('cluster {items horse, cat, dog, fish, bird}'));
			factGraph.add(factGraph.parseChunk('cluster {items orange, yellow, blue, green, black}'));
			factGraph.add(factGraph.parseChunk('cluster {items table, chair, desk, bookcase, bed}'));
			factGraph.add(factGraph.parseChunk('cluster {items teacher, school, student, homework, class}'));
			factGraph.add(factGraph.parseChunk('cluster {items apple, banana, kiwi, grape, mango}'));
			
			let cited = factGraph.cited;
			
			// let time pass
			factGraph.now += days * 24*60*60;  // in seconds
			
			// now see how many we can recall
			let list = factGraph.get({type: "word", all: true});
			
			log("recalled: " + list);
			
			let score = document.getElementById("score2");
			score.innerText = "recalled " +
				(list ? list.length : "zero") + " words" +
				" (" + (100.0*list.length/25).toFixed(0) + "%)";

			let items = [];
			for (let i = 0; i < list.length; ++i)
				items.push(list[i].id);
			document.getElementById("recalled2").innerText = items.join(", ");
			
			console.log("recalled chunks:");
			for (let i = 0; i < list.length; ++i) {
				let chunk = list[i];
				console.log('  ' + chunk.id + ' ' + chunk.getStrength(factGraph.now));
			}
			
			// now clear up by deleting the words and clusters
			factGraph.delete("word");
			factGraph.delete("cluster");
			factGraph.now = now;
		};
		
		let table = document.getElementById("related");
		let cells = table.getElementsByTagName("td");
		for (let i = 0; i < cells.length; ++i) {
			words.push(cells[i].innerText.toLowerCase());
		}
				
		let div = document.getElementById("test2");
		let buttons = div.getElementsByTagName("button");
		for (let i = 0; i < buttons.length; ++i) {
			let button = buttons[i];
			button.addEventListener("click", () => {
				log("test with " + button.getAttribute("delay") + " days");
				test2(parseInt(button.getAttribute("delay")));
			});
		}
	};
	
	// prepare for memory test3
	let prepareTest3 = function () {
		let words = [];
		// carry out test for given delay in days
		let test3 = function (days) {
			let now = factGraph.now;
			factGraph.now = Date.now()/1000;  // now in seconds
			
			// remember the words
			for (let i = 0; i < words.length; ++i) {
				let chunk = new Chunk("word", words[i]);
				factGraph.add(chunk);
				chunk.setValue("tray", "tray1");
			}
			
			// remember the clusters and their relationship to the tray
			
			factGraph.add(factGraph.parseChunk('tray tray1 {clusters c1, c2, c3, c4, c5}'));
			factGraph.add(factGraph.parseChunk('cluster c1 {tray tray1; items horse, cat, dog, fish, bird}'));
			factGraph.add(factGraph.parseChunk('cluster c2 {tray tray1; items orange, yellow, blue, green, black}'));
			factGraph.add(factGraph.parseChunk('cluster c3 {tray tray1; items table, chair, desk, bookcase, bed}'));
			factGraph.add(factGraph.parseChunk('cluster c4 {tray tray1; items teacher, school, student, homework, class}'));
			factGraph.add(factGraph.parseChunk('cluster c5 {tray tray1; items apple, banana, kiwi, grape, mango}'));
			
			let cited = factGraph.cited;
			
			// let time pass
			factGraph.now += days * 24*60*60;  // in seconds
			
			// now see how many we can recall
			let list = factGraph.get({type: "word", all: true});
			
			log("recalled: " + list);
			
			let score = document.getElementById("score3");
			score.innerText = "recalled " +
				(list ? list.length : "zero") + " words" +
				" (" + (100.0*list.length/25).toFixed(0) + "%)";
				
			let items = [];
			for (let i = 0; i < list.length; ++i)
				items.push(list[i].id);
			document.getElementById("recalled3").innerText = items.join(", ");
			
			console.log("recalled chunks:");
			for (let i = 0; i < list.length; ++i) {
				let chunk = list[i];
				console.log('  ' + chunk.id + ' ' + chunk.getStrength(factGraph.now));
			}
			
			// now clear up by deleting the words and clusters
			factGraph.delete("word");
			factGraph.delete("cluster");
			factGraph.delete("tray");
			factGraph.now = now;
		};
		
		let table = document.getElementById("related");
		let cells = table.getElementsByTagName("td");
		for (let i = 0; i < cells.length; ++i) {
			words.push(cells[i].innerText.toLowerCase());
		}
				
		let div = document.getElementById("test3");
		let buttons = div.getElementsByTagName("button");
		for (let i = 0; i < buttons.length; ++i) {
			let button = buttons[i];
			button.addEventListener("click", () => {
				log("test with " + button.getAttribute("delay") + " days");
				test3(parseInt(button.getAttribute("delay")));
			});
		}
	};
	
	// prepare for memory test4
	let prepareTest4 = function () {
		let words = [];
		// carry out test for given delay in days
		let test4 = function (days) {
			let now = factGraph.now;
			factGraph.now = Date.now()/1000;  // now in seconds
			
			// remember the words
			for (let i = 0; i < words.length; ++i) {
				let chunk = new Chunk("word", words[i]);
				factGraph.add(chunk);
				chunk.setValue("tray", "tray1");
			}
			
			// remember the clusters and their relationship to the tray
			
			factGraph.add(factGraph.parseChunk('tray tray1 {clusters c1, c2, c3, c4, c5}'));
			factGraph.add(factGraph.parseChunk('cluster c1 {tray tray1; items horse, cat, dog, fish, bird}'));
			factGraph.add(factGraph.parseChunk('cluster c2 {tray tray1; items orange, yellow, blue, green, black}'));
			factGraph.add(factGraph.parseChunk('cluster c3 {tray tray1; items table, chair, desk, bookcase, bed}'));
			factGraph.add(factGraph.parseChunk('cluster c4 {tray tray1; items teacher, school, student, homework, class}'));
			factGraph.add(factGraph.parseChunk('cluster c5 {tray tray1; items apple, banana, kiwi, grape, mango}'));
			
			let cited = factGraph.cited;
			
			// let time pass
			factGraph.now += days * 24*60*60;  // in seconds
			
			// now see how many we can recall
			let clusters = factGraph.get({type: "cluster", all: true});
			
			log("recalled: " + clusters);
			
			let list = [];
			for (let i = 0; i < clusters.length; ++i)
				list = list.concat(clusters[i].properties.items);
			
			let score = document.getElementById("score4");
			score.innerText = "recalled " +
				(list ? list.length : "zero") + " words" +
				" (" + (100.0*list.length/25).toFixed(0) + "%)";
				
			let recalled = document.getElementById("recalled4");
			recalled.innerText = list.join(", ");
			
			let items = [];
			for (let i = 0; i < clusters.length; ++i)
				items.push(clusters[i].id);
			document.getElementById("recalled5").innerText = items.join(", ");
						
			// now clear up by deleting the words and clusters
			factGraph.delete("word");
			factGraph.delete("cluster");
			factGraph.delete("tray");
			factGraph.now = now;
		};
		
		let table = document.getElementById("related");
		let cells = table.getElementsByTagName("td");
		for (let i = 0; i < cells.length; ++i) {
			words.push(cells[i].innerText.toLowerCase());
		}
				
		let div = document.getElementById("test4");
		let buttons = div.getElementsByTagName("button");
		for (let i = 0; i < buttons.length; ++i) {
			let button = buttons[i];
			button.addEventListener("click", () => {
				log("test with " + button.getAttribute("delay") + " days");
				test4(parseInt(button.getAttribute("delay")));
			});
		}
	};

	let initFields = function () {	
		prettify();
		prepareTest1();  // initialise memory test for unclustered items
		prepareTest2();  // initialise memory test for clustered items
		prepareTest3();  // initialise memory test for enhanced clustered items 
		prepareTest4();  // initialise memory test for active recall via clusters
		
		if (window.Worker) {
			let worker = new Worker('worker.js');

			// send message to worker
			let info = ["hello", 123];
			worker.postMessage(info);

			// handle message from worker
			worker.onmessage = function (e) {
			   log(e.data);  // with the message
			}	
		} else {
			log("*** sorry this demo needs browser support for web workers! ***")
		}
	};
	
	let drawCircle = function (x, y, r, color) {
		ctx.beginPath();
		ctx.fillStyle = color;
		ctx.arc(x, y, r, 0, 2 * Math.PI, false);
		ctx.fill();
	};
	
	let drawPoint = function (x, y) {
		const w = 2;
		ctx.fillStyle = '#000';
		ctx.fillRect(x-w, y-w, w+w, w+w);
	};
	
	let drawLine = function (points, xscale, yscale) {
		ctx.beginPath();
		xscale = xscale ? xscale : 1.0;
		yscale = yscale ? yscale : 1.0;
		
		ctx.moveTo(xscale * points[0].x, yscale * points[0].y);
		
		for (let i = 0; i < points.length; ++i) {
			ctx.lineTo(xscale * points[i].x, yscale * points[i].y)
		}
		ctx.stroke();
		
		for (i = 0; i < points.length; ++i) {
			drawPoint(xscale * points[i].x, yscale * points[i].y);
		}
	};
	
	let drawCurve = function (points, xscale, yscale) {
		ctx.beginPath();
		xscale = xscale ? xscale : 1.0;
		yscale = yscale ? yscale : 1.0;
		
		ctx.moveTo(xscale * points[0].x, yscale * points[0].y);
		let i;

		for (i = 1; i < points.length - 2; ++i) {
		  let xc = xscale * (points[i].x + points[i + 1].x) / 2;
		  let yc = yscale * (points[i].y + points[i + 1].y) / 2;
		  ctx.quadraticCurveTo(xscale * points[i].x, yscale * points[i].y, xc, yc);
		}
		
		ctx.quadraticCurveTo(xscale * points[i].x, yscale * points[i].y,
			xscale * points[i+1].x, yscale * points[i+1].y);
		ctx.stroke();
		
		for (i = 0; i < points.length; ++i) {
			drawPoint(xscale * points[i].x, yscale * points[i].y);
		}
	};
	
	let drawCaptions = function () {
		ctx.save();
		let caption = function (text, x, y, xaxis) {
			ctx.font = '10px serif';
			let metrics = ctx.measureText(text);
			ctx.fillStyle = '#888';
			
			if (xaxis)
				ctx.fillText(text, x - metrics.width/2, y);
			else
				ctx.fillText(text, x, y + 3);			
		};
		
		const dx = width/6;
		const dy = height/5;
		let x0 = 0, y0 = height;
		
		caption("Chunk Strength", 7, 7, false);
		
		for (let i = 1; i < 6; ++i) {
			caption(5*i, i*dx, y0-7, true);
		}
		
		caption("Days", width-25, height-10, false);
/*
		for (let i = 1; i < 5; ++i) {
			caption(20*i, x0+7, height - i*dy, false);
		}
*/		
		ctx.restore();
	};
	
	let drawAxes = function () {
		let x0 = 0, y0 = 0;
		ctx.strokeStyle = "#888";
		ctx.lineWidth = 1;
		ctx.beginPath();
		
		ctx.moveTo(x0, y0+1);
		ctx.lineTo(width-x0, y0+1);
		ctx.stroke();
		
		const dx = (width-x0)/6;
		
		for (let i = 1; i < 6; ++i) {
			let x = i*dx;
			ctx.moveTo(x, y0-0.5);
			ctx.lineTo(x, y0+5);
			ctx.stroke();			
		}
				
		ctx.moveTo(x0+1, y0);
		ctx.lineTo(x0+1, height-y0);
		ctx.stroke();
		
/*
		const dy = (height-y0)/5;
		
		for (let i = 1; i < 5; ++i) {
			let y = i*dy;
			ctx.moveTo(x0-0.5, y);
			ctx.lineTo(x0+5, y);
			ctx.stroke();			
		}
*/
	};
	
	let drawThreshold = function () {
		let x0 = 0, y0 = 80;
		ctx.strokeStyle = "#383";
		ctx.lineWidth = 1;
		ctx.beginPath();
		
		ctx.moveTo(x0, y0);
		ctx.lineTo(width-x0, y0);
		ctx.stroke();
	};
	
	let data = function () {
		let points = [];
		let mouse = factGraph.chunks["a2"];
		let t = mouse.lastAccessed;
		const day = 24*60*60; // seconds
		let now = factGraph.now;
		
		points.push({x: 0, y:mouse.strength});

		for (let i = 1; i <= 30; ++i) {
			factGraph.now = t + i * day;		
			points.push({x: i, y:mouse.getStrength(factGraph.now)});
			
			// rehearsal at 9 days
			if (i == 9) {
				factGraph.add(mouse);
				points.push({x: i, y:mouse.strength});
			}
			
			// rehearsal at 10 days
			if (i == 10) {
				factGraph.add(mouse);
				points.push({x: i, y:mouse.strength});
			}
			
			// rehearsal at 23 days
			if (i == 23) {
				factGraph.add(mouse);
				points.push({x: i, y:mouse.strength});
			}
		}
		
		factGraph.now = now;
		return points;
	};

	let draw = function () {
		const red = '#F00';
		const green = '#0F0';
		const r = 10;
		
		ctx.save();
		// clear background to white
		ctx.fillStyle = "#FFF";
		ctx.fillRect(0, 0, width, height);
		
		drawCaptions();
				
		// set origin to bottom left
		ctx.translate(0, height);
		ctx.scale(1, -1);
		
		drawAxes();
		drawThreshold();
		
		let points = data();
		ctx.strokeStyle = "red"; //"#000";
		drawLine(points, width/30.0, height/1.5);
		
		
/*
		ctx.fillStyle = red;
		ctx.fillRect(40, 20, 10, 10);

		drawCircle(0, 0, r, red);
		drawCircle(width/2.0, height/2.0, r, green);
*/		
		ctx.restore();
	};
	
	
	// used to update visualisation of results
	let	refresh = function () {		
		window.requestAnimationFrame(draw);
	};
	
	let actions = {
		log: function (action, values) {
			let message = values.message;
			
			if (Array.isArray(message))
				message = message.join(' ');
					
			show(message);
		},
		list: function (action, values) {
			let chunks = factGraph.get({
				type: action.type,
				id: values['@id'],
				values: values,
				all: true
			});
			for (let i = 0; i < chunks.length; ++i) {
				show(chunks[i].toString({concise:true}));
			}
		},
		clearlog: function (action, values) {
			clear();  // clear the log
		}
	};
		
	let ruleEngine = new RuleEngine(log);
	
	// load the facts and rules
	loadResources().then(() => {
		console.log("*** Facts ***")
		console.log(factGraph.toString());
		console.log("*** Rules ***")
		console.log(ruleGraph.rulesToString());
		
		console.log("*** fact graph loaded at: " + factGraph.now);
		
		rulesModule = ruleEngine.addModule('rules', ruleGraph);
		factsModule = ruleEngine.addModule('facts', factGraph);
		goalModule = ruleEngine.addModule('goal', new ChunkGraph(), actions);
		initFields();
		ruleEngine.run();
				
		refresh();
	});
}