/*
	Decision tree demo for Chunks rule language
*/

window.addEventListener("load", function () {test.start(); }, false);

let test = {
	start: function () {
		let startButton = document.getElementById("start");
		let nextButton = document.getElementById("next");
		let rule_engine = new RuleEngine();
		startButton.disabled = true;
		nextButton.disabled = true;
		
		startButton.onclick = function () {
			nextButton.disabled = false;
			let initial_goal = 'golf {\n' +
		    '  state start\n ' +
			'  outlook ' + test.randomChoice(["sunny", "cloudy", "rainy"]) + '\n ' +
			'  humidity ' + test.randomIntFromInterval(20,80) + '\n ' +
			'  windy ' + test.randomChoice(["true", "false"]) + '\n ' +
			'}';

			rule_engine.start(test.rules, test.facts, initial_goal);
			return false;
		}
	
		nextButton.onclick = function () {
			rule_engine.next(test.rules, test.facts);
			return false;
		}
		
		let do_test = function (n) {
			test.goals = new ChunkGraph();
			fetch("rules.chk")
			.then((response) => response.text())
			.then(function (source) {
				test.rules = new ChunkGraph(source);
				let pre = document.getElementById("rules");
				pre.innerText = source;
				startButton.disabled = false;
				
				let a5 = test.rules.chunks['a5'];
			});
		};
		
		do_test();
	},
	randomIntFromInterval: function (min, max) {
  		return Math.floor(Math.random() * (max - min + 1)) + min;
  	},
  	randomChoice: function (range) {
		// range must be an array of values with length > 1
		let i = test.randomIntFromInterval(0, range.length - 1);
		return range[i];
	},
	
};
