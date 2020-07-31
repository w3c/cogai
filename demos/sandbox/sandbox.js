/*
	Script for sandbox for Chunks rule language
*/

window.addEventListener("load", () => {
	const tutorialElement = document.getElementById("tutorial");
	const logElement = document.getElementById("log");
	const clearLog = document.getElementById("clear");
	const persistCheckBox = document.getElementById("persist");
	const topicDiv = document.getElementById("topic");
	let initialGoal = 'start {}';

	function log (message) {
		let atBottom = logElement.scrollHeight - 
			logElement.clientHeight <= logElement.scrollTop + 1;
			
		logElement.innerText += message + '\n';
				
		if (atBottom)
			logElement.scrollTop = logElement.scrollHeight;
	}
	
	function clear () {
		logElement.innerText = "";
	}
	
	clearLog.addEventListener("click", () =>  {
		clear();
	});

	const startButton = document.getElementById("start");
	const stepButton = document.getElementById("step");
	const goalBuffer = document.getElementById("goal");
	const factsBuffer = document.getElementById("factsBuffer");
	const outputView = document.getElementById("output");
	const ruleView = document.getElementById("rule");
	const bindingsView = document.getElementById("bindings");
	let ruleEngine = new RuleEngine(log);
	let goal, facts, rules;
	
	startButton.disabled = true;
	stepButton.disabled = true;
	
	function viewButton (buttonID, viewID) {
		let button = document.getElementById(buttonID);
		let view = document.getElementById(viewID);
		button.innerText = "►";
		view.style.height = "30px";
		
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
	
	function clearAll () {
		initialGoal = outputView.innerText = goalBuffer.innerText =
			factsBuffer.innerText = logElement.innerText = "";
		document.getElementById("facts").show("");
		document.getElementById("rules").show("");
		
		ruleEngine.setGoal(initialGoal);
		facts = ruleEngine.addModule('facts', new ChunkGraph());
		rules = ruleEngine.addModule('rules', new ChunkGraph());
	}
	
		// loads the chunk graphs and other resources as needed
	function loadResources(tutorial) {
		let promises = [];
		let ready = null;

		promises.push(
    		new Promise((resolve, reject) => {
				fetch(tutorial + "/tutorial.md")
				.then((response) => response.text())
				.then(function (source) {
    				document.getElementById("topic").innerHTML = marked(source);
					resolve(true);
				});
			})
    	);

		promises.push(
    		new Promise((resolve, reject) => {
				fetch(tutorial + "/goal.chk")
				.then((response) => response.text())
				.then(function (source) {
					factGraph = new ChunkGraph(source);
					document.getElementById("goal").innerText = source;
					initialGoal = source;
					ruleEngine.setGoal(source);
					stepButton.disabled = source === "" ? true : false;
					startButton.disabled = false;
					resolve(true);
				});
			})
    	);

		promises.push(
    		new Promise((resolve, reject) => {
				fetch(tutorial + "/facts.chk")
				.then((response) => response.text())
				.then(function (source) {
					document.getElementById("facts").show(source);
					facts = ruleEngine.addModule('facts', new ChunkGraph(source));
					resolve(true);
				});
			})
    	);

		promises.push(
    		new Promise((resolve, reject) => {
				fetch(tutorial + "/rules.chk")
				.then((response) => response.text())
				.then(function (source) {
					document.getElementById("rules").show(source);
					rules = ruleEngine.addModule('rules', new ChunkGraph(source));
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

	
	tutorial.addEventListener("change", () =>  {
		let topic = tutorial.item(tutorial.selectedIndex).value;
		if (topic === "") {
		} else {
			clearAll();
			loadResources("tutorials/" + topic);
		}
	});
	
	function show (element, mode) {
		element.style.display = mode;
		element.style.visibility = "visible";
	}
	
	function hide (element) {
		element.style.display = "none";
		element.style.visibility = "hidden";
	}
	
	// e.g. editButton("editFacts", "facts")
	function editButton (buttonID, bufferID) {
		const editButton = document.getElementById(buttonID);
		const chunkview = document.getElementById(bufferID);
		const expandButton = editButton.parentElement.getElementsByTagName("button")[0];
		
		editButton.addEventListener("click", () => {
			let editBuffer = document.createElement("textarea");
			let saveButton = document.createElement("button");
			let cancelButton = document.createElement("button");
			editBuffer.setAttribute("spellcheck", "false");
			expandButton.disabled = true;
			saveButton.innerText = "save";
			saveButton.addEventListener("click", () => {
				try {
					if (bufferID === "goal") {
						initialGoal = editBuffer.value;
						ruleEngine.setGoal(initialGoal);
						stepButton.disabled = false;
					} else {
						ruleEngine.addModule(bufferID, new ChunkGraph(editBuffer.value));
					}
					chunkview.innerText = editBuffer.value;
					expandButton.disabled = false;
					editBuffer.remove();
					saveButton.remove();
					cancelButton.remove();
					show(editButton, "inline");
					show(chunkview, "block");
					
					if (persistCheckBox.checked)
						save();
				} catch (e) {
					editBuffer.className = "error";
					log(e.message);
				}
			});
			
			cancelButton.innerText = "cancel";
			cancelButton.addEventListener("click", () => {
				expandButton.disabled = false;
				editBuffer.remove();
				saveButton.remove();
				cancelButton.remove();
				show(editButton, "inline");
				show(chunkview, "block");
			});
			
			
			hide(chunkview);
			hide(editButton);
			editBuffer.value = chunkview.innerText;
			chunkview.parentNode.insertBefore(editBuffer, chunkview);
			chunkview.parentNode.insertBefore(saveButton, chunkview);
			chunkview.parentNode.insertBefore(cancelButton, chunkview);
			editBuffer.focus();
		})
	}
	
	function showBuffers () {
		goalBuffer.innerText = goal.readBuffer();
		factsBuffer.innerText = facts.readBuffer();
	}
	
	function ppBindings (bindings) {
		let s = "";
		for (let name in bindings) {
			if (bindings.hasOwnProperty(name)) {
				if (s === "")
					s = " ";
				else
					s += "; ";
				
				s += name + " = ";
			
				let value = bindings[name];
				if (Array.isArray(value)) {
					for (let i = 0; i < value.length - 1; ++i) {
						s += value[i] + ", ";
					}
				
					s += value[value.length - 1];
				} else {
					s += value;
				}
			}
		}
	
		return s;
	}
	
	startButton.onclick = function () {
		stepButton.disabled = false;
		ruleView.innerText = outputView.innerText = logElement.innerText = "";
		ruleEngine.setGoal(initialGoal);
		ruleEngine.getModuleByName('facts').clearBuffer();
		showBuffers();
		return false;
	}

	stepButton.onclick = function () {
		let text = "";
		console.log("" + rules.graph);
		let match = ruleEngine.next();
		showBuffers();
		
		if (match) {
			let rule = match[0];
			ruleView.innerText = rules.graph.ruleToString(rule);
			bindingsView.innerText = ppBindings(match[1]);
		} else {
			ruleView.innerText = "*** no matching rules ***"
			stepButton.disabled = true;
		}
		
		
		return false;
	}
	
	goal = ruleEngine.addModule('goal', new ChunkGraph(), {
		log: function (action, properties) {
			let message = properties.message;
			
			if (Array.isArray(message))
				message = message.join(' ');
					
			log(message);
		},
		show: function (action, properties) {
			let message = properties.value;
			
			if (Array.isArray(message))
				message = message.join(' ');
					
			outputView.innerText = message;
		}
	});
	
	editButton("editGoal", "goal");
	editButton("editFacts", "facts");
	editButton("editRules", "rules");

	persistCheckBox.addEventListener("change", () =>  {		
		if (persistCheckBox.checked) {
			save();
		} else {
			localStorage.removeItem('facts');
			localStorage.removeItem('rules');
			localStorage.removeItem('goal');
		}
	});
	
	function save () {
		let source = document.getElementById('facts').innerText;
		localStorage.setItem('facts', source);
		source = document.getElementById('rules').innerText;
		localStorage.setItem('rules', source);
		localStorage.setItem('goal', initialGoal);
		localStorage.setItem('persist', persistCheckBox.checked ? true : false);
	}
	
	function restore () {
		let source = localStorage.getItem('facts');
		
		if (typeof (source) === "string") {
			document.getElementById("facts").show(source);
			facts = ruleEngine.addModule('facts', new ChunkGraph(source));
		
			source = localStorage.getItem('rules');
			document.getElementById("rules").show(source);
			rules = ruleEngine.addModule('rules', new ChunkGraph(source));
		
			initialGoal = localStorage.getItem('goal');
			goalBuffer.innerText = initialGoal;
			ruleEngine.setGoal(initialGoal);
			persistCheckBox.checked = localStorage.getItem('persist') ? true : false;
			startButton.disabled = false;
			stepButton.disabled = initialGoal === "" ? true : false;
			return true;
		}
		
		return false;
	}

	if (!restore()) {
		loadResources("tutorials/blank");
	}

}, false);
