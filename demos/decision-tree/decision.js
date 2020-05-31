/*
	Decision tree demo for Chunks rule language
*/

window.addEventListener("load", test, false);

function test () {
	function randomIntFromInterval (min, max) {
  		return Math.floor(Math.random() * (max - min + 1)) + min;
  	}
  	
  	function randomChoice (range) {
		// range must be an array of values with length > 1
		let i = randomIntFromInterval(0, range.length - 1);
		return range[i];
	}

	let goalBuffer = document.getElementById("goalBuffer");
	let factsBuffer = document.getElementById("factsBuffer");
	let outputView = document.getElementById("output");
	let ruleView = document.getElementById("rule");
	let startButton = document.getElementById("start");
	let nextButton = document.getElementById("next");
	let log = new Log('log');
	let ruleEngine = new RuleEngine();
	let goal, rules, output;
	
	output = ruleEngine.addModule('output', new ChunkGraph(), {
		log: function (action, bindings) {
			outputView.innerText = bindings.value;
		}
	});
	goal = ruleEngine.addModule('goal', new ChunkGraph());

	startButton.disabled = true;
	nextButton.disabled = true;
	
	function showBuffers () {
		goalBuffer.innerText = goal.readBuffer();
	}

	startButton.onclick = function () {
		log.clear();
		nextButton.disabled = false;
		ruleView.innerText = outputView.innerText = "";
		let initial_goal = 'golf {\n' +
		'  state start\n ' +
		'  outlook ' + randomChoice(["sunny", "cloudy", "rainy"]) + '\n ' +
		'  humidity ' + randomIntFromInterval(20,80) + '\n ' +
		'  windy ' + randomChoice(["true", "false"]) + '\n ' +
		'}';

		ruleEngine.setGoal(initial_goal);
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
		} else
			ruleView.innerText = "*** no matching rules ***"

		return false;
	}

	fetch("rules.chk")
	.then((response) => response.text())
	.then(function (source) {
		rules = ruleEngine.addModule('rules', new ChunkGraph(source));
		let pre = document.getElementById("rules");
		pre.innerText = source;
		startButton.disabled = false;
		console.log('' + ruleEngine.getModule('rules').graph);
	});	
};
