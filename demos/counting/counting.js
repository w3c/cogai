/*
	Test script for Chunks rule language
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
			let initial_goal = 'count {\n state start\nstart 3\n end 8\n }';

			rule_engine.start(test.rules, test.facts, initial_goal);
			return false;
		}
	
		nextButton.onclick = function () {
			rule_engine.next(test.rules, test.facts);
			return false;
		}
		
		let do_test = function (n) {
			test.goals = new ChunkGraph();
			fetch("facts.chk")
			.then((response) => response.text())
			.then(function (source) {
				test.facts = new ChunkGraph(source);
				let pre = document.getElementById("facts");
				pre.innerText = source;
				
				fetch("rules.chk")
				.then((response) => response.text())
				.then(function (source) {
					test.rules = new ChunkGraph(source);
					let pre = document.getElementById("rules");
					pre.innerText = source;
					startButton.disabled = false;
				});
			});
		};
		
		do_test();
	}
};
