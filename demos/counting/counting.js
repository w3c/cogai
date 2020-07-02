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
	let goal, facts, rules;
	
	startButton.disabled = true;
	nextButton.disabled = true;
	
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

	function showBuffers () {
		goalBuffer.innerText = goal.readBuffer();
		factsBuffer.innerText = facts.readBuffer();
	}
	
	startButton.onclick = function () {
		nextButton.disabled = false;
		ruleView.innerText = outputView.innerText = logView.innerText = "";
		ruleEngine.setGoal('count {\n state start\nstart 2\n end 5\n }');
		ruleEngine.getModuleByName('facts').clearBuffer();
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
	
	goal = ruleEngine.addModule('goal', new ChunkGraph(), {
		show: function (action, bindings) {
			let value = bindings.value;
			let text = value;
			
			if (Array.isArray(value)) {
				text = value.join(', ');
			}
			
			outputView.innerText = text;
		}
	});

	fetch("facts.chk")
	.then((response) => response.text())
	.then(function (source) {
		facts = ruleEngine.addModule('facts', new ChunkGraph(source));
		document.getElementById("facts").show(source);
		console.log('Facts\n=====');
		console.log('' + facts.graph);
		
		fetch("rules.chk")
		.then((response) => response.text())
		.then(function (source) {
			rules = ruleEngine.addModule('rules', new ChunkGraph(source));
			document.getElementById("rules").show(source);
			startButton.disabled = false;
			console.log('Rules\n=====');
			console.log('' + rules.graph);
		});
	});
}
