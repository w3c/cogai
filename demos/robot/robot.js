/*
	Test script for Chunks rule language
*/

window.addEventListener("load", function () {test(); }, false);

function test () {
	const canvas = document.getElementById('factory');
	const logElement = document.getElementById('log');
	const clearLog = document.getElementById("clear");
	const ctx = canvas.getContext('2d');
	const width = canvas.width;
	const height = canvas.height;
	const bottleDiameter = 30;
	const boxWidth = 95;
	const boxHeight = 65;
	const LOW_PRIORITY = 3;
	const MEDIUM_PRIORITY = 5;
	const HIGH_PRIORITY = 8;
		
	// hack for webkit, probably not needed anymore
	window.AudioContext = window.AudioContext||window.webkitAudioContext;
	
	let audioCtx = null;
	let audioMedia = [];
	let soundRobot, soundBelt, soundWater, soundFilling, soundCapping;
	let buttonImage, factGraph, ruleGraph;
	let beltMoving = 0;
	let ready = null;
	let scrolled = false;
	
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
	
	function clear () {
		logElement.innerText = "";
	}
	
	clearLog.addEventListener("click", () =>  {
		clear();
	});

	let connect = function (sound) {
		let source = audioCtx.createMediaElementSource(sound);
		source.connect(audioCtx.destination);
	};
	
	function viewButton (buttonID, viewID) {
		let button = document.getElementById(buttonID);
		let view = document.getElementById(viewID);
		button.innerText = "►";
		view.style.height = "20px";
		
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
				view.style.height = "20px";
			}
		});
	}
	
	viewButton("factsButton", "facts");
	viewButton("rulesButton", "rules");
	
	// loads a list of mp3 files for sound effects
	function loadResources(next) {
		let promises = [];
		let src = ["robot.mp3", "belt.mp3", "water.mp3", "capping.mp3"];
		let sounds = [soundRobot, soundBelt, soundFilling, soundCapping];
		
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
						console.log(ruleGraph.toString(true));
						resolve(true);
				});
			})
    	);
    	
		promises.push(
    		new Promise((resolve, reject) => {
				buttonImage = new Image();
				buttonImage.addEventListener("load", () => {
					resolve(true);
				});
				buttonImage.src = "play-pause.png";
			})
    	);
    	
		for (let i = 0; i < src.length; ++i) {
			promises.push (
				new Promise (resolve => {
					let sound = audioMedia[i] = new Audio("sounds/" + src[i]);
					sound.addEventListener("canplaythrough", event => {
						resolve(true);
					})
				})
			);
		}
						
		Promise.all(promises).then((results) => {			
			ready();			
		});
		return new Promise(resolve => {
			ready = resolve;
		});
	};
	
	let stopSound = function () {
		soundBelt.pause();
		soundRobot.pause();
		soundFilling.pause();
	};
		
	// uses cosine for slow fast slow
	// returns number in range 1 to 0 as t goes from t0 to t0+td
	let fraction = function (start, t, finish) {
		if (t < start)
			t = start;
			
		if (t > finish)
			t = finish;
			
		if (start == finish)
			return 0;
			
		// angle goes from 0 to PI
		let angle = Math.PI * (t-start)/(finish-start);
			
		return (Math.cos(angle) + 1.0)/2.0;
		//return (finish-t)/(finish-start);
	};
	
	// interpolate between a and b where 0 <= n <= 1
	let interpolate = function (a, b, n) {
		return a*n + b*(1-n);
	};
		
	// create a robot arm with base at x, y
	let Robot = function (x, y) {
		let robot = this;
		let t0 = null;        // to be dropped
		let start = null;     // start time for animation
		let duration = null;  // duration of animation
		let from = null;
		let to = null;
		robot.x = x;
		robot.y = y;
		robot.shoulder = -30 * Math.PI / 180;
		robot.elbow = 60 * Math.PI / 180;
		robot.wrist = 45 * Math.PI / 180;;
		robot.gap = 30;  // distance between gripper's finger and thumb
		robot.object = null;  // object held by the gripper
		
		const a1 = 120;  // length of upper arm
		const a2 = 90;   // length of lower arm excluding gripper
		const gd = 22;   // half-width of gripper wrist
		const gw = 20;   // length of gripper wrist
		const gf = 35;   // length of gripper fingers
		const h = 60;    // height of main joint above base
		
		let normalise = function (angle) {
			const pi = Math.PI;
			angle = angle % (2 * pi);
			
			if (angle < -pi)
				angle += 2 * pi;
			else if (angle > pi)
				angle -= 2 * pi;
						
			return angle;
		};
		
		// compute difference in angles for range -pi to pi
		let delta = function (a, b) {
			return normalise(normalise(b)-normalise(a));
		};
		
		robot.grasp = function (obj) {
			robot.object = obj;
		};
		
		robot.graspedObject = function () {
			return robot.object;
		};
		
		robot.release = function () {
			let obj = robot.object;
			robot.object = null;
			return obj;
		};
		
		// robot can reach anywhere in circle with
		// radius r such that (a1-a2) <= r <= (a1+a2)
		// for each such position there are two sets of joint angles
		// that describe a parallelogram with sides a1, a2
		
		robot.setJoints = function (q1, q2, q3) {
			robot.shoulder = q1;
			robot.elbow = q2;
			robot.wrist = q3;
		};
		
		// grateful thanks to robotacademy.net.au for the math
		// made a little more complicated given that the main
		// joint is positioned above the robot's base, where y
		// increases down the screen, and x increases to the right

		// return gripper position
		robot.getPosition = function () {
			const r = 5 + gw + gf/2.0;
			const q1 = robot.shoulder;
			const q2 = robot.elbow;
			const angle = q1 + q2 + robot.wrist;
			
			const x = robot.x + a2 * Math.cos(q1+q2) + a1 * Math.cos(q1);
			const y = robot.y - h  + a2 * Math.sin(q1+q2) + a1 * Math.sin(q1)
			
			return [x + r * Math.cos(angle), y + r * Math.sin(angle)];
		};
		
		// position of gripper and its angle
		robot.setPosition = function (x, y, angle) {
			const r = 5 + gw + gf/2.0;
			x -= robot.x + r * Math.cos(angle);
			y -= robot.y - h + r * Math.sin(angle);
			
			// first solution for joint angles
			let q2 = Math.acos((x*x + y*y - a1*a1 - a2*a2)/(2*a1*a2));
			let q1 = Math.atan2(y, x) - Math.atan2((a2*Math.sin(q2)), (a1 + a2*Math.cos(q2)));
			//console.log( "a) q1 = " + (q1*180/Math.PI) + ", q2 = " + (q2*180/Math.PI));
			robot.shoulder = q1;
			robot.elbow = q2;
			
			// second solution for joint angles
			/*
			q2 = -q2;
			q1 = Math.atan2(y, x) - Math.atan2((a2*Math.sin(q2)), (a1 + a2*Math.cos(q2)));
			console.log( "b) q1 = " + (q1*180/Math.PI) + ", q2 = " + (q2*180/Math.PI));
			robot.shoulder = q1;
			robot.elbow = q2;
			*/
			
			// compute wrist angle relative to lower arm
			robot.wrist = angle - q1 - q2;
		};

		// instruct robot to change state
		robot.move = function (x, y, angle, gap) {
			//console.log('started');	
			// compute joint angles for new state
			
			const r = 5 + gw + gf/2.0;
			
			// play safe with gripper gap
			
			if (gap > 2 * gd)
				gap = 2 * gd;
				
			if (gap < 5)
				gap = 5;
				
			x -= r * Math.cos(angle);
			y -= - h + r * Math.sin(angle);
			
			let q2 = Math.acos((x*x + y*y - a1*a1 - a2*a2)/(2*a1*a2));
			let q1 = Math.atan2(y, x) - Math.atan2((a2*Math.sin(q2)), (a1 + a2*Math.cos(q2)));
			let q3 = angle - q1 - q2;
			
			// initial state
			from = {
				shoulder: robot.shoulder,
				elbow: robot.elbow,
				wrist: robot.wrist,
				gap: robot.gap,
				time: null
			};
			
			// target state
			to = {
				shoulder: q1,
				elbow: q2,
				wrist: q3,
				gap: gap,
				time: null
			};

			// compute time duration as maximum of individual operations
			let t1 = Math.abs(delta(from.shoulder, to.shoulder)) * 5 / Math.PI;
			let t2 = Math.abs(delta(from.elbow, to.elbow)) * 3 / Math.PI;
			let t3 = Math.abs(delta(from.wrist, to.wrist)) * 2 / Math.PI;
			let t4 = Math.abs(to.gap - from.gap)/10;
			
			let td = t1;
			
			if (td < t2)
				td = t2;
				
			if (td < t3)
				td = t3;
				
			if (td < t4)
				td = t4;
				
			duration = td * 1000;
			
			let promise = new Promise(function (resolve, reject) {
				robot.resolve = resolve;
				robot.reject = reject;
			});
			
			soundRobot.play();
			return promise;
		};
		
		
		robot.animate = function (t) {
			if (from) {
				if (!from.time) {
					from.time = t;
					to.time = t + duration;
				}
				
				let mix = fraction(from.time, t, to.time);
				robot.shoulder = interpolate(from.shoulder, to.shoulder, mix);
				robot.elbow = interpolate(from.elbow, to.elbow, mix);
				robot.wrist = interpolate(from.wrist, to.wrist, mix);
				robot.gap = interpolate(from.gap, to.gap, mix);
			
				if (t >= to.time) {
					duration = from = to = null;
					robot.resolve();
					soundRobot.pause();
					//console.log("completed");
				}
			}
			robot.draw();
		};

		let drawBase = function () {
			const w1 = 50;
			const w2 = 20;
			ctx.beginPath();
			ctx.moveTo(x-w1, y);
			ctx.lineTo(x-w2, y-h-10);
			ctx.lineTo(x+w2, y-h-10);
			ctx.lineTo(x+w1, y);
			ctx.lineTo(x-w1, y);
			ctx.stroke();
			ctx.fill();
			ctx.translate(x, y-h);
			ctx.save();
			drawUpperArm();
			ctx.restore();
			drawJoint(0, 0, 25);
		};
		
		let drawUpperArm = function () {
			const h1 = 20;
			const h2 = 10;
			const w = a1;
			ctx.rotate(robot.shoulder);
			ctx.beginPath();
			ctx.moveTo(0, -h1);
			ctx.lineTo(w, -h2);
			ctx.lineTo(w, h2);
			ctx.lineTo(0, h1);
			ctx.lineTo(0, -h1);
			ctx.stroke();
			ctx.fill();
			ctx.save();
			ctx.translate(w, 0);
			drawLowerArm();
			ctx.restore();
			drawJoint(w, 0, 15);
		};
		
		let drawLowerArm = function () {
			const h1 = 10;
			const h2 = 5;
			const w = a2;
			ctx.rotate(robot.elbow);
			ctx.save();
			ctx.translate(w, 0);
			drawGripper(robot.grip);
			ctx.restore();
			ctx.beginPath();
			ctx.moveTo(0, -h1);
			ctx.lineTo(w, -h2);
			ctx.lineTo(w, h2);
			ctx.lineTo(0, h1);
			ctx.lineTo(0, -h1);
			ctx.stroke();
			ctx.fill();
			drawJoint(w, 0, 10);
		};
		
		let drawGripper = function () {
			const gh = robot.gap/2;
			ctx.rotate(robot.wrist);
						
			ctx.lineWidth = 5;
			ctx.lineCap = 'square';
			
			// draw first finger
			ctx.beginPath();
			ctx.moveTo(gw, gh);
			ctx.lineTo(gw+gf, gh);
			ctx.stroke();
			
			// draw second finger
			ctx.beginPath();
			ctx.moveTo(gw, -gh);
			ctx.lineTo(gw+gf, -gh);
			ctx.stroke();

			// draw wrist
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(0, -10);
			ctx.lineTo(gw, -gd);
			ctx.lineTo(gw, gd);
			ctx.lineTo(0, 10);
			ctx.lineTo(0, 0);
			ctx.stroke();
			ctx.fill();
		};
		
		let drawJoint = function (x, y, r) {
			ctx.beginPath();
			ctx.arc(x, y, r, 0, 2 * Math.PI);
			ctx.stroke();
			ctx.fill();
		};
		
		robot.draw = function () {
			ctx.resetTransform();
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 5;
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			ctx.fillStyle = 'white';
			drawBase();
			
			if (robot.object) {
				const gripper = robot.getPosition();
				robot.object.draw(gripper[0], gripper[1]);
			}
		};
	};
		
	// create an empty bottle
	let Bottle = function () {
		const radius = bottleDiameter/2;
		let bottle = this;
		bottle.level = 0;  // percentage filled
		bottle.capped = false;
		
		let alpha = function () {
			return (256 + Math.round(2.55 * bottle.level)).toString(16).substr(-2);
		};
		
		bottle.width = function () {
			return 2*radius ;
		};
		
		bottle.height = function () {
			return 2*radius;
		};

		bottle.radius = function () {
			return radius;
		};
		
		bottle.draw = function (x, y) {
			ctx.resetTransform();
			ctx.lineWidth = 2;
			ctx.fillStyle =  '#27542322'; // translucent bottle green
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, 2 * Math.PI);
			ctx.fill();
			ctx.fillStyle = '#7f1a1a' + alpha(); // wine red
			ctx.strokeStyle = '#275423'; // bottle green
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
			
			ctx.beginPath();
			
			if (bottle.capped) {
				ctx.arc(x, y, 5, 0, 2 * Math.PI);
				ctx.fillStyle = ctx.strokeStyle = '#000000';
				ctx.fill();
			} else {
				ctx.arc(x, y, 5, 0, 2 * Math.PI);
			}
			
			ctx.stroke();
		};
	};
	
	// create an empty box
	let Box = function () {
		let box = this;
		let h = boxHeight;
		let w = boxWidth;
		let resolveBox = null;
		let items = [];
				
		box.width = function () {
			return w;
		};
		
		box.height = function () {
			return h;
		};
		
		box.full = function () {			
			if (box.isFull()) {
				resolveBox = null;
				return Promise.resolve();
			}
			return new Promise(resolve => {
				resolveBox = resolve;
			});
		};

		
		box.isFull = function () {
			return items.length >= 6;
		};
		
		box.add = function (item, x, y) {
			if (items.length < 6) {
				items.push({
					item: item,
					x: x,
					y: y
				})
			}
			
			if(box.isFull() && resolveBox) {
				resolveBox();
				resolveBox = null;
			}
		};
		
		box.getNextSpace = function () {
			let n = items.length;
			
			if (n < 6) {
				let y = (n & 1) ? -15 : +15;
				let x = 30*(1 - Math.floor(n/2));
				return {x: x, y: y};
			}
		};
		
		box.draw = function (x, y) {
			ctx.resetTransform();
			ctx.fillStyle = '#f2cea2'
			ctx.fillRect(x-w/2, y-h/2, w, h);
			ctx.strokeStyle = '#9e876a'
			ctx.beginPath();
			ctx.moveTo(x-w/2, y-h/2);
			ctx.lineTo(x-w/2, y+h/2);
			ctx.lineTo(x+w/2, y+h/2);
			ctx.lineTo(x+w/2, y-h/2);
			ctx.lineTo(x-w/2, y-h/2);
			ctx.stroke();
			
			for (let i = 0; i < items.length; ++i) {
				let item = items[i];
				item.item.draw(x + item.x, y + item.y);
			}
		}
		
		/*
		let p = box.getNextSpace();
		box.add(new Bottle(), p.x, p.y);
		p = box.getNextSpace();
		box.add(new Bottle(), p.x, p.y);
		p = box.getNextSpace();
		box.add(new Bottle(), p.x, p.y);
		p = box.getNextSpace();
		box.add(new Bottle(), p.x, p.y);
		p = box.getNextSpace();
		box.add(new Bottle(), p.x, p.y);
		p = box.getNextSpace();
		box.add(new Bottle(), p.x, p.y);
		*/
	};
	
	let beltPattern = function () {
		const canvas1 = document.createElement('canvas');
		const context1 = canvas1.getContext('2d');
		canvas1.width = 10;
		canvas1.height = 10;
		context1.fillStyle = '#DDDDDD';
		context1.arc(5, 5, 4, 0, 2*Math.PI);
		context1.fill();
		
		const canvas2 = document.createElement('canvas');
		const context2 = canvas1.getContext('2d');
		return context2.createPattern(canvas1, 'repeat');
	};
	
	let Belt = function (x, y, w, h) {
		let belt = this;
		let svg1 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		let matrix = svg1.createSVGMatrix();
		let pattern = beltPattern();
		let prev = null;
		let offset = 0;
		let items = [];
		let full = false;
		let moving = false;
		let requestedSpace = null;
		let resolveSpace = null;
		let resolveFull = null;
		const spacing = 5;

		
		belt.start = function () {
			if (!moving) {
				moving = true;
			
				// shared sound resource for both belts
				// thus use global variable to keep track
			
				if (!beltMoving) 
					soundBelt.play();

				beltMoving++;
			}
		};
		
		belt.stop = function () {
			if (moving) {
				moving = false;
				beltMoving--;

				// shared sound resource for both belts
				// thus use global variable to keep track

				if (!beltMoving) 
					soundBelt.pause();
			}
		};
		
		belt.addItem = function (item) {
			let place = {
				item: item,
				x: spacing + item.width()/2.0
			};
			items.unshift(place);
		};
		
		belt.releaseItem = function () {
			if (items.length) {
				let item = items.pop();
				full = false;
				return item.item;
			}
		};
		
		belt.firstItem = function () {
			if (items.length) {
				let place = items[0];
				
				return {
					item: place.item,
					x: x+place.x,
					y: y+h/2,
				};
			}
		};
		
		let hasSpace = function (size) {
			return (items.length == 0 ||
						items[0].x >= 2*spacing + size + items[0].item.width()/2);
		};
		
		// promise for when space is free at start
		belt.space = function (size) {
			if (hasSpace(size))
				return Promise.resolve();
			
			return new Promise(resolve => {
				requestedSpace = size;
				resolveSpace = resolve;
			});
		};
		
		// promise for when an item is at end of belt
		belt.full = function (name) {
			if (isFull())
				return Promise.resolve();
				
			return new Promise(resolve => {
				resolveFull = resolve;
			});
		};
		
		// test if an item is at end of belt
		let isFull = function () {
			if (items.length) {
				let place = items[items.length-1];
			
				if (place.x + place.item.width()/2.0 >= w - 5)
					return true;
			}
			
			return false;
		};		
		
		belt.draw = function () {
			pattern.setTransform(matrix.translate(offset,0).scale(0.5, 0.5));
			ctx.resetTransform();
			ctx.fillStyle = '#EEEEEE';
			ctx.fillRect(x, y, w, h);
			ctx.fillStyle = pattern;
			ctx.fillRect(x, y, w, h);
			
			for (let i = 0; i < items.length; ++i) {
				let place = items[i];
				place.item.draw(x+place.x, y+h/2);
			}
		};

		belt.animate = function (now) {
			if (prev == null)
				prev = now;
							
			if (moving) {
				if (resolveSpace && requestedSpace != null) {
					if (hasSpace(requestedSpace)) {
						resolveSpace();
						resolveSpace = null;
					}
				}

				let delta = (now-prev)/100;
				offset = (offset + delta) % w;
				
				for (let i = 0; i < items.length; ++i) {
					let place = items[i];
					place.x += delta;
				}
				
				if (isFull()) {
					if (resolveFull) {
						resolveFull();
						resolveFull = null;
					} else {
						belt.stop();
					}
				}	
			}
				
			belt.draw();
			prev = now;
		};
	};
	
	let FillStation = function (x, y, w, h) {
		let station = this;
		let bottle = null;
		let start = null;
		let duration = 3000;
		let from = null;
		let to = 100;
		
		let caption = function (text) {
			ctx.font = '16px serif';
			let metrics = ctx.measureText(text);
			ctx.fillStyle = '#000000';
			ctx.fillText(text, x+w/2 - metrics.width/2, y+15);
		};
		
		station.draw = function () {
			ctx.fillStyle = '#b6c3e0';
			ctx.fillRect(x, y, w, h);
		};
		
		station.animate = function (now) {
			station.draw();
			ctx.fillStyle = '#b6c3e0';
			ctx.fillRect(x, y, w, h);

			if (bottle) {
				if (start == null) {
					start = now;
					from = bottle.level;
				}
				
				if (now >= start + duration) {
					bottle.level = to;
					station.resolve();
					bottle = null;
					soundFilling.pause();
				} else {
					caption("Filling");
					bottle.level = from + (to-from) * (now-start) / duration;
				}
			}
		};
		
		station.fill = function (aBottle) {
			bottle = aBottle;
			soundFilling.play();
			start = station.resolve = station.reject = null;
			let promise = new Promise(function (resolve, reject) {
				station.resolve = resolve;
				station.reject = reject;
			});
			
			return promise;
		};
	};
	
	let CapStation = function (x, y, w, h) {
		let station = this;
		let bottle = null;
		let start = null;
		let duration = 1000;
		
		let caption = function (text) {
			ctx.font = '16px serif';
			let metrics = ctx.measureText(text);
			ctx.fillStyle = '#000000';
			ctx.fillText(text, x+w/2 - metrics.width/2, y+15);
		};
		
		station.draw = function () {
			ctx.fillStyle = '#b6c3e0';
			ctx.fillRect(x, y, w, h);
		};
		
		station.animate = function (now) {
			station.draw();
			
			if (bottle) {
				if (start == null) {
					start = now;
				}
				
				if (now >= start + duration) {
					station.resolve();
					bottle = null;
					//soundCapping.pause();
				} else {
					caption("Capping");
					
					if (now > start + duration/2)
						bottle.capped = true;
				}
			}
		};
		
		station.cap = function (aBottle) {
			bottle = aBottle;
			soundCapping.play();
			start = station.resolve = station.reject = null;
			let promise = new Promise(function (resolve, reject) {
				station.resolve = resolve;
				station.reject = reject;
			});
			
			return promise;
		};
	};
	
	let animate = function () {
		let step = function (t) {
			if (running) {
				ctx.save();
				ctx.fillStyle = 'rgb(250, 250, 250)';
				ctx.fillRect(0, 0, width, height);
				ctx.drawImage(buttonImage, x-25 , y+20);
				fillStation.animate(t);
				capStation.animate(t);
				belt1.animate(t);
				belt2.animate(t);
				robot.animate(t);
				ctx.restore();
				window.requestAnimationFrame(step);
			}
		}
		window.requestAnimationFrame(step);
	};
	
	// only used at start
	let drawOnce = function () {
		ctx.save();
		ctx.fillStyle = 'rgb(250, 250, 250)';
		ctx.fillRect(0, 0, width, height);
		ctx.drawImage(buttonImage, x-25 , y+20);
		fillStation.draw();
		capStation.draw();
		belt1.draw();
		belt2.draw();
		robot.draw();
		ctx.restore();
	}
	
	const x = width/2 - 40;
	const y = height - 80;
	const bx = x-80;
	const by = y-235;
	
	let fillStation = new FillStation(x-120, y-280, 80, 80);
	let capStation = new CapStation(x+50, y-280, 80, 80);
	
	let belt1 = new Belt(x-350, y-100, 200, 50);
	let belt2 = new Belt(x+130, y-110, 300, 80);

	let resolvePackingSpace = null;
	
	let packingSpace = function () {
		let item = belt2.firstItem();
		
		if (item) {
			let box = item.item;
			
			if (!box.isFull()) {
				resolvePackingSpace = null;
				return Promise.resolve();
			}
		}
		
		return new Promise(resolve => {
			resolvePackingSpace = resolve;
		});
	};
	
	let copyBindings = function (chunk, bindings) {
		for (let name in bindings) {
			if (bindings.hasOwnProperty(name))
				chunk.properties[name] = bindings[name];
		}
	};

	let robot = new Robot(x, y);
	robot.setPosition (x, y-170, -Math.PI/2);
		
	let running = null;
	let ruleEngine = new RuleEngine(log);
	let goalModule = null;

	// action is rule's action chunk that includes @do
	// properties are its properties after binding variables
	let actions = {
		show: function (action, bindings) {
			let value = bindings.value;
			let text = value;
			
			if (Array.isArray(value)) {
				text = value.join(', ');
			}
			console.log(text);
		},
		start: function (action, properties) {
			let thing = properties.thing;
			if (thing) {
				log('starting ' + thing);
			  if (thing === "belt1")
				belt1.start();
			  else if (thing === "belt2")
				belt2.start();
			}
		},
		stop: function (action, properties) {
			let thing = properties.thing;
			if (thing) {
				log('stopping ' + thing);
			  if (thing === "belt1")
				belt1.stop();
			  else if (thing === "belt2")
				belt2.stop();
			}
		},
		addBottle: function (action, properties) {
			belt1.addItem(new Bottle());
		},
		addBox: function (action, properties) {
			belt2.addItem(new Box());
			
			if (resolvePackingSpace) {
				resolvePackingSpace();
				resolvePackingSpace = null;
			}
		},
		move: function (action, properties, bindings) {
			let angle = properties.angle * Math.PI / 180.0;
			let x = properties.x, y = properties.y, gap = properties.gap;
			robot.move(x, y, angle, gap).then(() => {
				let chunk = new Chunk('after');
				chunk.priority = MEDIUM_PRIORITY;
				copyBindings(chunk, bindings);
				chunk.properties.step = properties.step;
				goalModule.pushBuffer(chunk);
			})
		},
		grasp: function (action, properties) {
			let bottle = belt1.releaseItem();
			robot.grasp(bottle);
		},
		release: function (action, properties) {
			let bottle = robot.release();
			let item = belt2.firstItem();
			let box = item.item;
			let place = box.getNextSpace();
			box.add(bottle, place.x, place.y);
		},
		fill: function (action, properties) {
			// defer action until wait on filled
		},
		cap: function (action, properties) {
			// defer action until wait on capped
		},
		shipBox: function (action, properties) {
			belt2.releaseItem();
		},
		wait: function (action, properties) {
			let thing = properties.thing;
			if (thing)
				log('wait on ' + action.type + ' for ' + thing);
			else
				log('wait on ' + action.type);
						
			let notify = function (priority) {
				log("notify: " + (thing ? thing + " " : "") + action.type);
				let chunk = new Chunk(action.type);
				
				if (priority === undefined)
					priority = MEDIUM_PRIORITY;
					
				chunk.priority = priority;
				
				if (thing)
					chunk.properties.thing = thing;
					
				goalModule.pushBuffer(chunk);
			};
			
			switch (action.type) {
			case 'space':
					let width = properties.space;
					if (thing === 'belt1') {
						belt1.space(width).then(() => {
							notify(LOW_PRIORITY);
						});
					} else if (thing === 'belt2') {
						belt2.space(width).then(() => {
							notify(LOW_PRIORITY);
						});
					}
					break;

			case 'full':
					if (thing === 'belt1') {
						belt1.full().then(() => {
							notify(HIGH_PRIORITY);
						});
					} else if (thing === 'belt2') {
						belt2.full().then(() => {
							notify(HIGH_PRIORITY);
						});
					}
					break;
			case 'filled': {
					let bottle = robot.graspedObject();
					fillStation.fill(bottle).then (() => {
						notify(MEDIUM_PRIORITY);
					});
				}
				break;
			case 'capped': {
					let bottle = robot.graspedObject();
					capStation.cap(bottle).then (() => {
						notify(MEDIUM_PRIORITY);
					});
				}
				break;
			case 'packingSpace': {
					packingSpace().then(() => {
						let item = belt2.firstItem();
						let box = item.item;
						let place = box.getNextSpace();
						let x = item.x + place.x - robot.x;
						let y = item.y + place.y - robot.y;
						let chunk = new Chunk(action.type);
						chunk.priority = MEDIUM_PRIORITY;
						chunk.properties.x = x;
						chunk.properties.y = y;
						goalModule.pushBuffer(chunk);
					});
				}
				break;
			case 'boxFull': {
					let item = belt2.firstItem();
					let box = item.item;
					box.full().then(() => {
						notify(LOW_PRIORITY);
					});
				}
				break;
			}
		}
	};
	
	canvas.onclick = function() {
		if (running == null) {
			audioCtx = new AudioContext();
			
			soundRobot = audioMedia[0];
			soundBelt = audioMedia[1];
			soundFilling = audioMedia[2];
			soundCapping = audioMedia[3];

			soundBelt.loop = true;
			soundRobot.loop = true;
			soundFilling.loop = true;
			
			connect(soundRobot);
			connect(soundBelt);
			connect(soundCapping);
			connect(soundFilling);

			logElement.innerText = "";
			ruleEngine.addModule('rules', ruleGraph);
			ruleEngine.addModule('facts', factGraph);
			goalModule = ruleEngine.addModule('goal', new ChunkGraph(), actions);
			ruleEngine.setGoal('start {}');
			ruleEngine.run();
			running = true;
			animate();
		} else if (running == true) {
			running = false;
			stopSound();
		} else if (!running){
			running = true;
			animate();
		}
	};
	
	loadResources().then(() => {
		drawOnce();  // before production is started
	});
};
