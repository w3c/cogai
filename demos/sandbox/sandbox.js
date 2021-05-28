/*
	Script for sandbox for Chunks rule language
*/

window.addEventListener("load", () => {
	const tutorial = document.getElementById("tutorial");
	const logElement = document.getElementById("log");
	const clearLog = document.getElementById("clear");
	const persistCheckBox = document.getElementById("persist");
	const topicDiv = document.getElementById("topic");
	
	let initialGoal = 'start {}';
	let currentIndex = tutorial.selectedIndex;
	let currentTopic = tutorial.item(tutorial.selectedIndex).value;

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

	const revertButton = document.getElementById("revert");
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
					const topic = document.getElementById("topic");
    				topic.markdown = source;
    				topic.innerHTML = marked(source, {gfm:true});
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
		} else if (currentTopic !== topic) {
			save();
			clearAll();
			currentTopic = topic;
			currentIndex = tutorial.selectedIndex;
			loadResources("tutorials/" + topic).then(
				function (results) {					
					if (persistCheckBox.checked)
						save();
				}
			);
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
	
	function editTopic (buttonID, bufferID) {
		const editButton = document.getElementById(buttonID);
		const topicView = document.getElementById(bufferID);
		
		editButton.addEventListener("click", () => {
			let editBuffer = document.createElement("textarea");
			let saveButton = document.createElement("button");
			let cancelButton = document.createElement("button");
			editBuffer.setAttribute("spellcheck", "false");

			saveButton.innerText = "save";
			saveButton.addEventListener("click", () => {
				try {
					topicView.markdown = editBuffer.value;
					topicView.innerHTML = marked(editBuffer.value, {gfm:true});
					editBuffer.remove();
					saveButton.remove();
					cancelButton.remove();
					show(editButton, "inline");
					show(topicView, "block");
					
					if (persistCheckBox.checked)
						save();
				} catch (e) {
					editBuffer.className = "error";
					log(e.message);
				}
			});
			
			cancelButton.innerText = "cancel";
			cancelButton.addEventListener("click", () => {
				editBuffer.remove();
				saveButton.remove();
				cancelButton.remove();
				show(editButton, "inline");
				show(topicView, "block");
			});

			hide(topicView);
			hide(editButton);
			editBuffer.value = topicView.markdown;
			topicView.parentNode.insertBefore(editBuffer, topicView);
			topicView.parentNode.insertBefore(saveButton, topicView);
			topicView.parentNode.insertBefore(cancelButton, topicView);
			editBuffer.focus();
		})
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
	
	revertButton.onclick = function () {
		let topic = tutorial.item(tutorial.selectedIndex).value;
		
		clearAll();
		loadResources("tutorials/" + topic);
		
		if (persistCheckBox.checked)
			save();
				
		console.log("revert on " + topic);
	};
	
	startButton.onclick = function () {
		stepButton.disabled = false;
		ruleView.innerText = outputView.innerText = logElement.innerText = "";
		ruleEngine.setGoal(initialGoal);
		ruleEngine.getModuleByName('facts').clearBuffer();
		showBuffers();
		return false;
	};

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
	};
	
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
	editTopic("editTopic", "topic");

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
		let topic = currentTopic;
		let index = currentIndex;
		localStorage.setItem('tutorialIndex', index);
		console.log('save tutorial index ' + index);
		
		if (topic === undefined || topic === null)
			topic = 'topic';
			
		console.log("saving " + topic)
		
		let facts = document.getElementById('facts').innerText;
		let rules = document.getElementById('rules').innerText;
		console.log("   saving " + facts.length + " bytes for facts");
		console.log("   saving " + rules.length + " bytes for rules");

		localStorage.setItem(topic+'-facts', document.getElementById('facts').innerText);
		localStorage.setItem(topic+'-rules', document.getElementById('rules').innerText);
		localStorage.setItem(topic+'-goal', initialGoal);
		localStorage.setItem(topic, document.getElementById('topic').markdown);
		localStorage.setItem('persist', persistCheckBox.checked ? true : false);
	}
	
	function restore () {
		let tutorialIndex = localStorage.getItem('tutorialIndex');
		
		if (tutorialIndex !== null)
			tutorial.selectedIndex = tutorialIndex;
	
		console.log('restore tutorial index ' + tutorial.selectedIndex);
		let topic = tutorial.item(tutorial.selectedIndex).value;

		if (topic === undefined || topic === null)
			topic = 'topic';
		
		console.log("restoring " + topic)
		currentIndex = tutorial.selectedIndex;
		currentTopic = tutorial.item(tutorial.selectedIndex).value;

		let source = localStorage.getItem(topic+'-facts');
		document.getElementById("facts").show(source);
		facts = ruleEngine.addModule(topic+'-facts', new ChunkGraph(source));
		console.log("   restoring " + source.length +  " bytes for facts");
	
		source = localStorage.getItem(topic+'-rules');
		document.getElementById("rules").show(source);
		rules = ruleEngine.addModule('rules', new ChunkGraph(source));
		console.log("   restoring " + source.length + " bytes for rules");
	
		initialGoal = localStorage.getItem(topic+'-goal');
		goalBuffer.innerText = initialGoal;
		ruleEngine.setGoal(initialGoal);
		
		source = localStorage.getItem(topic);
		let description = document.getElementById('topic');
		description.markdown = source;
		description.innerHTML = marked(source, {gfm:true});
		
		persistCheckBox.checked = localStorage.getItem('persist') ? true : false;
		startButton.disabled = false;
		stepButton.disabled = initialGoal === "" ? true : false;
		return true;
	}

	if (!restore()) {
		loadResources("tutorials/blank");
	}

}, false);
