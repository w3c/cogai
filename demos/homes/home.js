window.addEventListener("load", test, false);

//let SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
//let SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
//let SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

function test () {
	const logElement = document.getElementById('log');
	const clearLog = document.getElementById("clear");
	const commandElement = document.getElementById('command');
	const manElement = document.getElementById("man");
	const womanElement = document.getElementById("woman");
	const lightsElement = document.getElementById("lights");
	const heatingElement = document.getElementById("heating");
	const thermostatElement = document.getElementById("thermostat");
	const canvas = document.getElementById('room');
	const ctx = canvas.getContext('2d');
	const width = canvas.width;
	const height = canvas.height;
	let factGraph, ruleGraph, goalModule, factsModule, rulesModule;
	let man = true, woman = false, timeOfDay = "morning";
	let lights = false, hue = "warm hue", heating = false;
	let externalTemperature = 5, roomTemperature = 18, targetTemperature = 20;
	let debug = false;
	
	function log (message) {
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

	function say (message) {
		log(message);
		let t2s = new SpeechSynthesisUtterance(message);
		window.speechSynthesis.speak(t2s);
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
	
	let chair1Image, chair2Image, manSeatedImage, womanSeatedImage,
		tableImage, lightImage, radiatorImage;
	
	// loads the chunk graphs and other resources as needed
	function loadResources(next) {
		let promises = [];
		let ready = null;
		
		let loadImage = function(url, deliver) {
			promises.push(
				new Promise((resolve, reject) => {
					let image;
					image = new Image();
					image.addEventListener("load", () => {
						resolve(true);
						deliver(image);
					});
					image.src = url;
				})
			);
		};
		
		loadImage("images/settee1.png", (image) => {
			chair1Image = image;
		});
		
		loadImage("images/settee2.png", (image) => {
			chair2Image = image;
		});
		
		loadImage("images/man-seated.png", (image) => {
			manSeatedImage = image;
		});
		
		loadImage("images/woman-seated.png", (image) => {
			womanSeatedImage = image;
		});
		
		loadImage("images/table.png", (image) => {
			tableImage = image;
		});
		
		loadImage("images/light.png", (image) => {
			lightImage = image;
		});
		
		loadImage("images/radiator.png", (image) => {
			radiatorImage = image;
		});

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
	
	
	let initFields = function () {		
		manElement.checked = man ? "checked" : undefined;
		womanElement.checked = woman ? "checked" : undefined;
		lightsElement.checked = lights ? "checked" : undefined;
		thermostatElement.value = Math.floor(targetTemperature);
		
		if (man) {
			let chunk = new Chunk("person", "John");
			chunk.properties.room = "room1";
			factGraph.add(chunk);
			let goal = new Chunk("enter");
			goal.properties.person = "John";
			goalModule.pushBuffer(goal);
		}		

		if (woman) {
			let chunk = new Chunk("person", "Janet");
			chunk.properties.room = "room1";
			factGraph.add(chunk);
			let goal = new Chunk("enter");
			goal.properties.person = "John";
			goalModule.pushBuffer(goal);
		}		

		manElement.onclick = function  () {
			man = manElement.checked;
			log("manElement.checked is now " + manElement.checked);
			syncState(); // ensure known facts are current before goal is queued
			if (man) {
				let chunk = new Chunk("person", "John");
				chunk.properties.room = "room1";
				factGraph.add(chunk);
			} else {
				let chunk = factGraph.chunks["John"];
				factGraph.remove(chunk);
			}		
			let goal = new Chunk(man ? "enter" : "leave");
			goal.properties.person = "John";
			log("alert: " + goal);
			goalModule.pushBuffer(goal);
			draw();
		};
		womanElement.onclick = function  () {
			woman = womanElement.checked;
			syncState(); // ensure known facts are current before goal is queued
			if (woman) {
				let chunk = new Chunk("person", "Janet");
				chunk.properties.room = "room1";
				factGraph.add(chunk);
			} else {
				let chunk = factGraph.chunks["Janet"];
				factGraph.remove(chunk);
			}		
			let goal = new Chunk(woman ? "enter" : "leave");
			goal.properties.person = "Janet";
			log("alert: " + goal);
			goalModule.pushBuffer(goal);
			draw();
		};
		
		lightsElement.onclick = function  () {
			lights = lightsElement.checked;
			syncState(); // ensure known facts are current
			draw();
		};
		
		heatingElement.onclick = function  () {
			heating = heatingElement.checked;
			syncState(); // ensure known facts are current
			draw();
		};
		
		thermostatElement.onkeydown = function (e) {
			if (e.keyCode === 13) {
				this.value = Math.floor(this.value);
				
				if (this.value < 5)
					this.value = 5;
					
				if (this.value > 30)
					this.value = 30;
					
				targetTemperature = parseFloat(this.value);
				syncState(); // ensure known facts are current
				
				draw();
				log("new target temperature is " + targetTemperature +
					", current temperature is " + roomTemperature);
				//animate();
				//e.preventDefault();
				return false; // suppress form submission
			}
		};
		
		let inputs  = document.getElementsByTagName("input");
		
		for (let i = 0; i < inputs.length; ++ i) {
			let input = inputs[i];
			if (input.type === "radio") {
				if (input.name === "timeOfDay") {
					if (input.parentElement.innerText === timeOfDay)
						input.checked = "checked";
						
					input.onchange = function () {
						let parent = this.parentElement;
						timeOfDay = parent.innerText;
						let goal = new Chunk("clock");
						goal.properties.time = timeOfDay;
						log("alert: " + goal);
						goalModule.pushBuffer(goal);
						draw();
					}
				} else if (input.name === "hue") {
					if (input.parentElement.innerText === hue)
						input.checked = "checked";
						
					input.onchange = function () {
						let parent = this.parentElement;
						hue = parent.innerText;
						draw();
					}
				}
			}
		}
	};
		
	let drawThermometer = function (x, y, h) {
		const glass = '#eee';
		const fluid = '#c00';
		let text = Math.floor(roomTemperature) + "°C";
		
		let yt = function (t) {
			return y + h - 10 - (h-20) * t/30;
		};
		
		ctx.save();
		
		ctx.font = '14px serif';
		let metrics = ctx.measureText(text);
		ctx.fillStyle = '#000000';
		ctx.fillText(text, x - metrics.width/2, y+h+30);
		
		ctx.lineCap = "round";
		
		ctx.strokeStyle = '#080';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(x-15, yt(targetTemperature) - 3);
		ctx.lineTo(x+15, yt(targetTemperature) - 3);
		ctx.stroke();
		
		ctx.strokeStyle = glass;
		ctx.lineWidth = 15;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x, y + h);
		ctx.stroke();
		
		ctx.beginPath();
		ctx.fillStyle = glass;
		ctx.arc(x, y+h, 15, 0, 2 * Math.PI);
		ctx.fill();
		
		ctx.beginPath();
		ctx.fillStyle = fluid;
		ctx.arc(x, y+h, 10, 0, 2 * Math.PI);
		ctx.fill();			
		
		ctx.lineCap = "square";
		ctx.strokeStyle = fluid;
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.moveTo(x, y + h);
		ctx.lineTo(x, yt(roomTemperature));
		ctx.stroke();
		ctx.restore();		
	};
	
	let outsideTemperature = {
		morning: 12,
		afternoon: 18,
		evening: 12,
		night: 5
	};
	
	let daylight = {
		morning: 'rgb(255,255,255)',
		afternoon: 'rgb(255,255,245)',
		evening: 'rgb(200,200,200)',
		night: 'rgb(20,20,20)'
	};
	
	let illumination = {
		morning: 'rgba(255,255,255,0)',
		afternoon: 'rgba(255,255,250,0.05)',
		evening: 'rgba(200,200,170,0.3)',
		night: 'rgba(20,20,20,0.8)'
	};
	
	// computed from lights and time of day
	let lighting = function () {
		if (lights) {
			if (timeOfDay === "morning" || timeOfDay === "afternoon")
				return 'rgba(255,255,255,0.2)';
				
			return 'rgba(255,220,0,0.1)';
		}
		
		return illumination[timeOfDay];
	};
	
	let RoomWindow = function (x, y, w, h) {
		let roomWindow  = this;
		let skyColour = 'rgb(250, 250, 255)';
		
		roomWindow.draw = function () {
			ctx.save();
			ctx.fillStyle = daylight[timeOfDay];
			ctx.fillRect(x-w/2, y-h/2, w, h);
			ctx.strokeStyle = '#888';
			ctx.beginPath();
			ctx.moveTo(x-w/2, y-h/2);
			ctx.lineTo(x-w/2, y+h/2);
			ctx.lineTo(x+w/2, y+h/2);
			ctx.lineTo(x+w/2, y-h/2);
			ctx.lineTo(x-w/2, y-h/2);
			ctx.moveTo(x-w/2, y-h/2+50);
			ctx.lineTo(x+w/2, y-h/2+50);
			ctx.moveTo(x-w/2, y+h/2-50);
			ctx.lineTo(x+w/2, y+h/2-50);
			
			ctx.moveTo(x-w/2+50, y-h/2);
			ctx.lineTo(x-w/2+50, y+h/2);
			ctx.moveTo(x-w/2+100, y-h/2);
			ctx.lineTo(x-w/2+100, y+h/2);
			ctx.moveTo(x-w/2+150, y-h/2);
			ctx.lineTo(x-w/2+150, y+h/2);
			ctx.moveTo(x-w/2+200, y-h/2);
			ctx.lineTo(x-w/2+200, y+h/2);
			
			ctx.stroke();
			
			let text = Math.floor(outsideTemperature[timeOfDay]) + "°C";
			ctx.font = '14px serif';
			let metrics = ctx.measureText(text);
			ctx.fillStyle = timeOfDay === "night" ? '#888' : '#000000';
			ctx.fillText(text, x - metrics.width/2, y-h/2 + 20);

			ctx.restore();		
		};
	};
	
	let drawLighting = function () {
		let light = 'rgba(255,255,0,0.1)';
		const d1 = 35, d2 = 160, d3 = 600;
				
		let lightBeam = function (x, y) {
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x-d1, y);
			ctx.lineTo(x-d2, y+d3);
			ctx.lineTo(x+d2, y+d3);
			ctx.lineTo(x+d1, y);
			ctx.lineTo(x,y);
			ctx.fill();
		};
		
		ctx.save();
		ctx.scale(0.5, 0.5);

		if (hue) {
			if (hue === "warm hue")
				light = 'rgba(255,255,0,0.1)';
			else if (hue === "cool hue")
				light = 'rgba(200,200,255,0.1)';
		}
		
		//light = 'rgba(200,200,255,0.1)';

		ctx.fillStyle = light;
		lightBeam(180, 120);
		lightBeam(480, 120);
		lightBeam(780, 120);
				
		ctx.restore();
	}

	let draw = function () {
		ctx.save();
		ctx.fillStyle = 'rgb(255, 250, 250)';
		ctx.fillRect(0, 0, width, height);
				
		ctx.scale(0.5, 0.5);

		ctx.drawImage(lightImage, 100, 0);
		ctx.drawImage(lightImage, 400, 0);
		ctx.drawImage(lightImage, 700, 0);
		
		ctx.drawImage(radiatorImage, 2*(width - 250), 2*(height - 150));
		ctx.drawImage(tableImage, 400, 2*(height - 150));
		
		if (heating) {
			ctx.beginPath();
			ctx.fillStyle = '#f00';
			ctx.arc(25 + 2*(width - 250), 25 + 2*(height - 150), 5, 0, 2 * Math.PI);
			ctx.fill();
		}

		ctx.scale(2, 2);

		if (woman)
			ctx.drawImage(womanSeatedImage, -20, height - 280);
		else
			ctx.drawImage(chair1Image, -20, height - 280);
			
		if (man)
			ctx.drawImage(manSeatedImage, 270, height - 280);
		else
			ctx.drawImage(chair2Image, 270, height - 280);
			
		if (lights)
			drawLighting();
			
		drawThermometer(width-40, 200, 100, 40);
			
		// simulate varying illumination
		ctx.fillStyle = lighting();
		ctx.fillRect(0, 0, width, height);

		roomWindow.draw();
		ctx.restore();
	};
	
	let	animate = function () {
		const a = 0.00005;
		const b = 0.0001
		const threshold = 2;
		const radiatorTemperature = 60;
		
		let timeLast = null;
		
		let step = function (timeNow) {
			if (timeLast === null) {
				timeLast = timeNow;
				tempLast = roomTemperature;
			}
				
			let deltaT = timeNow - timeLast;
			
			syncState(); // ensure known facts are current

			// update room roomTemperature			
			
			if (heating)
				roomTemperature += deltaT * a * (radiatorTemperature - roomTemperature);
			
			roomTemperature += deltaT * b * (outsideTemperature[timeOfDay] - roomTemperature);
			
			if (roomTemperature < 5)
				roomTemperature = 5;
						
			timeLast = timeNow;
			draw();
			window.requestAnimationFrame(step);
		}
		window.requestAnimationFrame(step);
	};
	
	let monitorTemperature = function () {
		const threshold = 0.5;
		
		if (roomTemperature < targetTemperature - threshold) {
			let goal = new Chunk("room", "room1");
			goal.properties.state = "tooCold"
			log("alert: " + goal);
			goalModule.pushBuffer(goal);
		} else if (roomTemperature >= targetTemperature + threshold) {
			let goal = new Chunk("room", "room1");
			goal.properties.state = "tooHot"
			log("alert: " + goal);
			goalModule.pushBuffer(goal);
		}		
	};
	
	let syncState = function () {
		// room room1 {present Janet, John; heating on;
		//   temperature 16; targetTemperature 20;
		//   lights off; hue warm; time evening}
		
		let room = new Chunk("room", "room1");
		let janet = womanElement.checked;
		let john = manElement.checked;
		
		if (janet && john)
			room.properties.occupancy = 2;
		else if (janet)
			room.properties.occupancy = 1;
		else if (john)
			room.properties.occupancy = 1;
		else
			room.properties.occupancy = 0;
			
		room.properties.heating = heating ? "on" : "off";
		room.properties.temperature = roomTemperature;
		room.properties.thermostat = targetTemperature;
		room.properties.lights = lights ? "on" : "off";
		room.properties.hue = hue === "warm hue" ? "warm" : "cool";
		room.properties.time = timeOfDay;
		factsModule.graph.add(room);
	};
	
	let actions = {
		thermostat: function (action, values) {
			if (values.heating !== undefined)
				heating = heatingElement.checked = (values.heating === "on" ? true : false);
				
			if (values.targetTemperature !== undefined)
				targetTemperature = thermostatElement.value = values.targetTemperature;
		},
		lights: function (action, values) {
			if (values.turn !== undefined)
				lights = lightsElement.checked = (values.turn === "on" ? true : false);
			
			if (values.hue !== undefined) {
				hue = (values.hue === "warm" ? "warm hue" : "cool hue");
				let inputs  = document.getElementsByTagName("input");
		
				for (let i = 0; i < inputs.length; ++ i) {
					let input = inputs[i];
					
					if (input.type === "radio" &&
							input.name === "hue" &&
							input.parentElement.innerText === hue) {
						input.checked = true;
					}
				}
			}
		},
		log: function (action, values) {
			let message = values.message;
			
			if (Array.isArray(message))
				message = message.join(' ');
					
			log(message);
		}
	};
		
	let ruleEngine = new RuleEngine(log);
	let roomWindow = new RoomWindow(width-150, 100, 250, 150);
	
	// load the facts and rules
	loadResources().then(() => {
		console.log("*** Facts ***")
		console.log(factGraph.toString());
		console.log("*** Rules ***")
		console.log(ruleGraph.rulesToString());
		
		rulesModule = ruleEngine.addModule('rules', ruleGraph);
		factsModule = ruleEngine.addModule('facts', factGraph);
		goalModule = ruleEngine.addModule('goal', new ChunkGraph(), actions);
		initFields();
		ruleEngine.run();
		
		setInterval(monitorTemperature, 2000);
		animate();
	});
}