/*
	Test script for tasks using Chunks rule language
*/

window.addEventListener("load", () => {
	let logView = document.getElementById("log");

	function log (message) {
		let atBottom = logView.scrollHeight - 
			logView.clientHeight <= logView.scrollTop + 1;
			
		logView.innerText += message + '\n';
		
		if (logView.innerText.length > 100000)
			// discard old data to avoid memory overflow
			logView.innerText =
				logView.innerText.substr(logView.innerText.length - 50000);
		
		if (atBottom)
			logView.scrollTop = logView.scrollHeight;
	}

	let startButton = document.getElementById("start");
	let ruleEngine = new RuleEngine(log);
	let goalModule, factsModule, rulesModule;
	let goal, facts, rules;
	
	startButton.disabled = true;
	
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

	startButton.onclick = function () {
		logView.innerText = "";
		ruleEngine.setGoal('process1 { }');
		ruleEngine.getModuleByName('facts').clearBuffer();
	    ruleEngine.run();
		return false;
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

    // define some custom operations
	let actions = {
		timer: function (action, values) {
		    let goal = goalModule.readBuffer();
		    //log("goal is " + goal);
		    
		    let max = values.max ? values.max : 5;
		    let time = Math.floor(1000 * Math.random() * max);
		    let chunk = action.clone(true);
		    
		    // set time property
		    chunk.setValue("time", time);
		    
		    // copy goal's task ID
		    chunk.setValue("@task", goal.properties["@task"]);
				
			setTimeout(() => {
			    log("timeout after " + time + " mS");
			    goalModule.pushBuffer(chunk);
			}, time);
		},
		log: function (action, values) {
			let message = values.message;
			
			if (Array.isArray(message))
				message = message.join(' ');
					
			log(message);
		}
	};

	loadResources().then(() => {		
		rulesModule = ruleEngine.addModule('rules', ruleGraph);
		factsModule = ruleEngine.addModule('facts', factGraph);
		goalModule = ruleEngine.addModule('goal', new ChunkGraph(), actions);
		startButton.disabled = false;
	});
}, false);
