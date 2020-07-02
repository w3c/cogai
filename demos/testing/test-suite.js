/*
	Test script for Chunks rule language
*/

window.addEventListener("load", test, false);

function test () {
	let goalModule, factsModule, rulesModule;
	const logView = document.getElementById("log");
	const clearLog = document.getElementById("clear");

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
	
	function clear () {
		logView.innerText = "";
	}
	
	clearLog.addEventListener("click", () =>  {
		clear();
	});
		
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
	
	function disableTest (id) {
		let button = document.getElementById(id);
		button.disabled = true;
	}
	
	function disableTests () {
		let div = document.getElementById("tests");
		let buttons = div.getElementsByTagName("button");
		for (let i = 0; i < buttons.length; ++i) {
			buttons[i].disabled = true;
		}
	}
		
	disableTests ();
	
	function fail (test) {
		let testButton = document.getElementById(test);
		let span = testButton.parentElement.getElementsByTagName('span')[0];
		span.className = "bad";
		span.innerText = "✗";
	};
	
	let enableTests = function () {
		function enableTest (button) {
			button.disabled = false;
			button.parentElement.addEventListener("click", () => {
				fail (button.id);
				goalModule.clearBuffer();
				factsModule.clearBuffer();
				clear();
				let chunk = new Chunk('run');
				chunk.properties.test = button.id;
				goalModule.pushBuffer(chunk);
				ruleEngine.run();
			});
			
			let space = document.createTextNode(" ");
			let span = document.createElement("span");
			button.parentElement.appendChild(space);
			button.parentElement.appendChild(span);
		}
		
		let div = document.getElementById("tests");
		let buttons = div.getElementsByTagName("button");
		
		for (let i = 0; i < buttons.length; ++i) {
			enableTest(buttons[i]);
		}
	};
	
	let actions = {
		result: function (action, properties) {
			let test = properties.test;
			if (test !== undefined) {
				let testButton = document.getElementById(test);
				let span = testButton.parentElement.getElementsByTagName('span')[0];
				span.className = properties.result ? "good" : "bad";
				span.innerText = properties.result ? "✓" : "✗";
			}
		},
		log: function (action, properties) {
			let message = properties.message;
			
			if (Array.isArray(message))
				message = message.join(' ');
					
			log(message);
		}
	};
	
	let ruleEngine = new RuleEngine(log);
	goalModule = ruleEngine.addModule('goal', new ChunkGraph(), actions);

	fetch("facts.chk")
	.then((response) => response.text())
	.then(function (source) {
		factsModule = ruleEngine.addModule('facts', new ChunkGraph(source));
		document.getElementById("facts").show(source);
			console.log("Facts\n=====\n" + factsModule.graph);
		
		fetch("rules.chk")
		.then((response) => response.text())
		.then(function (source) {
			rulesModule = ruleEngine.addModule('rules', new ChunkGraph(source));
			document.getElementById("rules").show(source);
			console.log("Rules\n=====\n" + rulesModule.graph.rulesToString());
			enableTests();
		});
	});
}
