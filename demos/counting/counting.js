/*
	Test script for Chunks rule language
*/

window.addEventListener("load", count, false);

function count () {
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
	let nextButton = document.getElementById("next");
	let goalBuffer = document.getElementById("goalBuffer");
	let factsBuffer = document.getElementById("factsBuffer");
	let outputView = document.getElementById("output");
	let ruleView = document.getElementById("rule");
	let ruleEngine = new RuleEngine(log);
	let goal, facts, rules, output;
	
	startButton.disabled = true;
	nextButton.disabled = true;
	
	function viewButton (buttonID, viewID) {
		let button = document.getElementById(buttonID);
		let view = document.getElementById(viewID);
		
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

	function showBuffers () {
		goalBuffer.innerText = goal.readBuffer();
		factsBuffer.innerText = facts.readBuffer();
	}
	
	startButton.onclick = function () {
		nextButton.disabled = false;
		ruleView.innerText = outputView.innerText = logView.innerText = "";
		ruleEngine.setGoal('count {\n state start\nstart 3\n end 5\n }');
		ruleEngine.getModule('facts').clearBuffer();
		showBuffers();
		return false;
	}

	nextButton.onclick = function () {
		let text = "";
		let match = ruleEngine.next();
		showBuffers();
		
		if (match) {
			let rule = match[0];
			ruleView.innerText = rules.graph.ruleToString(rule);
		} else {
			ruleView.innerText = "*** no matching rules ***"
			nextButton.disabled = true;
		}
		
		
		return false;
	}
	
	output = ruleEngine.addModule('output', new ChunkGraph(), {
		log: function (action, bindings) {
			outputView.innerText = JSON.stringify(bindings.value);
		}
	});
	
	goal = ruleEngine.addModule('goal', new ChunkGraph());

	fetch("facts.chk")
	.then((response) => response.text())
	.then(function (source) {
		facts = ruleEngine.addModule('facts', new ChunkGraph(source));
		document.getElementById("facts").innerText = source;
		
		fetch("rules.chk")
		.then((response) => response.text())
		.then(function (source) {
			rules = ruleEngine.addModule('rules', new ChunkGraph(source));
			document.getElementById("rules").innerText = source;
			startButton.disabled = false;
			console.log('' + ruleEngine.getModule('rules').graph);
		});
	});
}
